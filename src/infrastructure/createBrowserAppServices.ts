import {
  getRuntimeEnvironment,
  type RuntimeEnvironment,
} from "../config/environment";
import type { AppServices } from "../services";
import {
  createBackendAuthService,
  createBackendHttpClient,
  MemoryCredentialStore,
} from "./backend";
import { createHybridAuthService, UnavailableNormalAuthService } from "./auth";
import { createLocalAppServices } from "./local";
import type { StorageLike } from "./local";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

interface BrowserAppServiceOptions {
  environment?: RuntimeEnvironment;
  fetchImpl?: FetchLike;
  now?: () => string;
}

/** Composes real normal authentication with the isolated local demo path. */
export function createBrowserAppServices(
  storage: StorageLike,
  options: BrowserAppServiceOptions = {},
): AppServices {
  const local = createLocalAppServices(storage, { now: options.now });
  const environment = options.environment ?? getRuntimeEnvironment();

  const normalAuth =
    environment.status === "available"
      ? (() => {
          const credentials = new MemoryCredentialStore();
          const client = createBackendHttpClient({
            baseUrl: environment.apiBaseUrl,
            credentials,
            fetchImpl: options.fetchImpl,
          });
          return createBackendAuthService({
            client,
            credentials,
            now: options.now,
          });
        })()
      : new UnavailableNormalAuthService(
          "Backend authentication is unavailable. Check the public endpoint configuration.",
        );

  return {
    ...local,
    auth: createHybridAuthService(normalAuth, local.auth),
  };
}
