import {createPromiseGroup, PromiseGroup} from './promise-group';
import {indexBy} from '../utils';

export interface Loadable<T, Context> {
    loadOne(id: string, ctx: Context): Promise<T | null>;
    loadFewAsArray(ids: string[], ctx: Context): Promise<Array<T | null>>;
    leadFewAsRecord(ids: string[], ctx: Context): Promise<Record<string, T | null>>;
    invalidateCache(id: string | string[]): void;
}

export interface Listable<T, Filter, Meta, Context> {
    loadList(filter: Filter, ctx: Context): Promise<T[]>;
    loadListWithMeta(filter: Filter, ctx: Context): Promise<{
        items: T[];
        meta: Meta;
    }>;
}

export function createLoadable<T, Context>(
    loadFew: (ids: string[], ctx: Context) => Promise<Record<string, T>>,
): Loadable<T, Context>;
export function createLoadable<T, Context>(
    loadFew: (ids: string[], ctx: Context) => Promise<T[] | Record<string, T>>,
    resolveId: (data: T) => string,
): Loadable<T, Context>;
export function createLoadable<T, Filter, Context>(
    loadFew: (ids: string[], ctx: Context) => Promise<T[] | Record<string, T>>,
    resolveId: (data: T) => string,
    loadList: (filter: Filter, ctx: Context) => Promise<T[]>,
): Loadable<T, Context> & Listable<T, Filter, void, Context>;
export function createLoadable<T, Filter, Meta, Context>(
    loadFew: (ids: string[], ctx: Context) => Promise<T[] | Record<string, T>>,
    resolveId: (data: T) => string,
    loadList: (filter: Filter, ctx: Context) => Promise<{items: T[], meta: Meta}>,
): Loadable<T, Context> & Listable<T, Filter, Meta, Context>;
export function createLoadable<T, Context>(
    getHandler: (ids: string[], ctx: Context) => Promise<T[] | Record<string, T>>,
    getId?: (data: T) => string,
    listHandler?: (filter: any, ctx: Context) => Promise<T[] | {items: T[], meta?: any}>,
): any {
    const loadSym = Symbol();
    const getPromiseGroup = (ctx: Context): PromiseGroup<T> => {
        return (ctx as any)[loadSym] ??= createPromiseGroup(async (ids) => {
            const raw = await getHandler(ids, ctx);
            return Array.isArray(raw) ? indexBy(raw, item => getId!(item)) : raw;
        });
    };
    const loadOne: Loadable<T, Context>['loadOne'] = (id, ctx) => getPromiseGroup(ctx)(id);
    const leadFewAsRecord: Loadable<T, Context>['leadFewAsRecord'] = async (ids, ctx) => {
        const res: Record<string, T | null> = {};
        await Promise.all(ids.map(id => loadOne(id, ctx).then(v => {
            res[id] = v;
        })));
        return res;
    };
    const loadFewAsArray: Loadable<T, Context>['loadFewAsArray'] = async (ids, ctx) => {
        const rec = await leadFewAsRecord(ids, ctx);
        return ids.map(id => rec[id]);
    }
    const loadListWithMeta = listHandler ? async (filter: any, ctx: Context) => {
        let items = await listHandler(filter, ctx);
        let meta: any = undefined;
        if (!Array.isArray(items)) {
            meta = items.meta;
            items = items.items;
        }
        const pg = getPromiseGroup(ctx);
        for (const item of items) {
            pg.set(getId!(item), item);
        }
        return {items, meta};
    } : undefined;
    const loadList = loadListWithMeta ? async (filter: any, ctx: Context) => {
        const {items} = await loadListWithMeta(filter, ctx);
        return items;
    } : undefined;
    const invalidateCache = (id: string | string[], ctx: Context) => {
        getPromiseGroup(ctx).invalidate(id);
    };
    return {
        loadOne,
        leadFewAsRecord,
        loadFewAsArray,
        loadListWithMeta,
        loadList,
        invalidateCache,
    };
}