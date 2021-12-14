import { defaultOperators } from '..';
import { defaultCombinators } from '../defaults';
import { QueryBuilderAPI, RuleGroupType, RuleGroupTypeIC } from '../types';
import { getParentPath } from './pathUtils';
import { addGroup, addRule, moveRuleOrGroup, removeRule, updateIC, updateProp } from './queryTools';

export const api: QueryBuilderAPI<RuleGroupTypeIC | RuleGroupType> = {
  add: (query, rOrG, parentPath) =>
    'rules' in rOrG ? addGroup(query, rOrG, parentPath) : addRule(query, rOrG, parentPath),
  remove: (query, path) => removeRule(query, path),
  clone: (query, path, options) =>
    moveRuleOrGroup(
      query,
      path,
      [...getParentPath(path), path[path.length - 1] + 1],
      true,
      options?.combinators ?? defaultCombinators,
      !!options?.independentCombinators
    ),
  move: (query, oldPath, newPath, options) =>
    moveRuleOrGroup(
      query,
      oldPath,
      newPath,
      false,
      options?.combinators ?? defaultCombinators,
      !!options?.independentCombinators
    ),
  update: (query, prop, value, path, options) =>
    updateProp(
      query,
      prop,
      value,
      path,
      !!options?.resetOnFieldChange,
      !!options?.resetOnOperatorChange,
      !options || !options.getDefaultOperator
        ? () => defaultOperators[0].name
        : typeof options.getDefaultOperator === 'string'
        ? () => options.getDefaultOperator as string
        : options.getDefaultOperator,
      options?.getDefaultValue ?? (() => '')
    ),
  updateIndependentCombinator: (query, value, path) => updateIC(query, value, path),
};
