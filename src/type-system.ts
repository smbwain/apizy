import * as check from 'checkeasy';
import {mapObject} from './utils';
import {TypeDescription} from './api-description';

export type PromiseOrValue<T> = Promise<T> | T;

export interface InputType<T> {
    extract: check.Validator<T>;
    desc: TypeDescription;
}

export interface OutputType<T> {
    resolve: (v: T, path: string, extendQuery: any, ctx: any) => PromiseOrValue<any>;
    checkExtendedQuery?: check.Validator<any>;
    desc: TypeDescription;
}

export interface Type<T> extends InputType<T>, OutputType<T> {}

export function isTypeInput<T>(t: InputType<T> | OutputType<T>): t is InputType<T> {
    return !!(t as any).extract;
}
export function isTypeOutput<T>(t: InputType<T> | OutputType<T>): t is OutputType<T> {
    return !!(t as any).resolve;
}

export function extend<T>(type: OutputType<T>): OutputType<() => PromiseOrValue<T>> {
    return {
        desc: {
            ...type.desc,
            outputExtendable: true,
        },
        resolve: async (v, path, extendQuery, ctx): Promise<any> => {
            if (!extendQuery) {
                return undefined;
            }
            return type.resolve(
                await v(),
                path,
                extendQuery,
                ctx,
            );
        },
        checkExtendedQuery: type.checkExtendedQuery || check.optional(check.object({})),
    };
}

export const string = (options?: Parameters<typeof check.string>[0]): Type<string> => ({
    extract: check.string(options),
    resolve: check.string(options),
    desc: {
        type: {
            ts: 'string',
        },
    },
});

export const uuid = (): Type<string> => ({
    extract: check.UUID(),
    resolve: check.UUID(),
    desc: {
        type: {
            ts: 'string',
        },
    },
});

export const int = (options?: Parameters<typeof check.int>[0]): Type<number> => ({
    extract: check.int(options),
    resolve: check.int(options),
    desc: {
        type: {
            ts: 'number',
        },
    },
});

export const float = (options?: Parameters<typeof check.float>[0]): Type<number> => ({
    extract: check.float(options),
    resolve: check.float(options),
    desc: {
        type: {
            ts: 'number',
        },
    },
});

export const boolean = (): Type<boolean> => ({
    extract: check.boolean(),
    resolve: check.boolean(),
    desc: {
        type: {
            ts: 'boolean',
        },
    },
});

// export function json<T>(scheme: check.Validator<T>): Type<T> {
//     return {
//         extract: (v, path) => {
//             let parsed;
//             try {
//                 parsed = JSON.parse(v);
//             } catch(err) {
//                 throw new check.ValidationError(`Not valid JSON not valid for [${path}]`);
//             }
//             return scheme(parsed, path);
//         },
//         resolve: (v) => JSON.stringify(v),
//         tsExtract: 'string',
//         tsResolve: 'string',
//     };
// }

export function object<O extends {[k: string]: Type<any>}>(description: O): Type<{
    [K in keyof O]: O[K] extends Type<infer T> ? T : never;
}>;
export function object<O extends {[k: string]: InputType<any>}>(description: O): InputType<{
    [K in keyof O]: O[K] extends InputType<infer T> ? T : never;
}>;
export function object<O extends {[k: string]: OutputType<any>}>(description: O): OutputType<{
    [K in keyof O]: O[K] extends OutputType<infer T> ? T : never;
}>;
export function object(description: any) {
    const keys = Object.keys(description);
    const res: any = {
        desc: {
            type: {
                objectOf: mapObject(description, (val: any) => val.desc),
            },
        },
    };
    if (keys.every(key => isTypeInput(description[key]))) {
        const d = description as Record<string, InputType<any>>;
        (res as InputType<any>).extract = check.object(mapObject(d, (val: any) => val.extract));
    }
    if (keys.every(key => isTypeOutput(description[key]))) {
        const d = description as Record<string, OutputType<any>>;
        (res as OutputType<any>).resolve = async (v, path, extendQuery, ctx) => {
            const res: any = {};
            await Promise.all(keys.map(async (key) => {
                res[key] = await d[key].resolve(v[key], `${path}.${key}`, extendQuery?.[key], ctx);
            }));
            return res;
        };

        const subValidators: Record<string, check.Validator<any>> = {};
        for (const key of keys) {
            if (d[key].checkExtendedQuery) {
                subValidators[key] = d[key].checkExtendedQuery!;
            }
        }

        (res as OutputType<any>).checkExtendedQuery = Object.keys(subValidators).length ? check.optional(check.object(subValidators)) : undefined;
    }
    return res;
}

export function arrayOf<T>(t: Type<T>, options?: Parameters<typeof check.arrayOf>[1]): Type<T[]>;
export function arrayOf<T>(t: InputType<T>, options?: Parameters<typeof check.arrayOf>[1]): InputType<T[]>;
export function arrayOf<T>(t: OutputType<T>, options?: Parameters<typeof check.arrayOf>[1]): OutputType<T[]>;
export function arrayOf(t: Type<any> | InputType<any> | OutputType<any>, options?: Parameters<typeof check.arrayOf>[1]) {
    const res: any = {
        desc: {
            type: {
                arrayOf: t.desc,
            },
        },
    };
    if (isTypeInput(t)) {
        (res as InputType<any>).extract = check.arrayOf(t.extract, options);
    }
    if (isTypeOutput(t)) {
        (res as OutputType<any>).resolve = async (v, path, extendedQuery, ctx) => {
            if (t.desc.outputExtendable && !extendedQuery) {
                return undefined;
            }
            return Promise.all((v as any[]).map((item, index) => t.resolve(item, `${path}[${index}]`, extendedQuery, ctx)))
        };
        (res as OutputType<any>).checkExtendedQuery = t.checkExtendedQuery;
    }
    return res;
}

