export interface RegistrationFormValues {
  displayName: string;
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

const minimumDemoPasswordLength = 8;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalizes an email for comparison and for the local prototype profile. */
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

function validateDemoPassword(password: string): string | undefined {
  if (!password.trim()) {
    return "Enter a demo-only passphrase. Do not use a real password.";
  }
  if (password.length < minimumDemoPasswordLength) {
    return `Use at least ${minimumDemoPasswordLength} characters for the demo passphrase.`;
  }
  return undefined;
}

export function validateRegistration(
  values: RegistrationFormValues,
): RegistrationValidation {
  const errors: FieldErrors<RegistrationField> = {};
  const displayName = values.displayName.trim();

  if (!displayName) errors.displayName = "Enter your display name.";
  else if (displayName.length > 80) {
    errors.displayName = "Display name must be 80 characters or fewer.";
  }

  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;

  const passwordError = validateDemoPassword(values.password);
  if (passwordError) errors.password = passwordError;

  if (!values.passwordConfirmation) {
    errors.passwordConfirmation = "Confirm your demo-only passphrase.";
  } else if (values.password !== values.passwordConfirmation) {
    errors.passwordConfirmation = "Passphrases do not match.";
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

  const passwordError = validateDemoPassword(values.password);
  if (passwordError) errors.password = passwordError;

  return {
    valid: Object.keys(errors).length === 0,
    normalizedEmail: normalizeEmail(values.email),
    errors,
  };
}
