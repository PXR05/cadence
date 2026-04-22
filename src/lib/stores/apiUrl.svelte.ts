import { createLocalStorageState } from "./localStorage.svelte";

const STORAGE_KEY = "cadence.api_url";
const DEFAULT_STORAGE_KEY = "cadence.api_url_default";

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

async function resolveRuntimeDefaultUrl(): Promise<string | null> {
  const processDefault = tryNormalize(
    typeof process !== "undefined" ? process.env.PUBLIC_API_URL : undefined,
  );
  if (processDefault) {
    return processDefault;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const { env } = await import("$env/dynamic/public");
    return tryNormalize(env.PUBLIC_API_URL);
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
  private defaultUrlStorage = createLocalStorageState<string>(
    DEFAULT_STORAGE_KEY,
    "",
  );

  defaultUrl = $state<string>("");

  customUrl = $state<string | null>(null);

  constructor() {
    this.defaultUrl = tryNormalize(this.defaultUrlStorage.value) ?? "";
    if (this.defaultUrlStorage.value !== this.defaultUrl) {
      this.defaultUrlStorage.value = this.defaultUrl;
    }

    this.customUrl = tryNormalize(this.customUrlStorage.value);

    if (this.customUrlStorage.value !== this.customUrl) {
      this.customUrlStorage.value = this.customUrl;
    }

    void this.hydrateDefaultUrlFromRuntime();
  }

  private async hydrateDefaultUrlFromRuntime(): Promise<void> {
    if (this.defaultUrl) {
      return;
    }

    const runtimeDefault = await resolveRuntimeDefaultUrl();
    if (!runtimeDefault) {
      return;
    }

    this.defaultUrl = runtimeDefault;
    this.defaultUrlStorage.value = runtimeDefault;

    if (this.customUrl === runtimeDefault) {
      this.customUrl = null;
      this.customUrlStorage.value = null;
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
      "Backend URL is not configured. Set PUBLIC_API_URL or choose a custom backend URL.",
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
