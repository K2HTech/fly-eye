export interface BackendErrorInfo {
  readonly status: number;
  readonly code: string | null;
  readonly requestId: string | null;
}

export class BackendRequestError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly requestId: string | null;

  constructor(message: string, info: BackendErrorInfo) {
    super(message);
    this.name = "BackendRequestError";
    this.status = info.status;
    this.code = info.code;
    this.requestId = info.requestId;
  }
}

const publicErrorCodes = new Set([
  "EMAIL_ALREADY_REGISTERED",
  "INVALID_CREDENTIALS",
  "INVALID_REFRESH_TOKEN",
  "UNAUTHORIZED",
  "CALIBRATION_DEGENERATE",
  "CALIBRATION_FRAME_INCOMPLETE",
  "CALIBRATION_FRAME_INVALID",
  "CALIBRATION_MISSING",
  "ENGINE_ERROR",
]);

export function publicBackendMessage(status: number, code?: unknown): string {
  if (code === "INVALID_CREDENTIALS")
    return "The email or password is incorrect.";
  if (code === "INVALID_REFRESH_TOKEN")
    return "Your session has expired. Please sign in again.";
  if (code === "CALIBRATION_FRAME_INCOMPLETE")
    return "One or more calibration images did not finish uploading.";
  if (code === "CALIBRATION_FRAME_INVALID")
    return "The captured calibration images are not valid for this camera.";
  if (code === "CALIBRATION_DEGENERATE")
    return "The marked court geometry could not be calibrated.";
  if (code === "ENGINE_ERROR")
    return "Calibration could not be completed. Please try again.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You are not allowed to perform this action.";
  if (status === 404) return "The requested Fly Eye resource was not found.";
  if (status === 409 && code === "EMAIL_ALREADY_REGISTERED")
    return "An account already exists with that email.";
  if (status === 422) return "The submitted data is invalid.";
  if (status >= 500) return "The Fly Eye service is temporarily unavailable.";
  return "The Fly Eye request could not be completed.";
}

export async function toBackendError(
  response: Response,
  requestId: string | null,
): Promise<BackendRequestError> {
  let code: string | null = null;
  try {
    const body: unknown = await response.clone().json();
    if (typeof body === "object" && body !== null && "detail" in body) {
      const detail = body.detail;
      if (typeof detail === "object" && detail !== null && "error" in detail) {
        const error = detail.error;
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          typeof error.code === "string"
        )
          code = publicErrorCodes.has(error.code) ? error.code : null;
      }
    }
  } catch {
    /* A public generic message is sufficient for malformed responses. */
  }
  return new BackendRequestError(publicBackendMessage(response.status, code), {
    status: response.status,
    code,
    requestId,
  });
}

export function networkBackendError(
  requestId: string | null,
): BackendRequestError {
  return new BackendRequestError("Unable to reach the Fly Eye service.", {
    status: 0,
    code: "NETWORK_ERROR",
    requestId,
  });
}
