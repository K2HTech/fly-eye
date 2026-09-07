import { describe, expect, it } from "vitest";

import { parseEnvironment } from "./environment";

describe("parseEnvironment", () => {
  const valid = {
    VITE_API_BASE_URL: "https://api.example.test",
    VITE_SIGNALING_URL: "wss://api.example.test/api/v1/signal",
  };

  it("normalizes the backend API base to /api/v1", () => {
    const result = parseEnvironment(valid, "production");
    expect(result).toEqual({
      status: "available",
      apiBaseUrl: "https://api.example.test/api/v1",
      signalingUrl: "wss://api.example.test/api/v1/signal",
      cameraSimulatorEnabled: false,
      insecurePublicSignalingAllowed: false,
    });
  });

  it("accepts an already versioned API base", () => {
    const result = parseEnvironment({
      ...valid,
      VITE_API_BASE_URL: "https://api.test/api/v1/",
    });
    expect(result.status === "available" && result.apiBaseUrl).toBe(
      "https://api.test/api/v1",
    );
  });

  it("accepts a same-origin API path for a development proxy", () => {
    const result = parseEnvironment({
      ...valid,
      VITE_API_BASE_URL: "/api",
    });

    expect(result.status === "available" && result.apiBaseUrl).toBe("/api/v1");
  });

  it("rejects a protocol-relative API path", () => {
    expect(
      parseEnvironment({ ...valid, VITE_API_BASE_URL: "//api.example.test" }),
    ).toEqual({
      status: "unavailable",
      issues: ["API path must be a same-origin path."],
    });
  });

  it("returns actionable unavailable issues for missing values", () => {
    expect(parseEnvironment({}, "production")).toEqual({
      status: "unavailable",
      issues: [
        "VITE_API_BASE_URL is missing.",
        "VITE_SIGNALING_URL is missing.",
      ],
    });
  });

  it("rejects insecure signaling in production and simulator there", () => {
    const result = parseEnvironment(
      {
        ...valid,
        VITE_SIGNALING_URL: "ws://localhost:8000/signal",
        VITE_CAMERA_SIMULATOR_ENABLED: "true",
      },
      "production",
    );
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.issues).toContain(
        "Signaling URL must use wss (private-network ws is development-only).",
      );
      expect(result.issues).toContain(
        "VITE_CAMERA_SIMULATOR_ENABLED cannot be enabled in production.",
      );
    }
  });

  it("allows an explicitly enabled simulator only in development", () => {
    const result = parseEnvironment({
      ...valid,
      VITE_SIGNALING_URL: "ws://localhost:8000/api/v1/signal",
      VITE_CAMERA_SIMULATOR_ENABLED: "true",
    });
    expect(result).toMatchObject({
      status: "available",
      cameraSimulatorEnabled: true,
    });
  });

  it("requires an explicit development flag for public ws signaling", () => {
    const result = parseEnvironment({
      ...valid,
      VITE_API_BASE_URL: "http://public.example.test",
      VITE_SIGNALING_URL: "ws://public.example.test/api/v1/signal",
    });

    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.issues).toEqual([
        "API URL must use https (private-network http is development-only).",
        "Signaling URL must use wss (private-network ws is development-only).",
      ]);
    }
  });

  it("allows explicitly opted-in public ws signaling only in development", () => {
    const result = parseEnvironment({
      ...valid,
      VITE_SIGNALING_URL: "ws://45.77.47.58:9080/api/v1/signal",
      VITE_ALLOW_INSECURE_PUBLIC_SIGNALING: "true",
    });

    expect(result).toMatchObject({
      status: "available",
      signalingUrl: "ws://45.77.47.58:9080/api/v1/signal",
      insecurePublicSignalingAllowed: true,
    });
  });

  it("rejects the insecure public signaling override in production", () => {
    const result = parseEnvironment(
      {
        ...valid,
        VITE_ALLOW_INSECURE_PUBLIC_SIGNALING: "true",
      },
      "production",
    );

    expect(result).toEqual({
      status: "unavailable",
      issues: [
        "VITE_ALLOW_INSECURE_PUBLIC_SIGNALING cannot be enabled in production.",
      ],
    });
  });

  it("rejects a signaling URL outside the implemented endpoint", () => {
    const result = parseEnvironment({
      ...valid,
      VITE_SIGNALING_URL: "wss://api.example.test/socket",
    });
    expect(result).toEqual({
      status: "unavailable",
      issues: ["Signaling URL must end with /api/v1/signal."],
    });
  });

  it("rejects an invalid simulator flag instead of guessing", () => {
    const result = parseEnvironment({
      ...valid,
      VITE_CAMERA_SIMULATOR_ENABLED: "yes",
    });
    expect(result).toEqual({
      status: "unavailable",
      issues: ["VITE_CAMERA_SIMULATOR_ENABLED must be true or false."],
    });
  });
});
