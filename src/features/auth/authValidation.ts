export interface RegistrationFormValues {
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface SignInFormValues {
  email: string;
  password: string;
}

export type RegistrationField = keyof RegistrationFormValues;
export type SignInField = keyof SignInFormValues;

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export interface RegistrationValidation {
  valid: boolean;
  normalizedEmail: string;
  errors: FieldErrors<RegistrationField>;
}

export interface SignInValidation {
  valid: boolean;
  normalizedEmail: string;
  errors: FieldErrors<SignInField>;
}

export const minimumPasswordLength = 12;
export const maximumPasswordLength = 128;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalizes an email for consistent account lookup. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return emailPattern.test(normalizeEmail(email));
}

function validateEmail(email: string): string | undefined {
  if (!email.trim()) return "Enter your email address.";
  if (!isValidEmail(email)) return "Enter a valid email address.";
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password.trim()) {
    return "Enter your password.";
  }
  if (password.length < minimumPasswordLength) {
    return `Use at least ${minimumPasswordLength} characters for the password.`;
  }
  if (password.length > maximumPasswordLength) {
    return `Use no more than ${maximumPasswordLength} characters for the password.`;
  }
  return undefined;
}

export function validateRegistration(
  values: RegistrationFormValues,
): RegistrationValidation {
  const errors: FieldErrors<RegistrationField> = {};

  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(values.password);
  if (passwordError) errors.password = passwordError;

  if (!values.passwordConfirmation) {
    errors.passwordConfirmation = "Confirm your password.";
  } else if (values.password !== values.passwordConfirmation) {
    errors.passwordConfirmation = "Passwords do not match.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    normalizedEmail: normalizeEmail(values.email),
    errors,
  };
}

export function validateSignIn(values: SignInFormValues): SignInValidation {
  const errors: FieldErrors<SignInField> = {};
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(values.password);
  if (passwordError) errors.password = passwordError;

  return {
    valid: Object.keys(errors).length === 0,
    normalizedEmail: normalizeEmail(values.email),
    errors,
  };
}
