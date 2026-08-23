import { describe, expect, it } from "vitest";

import type { MatchStatus } from "../../domain";
import { matchResumeLabel, matchResumePath } from "./matchNavigation";

describe("match dashboard navigation", () => {
  it.each([
    ["draft", "/matches/match%2042/readiness", "Continue setup"],
    ["ready", "/matches/match%2042/readiness", "Open readiness"],
    ["live", "/matches/match%2042/live", "Resume live monitor"],
    ["completed", "/matches/match%2042/decision", "Review decision"],
  ] satisfies [MatchStatus, string, string][])(
    "maps %s matches to their safe resume destination",
    (status, path, label) => {
      expect(matchResumePath({ id: "match 42", status })).toBe(path);
      expect(matchResumeLabel(status)).toBe(label);
    },
  );
});
