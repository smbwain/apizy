import {BadReqError} from './errors';

export function createExtendQueryChecker({maxDeep, maxWeight, maxNodes}: {
    maxDeep: number;
    maxWeight: number;
    maxNodes: number;
}) {
    let weights = Array(maxDeep).fill(0);
    let nodes = 0;
    const check = (extend: any, level: number) => {
        if (level > maxDeep) {
            throw new BadReqError('Max deep of extendQuery exceeded');
        }
        if (typeof extend === 'object' && extend) {
            const length = Object.keys(extend).length;
            if ((nodes += length) > maxNodes) {
                throw new BadReqError('Max nodes of extendQuery exceeded');
            }
            if ((weights[level] += length) > maxWeight) {
                throw new BadReqError('Max weight of extendQuery exceeded');
            }
            for (const key in extend) {
                check(extend[key], level + 1);
            }
        }
    };
    return (extend: any) => {
        check(extend, 0);
    };
}