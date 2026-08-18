export { backendConfig, backendCapabilities } from "./config";
export {
  hasBackendCapability,
  requireBackendCapability,
  BackendFeatureDisabledError,
  type BackendCapabilityPath,
} from "./capabilities";
export {
  backendRuntime,
  getBackendUrl,
  buildBackendUrl,
  normalizeBackendUrl,
} from "./runtime.svelte";
export {
  backendRequest,
  backendJson,
  createBackendHeaders,
  setBackendSessionProvider,
} from "./client";
export type {
  BackendCapabilities,
  BackendConfig,
  BackendRoutes,
  RemoteBackendProvider,
} from "./types";
export {
  applyBackendUrlChange,
  type ApplyBackendUrlChangeOptions,
  type ApplyBackendUrlChangeResult,
} from "./switchBackend";
