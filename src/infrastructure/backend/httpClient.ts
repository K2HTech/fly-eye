import { networkBackendError, toBackendError } from "./errors";
import type { CredentialStore } from "./credentials";
import { parseBackendTokenPair } from "./dtos";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
type RequestIdFactory = () => string;
export type CryptoLike = Partial<
  Pick<Crypto, "getRandomValues" | "randomUUID">
>;

export interface BackendHttpClientOptions {
  baseUrl: string;
  credentials: CredentialStore;
  fetchImpl?: FetchLike;
  requestIdFactory?: RequestIdFactory;
  crypto?: CryptoLike;
}

export interface BackendHttpClient {
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

function defaultRequestId(
  crypto: CryptoLike | undefined = globalThis.crypto,
): string {
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  if (typeof crypto?.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return [...bytes]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  throw new Error("Secure request correlation IDs are unavailable.");
}

export function createBackendHttpClient(
  options: BackendHttpClientOptions,
): BackendHttpClient {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const requestIdFactory =
    options.requestIdFactory ?? (() => defaultRequestId(options.crypto));
  let refreshPromise: Promise<void> | null = null;

  const refresh = async (): Promise<void> => {
    const current = options.credentials.get();
    if (!current) throw new Error("No refresh credentials are available.");
    const requestId = requestIdFactory();
    let response: Response;
    try {
      response = await fetchImpl(`${options.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
        },
        body: JSON.stringify({ refresh_token: current.refreshToken }),
      });
    } catch {
      options.credentials.clear();
      throw networkBackendError(requestId);
    }
    if (!response.ok) {
      const error = await toBackendError(response, requestId);
      options.credentials.clear();
      throw error;
    }
    try {
      const pair = parseBackendTokenPair(await response.json());
      options.credentials.set({
        accessToken: pair.access_token,
        refreshToken: pair.refresh_token,
      });
    } catch {
      options.credentials.clear();
      throw new Error("The Fly Eye service returned an invalid session.");
    }
  };

  const ensureRefresh = (): Promise<void> => {
    if (!refreshPromise)
      refreshPromise = refresh().finally(() => {
        refreshPromise = null;
      });
    return refreshPromise;
  };

  const request = async <T>(
    path: string,
    init: RequestInit = {},
    replayed = false,
  ): Promise<T> => {
    const requestId = requestIdFactory();
    const headers = new Headers(init.headers);
    headers.set("X-Request-ID", requestId);
    const credentials = options.credentials.get();
    if (credentials)
      headers.set("Authorization", `Bearer ${credentials.accessToken}`);
    let response: Response;
    try {
      response = await fetchImpl(
        `${options.baseUrl}/${path.replace(/^\/+/, "")}`,
        { ...init, headers },
      );
    } catch {
      throw networkBackendError(requestId);
    }
    if (
      response.status === 401 &&
      !replayed &&
      credentials?.refreshToken &&
      path !== "auth/refresh"
    ) {
      const latest = options.credentials.get();
      if (latest?.accessToken === credentials.accessToken) {
        await ensureRefresh();
      }
      return request<T>(path, init, true);
    }
    if (!response.ok) {
      if (response.status === 401 && credentials) options.credentials.clear();
      throw await toBackendError(response, requestId);
    }
    if (response.status === 204) return undefined as T;
    try {
      return (await response.json()) as T;
    } catch {
      throw new Error("The Fly Eye service returned an invalid response.");
    }
  };

  return { request };
}
