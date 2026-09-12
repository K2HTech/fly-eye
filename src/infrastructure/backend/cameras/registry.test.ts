import { describe, expect, it, vi } from "vitest";

import {
  BackendCameraRegistry,
  CameraRegistryError,
  type CameraRole,
} from "./registry";
import type { BackendHttpClient, CryptoLike } from "../httpClient";

const matchId = "00000000-0000-4000-8000-000000000001";
const leftId = "00000000-0000-4000-8000-000000000011";
const rightId = "00000000-0000-4000-8000-000000000012";

const crypto = {
  randomUUID: vi
    .fn<() => string>()
    .mockReturnValueOnce("00000000-0000-4000-8000-000000000101")
    .mockReturnValueOnce("00000000-0000-4000-8000-000000000102")
    .mockReturnValueOnce("00000000-0000-4000-8000-000000000103")
    .mockReturnValueOnce("00000000-0000-4000-8000-000000000104"),
} as CryptoLike;

function camera(
  role: string,
  id = role === "SIDELINE_LEFT" ? leftId : rightId,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    matchId,
    name: role === "SIDELINE_LEFT" ? "Left sideline" : "Right sideline",
    role,
    sourceType: "device",
    sourceRef: `device-${role.toLowerCase()}`,
    resolution: { w: 1280, h: 720 },
    targetFps: 30,
    isActive: true,
    calibration: null,
    createdAt: "2026-08-29T00:00:00.000Z",
    ...overrides,
  };
}

function clientFor(
  cameras: unknown[],
  created: Partial<Record<CameraRole, unknown>> = {},
) {
  const request = vi.fn<BackendHttpClient["request"]>();
  request.mockImplementation(async (_path, init) => {
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as {
        role: CameraRole;
        sourceRef: string;
      };
      return (
        created[body.role] ??
        camera(body.role, body.role === "SIDELINE_LEFT" ? leftId : rightId, {
          sourceRef: body.sourceRef,
        })
      );
    }
    return cameras;
  });
  return { client: { request } as BackendHttpClient, request };
}

