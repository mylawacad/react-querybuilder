import { enableES5 } from 'immer';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  defaultCombinators,
  defaultControlClassnames,
  defaultControlElements,
  defaultFields,
  defaultOperators,
  defaultTranslations,
  standardClassnames,
} from './defaults';
import type {
  Field,
  QueryBuilderProps,
  QueryBuilderPropsInternal,
  RuleGroupType,
  RuleGroupTypeIC,
  RuleType,
  Schema,
} from './types';
import {
  addGroup,
  addRule,
  c,
  generateID,
  isRuleGroup,
  moveRuleOrGroup,
  prepareRuleGroup,
  removeRule,
  uniqByName,
  updateIC,
  updateProp,
} from './utils';

enableES5();

const QueryBuilderImpl = <RG extends RuleGroupType | RuleGroupTypeIC = RuleGroupType>({
  defaultQuery,
  query,
  fields: fieldsProp = defaultFields,
  operators = defaultOperators,
  combinators = defaultCombinators,
  translations = defaultTranslations,
  enableMountQueryChange = true,
  controlElements,
  getDefaultField,
  getDefaultOperator,
  getDefaultValue,
  getOperators,
  getValueEditorType,
  getInputType,
  getValues,
  onAddRule = r => r,
  onAddGroup = rg => rg,
  onQueryChange = () => {},
  controlClassnames,
  showCombinatorsBetweenRules = false,
  showNotToggle = false,
  showCloneButtons = false,
  resetOnFieldChange = true,
  resetOnOperatorChange = false,
  autoSelectField = true,
  addRuleToNewGroups = false,
  enableDragAndDrop = false,
  independentCombinators,
  disabled,
  validator,
  context,
}: QueryBuilderPropsInternal<RG>) => {
  const fields = useMemo(() => {
    let f = fieldsProp;
    if (!autoSelectField) {
      f = defaultFields.concat(fieldsProp);
    }
    return uniqByName(f);
  }, [autoSelectField, fieldsProp]);

  const fieldMap = useMemo(() => {
    const fm: { [k: string]: Field } = {};
    fields.forEach(f => (fm[f.name] = f));
    return fm;
  }, [fields]);

  const getOperatorsMain = (field: string) => {
    const fieldData = fieldMap[field];
    if (fieldData?.operators) {
      return fieldData.operators;
    }
    if (getOperators) {
      const ops = getOperators(field);
      if (ops) return ops;
    }

    return operators;
  };

  const getRuleDefaultOperator = (field: string) => {
    const fieldData = fieldMap[field];
    if (fieldData?.defaultOperator) {
      return fieldData.defaultOperator;
    }

    if (getDefaultOperator) {
      if (typeof getDefaultOperator === 'function') {
        return getDefaultOperator(field);
      } else {
        return getDefaultOperator;
      }
    }

    const operators = getOperatorsMain(field) ?? /* istanbul ignore next */ [];
    return operators.length ? operators[0].name : /* istanbul ignore next */ '';
  };

  const getRuleDefaultValue = (rule: RuleType) => {
    const fieldData = fieldMap[rule.field];
    /* istanbul ignore next */
    if (fieldData?.defaultValue !== undefined && fieldData.defaultValue !== null) {
      return fieldData.defaultValue;
    } else if (getDefaultValue) {
      return getDefaultValue(rule);
    }

    let value: any = '';

    const values = getValuesMain(rule.field, rule.operator);

    if (values.length) {
      value = values[0].name;
    } else {
      const editorType = getValueEditorTypeMain(rule.field, rule.operator);

      if (editorType === 'checkbox') {
        value = false;
      }
    }

    return value;
  };

  const getValueEditorTypeMain = (field: string, operator: string) => {
    if (getValueEditorType) {
      const vet = getValueEditorType(field, operator);
      if (vet) return vet;
    }

    return 'text';
  };

  const getInputTypeMain = (field: string, operator: string) => {
    if (getInputType) {
      const inputType = getInputType(field, operator);
      if (inputType) return inputType;
    }

    return 'text';
  };

  const getValuesMain = (field: string, operator: string) => {
    const fieldData = fieldMap[field];
    /* istanbul ignore if */
    if (fieldData?.values) {
      return fieldData.values;
    }
    if (getValues) {
      const vals = getValues(field, operator);
      if (vals) return vals;
    }

    return [];
  };

  const createRule = (): RuleType => {
    let field = '';
    /* istanbul ignore else */
    if (fields?.length > 0 && fields[0]) {
      field = fields[0].name;
    }
    if (getDefaultField) {
      if (typeof getDefaultField === 'function') {
        field = getDefaultField(fields);
      } else {
        field = getDefaultField;
      }
    }

    const operator = getRuleDefaultOperator(field);

    const newRule: RuleType = {
      id: `r-${generateID()}`,
      field,
      value: '',
      operator,
    };

    const value = getRuleDefaultValue(newRule);

    return { ...newRule, value };
  };

  const createRuleGroup = (): RG => {
    if (independentCombinators) {
      return {
        id: `g-${generateID()}`,
        rules: addRuleToNewGroups ? [createRule()] : [],
        not: false,
      } as any;
    }
    return {
      id: `g-${generateID()}`,
      rules: addRuleToNewGroups ? [createRule()] : [],
      combinator: combinators[0].name,
      not: false,
    } as any;
  };

  const onRuleAdd = (rule: RuleType, parentPath: number[]) => {
    /* istanbul ignore next */
    if (disabled) return;
    const newRule = onAddRule(rule, parentPath, root);
    if (!newRule) return;
    const newQuery = addRule(root, newRule, parentPath);
    dispatchQueryChange(newQuery);
  };

  const onGroupAdd = (group: RG, parentPath: number[]) => {
    /* istanbul ignore next */
    if (disabled) return;
    const newGroup = onAddGroup(group, parentPath, root);
    if (!newGroup) return;
    const newQuery = addGroup(root, newGroup, parentPath);
    dispatchQueryChange(newQuery);
  };

  const onPropChange = (
    prop: Exclude<keyof RuleType | keyof RuleGroupType, 'id' | 'path'>,
    value: any,
    path: number[]
  ) => {
    /* istanbul ignore next */
    if (disabled) return;
    const newQuery = updateProp(
      root,
      prop,
      value,
      path,
      resetOnFieldChange,
      resetOnOperatorChange,
      getRuleDefaultOperator,
      getRuleDefaultValue
    );
    dispatchQueryChange(newQuery);
  };

  const updateIndependentCombinator = (value: string, path: number[]) => {
    /* istanbul ignore next */
    if (disabled) return;
    const newQuery = updateIC(root as RuleGroupTypeIC, value, path);
    dispatchQueryChange(newQuery as RG);
  };

  const onRuleOrGroupRemove = (path: number[]) => {
    const newQuery = removeRule(root, path);
    dispatchQueryChange(newQuery);
  };

  const moveRule = (oldPath: number[], newPath: number[], clone?: boolean) => {
    /* istanbul ignore if */
    if (disabled) {
      return;
    }
    const newQuery = moveRuleOrGroup(
      root,
      oldPath,
      newPath,
      !!clone,
      combinators,
      independentCombinators
    );
    dispatchQueryChange(newQuery);
  };

  const dispatchQueryChange = (newQuery: RG) => {
    // State variable only used when component is uncontrolled
    if (!query) {
      setQueryState(newQuery);
    }
    onQueryChange(newQuery);
  };

  const isFirstRender = useRef(true);
  const [queryState, setQueryState] = useState(defaultQuery ?? createRuleGroup());
  // We assume here that if a query is passed in, and it's not the first render,
  // that the query has already been prepared, i.e. the user is just passing back
  // the onQueryChange callback parameter as query. This appears to have a huge
  // performance impact.
  const root: RG = query
    ? isFirstRender.current
      ? (prepareRuleGroup(query) as any)
      : query
    : queryState;
  isFirstRender.current = false;

  /* istanbul ignore next */
  useEffect(() => {
    // Notify a query change on mount
    if (enableMountQueryChange) {
      onQueryChange(root);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validationResult = useMemo(
    () => (typeof validator === 'function' ? validator(root) : {}),
    [root, validator]
  );
  const validationMap = typeof validationResult === 'object' ? validationResult : {};

  const schema: Schema = {
    fields,
    fieldMap,
    combinators,
    classNames: { ...defaultControlClassnames, ...controlClassnames },
    createRule,
    createRuleGroup,
    onRuleAdd,
    onGroupAdd,
    onRuleRemove: onRuleOrGroupRemove,
    onGroupRemove: onRuleOrGroupRemove,
    onPropChange,
    isRuleGroup,
    controls: { ...defaultControlElements, ...controlElements },
    getOperators: getOperatorsMain,
    getValueEditorType: getValueEditorTypeMain,
    getInputType: getInputTypeMain,
    getValues: getValuesMain,
    updateIndependentCombinator,
    moveRule,
    showCombinatorsBetweenRules,
    showNotToggle,
    showCloneButtons,
    autoSelectField,
    addRuleToNewGroups,
    enableDragAndDrop,
    independentCombinators: !!independentCombinators,
    validationMap,
  };

  const className = useMemo(
    () =>
      c(
        standardClassnames.queryBuilder,
        schema.classNames.queryBuilder,
        typeof validationResult === 'boolean'
          ? validationResult
            ? standardClassnames.valid
            : standardClassnames.invalid
          : ''
      ),
    [schema.classNames.queryBuilder, validationResult]
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className={className}
        data-dnd={enableDragAndDrop ? 'enabled' : 'disabled'}
        data-inlinecombinators={
          independentCombinators || showCombinatorsBetweenRules ? 'enabled' : 'disabled'
        }>
        <schema.controls.ruleGroup
          translations={{ ...defaultTranslations, ...translations }}
          rules={root.rules}
          combinator={'combinator' in root ? root.combinator : undefined}
          schema={schema}
          id={root.id}
          path={[]}
          not={!!root.not}
          disabled={disabled}
          context={context}
        />
      </div>
    </DndProvider>
  );
};

export const QueryBuilder = <RG extends RuleGroupType | RuleGroupTypeIC = RuleGroupType>(
  props: QueryBuilderProps<RG>
) => {
  if (!props.independentCombinators) {
    return QueryBuilderImpl({
      ...props,
      independentCombinators: false,
    } as QueryBuilderPropsInternal);
  }
  return QueryBuilderImpl<RuleGroupTypeIC>({
    ...props,
    independentCombinators: true,
  } as QueryBuilderPropsInternal<RuleGroupTypeIC>);
};

QueryBuilder.displayName = 'QueryBuilder';
