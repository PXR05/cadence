import { backendCapabilities } from "./config";
import type { BackendCapabilities } from "./types";

export type BackendCapabilityPath =
  | "auth"
  | "auth.registration"
  | "auth.passwordChange"
  | "auth.userManagement"
  | "library"
  | "library.search"
  | "library.suggestions"
  | "library.random"
  | "library.delete"
  | "playlists"
  | "playlists.create"
  | "playlists.edit"
  | "playlists.delete"
  | "playlists.manageItems"
  | "playlists.reorder"
  | "media.streaming"
  | "media.images"
  | "media.streamTickets"
  | "uploads.file"
  | "uploads.remote"
  | "offline"
  | "settingsSync"
  | "backendUrlSelection"
  | `remoteProviders.${keyof BackendCapabilities["remoteProviders"]}.search`
  | `remoteProviders.${keyof BackendCapabilities["remoteProviders"]}.import`;

export function hasBackendCapability(path: BackendCapabilityPath): boolean {
  const parts = path.split(".");
  let value: unknown = backendCapabilities;

  for (const part of parts) {
    if (!value || typeof value !== "object") return false;
    value = (value as Record<string, unknown>)[part];
  }

  if (typeof value === "boolean") return value;
  if (value && typeof value === "object" && "enabled" in value) {
    return Boolean((value as { enabled?: boolean }).enabled);
  }
  return false;
}

export function requireBackendCapability(path: BackendCapabilityPath): void {
  if (!hasBackendCapability(path)) {
    throw new BackendFeatureDisabledError(path);
  }
}

export class BackendFeatureDisabledError extends Error {
  constructor(public readonly capability: BackendCapabilityPath) {
    super(`Backend feature is disabled: ${capability}`);
    this.name = "BackendFeatureDisabledError";
  }
}

