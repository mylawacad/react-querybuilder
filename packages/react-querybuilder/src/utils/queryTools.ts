import produce from 'immer';
import { NameLabelPair, RuleGroupType, RuleGroupTypeIC, RuleType } from '../types';
import findPath from './findPath';
import { getCommonAncestorPath, getParentPath, pathsAreEqual } from './pathUtils';
import { prepareRule, prepareRuleGroup } from './prepareQueryObjects';
import { regenerateID, regenerateIDs } from './regenerateIDs';

export const addRule = <RG extends RuleGroupType | RuleGroupTypeIC = RuleGroupType>(
  query: RG,
  rule: RuleType,
  parentPath: number[]
) => {
  const newQuery = produce(query, draft => {
    const parent = findPath(parentPath, draft) as RG;
    if ('combinator' in parent) {
      parent.rules.push(prepareRule(rule));
    } else {
      if (parent.rules.length > 0) {
        const prevCombinator = parent.rules[parent.rules.length - 2];
        parent.rules.push((typeof prevCombinator === 'string' ? prevCombinator : 'and') as any);
      }
      parent.rules.push(prepareRule(rule));
    }
  });
  return newQuery;
};

export const addGroup = <RG extends RuleGroupType | RuleGroupTypeIC = RuleGroupType>(
  query: RG,
  group: RG,
  parentPath: number[]
) => {
  const newQuery = produce(query, draft => {
    const parent = findPath(parentPath, draft) as RG;
    /* istanbul ignore else */
    if ('combinator' in parent) {
      parent.rules.push(prepareRuleGroup(group) as any);
    } else if (!('combinator' in parent)) {
      if (parent.rules.length > 0) {
        const prevCombinator = parent.rules[parent.rules.length - 2];
        parent.rules.push((typeof prevCombinator === 'string' ? prevCombinator : 'and') as any);
      }
      parent.rules.push(prepareRuleGroup(group) as any);
    }
  });
  return newQuery;
};

export const updateProp = <RG extends RuleGroupType | RuleGroupTypeIC = RuleGroupType>(
  query: RG,
  prop: Exclude<keyof RuleType | keyof RuleGroupType, 'id' | 'path'>,
  value: any,
  path: number[],
  resetOnFieldChange: boolean,
  resetOnOperatorChange: boolean,
  getRuleDefaultOperator: (field: string) => string,
  getRuleDefaultValue: (rule: RuleType) => any
) => {
  const newQuery = produce(query, draft => {
    const ruleOrGroup = findPath(path, draft);
    /* istanbul ignore if */
    if (!ruleOrGroup) return;
    (ruleOrGroup as any)[prop] = value;
    if (!('rules' in ruleOrGroup)) {
      // Reset operator and set default value for field change
      if (resetOnFieldChange && prop === 'field') {
        ruleOrGroup.operator = getRuleDefaultOperator(value);
        ruleOrGroup.value = getRuleDefaultValue({ ...ruleOrGroup, field: value });
      }
      // Set default value for operator change
      if (resetOnOperatorChange && prop === 'operator') {
        ruleOrGroup.value = getRuleDefaultValue({ ...ruleOrGroup, operator: value });
      }
    }
  });
  return newQuery;
};

export const updateIC = (query: RuleGroupTypeIC, value: string, path: number[]) => {
  // No-op if path does not point to a valid combinator
  if (typeof findPath(path, query) !== 'string') {
    return query;
  }
  const parentPath = getParentPath(path);
  const index = path[path.length - 1];
  const newQuery = produce(query, draft => {
    const parentRules = (findPath(parentPath, draft) as RuleGroupTypeIC).rules;
    parentRules[index] = value;
  });
  return newQuery;
};

export const removeRule = <RG extends RuleGroupType | RuleGroupTypeIC = RuleGroupType>(
  query: RG,
  path: number[]
) => {
  // No-op if trying to remove the root group
  if (path.length < 1) {
    return query;
  }
  const parentPath = getParentPath(path);
  const index = path[path.length - 1];
  const newQuery = produce(query, draft => {
    const parent = findPath(parentPath, draft) as RG;
    if (!('combinator' in parent) && parent.rules.length > 1) {
      const idxStartDelete = index === 0 ? 0 : index - 1;
      parent.rules.splice(idxStartDelete, 2);
    } else {
      parent.rules.splice(index, 1);
    }
  });
  return newQuery;
};

