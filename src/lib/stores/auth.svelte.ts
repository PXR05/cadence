
import { createLocalStorageState } from "./localStorage.svelte";

class AuthStore {
  private tokenStore = createLocalStorageState<string | null>(
    "cadence.token",
    null
  );

  get token(): string | null {
    return this.tokenStore.value;
  }

  get isAuthenticated(): boolean {
    return this.tokenStore.value !== null;
  }

  async setToken(token: string): Promise<void> {
    try {
      this.tokenStore.value = token;

      if (typeof document !== "undefined") {
        document.cookie = `cadence.token=${token}; path=/; max-age=31536000; SameSite=Strict`;
      }
    } catch (error) {
      console.error("Failed to set token:", error);
      throw new Error("Failed to set token");
    }
  }

  clearToken(): void {
    this.tokenStore.clear();

    if (typeof document !== "undefined") {
      document.cookie = "cadence.token=; path=/; max-age=0";
    }
  }
}

export const authStore = new AuthStore();
