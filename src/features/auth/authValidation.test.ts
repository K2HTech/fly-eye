import { describe, expect, it } from "vitest";

import {
  isValidEmail,
  normalizeEmail,
  validateRegistration,
  validateSignIn,
} from "./authValidation";

const validRegistration = {
  email: " KHOA@example.com ",
  password: "demo-only-passphrase",
  passwordConfirmation: "demo-only-passphrase",
};

describe("email validation", () => {
  it("normalizes surrounding whitespace and casing", () => {
    expect(normalizeEmail("  KHOA.Tran@Example.COM ")).toBe(
      "khoa.tran@example.com",
    );
  });

  it.each(["operator@example.com", "a+b@court.example.org"])(
    "accepts %s",
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    },
  );

  it.each(["", "operator", "operator@", "@example.com", "a @example.com"])(
    "rejects %s",
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );
});

describe("registration validation", () => {
  it("accepts valid values and returns the normalized email", () => {
    const result = validateRegistration(validRegistration);

    expect(result).toEqual({
      valid: true,
      normalizedEmail: "khoa@example.com",
      errors: {},
    });
  });

  it("returns useful field-level errors for missing values", () => {
    const result = validateRegistration({
      email: "bad-email",
      password: "short",
      passwordConfirmation: "different",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toMatchObject({
      email: "Enter a valid email address.",
      password: "Use at least 12 characters for the password.",
      passwordConfirmation: "Passwords do not match.",
    });
  });

  it("requires confirmation even when the password is valid", () => {
    const result = validateRegistration({
      ...validRegistration,
      passwordConfirmation: "",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.passwordConfirmation).toBe("Confirm your password.");
  });

  it("rejects a whitespace-only password", () => {
    const result = validateRegistration({
      ...validRegistration,
      password: "        ",
      passwordConfirmation: "        ",
    });

    expect(result.errors.password).toMatch(/enter your password/i);
  });

  it("rejects a password longer than the backend maximum", () => {
    const password = "x".repeat(129);
    const result = validateRegistration({
      ...validRegistration,
      password,
      passwordConfirmation: password,
    });

    expect(result.errors.password).toBe(
      "Use no more than 128 characters for the password.",
    );
  });
});

describe("sign-in validation", () => {
  it("accepts valid values and normalizes the email", () => {
    const result = validateSignIn({
      email: " OPERATOR@example.com ",
      password: "demo-passphrase",
    });

    expect(result).toEqual({
      valid: true,
      normalizedEmail: "operator@example.com",
      errors: {},
    });
  });

  it("validates email and password independently", () => {
    const result = validateSignIn({ email: "", password: "short" });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({
      email: "Enter your email address.",
      password: "Use at least 12 characters for the password.",
    });
  });

  it("does not expose or transform password values in its result", () => {
    const result = validateSignIn({
      email: "operator@example.com",
      password: "demo-passphrase",
    });

    expect(result).not.toHaveProperty("password");
    expect(JSON.stringify(result)).not.toContain("demo-passphrase");
  });
});
