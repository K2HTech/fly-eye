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
  it("creates both approved device cameras from an empty set", async () => {
    const { client, request } = clientFor([]);
    const registry = new BackendCameraRegistry({ client, crypto });

    const pair = await registry.prepare(matchId);

    expect(pair.left.role).toBe("SIDELINE_LEFT");
    expect(pair.right.role).toBe("SIDELINE_RIGHT");
    expect(request).toHaveBeenCalledTimes(3);
    const leftBody = JSON.parse(String(request.mock.calls[1][1]?.body));
    const rightBody = JSON.parse(String(request.mock.calls[2][1]?.body));
    expect(leftBody).toMatchObject({
      name: "Left sideline",
      role: "SIDELINE_LEFT",
      sourceType: "device",
      resolution: { w: 1280, h: 720 },
      targetFps: 30,
    });
    expect(rightBody).toMatchObject({
      name: "Right sideline",
      role: "SIDELINE_RIGHT",
      sourceType: "device",
      resolution: { w: 1280, h: 720 },
      targetFps: 30,
    });
    expect(leftBody.clientRequestId).toMatch(uuidPattern);
    expect(rightBody.clientRequestId).toMatch(uuidPattern);
    expect(leftBody.clientRequestId).not.toBe(rightBody.clientRequestId);
    expect(leftBody.sourceRef).toMatch(/^fly-eye-device-[0-9a-f-]+$/);
    expect(leftBody.sourceRef).not.toMatch(/[?&#/@]/);
  });

  it("creates only the missing role and returns left/right independent of API order", async () => {
    const { client, request } = clientFor([camera("SIDELINE_RIGHT")]);
    const registry = new BackendCameraRegistry({ client, crypto });

    const pair = await registry.prepare(matchId);

    expect(pair.left.id).toBe(leftId);
    expect(pair.right.id).toBe(rightId);
    expect(request).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(request.mock.calls[1][1]?.body))).toMatchObject({
      role: "SIDELINE_LEFT",
    });
  });

  it("reuses a compatible two-camera set without creating or reordering it", async () => {
    const { client, request } = clientFor([
      camera("SIDELINE_RIGHT"),
      camera("SIDELINE_LEFT"),
    ]);
    const registry = new BackendCameraRegistry({ client, crypto });

    await expect(registry.prepare(matchId)).resolves.toMatchObject({
      left: { id: leftId, role: "SIDELINE_LEFT" },
      right: { id: rightId, role: "SIDELINE_RIGHT" },
    });
    expect(request).toHaveBeenCalledOnce();
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
      return listCall === 1 ? [] : [camera("SIDELINE_LEFT")];
    });
    const registry = new BackendCameraRegistry({
      client: { request } as BackendHttpClient,
      crypto,
    });

    await expect(registry.prepare(matchId)).rejects.toThrow(
      "temporary failure",
    );
    await expect(registry.prepare(matchId)).resolves.toMatchObject({
      left: { role: "SIDELINE_LEFT" },
      right: { role: "SIDELINE_RIGHT" },
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
      "incompatible resolution",
      [camera("SIDELINE_LEFT", leftId, { resolution: { w: 1920, h: 1080 } })],
    ],
    [
      "incompatible source type",
      [camera("SIDELINE_LEFT", leftId, { sourceType: "mjpeg" })],
    ],
  ])("rejects %s without guessing or mutating", async (_label, cameras) => {
    const { client, request } = clientFor(cameras);
    const registry = new BackendCameraRegistry({ client, crypto });

    await expect(registry.prepare(matchId)).rejects.toBeInstanceOf(
      CameraRegistryError,
    );
    expect(request).toHaveBeenCalledOnce();
  });

  it("rejects more than two cameras before creating anything", async () => {
    const { client, request } = clientFor([
      camera("SIDELINE_LEFT"),
      camera("SIDELINE_RIGHT"),
      camera("BASELINE_NEAR", "00000000-0000-4000-8000-000000000013"),
    ]);
    const registry = new BackendCameraRegistry({ client, crypto });

    await expect(registry.prepare(matchId)).rejects.toThrow(
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
