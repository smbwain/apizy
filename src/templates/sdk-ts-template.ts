import {
    ApiDescription,
    MethodDescription, TypeDescription,
} from '../index';

export const sdkTsTemplate = (desc: ApiDescription) => `

export type Method<Input, Output, ExtendQuery, FetchOptions> = (
    input: Input,
    options?: {
        extend?: ExtendQuery;
        fetchOptions?: FetchOptions;
    },
) => Promise<Output>;

${Object.keys(desc.types).map(name => {
    const d = desc.types[name];
    return `export type T_${name} = ${renderTSTypeFromDescription(d, 'output')}\nexport interface ExtendQuery_${name} ${renderTSExtendQueryTypeFromDescription(d)}`;
}).join('\n\n')}

export interface SDK<FetchOptions> {
${renderMethodsTree(desc.methods, 'type', 1)}}

export interface AuthStorage {
    get: () => [string | null, string | null];
    set: (jwt: string | null, rt: string | null) => void;
}

export const createMemoryAuthStorage = (onJwt?: (jwt: string | null) => void): AuthStorage => {
    let jwt = null as string | null;
    let rt = null as string | null;
    return {
        get: () => [jwt, rt],
        set: (_jwt, _rt) => {
            jwt = _jwt;
            rt = _rt;
            onJwt?.(jwt);
        },
    };
}

export const createBrowserAuthStorage = (storage: Storage, onJwt?: (jwt: string | null) => void): AuthStorage => {
    const set = (key: string, val: string | null) => {
        if (val === null) {
            storage.removeItem(key);
        } else {
            storage.setItem(key, val);
        }
    };
    onJwt?.(storage.getItem('jwt'));
    return {
        get: () => [storage.getItem('jwt'), storage.getItem('rt')],
        set: (jwt, rt) => {
            set('jwt', jwt);
            set('rt', rt);
            onJwt?.(jwt);
        },
    };
}

export function createSDK(options: {
    url: string;
    authStorage?: AuthStorage;
}): SDK<{
    signal?: AbortSignal;
    noRefreshToken?: boolean;
}>;
export function createSDK<FetchOptions>(fetch: (methodName: string, input: any, extend?: any, fetchOptions?: FetchOptions) => Promise<any>): SDK<FetchOptions>;
export function createSDK(p1: {
    url: string;
    authStorage?: AuthStorage;
} | ((methodName: string, input: any, extend?: any, fetchOptions?: any) => Promise<any>)): SDK<any> {
    const f = typeof p1 === 'function' ? p1 : (() => {
        const {authStorage, url} = p1;
        let refreshingToken: Promise<void> | null = null;
        const req = async (methodName: string, input: any, extend?: any, fetchOptions?: {
            signal?: AbortSignal;
            noRefreshToken?: boolean;
        }): Promise<any> => {
            const jwt = authStorage?.get()[0];
            const res = await window.fetch(url + '/' + methodName, {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    ...(jwt ? {Authorization: 'Bearer '+jwt} : {}),
                },
                body: JSON.stringify({
                    input,
                    extend,
                }),
                signal: fetchOptions?.signal,
            });
            if (!res.ok) {
                const err = new Error(await res.text());
                if (res.status === 401 && !fetchOptions?.noRefreshToken) {
                    const rt = authStorage?.get()[1];
                    if (rt) {
                        await (refreshingToken ??= (async () => {
                            await req('$auth.refresh', {rt}, undefined, {
                                ...fetchOptions,
                                noRefreshToken: true,
                            });
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            refreshingToken = null;
                        })());
                        if (!rt || rt === authStorage?.get()[1]) {
                            throw new Error('Refresh token was not updated');
                        }
                        return await req(methodName, input, extend, {
                            ...fetchOptions,
                            noRefreshToken: true,
                        });
                    }
                }
                throw err;
            }
            const output = (await res.json()).output;
            if (output?.$auth) {
                authStorage?.set(output.$auth.jwt ?? null, output.$auth.rt ?? null);
            }
            return output;
        };
        return req;
    })();
    const createMethod = (methodName: string) => (input: any, options: any) => f(methodName, input, options?.extend, options?.fetchOptions);
    return {\n${renderMethodsTree(desc.methods, 'impl', 2)}    };
};
`;