describe("BackendCameraRegistry", () => {
  it("creates only the requested approved device camera from an empty set", async () => {
    const { client, request } = clientFor([]);
    const registry = new BackendCameraRegistry({ client, crypto });

    const left = await registry.provision(matchId, "SIDELINE_LEFT");

    expect(left.role).toBe("SIDELINE_LEFT");
    expect(request).toHaveBeenCalledTimes(2);
    const leftBody = JSON.parse(String(request.mock.calls[1][1]?.body));
    expect(leftBody).toMatchObject({
      name: "Left sideline",
      role: "SIDELINE_LEFT",
      sourceType: "device",
      resolution: { w: 1280, h: 720 },
      targetFps: 30,
    });
    expect(leftBody.clientRequestId).toMatch(uuidPattern);
    expect(leftBody.sourceRef).toMatch(/^fly-eye-device-[0-9a-f-]+$/);
    expect(leftBody.sourceRef).not.toMatch(/[?&#/@]/);
  });

  it("creates only the selected missing role", async () => {
    const { client, request } = clientFor([camera("SIDELINE_RIGHT")]);
    const registry = new BackendCameraRegistry({ client, crypto });

    const left = await registry.provision(matchId, "SIDELINE_LEFT");

    expect(left.id).toBe(leftId);
    expect(request).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(request.mock.calls[1][1]?.body))).toMatchObject({
      role: "SIDELINE_LEFT",
    });
  });

  it("reuses an existing compatible selected role without creating", async () => {
    const { client, request } = clientFor([
      camera("SIDELINE_RIGHT"),
      camera("SIDELINE_LEFT"),
    ]);
    const registry = new BackendCameraRegistry({ client, crypto });

    await expect(
      registry.provision(matchId, "SIDELINE_LEFT"),
    ).resolves.toMatchObject({
      id: leftId,
      role: "SIDELINE_LEFT",
    });
    expect(request).toHaveBeenCalledOnce();
  });

  it("reuses a device camera whose reported resolution differs from the placeholder", async () => {
    const { client, request } = clientFor([
      camera("SIDELINE_LEFT", leftId, { resolution: { w: 1920, h: 1080 } }),
    ]);
    const registry = new BackendCameraRegistry({ client, crypto });

    await expect(
      registry.provision(matchId, "SIDELINE_LEFT"),
    ).resolves.toMatchObject({
      id: leftId,
      resolution: { width: 1920, height: 1080 },
    });
    expect(request).toHaveBeenCalledOnce();
  });

  it("updates a camera resolution through PATCH", async () => {
    const request = vi.fn<BackendHttpClient["request"]>();
    request.mockImplementation(async () =>
      camera("SIDELINE_LEFT", leftId, { resolution: { w: 1920, h: 1080 } }),
    );
    const registry = new BackendCameraRegistry({
      client: { request } as BackendHttpClient,
    });

    const updated = await registry.update(matchId, leftId, {
      resolution: { w: 1920, h: 1080 },
    });

    expect(updated).toMatchObject({
      id: leftId,
      role: "SIDELINE_LEFT",
      resolution: { width: 1920, height: 1080 },
    });
    expect(request).toHaveBeenCalledWith(
      `cameras/${leftId}`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ resolution: { w: 1920, h: 1080 } }),
      }),
    );
  });

  it.each([
    ["missing change", {}],
    ["zero width", { resolution: { w: 0, h: 720 } }],
    ["non-integer height", { resolution: { w: 1280, h: 720.5 } }],
    ["non-positive target FPS", { targetFps: 0 }],
  ])("rejects an invalid camera update: %s", async (_label, input) => {
    const { client } = clientFor([]);
    const registry = new BackendCameraRegistry({ client });

    await expect(registry.update(matchId, leftId, input)).rejects.toMatchObject(
      {
        code: "INVALID_CAMERA_UPDATE",
      },
    );
  });

  it("rejects a camera update for a malformed camera id", async () => {
    const { client } = clientFor([]);
    const registry = new BackendCameraRegistry({ client });

    await expect(
      registry.update(matchId, "not-a-uuid", {
        resolution: { w: 1280, h: 720 },
      }),
    ).rejects.toMatchObject({ code: "INVALID_CAMERA_UPDATE" });
  });

  it("retains each role's client request ID when a create retry is made", async () => {
    let listCall = 0;
    const request = vi.fn<BackendHttpClient["request"]>();
    request.mockImplementation(async (_path, init) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as {
          role: CameraRole;
          sourceRef: string;
        };
        if (listCall === 1 && body.role === "SIDELINE_LEFT")
          throw new Error("temporary failure");
        return camera(
          body.role,
          body.role === "SIDELINE_LEFT" ? leftId : rightId,
          {
            sourceRef: body.sourceRef,
          },
        );
      }
      listCall += 1;
      return [];
    });
    const registry = new BackendCameraRegistry({
      client: { request } as BackendHttpClient,
      crypto,
    });

    await expect(registry.provision(matchId, "SIDELINE_LEFT")).rejects.toThrow(
      "temporary failure",
    );
    await expect(
      registry.provision(matchId, "SIDELINE_LEFT"),
    ).resolves.toMatchObject({
      role: "SIDELINE_LEFT",
    });
    const postBodies = request.mock.calls
      .filter(([, init]) => init?.method === "POST")
      .map(
        ([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>,
      );
    expect(postBodies[0].clientRequestId).toBe(postBodies[1].clientRequestId);
  });

  it.each([
    [
      "duplicate role",
      [camera("SIDELINE_LEFT"), camera("SIDELINE_LEFT", rightId)],
    ],
    ["unexpected role", [camera("BASELINE_NEAR")]],
    ["inactive camera", [camera("SIDELINE_LEFT", leftId, { isActive: false })]],
    [
      "incompatible source type",
      [camera("SIDELINE_LEFT", leftId, { sourceType: "mjpeg" })],
    ],
  ])("rejects %s without guessing or mutating", async (_label, cameras) => {
    const { client, request } = clientFor(cameras);
    const registry = new BackendCameraRegistry({ client, crypto });

    await expect(
      registry.provision(matchId, "SIDELINE_LEFT"),
    ).rejects.toBeInstanceOf(CameraRegistryError);
    expect(request).toHaveBeenCalledOnce();
  });

  it("rejects more than two cameras before creating anything", async () => {
    const { client, request } = clientFor([
      camera("SIDELINE_LEFT"),
      camera("SIDELINE_RIGHT"),
      camera("BASELINE_NEAR", "00000000-0000-4000-8000-000000000013"),
    ]);
    const registry = new BackendCameraRegistry({ client, crypto });

    await expect(registry.provision(matchId, "SIDELINE_LEFT")).rejects.toThrow(
      "more than the two supported cameras",
    );
    expect(request).toHaveBeenCalledOnce();
  });

  it.each([
    ["not an array", {}],
    ["missing id", [camera("SIDELINE_LEFT", leftId, { id: undefined })]],
    [
      "invalid resolution",
      [camera("SIDELINE_LEFT", leftId, { resolution: null })],
    ],
    [
      "missing active state",
      [camera("SIDELINE_LEFT", leftId, { isActive: undefined })],
    ],
  ])("rejects malformed camera response: %s", async (_label, body) => {
    const { client } = clientFor(body as unknown[]);
    const registry = new BackendCameraRegistry({ client, crypto });

    await expect(registry.list(matchId)).rejects.toMatchObject({
      code: "INVALID_CAMERA_RESPONSE",
    });
  });
});

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
