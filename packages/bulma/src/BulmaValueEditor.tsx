import { useEffect } from 'react';
import type { ValueEditorProps } from 'react-querybuilder';

const BulmaValueEditor = ({
  fieldData,
  operator,
  value,
  handleOnChange,
  title,
  className,
  type,
  inputType,
  values,
  disabled,
}: ValueEditorProps) => {
  useEffect(() => {
    if (
      inputType === 'number' &&
      !['between', 'notBetween', 'in', 'notIn'].includes(operator) &&
      typeof value === 'string' &&
      value.includes(',')
    ) {
      handleOnChange('');
    }
  }, [inputType, operator, value, handleOnChange]);

  if (operator === 'null' || operator === 'notNull') {
    return null;
  }

  const placeHolderText = fieldData?.placeholder ?? '';
  const inputTypeCoerced = ['between', 'notBetween', 'in', 'notIn'].includes(operator)
    ? 'text'
    : inputType || 'text';

  switch (type) {
    case 'select':
      return (
        <div className={`${className} select is-small`}>
          <select value={value} disabled={disabled} onChange={e => handleOnChange(e.target.value)}>
            {values &&
              values.map(v => (
                <option key={v.name} value={v.name}>
                  {v.label}
                </option>
              ))}
          </select>
        </div>
      );

    case 'checkbox':
      return (
        <label className={`${className} checkbox`}>
          <input
            type="checkbox"
            checked={!!value}
            disabled={disabled}
            onChange={e => handleOnChange(e.target.checked)}
          />
        </label>
      );

    case 'radio':
      return (
        <div className={`${className} control`} title={title}>
          {values!.map(v => (
            <label key={v.name} className="radio" title={title}>
              <input
                type="radio"
                value={v.name}
                checked={value === v.name}
                onChange={() => handleOnChange(v.name)}
                disabled={disabled}
              />
              {v.label}
            </label>
          ))}
        </div>
      );

    default:
      return (
        <div className={`${className} control`}>
          <input
            type={inputTypeCoerced}
            value={value}
            title={title}
            disabled={disabled}
            className="input is-small"
            placeholder={placeHolderText}
            onChange={e => handleOnChange(e.target.value)}
          />
        </div>
      );
  }
};

BulmaValueEditor.displayName = 'BulmaValueEditor';

export default BulmaValueEditor;
