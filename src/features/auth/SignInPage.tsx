import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { routePaths } from "../../app/paths";
import { useSession } from "../../app/sessionContext";
import { AuthShell } from "./AuthShell";
import {
  validateSignIn,
  type FieldErrors,
  type SignInField,
  type SignInFormValues,
} from "./authValidation";

const initialValues: SignInFormValues = { email: "", password: "" };

export function SignInPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FieldErrors<SignInField>>({});
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const updateField = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as SignInField;
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServiceError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const validation = validateSignIn(values);
    setErrors(validation.errors);
    setServiceError(null);
    if (!validation.valid) {
      if (validation.errors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await session.signIn({
        email: validation.normalizedEmail,
        password: values.password,
      });
      navigate(routePaths.matches, { replace: true });
    } catch (cause) {
      setServiceError(
        cause instanceof Error ? cause.message : "Unable to sign in locally.",
      );
    } finally {
      setValues((current) => ({ ...current, password: "" }));
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell eyebrow="Returning operator" title="Resume your workspace">
      <p className="auth-shell__lead auth-shell__lead--compact">
        Sign in with an email already registered on this workstation.
      </p>
      <div className="auth-warning" role="note">
        <strong>Local simulation only</strong>
        <span>
          Enter a demo-only passphrase. It is discarded immediately and is not
          checked by a server.
        </span>
      </div>

      <form
        className="auth-form"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <div className="auth-field">
          <label htmlFor="sign-in-email">Email</label>
          <input
            ref={emailRef}
            id="sign-in-email"
            name="email"
            type="email"
            value={values.email}
            placeholder="operator@example.com"
            autoComplete="email"
            aria-describedby={errors.email ? "sign-in-email-error" : undefined}
            aria-invalid={Boolean(errors.email)}
            onChange={updateField}
          />
          {errors.email && (
            <span id="sign-in-email-error" className="auth-field__error">
              {errors.email}
            </span>
          )}
        </div>

        <div className="auth-field">
          <label htmlFor="sign-in-password">Demo passphrase</label>
          <input
            ref={passwordRef}
            id="sign-in-password"
            name="password"
            type="password"
            value={values.password}
            autoComplete="current-password"
            aria-describedby={
              errors.password ? "sign-in-password-error" : undefined
            }
            aria-invalid={Boolean(errors.password)}
            onChange={updateField}
          />
          {errors.password && (
            <span id="sign-in-password-error" className="auth-field__error">
              {errors.password}
            </span>
          )}
        </div>

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
          {isSubmitting ? "Starting local session…" : "Sign in locally"}
        </button>
      </form>

      <p className="auth-switch">
        No local profile yet? <Link to={routePaths.register}>Create one</Link>
      </p>
    </AuthShell>
  );
}
