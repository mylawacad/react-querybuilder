import { QueryBuilderProps } from './props';
import { RuleGroupType, RuleGroupTypeIC, RuleType } from './ruleGroups';

export interface QueryBuilderAPI<RG extends RuleGroupType | RuleGroupTypeIC> {
  add: (query: RG, ruleOrGroup: RuleType | RG, parentPath: number[]) => RG;
  remove: (query: RG, path: number[]) => RG;
  clone: (
    query: RG,
    path: number[],
    options?: Pick<QueryBuilderProps, 'combinators' | 'independentCombinators'>
  ) => RG;
  move: (
    query: RG,
    path: number[],
    newPath: number[],
    options?: Pick<QueryBuilderProps, 'combinators' | 'independentCombinators'>
  ) => RG;
  update: (
    query: RG,
    prop: Exclude<keyof RuleType | keyof RuleGroupType, 'id' | 'path'>,
    value: any,
    path: number[],
    options?: Pick<
      QueryBuilderProps,
      'resetOnFieldChange' | 'resetOnOperatorChange' | 'getDefaultOperator' | 'getDefaultValue'
    >
  ) => RG;
  updateIndependentCombinator: (
    query: RuleGroupTypeIC,
    value: string,
    path: number[]
  ) => RuleGroupTypeIC;
}
