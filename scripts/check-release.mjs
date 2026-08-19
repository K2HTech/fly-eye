import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tag = process.argv[2];

assert(tag, "usage: node scripts/check-release.mjs <tag>");

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const tauriConfig = JSON.parse(
  await readFile(
    new URL("../src-tauri/tauri.conf.json", import.meta.url),
    "utf8",
  ),
);
const expectedTag = `v${packageJson.version}`;

assert.equal(
  tag,
  expectedTag,
  `release tag ${tag} does not match package version ${expectedTag}`,
);
assert.equal(
  tauriConfig.version,
  packageJson.version,
  "Tauri and package versions must match before release",
);

console.log(`release tag ${tag} matches Fly Eye ${packageJson.version}`);
