export interface TypeDescription {
    type: {
        ts?: string;
        alias?: string
        arrayOf?: TypeDescription
        objectOf?: Record<string, TypeDescription>;
    };

    description?: string;
    nullable?: boolean;

    input?: boolean;
    inputOptional?: boolean;

    output?: boolean;
    outputExtendable?: boolean;
}

export interface MethodDescription {
    description?: string;
    input?: TypeDescription;
    output: TypeDescription;
}

export interface ApiDescription {
    types: Record<string, TypeDescription>;
    methods: Record<string, MethodDescription>;
}