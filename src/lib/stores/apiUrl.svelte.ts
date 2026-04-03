import { createLocalStorageState } from "./localStorage.svelte";

const STORAGE_KEY = "cadence.api_url";

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function tryNormalize(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    return normalizeApiUrl(value);
  } catch {
    return null;
  }
}

export function normalizeApiUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Backend URL is required");
  }

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

class ApiUrlStore {
  private customUrlStorage = createLocalStorageState<string | null>(
    STORAGE_KEY,
    null,
  );

  readonly defaultUrl = tryNormalize(import.meta.env.VITE_API_URL) ?? "";

  customUrl = $state<string | null>(null);

  constructor() {
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
    const normalized = normalizeApiUrl(value);
    const shouldUseDefault = this.defaultUrl && normalized === this.defaultUrl;

    this.customUrl = shouldUseDefault ? null : normalized;
    this.customUrlStorage.value = this.customUrl;
  }

  resetToDefault(): void {
    this.customUrl = null;
    this.customUrlStorage.clear();
  }
}

export const apiUrlStore = new ApiUrlStore();

export function getBackendUrl(): string {
  const activeUrl = apiUrlStore.url;

  if (!activeUrl) {
    throw new Error(
      "Backend URL is not configured. Set VITE_API_URL or choose a custom backend URL.",
    );
  }

  return activeUrl;
}

export function buildBackendUrl(path: string): string {
  const baseUrl = stripTrailingSlash(getBackendUrl());
  const normalizedPath = path.replace(/^\/+/, "");

  if (!normalizedPath) {
    return baseUrl;
  }

  const url = new URL(normalizedPath, baseUrl);

  return url.toString();
}