export const moveRuleOrGroup = <RG extends RuleGroupType | RuleGroupTypeIC = RuleGroupType>(
  query: RG,
  oldPath: number[],
  newPath: number[],
  clone: boolean,
  combinators: NameLabelPair[],
  independentCombinators: boolean
) => {
  // No-op if the old and new paths are the same or either are empty.
  // Ignore in test coverage since components that call this method
  // already prevent this case via their respective canDrop tests.
  /* istanbul ignore if */
  if (oldPath.length < 1 || newPath.length < 1 || pathsAreEqual(oldPath, newPath)) {
    return query;
  }

  const parentOldPath = getParentPath(oldPath);
  const ruleOrGroupOriginal = findPath(oldPath, query);
  /* istanbul ignore if */
  if (!ruleOrGroupOriginal) {
    return query;
  }
  const ruleOrGroup = clone
    ? 'rules' in ruleOrGroupOriginal
      ? regenerateIDs(ruleOrGroupOriginal)
      : regenerateID(ruleOrGroupOriginal)
    : ruleOrGroupOriginal;

  const commonAncestorPath = getCommonAncestorPath(oldPath, newPath);
  const movingOnUp = newPath[commonAncestorPath.length] <= oldPath[commonAncestorPath.length];

  const newQuery = produce(query, draft => {
    const parentOfRuleToRemove = findPath(parentOldPath, draft) as RG;
    const ruleToRemoveIndex = oldPath[oldPath.length - 1];
    const oldPrevCombinator =
      independentCombinators && ruleToRemoveIndex > 0
        ? (parentOfRuleToRemove.rules[ruleToRemoveIndex - 1] as string)
        : null;
    const oldNextCombinator =
      independentCombinators && ruleToRemoveIndex < parentOfRuleToRemove.rules.length - 1
        ? (parentOfRuleToRemove.rules[ruleToRemoveIndex + 1] as string)
        : null;
    /* istanbul ignore else */
    if (!clone) {
      const idxStartDelete = independentCombinators
        ? Math.max(0, ruleToRemoveIndex - 1)
        : ruleToRemoveIndex;
      const deleteLength = independentCombinators ? 2 : 1;
      // Remove the source item
      parentOfRuleToRemove.rules.splice(idxStartDelete, deleteLength);
    }

    const newNewPath = [...newPath];
    /* istanbul ignore else */
    if (!movingOnUp && !clone) {
      newNewPath[commonAncestorPath.length] -= independentCombinators ? 2 : 1;
    }
    const newNewParentPath = getParentPath(newNewPath);
    const parentToInsertInto = findPath(newNewParentPath, draft) as RG;
    const newIndex = newNewPath[newNewPath.length - 1];

    // Insert the source item at the target path
    if (parentToInsertInto.rules.length === 0 || !independentCombinators) {
      parentToInsertInto.rules.splice(newIndex, 0, ruleOrGroup);
    } else {
      if (newIndex === 0) {
        if (ruleToRemoveIndex === 0 && oldNextCombinator) {
          parentToInsertInto.rules.splice(newIndex, 0, ruleOrGroup, oldNextCombinator);
        } else {
          const newNextCombinator =
            parentToInsertInto.rules[1] ||
            oldPrevCombinator ||
            /* istanbul ignore next */ combinators[0].name;
          parentToInsertInto.rules.splice(newIndex, 0, ruleOrGroup, newNextCombinator);
        }
      } else {
        if (oldPrevCombinator) {
          parentToInsertInto.rules.splice(newIndex, 0, oldPrevCombinator, ruleOrGroup);
        } else {
          const newPrevCombinator =
            parentToInsertInto.rules[newIndex - 2] || oldNextCombinator || combinators[0].name;
          parentToInsertInto.rules.splice(newIndex, 0, newPrevCombinator, ruleOrGroup);
        }
      }
    }
  });
  return newQuery;
};
