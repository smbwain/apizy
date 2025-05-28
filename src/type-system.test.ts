import {extend, object, string} from './type-system';
import {ValidationError} from 'checkeasy';

describe('type-system', () => {
    it('should handle extend queries for objects', () => {
        const type = object({
            prop1: string(),
            prop2: extend(string()),
        });

        expect(type.desc).toMatchSnapshot();

        expect( type.checkExtendedQuery!({}, 'extend query') ).toMatchSnapshot();

        expect( type.checkExtendedQuery!({prop2: {}}, 'extend query') ).toMatchSnapshot();

        expect(() => {
            type.checkExtendedQuery!({prop1: {}}, 'extend query');
        } ).toThrowError(ValidationError);
    });
});