import { describe, expect, it } from "vitest";

import { toBackendError } from "./errors";

describe("backend error boundary", () => {
  it("keeps private backend details out of the public error", async () => {
    const response = new Response(
      JSON.stringify({
        detail: {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "private database detail",
          },
        },
      }),
      { status: 401 },
    );
    const error = await toBackendError(response, "request-1");
    expect(error.message).toBe("The email or password is incorrect.");
    expect(error.message).not.toContain("private database detail");
    expect(error.code).toBe("INVALID_CREDENTIALS");
    expect(error.requestId).toBe("request-1");
  });

  it("does not expose an unknown backend error code", async () => {
    const response = new Response(
      JSON.stringify({
        detail: {
          error: {
            code: "PRIVATE_DATABASE_CONSTRAINT",
            message: "private database detail",
          },
        },
      }),
      { status: 409 },
    );

    const error = await toBackendError(response, "request-2");
    expect(error.code).toBeNull();
    expect(error.message).toBe("The Fly Eye request could not be completed.");
    expect(JSON.stringify(error)).not.toContain("PRIVATE_DATABASE_CONSTRAINT");
  });
});
