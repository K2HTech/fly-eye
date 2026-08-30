import {
  getRuntimeEnvironment,
  type RuntimeEnvironment,
} from "../config/environment";
import type { AppServices } from "../services";
import {
  createBackendAuthService,
  createBackendCameraRegistry,
  createBackendHttpClient,
  createBackendMatchRepository,
  MemoryCredentialStore,
} from "./backend";
import {
  BrowserCameraConnectionFactory,
  createBackendPairingClient,
} from "./browser/cameras";
import { createHybridAuthService, UnavailableNormalAuthService } from "./auth";
import { HybridMatchRepository, UnavailableMatchRepository } from "./matches";
import {
  createLocalAppServices,
  createSupplementalScoringStore,
} from "./local";
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
  if (environment.status !== "available") {
    const auth = createHybridAuthService(
      new UnavailableNormalAuthService(
        "Backend authentication is unavailable. Check the public endpoint configuration.",
      ),
      local.auth,
    );
    return {
      ...local,
      auth,
      matches: new HybridMatchRepository(
        new UnavailableMatchRepository(),
        local.matches,
        () => auth.getActiveSessionMode(),
      ),
    };
  }

  const credentials = new MemoryCredentialStore();
  const client = createBackendHttpClient({
    baseUrl: environment.apiBaseUrl,
    credentials,
    fetchImpl: options.fetchImpl,
  });
  const auth = createHybridAuthService(
    createBackendAuthService({
      client,
      credentials,
      now: options.now,
    }),
    local.auth,
  );
  const scoring = createSupplementalScoringStore(storage, { now: options.now });
  const normalMatches = createBackendMatchRepository({
    client,
    readiness: local.readiness,
    scoring,
    now: options.now,
  });

  const pairing = createBackendPairingClient(client, environment.signalingUrl);
  return {
    ...local,
    auth,
    matches: new HybridMatchRepository(normalMatches, local.matches, () =>
      auth.getActiveSessionMode(),
    ),
    cameras: createBackendCameraRegistry({ client }),
    pairing,
    cameraConnections: new BrowserCameraConnectionFactory(pairing),
  };
}
