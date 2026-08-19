# Dependency management

Fly Eye uses npm for React/TypeScript dependencies and Cargo for the minimal
Tauri v2 host. `package-lock.json` and `src-tauri/Cargo.lock` are committed so
local development and CI resolve the same versions.

## Toolchain

- Node.js `24.13.1`, recorded in `.node-version`
- npm `11`
- Stable Rust

Install the platform-specific prerequisites from the
[Tauri documentation](https://v2.tauri.app/start/prerequisites/) before running
the native application.

On Ubuntu, install the native development packages before `task rust:check` or
`task desktop:run`:

```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev \
  libdbus-1-dev librsvg2-dev patchelf pkg-config
```

## Install dependencies

```bash
task setup
```

`task setup` runs `npm ci`, which installs exactly the dependency graph in
`package-lock.json` and fails if it disagrees with `package.json`.

Cargo resolves its graph from `src-tauri/Cargo.lock` when the Rust host is
checked or built.

## Change dependencies

Use npm rather than editing `package-lock.json` manually:

```bash
npm install <package>
npm install --save-dev <package>
npm uninstall <package>
```

For Rust dependencies, edit `src-tauri/Cargo.toml` and then run:

```bash
cargo update --manifest-path src-tauri/Cargo.toml
```

Commit the manifest and corresponding lockfile together. Run `task check`
before submitting a pull request.
