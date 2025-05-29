import {arrayOf, boolean, defaultValue, extend, int, nullable, object, optional, string, uuid} from './type-system';
import {createApi} from './api';

describe('api', () => {
    it('should handle extend queries for entities', async () => {
        const api = createApi();

        const $Entity = api.createEntity<string>('Test');

        const $DateTime = api.createCustomType<string>(
            'DateTime',
            'string',
            (v, path) => {
                return '';
            },
            (v) => {
                return '';
            },
            undefined,
            'DateTime string in ISO format',
        );

        const $Money = api.createCustomType<number>(
            'Money',
            '{currency: string, amount: number}',
            undefined,
            (v) => ({
                currency: 'PLN',
                amount: v,
            }),
        );

        $Entity.addResolver({
            id: uuid(),
            date: $DateTime,
            registrationEndDate: $DateTime,
            duration: nullable(int()),
            participantsLimit: nullable(int()),
            participantsCount: int(),
            cancelled: boolean(),
            name: nullable(string()),
            price: nullable($Money),
            reducedPrice: nullable($Money),
            seatsIOEventKey: nullable(string()),
            prices: extend(arrayOf(string())),
            // priceAddons: extend(arrayOf($PriceAddon)),
        }, (ld, ctx) => {
            return null as any;
        });

        // $Entity.addResolver({
        //     prop1: string(),
        //     prop2: extend(string()),
        // }, () => {
        //     return {
        //         prop1: 'p1',
        //         prop2: () => 'p2',
        //     }
        // });
        //
        // expect($Entity.desc).toMatchSnapshot();
        //
        // $Entity.checkExtendedQuery!({}, 'extend query');
        //
        // $Entity.checkExtendedQuery!({prop2: {}}, 'extend query');
        //
        // expect(() => {
        //     $Entity.checkExtendedQuery!({prop1: {}}, 'extend query');
        // }).toThrowError();

        api.createMethod(
            'listings.dates.list',
            object({
                listingId: optional(uuid()),
                date: optional(object({
                    // from: optional($DateTime),
                    // to: optional($DateTime),
                })),
                limit: defaultValue(100, int({min: 1, max: 500})),
                page: defaultValue(0, int({min: 0})),
            }),
            object({
                items: arrayOf($Entity),
            }),
            async (filter, ctx) => {
                return {
                    items: [],
                };
            },
        );

        const res = await api.callMethod('listings.dates.list', {}, {items: {prices: {}}}, {});

        expect(res).toMatchSnapshot();

        // --

        api.createMethod(
            'dumbFunction',
            object({}),
            boolean(),
            async (filter, ctx) => {
                return true;
            },
        );

        const res2 = await api.callMethod('dumbFunction', {}, {}, {});
        expect(res2).toEqual(true);

        // expect( type.checkExtendedQuery!({}, 'extend query') ).toMatchSnapshot();
        //
        // expect( type.checkExtendedQuery!({prop2: {}}, 'extend query') ).toMatchSnapshot();
        //
        // expect(() => {
        //     type.checkExtendedQuery!({prop1: {}}, 'extend query');
        // } ).toThrowError(ValidationError);
    });
});