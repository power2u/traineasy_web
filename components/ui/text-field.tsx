import { TextField as AriaTextField, Label, Input, FieldError } from '@heroui/react';

interface TextFieldProps {
  label?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function TextField({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  error,
  required,
  disabled,
  className,
}: TextFieldProps) {
  return (
    <AriaTextField
      className={className}
      value={value}
      onChange={onChange}
      isRequired={required}
      isDisabled={disabled}
 
    >
      {label && <Label>{label}</Label>}
      <Input type={type} placeholder={placeholder} />
      {error && <FieldError>{error}</FieldError>}
    </AriaTextField>
  );
}
