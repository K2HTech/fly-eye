/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SIGNALING_URL?: string;
  readonly VITE_CAMERA_SIMULATOR_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
