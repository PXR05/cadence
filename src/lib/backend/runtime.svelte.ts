import { createLocalStorageState } from "$lib/stores/localStorage.svelte";
import { backendConfig } from "./config";

const STORAGE_KEY = "cadence.api_url";
const DEFAULT_STORAGE_KEY = "cadence.api_url_default";

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function tryNormalize(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return normalizeBackendUrl(value);
  } catch {
    return null;
  }
}

export function normalizeBackendUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Backend URL is required");

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(
      "Enter a valid absolute URL (including http:// or https://)",
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Backend URL must use http:// or https://");
  }

  parsed.hash = "";
  parsed.search = "";
  return stripTrailingSlash(parsed.toString());
}

class BackendRuntime {
  private customUrlStorage = createLocalStorageState<string | null>(
    STORAGE_KEY,
    null,
  );
  private defaultUrlStorage = createLocalStorageState<string>(
    DEFAULT_STORAGE_KEY,
    backendConfig.defaultBaseUrl,
  );

  defaultUrl = $state("");
  customUrl = $state<string | null>(null);

  constructor() {
    this.defaultUrl = tryNormalize(backendConfig.defaultBaseUrl) ?? "";
    this.defaultUrlStorage.value = this.defaultUrl;
    this.customUrl = tryNormalize(this.customUrlStorage.value);
    if (this.customUrlStorage.value !== this.customUrl) {
      this.customUrlStorage.value = this.customUrl;
    }
  }

  get url(): string {
    return this.customUrl ?? this.defaultUrl;
  }

  get hasCustomUrl(): boolean {
    return this.customUrl !== null;
  }

  setCustomUrl(value: string): void {
    const normalized = normalizeBackendUrl(value);
    this.customUrl =
      this.defaultUrl && normalized === this.defaultUrl ? null : normalized;
    this.customUrlStorage.value = this.customUrl;
  }

  resetToDefault(): void {
    this.customUrl = null;
    this.customUrlStorage.clear();
  }
}

export const backendRuntime = new BackendRuntime();

export function getBackendUrl(): string {
  if (!backendRuntime.url) {
    throw new Error(
      "Backend URL is not configured. Set PUBLIC_API_URL or choose a custom backend URL.",
    );
  }
  return backendRuntime.url;
}

export function buildBackendUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;

  const baseUrl = `${stripTrailingSlash(getBackendUrl())}/`;
  const normalizedPath = path.replace(/^\/+/, "");
  return normalizedPath ? new URL(normalizedPath, baseUrl).toString() : baseUrl;
}

