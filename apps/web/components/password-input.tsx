"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface PasswordInputProps {
  autoComplete?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  className: string;
  id?: string;
  name?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  value?: string;
}

/**
 * One shared password field keeps the show/hide interaction consistent across
 * login, setup, and dashboard forms.
 */
export function PasswordInput({
  autoComplete,
  ariaDescribedBy,
  ariaInvalid,
  className,
  id,
  name,
  onChange,
  placeholder,
  required,
  disabled,
  maxLength,
  value,
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <input
        disabled={disabled}
        maxLength={maxLength}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        autoComplete={autoComplete}
        className={`${className} pr-12`}
        id={id}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        type={isVisible ? "text" : "password"}
        value={value}
      />

      <button
        disabled={disabled}
        aria-label={isVisible ? "Sakrij lozinku" : "Prikazi lozinku"}
        className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#7f8794] transition hover:bg-[#edf2f8] hover:text-[#2f3138]"
        onClick={() => setIsVisible((currentValue) => !currentValue)}
        title={isVisible ? "Sakrij lozinku" : "Prikaži lozinku"}
        type="button"
      >
        {isVisible ? <EyeOff aria-hidden="true" size={19} strokeWidth={1.8} /> : <Eye aria-hidden="true" size={19} strokeWidth={1.8} />}
      </button>
    </div>
  );
}