export function nullable<T>(t: Type<T>): Type<T | null>;
export function nullable<T>(t: InputType<T>): InputType<T | null>;
export function nullable<T>(t: OutputType<T>): OutputType<T | null>;
export function nullable(t: Type<any> | InputType<any> | OutputType<any>) {
    const res: any = {
        desc: {
            ...t.desc,
            nullable: true,
        },
    };
    if (isTypeInput(t)) {
        (res as InputType<any>).extract = check.nullable(t.extract);
    }
    if (isTypeOutput(t)) {
        (res as OutputType<any>).resolve = async (v, path, extendedQuery, ctx) => {
            if (t.desc.outputExtendable && !extendedQuery) {
                return undefined;
            }
            if (v === null) {
                return null;
            }
            return t.resolve(v, path, extendedQuery, ctx);
        };
        (res as OutputType<any>).checkExtendedQuery = t.checkExtendedQuery;
    }
    return res;
}

export const optional = <T>(t: InputType<T>): InputType<T | undefined> => ({
    desc: {
        ...t.desc,
        inputOptional: true,
    },
    extract: check.optional(t.extract),
});

export const defaultValue = <T>(val: T, t: InputType<T>): InputType<T> => ({
    desc: {
        ...t.desc,
        inputOptional: true,
    },
    extract: check.defaultValue(val, t.extract),
});

export const oneOf = <T>(values: ReadonlyArray<T>): Type<T> => ({
    desc: {
        type: {
            ts: `${values.map(val => JSON.stringify(val)).join(' | ')}`,
        }
    },
    extract: check.oneOf(values),
    resolve: check.oneOf(values),
});

export const any = (): Type<any> => ({
    desc: {
        type: {
            ts: 'any',
        },
    },
    extract: v => v,
    resolve: v => v,
});

export const exact = <T>(value: T): Type<T> => ({
    desc: {
        type: {
            ts: JSON.stringify(value),
        },
    },
    extract: check.exact(value),
    resolve: check.exact(value),
});

export function relation<T>(
    type: OutputType<T>,
    load: (id: string, ctx: any) => Promise<T | null>,
    options: {
        nullable: true;
        auto?: boolean;
    },
): OutputType<string | null>;
export function relation<T>(
    type: OutputType<T>,
    load: (id: string, ctx: any) => Promise<T>,
    options?: {
        nullable?: false;
        auto?: boolean;
    },
): OutputType<string>;
export function relation<T>(
    type: OutputType<T>,
    load: (id: string, ctx: any) => Promise<T | null>,
    {nullable, auto = false}: {
        nullable?: boolean;
        auto?: boolean;
    } = {},
): OutputType<string> {
    return {
        desc: {
            ...type.desc,
            outputExtendable: !auto || undefined,
            nullable,
        },
        resolve: async (id, path, extendQuery, ctx) => {
            if (!auto && !extendQuery) {
                return undefined;
            }
            if (id === null) {
                if (nullable) {
                    return null;
                } else {
                    throw new Error(`Nullable is not allowed but null is passed as id [${path}]`);
                }
            }
            const res = await load(id, ctx);
            if (res === null) {
                if (nullable) {
                    return null;
                } else {
                    throw new Error(`Nullable is not allowed but no record found [${path}]`);
                }
            }
            return type.resolve(
                res,
                path,
                extendQuery,
                ctx,
            );
        },
        checkExtendedQuery: type.checkExtendedQuery || check.optional(check.object({})),
    };
}

export function describe<T>(t: Type<T>, description: string): Type<T>;
export function describe<T>(t: InputType<T>, description: string): InputType<T>;
export function describe<T>(t: OutputType<T>, description: string): OutputType<T>;
export function describe<T>(t: InputType<T> | OutputType<T>, description: string): InputType<T> | OutputType<T> {
    return {
        ...t,
        desc: {
            ...t.desc,
            description,
        },
    };
}

// export function alternatives<Alts extends ReadonlyArray<Type<any>>>(alts: Alts): Type<Alts extends ReadonlyArray<Type<infer T>> ? T : never>;
// export function alternatives<Alts extends ReadonlyArray<InputType<any>>>(alts: Alts): InputType<Alts extends ReadonlyArray<InputType<infer T>> ? T : never>;
// export function alternatives<Alts extends ReadonlyArray<OutputType<any>>>(alts: Alts): OutputType<Alts extends ReadonlyArray<OutputType<infer T>> ? T : never>;
// export function alternatives(alts: any[]) {
//     const res: any = {};
//     if (alts.every(alt => alt.extract)) {
//         const r: InputType<any> = {
//             tsExtract: alts.map(alt => `(${alt.tsExtract})`).join(' | '),
//             extract: check.oneOf(alts.map(alt => alt.extract)),
//         };
//         Object.assign(res, r);
//     }
//     // if (alts.every(alt => alt.resolve)) {
//     //     const r: OutputType<any> = {
//     //         tsResolve: alts.map(alt => `(${alt.tsExtract})`).join(' | '),
//     //         resolve: async (v, path, q, ctx) => Promise.all((v as any[]).map(item => t.resolve(item, `${path}[${item}]`, q, ctx))),
//     //         includeType: t.includeType,
//     //         tsInclude: t.tsInclude,
//     //     };
//     //     Object.assign(res, r);
//     // }
//     return res;
// }