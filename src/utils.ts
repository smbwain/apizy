export function mapObject<T, R>(obj: Record<string, T>, mapper: (val: T, key: string) => R): Record<string, R> {
    const res: Record<string, R> = {};
    for (const k in obj) {
        res[k] = mapper(obj[k], k);
    }
    return res;
}

export function indexBy<T>(array: T[], key: (item: T, index: number) => string): Record<string, T> {
    const res: Record<string, T> = {};
    array.forEach((item, index) => {
        res[key(item, index)] = item;
    });
    return res;
}

export const textLeftOffset = (s: string, pad: string = '    ') => s.replace(/\n/g, `\n${pad}`);

// export const renderTsDescription = (s: string) => `\n/**\n * ${s.replace(/\n/g, '\n * ')}\n */\n`;