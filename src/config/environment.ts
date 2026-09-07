/** Public, runtime-validated Vite configuration. */

export interface BackendEnvironment {
  apiBaseUrl: string;
  signalingUrl: string;
  cameraSimulatorEnabled: boolean;
  insecurePublicSignalingAllowed: boolean;
}

export interface UnavailableEnvironment {
  status: "unavailable";
  issues: readonly string[];
}

export interface AvailableEnvironment extends BackendEnvironment {
  status: "available";
}

export type RuntimeEnvironment = AvailableEnvironment | UnavailableEnvironment;

export class EnvironmentConfigurationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Fly Eye configuration is unavailable: ${issues.join(" ")}`);
    this.name = "EnvironmentConfigurationError";
    this.issues = issues;
  }
}

function isPrivateDevelopmentHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "::1") return true;
  const octets = hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return false;
  }
  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
  );
}

function normalizeApiBase(value: string, mode: string): string {
  if (value.startsWith("/")) {
    if (value.startsWith("//")) {
      throw new Error("API path must be a same-origin path.");
    }
    const path = value.replace(/\/+$/, "");
    if (path.includes("?") || path.includes("#")) {
      throw new Error("API path must not contain query data.");
    }
    if (path === "/api" || path === "/api/") return "/api/v1";
    return path === "/api/v1" || path.endsWith("/api/v1")
      ? path
      : `${path || ""}/api/v1`;
  }
  const url = new URL(value);
  const secure = url.protocol === "https:";
  const developmentPrivate =
    mode !== "production" &&
    url.protocol === "http:" &&
    isPrivateDevelopmentHost(url.hostname);
  if (!secure && !developmentPrivate) {
    throw new Error(
      "API URL must use https (private-network http is development-only).",
    );
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("API URL must not contain credentials or query data.");
  }
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname =
    path === "/api/v1" || path.endsWith("/api/v1")
      ? path
      : `${path || ""}/api/v1`;
  return url.toString().replace(/\/$/, "");
}

function normalizeSignalingUrl(
  value: string,
  mode: string,
  insecurePublicSignalingAllowed: boolean,
): string {
  const url = new URL(value);
  const secure = url.protocol === "wss:";
  const developmentPrivate =
    mode !== "production" &&
    url.protocol === "ws:" &&
    isPrivateDevelopmentHost(url.hostname);
  const developmentPublicException =
    mode !== "production" &&
    url.protocol === "ws:" &&
    insecurePublicSignalingAllowed;
  if (!secure && !developmentPrivate && !developmentPublicException) {
    throw new Error(
      "Signaling URL must use wss (private-network ws is development-only).",
    );
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      "Signaling URL must not contain credentials or query data.",
    );
  }
  if (!url.pathname.replace(/\/+$/, "").endsWith("/api/v1/signal")) {
    throw new Error("Signaling URL must end with /api/v1/signal.");
  }
  return url.toString().replace(/\/$/, "");
}

function parseBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
}

export function parseEnvironment(
  raw: Record<string, unknown>,
  mode = "development",
): RuntimeEnvironment {
  const issues: string[] = [];
  let apiBaseUrl = "";
  let signalingUrl = "";
  const insecurePublicSignalingValue = parseBoolean(
    raw.VITE_ALLOW_INSECURE_PUBLIC_SIGNALING,
  );
  if (insecurePublicSignalingValue === null) {
    issues.push("VITE_ALLOW_INSECURE_PUBLIC_SIGNALING must be true or false.");
  }
  const insecurePublicSignalingAllowed = insecurePublicSignalingValue === true;
  if (mode === "production" && insecurePublicSignalingAllowed) {
    issues.push(
      "VITE_ALLOW_INSECURE_PUBLIC_SIGNALING cannot be enabled in production.",
    );
  }

  const apiValue =
    typeof raw.VITE_API_BASE_URL === "string"
      ? raw.VITE_API_BASE_URL.trim()
      : "";
  if (!apiValue) issues.push("VITE_API_BASE_URL is missing.");
  else {
    try {
      apiBaseUrl = normalizeApiBase(apiValue, mode);
    } catch (error) {
      issues.push(
        error instanceof Error
          ? error.message
          : "VITE_API_BASE_URL is invalid.",
      );
    }
  }

  const signalingValue =
    typeof raw.VITE_SIGNALING_URL === "string"
      ? raw.VITE_SIGNALING_URL.trim()
      : "";
  if (!signalingValue) issues.push("VITE_SIGNALING_URL is missing.");
  else {
    try {
      signalingUrl = normalizeSignalingUrl(
        signalingValue,
        mode,
        insecurePublicSignalingAllowed,
      );
    } catch (error) {
      issues.push(
        error instanceof Error
          ? error.message
          : "VITE_SIGNALING_URL is invalid.",
      );
    }
  }

  const cameraSimulatorValue = parseBoolean(raw.VITE_CAMERA_SIMULATOR_ENABLED);
  if (cameraSimulatorValue === null) {
    issues.push("VITE_CAMERA_SIMULATOR_ENABLED must be true or false.");
  }
  const cameraSimulatorEnabled = cameraSimulatorValue === true;
  if (mode === "production" && cameraSimulatorEnabled) {
    issues.push(
      "VITE_CAMERA_SIMULATOR_ENABLED cannot be enabled in production.",
    );
  }
  if (issues.length > 0) return { status: "unavailable", issues };
  return {
    status: "available",
    apiBaseUrl,
    signalingUrl,
    cameraSimulatorEnabled,
    insecurePublicSignalingAllowed,
  };
}

export function getRuntimeEnvironment(): RuntimeEnvironment {
  return parseEnvironment(import.meta.env, import.meta.env.MODE);
}

export function requireEnvironment(
  environment: RuntimeEnvironment,
): AvailableEnvironment {
  if (environment.status === "unavailable") {
    throw new EnvironmentConfigurationError(environment.issues);
  }
  return environment;
}
