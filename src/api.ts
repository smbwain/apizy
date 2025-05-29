import {exact, InputType, object, OutputType, PromiseOrValue, string, Type} from './type-system';
import * as check from 'checkeasy';
import {BadReqError, NotFoundError} from './errors';
import {ApiDescription} from './api-description';

const NOT_INITIALIZED_METHOD = () => {
    throw new Error('Not initialized');
}

export interface Entity<Data, Context> extends OutputType<Data> {
    addResolver<Attrs extends {[k: string]: OutputType<any>}>(
        types: Attrs,
        handler: (data: Data, ctx: Context) => {
            [K in keyof Attrs]: Attrs[K] extends OutputType<infer T> ? T : never;
        },
    ): void;
}

export interface ApiContext {}

export interface Method<Context> {
    inputType: InputType<any> | null;
    outputType: OutputType<any>;
    handler: (input: any, ctx: Context) => Promise<any>;
}

export interface Api<Context extends ApiContext> {
    createMethod<Output>(
        name: string,
        input: null,
        output: OutputType<Output>,
        handler: (input: void, context: Context) => Promise<Output>,
    ): void;
    createMethod<Input, Output>(
        name: string,
        input: InputType<Input>,
        output: OutputType<Output>,
        handler: (input: Input, context: Context) => Promise<Output>,
    ): void;

    createEntity<Data>(
        name: string,
    ): Entity<Data, Context>;

    createAlias<T>(name: string, t: Type<T>): Type<T>;
    createAlias<T>(name: string, t: InputType<T>): InputType<T>;
    createAlias<T>(name: string, t: OutputType<T>): OutputType<T>;

    createCustomType<T>(
        name: string,
        tsDefinition: string,
        extract: check.Validator<T>,
        resolve: (v: T, path: string, extendQuery: any, ctx: any) => PromiseOrValue<any>,
        checkExtendedQuery?: check.Validator<any>,
        description?: string,
    ): Type<T>;
    createCustomType<T>(
        name: string,
        tsDefinition: string,
        extract: check.Validator<T>,
        resolve?: undefined,
        checkExtendedQuery?: undefined,
        description?: string,
    ): InputType<T>;
    createCustomType<T>(
        name: string,
        tsDefinition: string,
        extract: undefined,
        resolve: (v: T, path: string, extendQuery: any, ctx: any) => PromiseOrValue<any>,
        checkExtendedQuery?: check.Validator<any>,
        description?: string,
    ): OutputType<T>;

    callMethod(name: string, input: any, extend: any, ctx: Context): Promise<any>;

    apiDescription: ApiDescription;
}

export function createApi<Context extends ApiContext = ApiContext>(): Api<Context> {
    const apiDescription: ApiDescription = {
        methods: {},
        types: {},
    };

    const methods: {
        [methodName: string]: Method<Context>;
    } = {};

    function createMethod(name: string, inputType: InputType<any> | null, outputType: OutputType<any>, handler: (input: any, context: Context) => Promise<any>, description?: string) {
        if (methods[name]) {
            throw new Error('Method is already defined');
        }
        methods[name] = {
            inputType,
            outputType,
            handler,
        };
        apiDescription.methods[name] = {
            input: inputType?.desc,
            output: outputType.desc,
            description,
        };
    }

    function createEntity<Data>(
        name: string,
    ): Entity<Data, Context> {
        if (apiDescription.types[name]) {
            throw new Error('Type is already defined');
        }
        apiDescription.types[name] = {
            type: {
                objectOf: {},
            },
        };
        let checkExtendedQuery: check.Validator<any> = NOT_INITIALIZED_METHOD;
        let resolve: OutputType<any>['resolve'] = NOT_INITIALIZED_METHOD;
        const entity: Entity<any, Context> = {
            desc: {
                type: {
                    alias: name,
                },
            },
            checkExtendedQuery: (v, path) => checkExtendedQuery(v, path),
            resolve: (v, path, extendQuery, ctx) => resolve(v, path, extendQuery, ctx),
            addResolver: (
                types: Record<string, OutputType<any>>,
                handler: (data: any, ctx: Context) => any,
            ) => {
                const type = object({
                    $type: exact(name),
                    ...types,
                });
                resolve = async (v, path, extendQuery, ctx) => {
                    return type.resolve(
                        {
                            $type: name,
                            ...await handler(v, ctx),
                        },
                        path,
                        extendQuery,
                        ctx,
                    );
                };
                checkExtendedQuery = type.checkExtendedQuery ?? check.optional(check.object({}));
                apiDescription.types[name] = type.desc;
            },
        };

        return entity;
    }

    const createAlias = <T>(name: string, type: Type<T> | InputType<T> | OutputType<T>): any => {
        if (apiDescription.types[name]) {
            throw new Error('Type is already defined');
        }
        apiDescription.types[name] = type.desc;

        return {
            ...type,
            desc: {
                type: {
                    alias: name,
                },
            },
        };
    };

    const createCustomType = <T>(
        name: string,
        tsDefinition: string,
        extract?: check.Validator<T>,
        resolve?: (v: T, path: string, extendQuery: any, ctx: any) => PromiseOrValue<any>,
        checkExtendedQuery?: check.Validator<any>,
        description?: string,
    ): any => {
        if (apiDescription.types[name]) {
            throw new Error('Type is already defined');
        }
        apiDescription.types[name] = {
            type: {
                ts: tsDefinition,
            },
            description,
        };
        return {
            desc: {
                type: {
                    alias: name,
                },
            },
            extract,
            resolve,
            checkExtendedQuery,
        };
    }

    async function callMethod(name: string, unsafeInput: any, unsafeExtend: any, ctx: Context): Promise<any> {
        const method = methods[name];
        if (!method) {
            throw new NotFoundError('No method found');
        }
        const [input, extend]: any = (() => {
            try {
                return [
                    method.inputType?.extract(unsafeInput, 'input'),
                    (method.outputType.checkExtendedQuery ?? check.optional(check.object({})))(unsafeExtend, 'extend'),
                ];
            } catch (err) {
                if (err instanceof check.ValidationError) {
                    throw new BadReqError(err.message);
                }
                throw err;
            }
        })();
        return method.outputType.resolve(
            await method.handler(input, ctx),
            'output',
            extend,
            ctx,
        );
    }

    return {
        createEntity,
        createMethod,
        createAlias,
        createCustomType,
        callMethod,
        apiDescription,
    };
}