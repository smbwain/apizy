export interface PromiseGroup<T> {
    (id: string): Promise<T | null>;
    set(id: string, v: T | null): void;
    invalidate(id: string | string[]): void;
}

export function createPromiseGroup<T>(handler: (ids: string[]) => Promise<Record<string, T>>): PromiseGroup<T> {
    const cache: Record<string, Promise<T | null>> = {};
    let defers: Record<string, {
        resolve: (v: any) => void,
        reject: (err: any) => void,
    }> | undefined;
    const load = () => {
        const localDefers = defers!;
        defers = undefined;
        handler(Object.keys(localDefers)).then(
            (res) => {
                for (const id in localDefers) {
                    localDefers[id].resolve(res[id] ?? null);
                }
            },
            err => {
                for (const id in localDefers) {
                    localDefers[id].reject(err);
                }
            },
        );
    };
    const pg: PromiseGroup<T> = (id: string) => {
        if (!cache[id]) {
            if (!defers) {
                defers = {};
                Promise.resolve().then(() => {
                    process.nextTick(() => {
                        load();
                    });
                });
            }
            cache[id] = new Promise((resolve, reject) => {
                defers![id] = {resolve, reject};
            });
        }
        return cache[id];
    };
    pg.set = (id, v) => {
        cache[id] = Promise.resolve(v);
    };
    pg.invalidate = (id) => {
        for (const _id of Array.isArray(id) ? id : [id]) {
            delete cache[_id];
        }
    };
    return pg;
}