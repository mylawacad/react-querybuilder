import { RuleGroupType } from '../../types';
import { api } from '../api';
import formatQuery from '../formatQuery';

const stripQueryIds = (query: any) => JSON.parse(formatQuery(query, 'json_without_ids') as string);

describe('api', () => {
  describe('add', () => {
    it('adds rules', () => {
      expect(
        stripQueryIds(
          api.add({ combinator: 'and', rules: [] }, { field: 'f1', operator: '=', value: 'v1' }, [])
        )
      ).toEqual({
        combinator: 'and',
        rules: [{ field: 'f1', operator: '=', value: 'v1' }],
      });
    });

    it('adds groups', () => {
      expect(
        stripQueryIds(
          api.add({ combinator: 'and', rules: [] }, { combinator: 'and', rules: [] }, [])
        )
      ).toEqual({
        combinator: 'and',
        rules: [{ not: false, combinator: 'and', rules: [] }],
      });
    });
  });

  describe('remove', () => {
    const originalQuery: RuleGroupType = {
      combinator: 'and',
      rules: [
        { combinator: 'and', rules: [] },
        { field: 'f1', operator: '=', value: 'v1' },
      ],
    };

    it('removes groups', () => {
      expect(stripQueryIds(api.remove(originalQuery, [0]))).toEqual({
        combinator: 'and',
        rules: [{ field: 'f1', operator: '=', value: 'v1' }],
      });
    });

    it('does not remove the root group', () => {
      expect(api.remove(originalQuery, [])).toBe(originalQuery);
    });
  });

  it('clones', () => {
    // expect(api.clone({ combinator: 'and', rules: [] })).toEqual({});
  });

  it('moves', () => {
    // expect(api.move({ combinator: 'and', rules: [] })).toEqual({});
  });

  it('updates', () => {
    // expect(api.update({ combinator: 'and', rules: [] })).toEqual({});
  });

  it('updateIndependentCombinators', () => {
    // expect(api.updateIndependentCombinator({ combinator: 'and', rules: [] })).toEqual({});
  });
});