const tab = (indent: number) => ' '.repeat(indent*4);

const renderTSTypeFromDescription = (
    desc: TypeDescription,
    mode: 'input' | 'output',
    indent: number = 0,
): string => {
    if (desc.type.ts) {
        return desc.type.ts;
    }
    if (desc.type.alias) {
        return `T_${desc.type.alias}`;
    }
    if (desc.type.arrayOf) {
        return `Array<${renderTSTypeFromDescription(desc.type.arrayOf, mode, indent)}>`;
    }
    if (desc.type.objectOf) {
        return `{\n${Object.keys(desc.type.objectOf).map(key => {
            const sub = desc.type.objectOf![key];
            return `${tab(indent+1)}${JSON.stringify(key)}`+
                `${((mode === 'input' && sub.inputOptional) || (mode === 'output' && sub.outputExtendable)) ? '?' : ''}`+
                `: ${renderTSTypeFromDescription(sub, mode, indent+1)};\n`;
        }).join('')}${tab(indent)}}`;
    }
    throw new Error('Unknown type');
};

const renderTSExtendQueryTypeFromDescription = (
    desc: TypeDescription,
    indent: number = 0,
): string => {
    if (desc.type.arrayOf) {
        return renderTSExtendQueryTypeFromDescription(desc.type.arrayOf, indent);
    }
    if (desc.type.alias) {
        return `ExtendQuery_${desc.type.alias}`;
    }
    if (desc.type.objectOf) {
        const keys = Object.keys(desc.type.objectOf).filter(key => desc.type.objectOf![key].outputExtendable);
        if (keys.length > 0) {
            return `{\n${keys.map(key => {
                const sub = desc.type.objectOf![key];
                return `${tab(indent+1)}${JSON.stringify(key)}?: ${renderTSExtendQueryTypeFromDescription(sub, indent+1)};\n`;
            }).join('')}${tab(indent)}}`;
        }
    }
    return '{}';
};

// const renderMethodType = (desc: MethodDescription, indent: number): string => {
//     return `(\n`+
//         `${tab(indent+1)}input: ${desc.input ? renderTSTypeFromDescription(desc.input, 'input', indent+1) : 'null'},\n` +
//         `${tab(indent+1)}options: {\n${tab(indent+2)}extend: ${renderTSExtendQueryTypeFromDescription(desc.output, indent+2)};\n${tab(indent+2)}fetchOptions: FetchOptions;\n${tab(indent+1)}},\n` +
//         `${tab(indent)}) => Promise<${renderTSTypeFromDescription(desc.output, 'output', indent+1)}>`;
// };

const renderMethodType = (desc: MethodDescription, indent: number): string => {
    return `Method<${desc.input ? renderTSTypeFromDescription(desc.input, 'input', indent) : 'null'}, ` +
        `${renderTSTypeFromDescription(desc.output, 'output', indent)}, ` +
        `${renderTSExtendQueryTypeFromDescription(desc.output, indent)}, FetchOptions>`;
};

const renderMethodsTree = (rec: Record<string, MethodDescription>, mode: 'type' | 'impl', indent: number): string => {
    let lastPath: string[] = [];
    const parts: string[] = [];
    const close = (c: number, indent: number) => {
        for (; c > 0; c--) {
            parts.push(`${tab(indent+c-1)}}${mode === 'type' ? ';' : ','}\n`);
        }
    };
    Object.keys(rec).sort().forEach(key => {
        const path = key.split('.');
        const methodName = path.pop();

        let commonCount = 0;
        while (commonCount < lastPath.length && commonCount < path.length && lastPath[commonCount] === path[commonCount]) {
            commonCount++;
        }

        close(lastPath.length-commonCount, indent+path.length-1);
        lastPath = path;

        for(let i = commonCount; i < path.length; i++) {
            parts.push(`${tab(indent+path.length-1)}${JSON.stringify(path[i])}: {\n`);
        }

        parts.push(`${tab(indent+path.length)}${JSON.stringify(methodName)}: `);
        if (mode === 'type') {
            parts.push(`${renderMethodType(rec[key], indent+path.length)};\n`);
        } else {
            parts.push(`createMethod(${JSON.stringify(key)}),\n`);
        }
    });
    close(lastPath.length, indent);
    return parts.join('');
};