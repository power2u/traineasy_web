'use client';

import { Select, Label, Description, ListBox } from '@heroui/react';

interface SelectOption {
  key: string;
  label: string;
  value: string;
}

interface SelectFieldProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  isDisabled?: boolean;
  isRequired?: boolean;
  className?: string;
  description?: string;
  errorMessage?: string;
}

export function SelectField({
  label,
  placeholder = "Select an option",
  options,
  value,
  onChange,
  isDisabled = false,
  isRequired = false,
  className,
  description,
  errorMessage,
}: SelectFieldProps) {
  return (
    <Select
      className={className}
      isDisabled={isDisabled}
      selectedKey={value || null}
      onSelectionChange={(key) => {
        onChange?.(key ? String(key) : '');
      }}
    >
      {label && (
        <Label>
          {label}
          {isRequired && <span className="text-danger ml-1">*</span>}
        </Label>
      )}
      
      <Select.Trigger>
        <Select.Value>
          {value ? options.find(opt => opt.value === value)?.label : placeholder}
        </Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      
      {(description || errorMessage) && (
        <Description>
          {errorMessage ? (
            <span className="text-danger">{errorMessage}</span>
          ) : (
            description
          )}
        </Description>
      )}
      
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item key={option.key} id={option.value}>
              <Label>{option.label}</Label>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

// Pre-defined option sets for common use cases
export const BLOOD_GROUP_OPTIONS: SelectOption[] = [
  { key: 'A+', label: 'A+', value: 'A+' },
  { key: 'A-', label: 'A-', value: 'A-' },
  { key: 'B+', label: 'B+', value: 'B+' },
  { key: 'B-', label: 'B-', value: 'B-' },
  { key: 'AB+', label: 'AB+', value: 'AB+' },
  { key: 'AB-', label: 'AB-', value: 'AB-' },
  { key: 'O+', label: 'O+', value: 'O+' },
  { key: 'O-', label: 'O-', value: 'O-' },
];

export const WEIGHT_UNIT_OPTIONS: SelectOption[] = [
  { key: 'kg', label: 'Kilograms (kg)', value: 'kg' },
  { key: 'lbs', label: 'Pounds (lbs)', value: 'lbs' },
];

export const THEME_OPTIONS: SelectOption[] = [
  { key: 'light', label: 'Light', value: 'light' },
  { key: 'dark', label: 'Dark', value: 'dark' },
  { key: 'system', label: 'System', value: 'system' },
];

export const RELATIONSHIP_OPTIONS: SelectOption[] = [
  { key: 'spouse', label: 'Spouse', value: 'spouse' },
  { key: 'parent', label: 'Parent', value: 'parent' },
  { key: 'sibling', label: 'Sibling', value: 'sibling' },
  { key: 'child', label: 'Child', value: 'child' },
  { key: 'friend', label: 'Friend', value: 'friend' },
  { key: 'other', label: 'Other', value: 'other' },
];