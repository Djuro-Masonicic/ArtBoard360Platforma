"use client";

import { useState } from "react";

interface PasswordInputProps {
  autoComplete?: string;
  className: string;
  name?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  value?: string;
}

/**
 * One shared password field keeps the show/hide interaction consistent across
 * login, setup, and dashboard forms.
 */
export function PasswordInput({
  autoComplete,
  className,
  name,
  onChange,
  placeholder,
  value,
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <input
        autoComplete={autoComplete}
        className={`${className} pr-12`}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        type={isVisible ? "text" : "password"}
        value={value}
      />

      <button
        aria-label={isVisible ? "Sakrij lozinku" : "Prikazi lozinku"}
        className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#7f8794] transition hover:bg-[#edf2f8] hover:text-[#2f3138]"
        onClick={() => setIsVisible((currentValue) => !currentValue)}
        type="button"
      >
        {isVisible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M2.25 12C3.9 8.25 7.5 5.75 12 5.75C16.5 5.75 20.1 8.25 21.75 12C20.1 15.75 16.5 18.25 12 18.25C7.5 18.25 3.9 15.75 2.25 12Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 3L21 21"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M10.55 6.05C11.02 5.85 11.5 5.75 12 5.75C16.5 5.75 20.1 8.25 21.75 12C21.08 13.52 20.08 14.84 18.83 15.89M14.82 14.83C14.08 15.57 13.08 16 12 16C9.79 16 8 14.21 8 12C8 10.92 8.43 9.92 9.17 9.18M6.13 7.11C4.59 8.21 3.3 9.78 2.25 12C3.9 15.75 7.5 18.25 12 18.25C13.95 18.25 15.73 17.78 17.25 16.96"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
