import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { routePaths } from "../../app/paths";
import { useSession } from "../../app/sessionContext";
import { AuthShell } from "./AuthShell";
import {
  validateRegistration,
  type FieldErrors,
  type RegistrationField,
  type RegistrationFormValues,
} from "./authValidation";

const initialValues: RegistrationFormValues = {
  displayName: "",
  email: "",
  password: "",
  passwordConfirmation: "",
};

const fieldOrder: readonly RegistrationField[] = [
  "displayName",
  "email",
  "password",
  "passwordConfirmation",
];

export function RegisterPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FieldErrors<RegistrationField>>({});
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fields = useRef<
    Partial<Record<RegistrationField, HTMLInputElement | null>>
  >({});

  const updateField = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as RegistrationField;
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServiceError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const validation = validateRegistration(values);
    setErrors(validation.errors);
    setServiceError(null);
    if (!validation.valid) {
      const firstInvalid = fieldOrder.find((field) => validation.errors[field]);
      if (firstInvalid) fields.current[firstInvalid]?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await session.register({
        displayName: values.displayName.trim(),
        email: validation.normalizedEmail,
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
      });
      navigate(routePaths.matches, { replace: true });
    } catch (cause) {
      setServiceError(
        cause instanceof Error
          ? cause.message
          : "Unable to create the local prototype profile.",
      );
    } finally {
      setValues((current) => ({
        ...current,
        password: "",
        passwordConfirmation: "",
      }));
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell eyebrow="New operator" title="Create your local profile">
      <p className="auth-shell__lead auth-shell__lead--compact">
        Set up the operator identity used on this workstation.
      </p>
      <div className="auth-warning" role="note">
        <strong>Prototype authentication</strong>
        <span>
          Do not use a real password. Demo passphrases are discarded and never
          stored or verified remotely.
        </span>
      </div>

      <form
        className="auth-form"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <AuthInput
          autoComplete="name"
          error={errors.displayName}
          inputRef={(element) => {
            fields.current.displayName = element;
          }}
          label="Display name"
          name="displayName"
          onChange={updateField}
          placeholder="Khoa Tran"
          value={values.displayName}
        />
        <AuthInput
          autoComplete="email"
          error={errors.email}
          inputRef={(element) => {
            fields.current.email = element;
          }}
          label="Email"
          name="email"
          onChange={updateField}
          placeholder="operator@example.com"
          type="email"
          value={values.email}
        />
        <AuthInput
          autoComplete="new-password"
          error={errors.password}
          inputRef={(element) => {
            fields.current.password = element;
          }}
          label="Demo passphrase"
          name="password"
          onChange={updateField}
          type="password"
          value={values.password}
        />
        <AuthInput
          autoComplete="new-password"
          error={errors.passwordConfirmation}
          inputRef={(element) => {
            fields.current.passwordConfirmation = element;
          }}
          label="Confirm demo passphrase"
          name="passwordConfirmation"
          onChange={updateField}
          type="password"
          value={values.passwordConfirmation}
        />

        {serviceError && (
          <p className="auth-message auth-message--error" role="alert">
            {serviceError}
          </p>
        )}

        <button
          className="auth-button auth-button--primary auth-button--submit"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating local profile…" : "Create profile"}
        </button>
      </form>

      <p className="auth-switch">
        Already created a local profile?{" "}
        <Link to={routePaths.signIn}>Sign in</Link>
      </p>
    </AuthShell>
  );
}

interface AuthInputProps {
  autoComplete: string;
  error?: string;
  inputRef: (element: HTMLInputElement | null) => void;
  label: string;
  name: RegistrationField;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: "email" | "password" | "text";
  value: string;
}

function AuthInput({
  autoComplete,
  error,
  inputRef,
  label,
  name,
  onChange,
  placeholder,
  type = "text",
  value,
}: AuthInputProps) {
  const errorId = `${name}-error`;
  return (
    <div className="auth-field">
      <label htmlFor={name}>{label}</label>
      <input
        ref={inputRef}
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        onChange={onChange}
      />
      {error && (
        <span id={errorId} className="auth-field__error">
          {error}
        </span>
      )}
    </div>
  );
}
