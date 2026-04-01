import { createLocalStorageState } from "./localStorage.svelte";
import type { User } from "$lib/schemas/auth";
import { authFetch } from "$lib/api/fetch";
import { buildBackendUrl, getBackendUrl } from "$lib/stores/apiUrl.svelte";

interface LoginResponse {
  message: string;
  user: User;
  sessionId: string;
}

interface RegisterResponse {
  message: string;
  user: User;
  sessionId: string;
}

interface GetCurrentUserResponse {
  data: User;
}

class AuthStore {
  private userStore = createLocalStorageState<User | null>(
    "cadence.user",
    null,
  );
  private sessionIdStore = createLocalStorageState<string | null>(
    "cadence.sessionId",
    null,
  );

  user = $state<User | null>(null);
  sessionId = $state<string | null>(null);
  private cookieAuthMode = $state<"unknown" | "supported" | "unsupported">(
    "unknown",
  );

  constructor() {
    if (typeof window !== "undefined" && this.user === null) {
      this.getCurrentUser();
      void this.probeServerCookieAuth();
    }
  }

  private async probeServerCookieAuth(): Promise<void> {
    if (typeof window === "undefined") return;

    if ("onLine" in navigator && !navigator.onLine) {
      return;
    }

    try {
      getBackendUrl();
    } catch {
      return;
    }

    try {
      const response = await fetch(buildBackendUrl("/auth/me"), {
        method: "GET",
        credentials: "include",
        mode: "cors",
      });

      if (response.ok) {
        this.cookieAuthMode = "supported";
        return;
      }

      if (response.status === 401) {
        this.cookieAuthMode = "unsupported";
      }
    } catch {}
  }

  async refreshCookieAuthMode(): Promise<void> {
    this.cookieAuthMode = "unknown";
    await this.probeServerCookieAuth();
  }

  private restoreUserFromStorage(): void {
    const cachedUser = this.userStore.value;
    if (cachedUser) {
      this.user = cachedUser;
    }

    const cachedSessionId = this.sessionIdStore.value;
    if (cachedSessionId) {
      this.sessionId = cachedSessionId;
    }
  }

  private saveUserToStorage(user: User | null): void {
    this.userStore.value = user;
  }

  private saveSessionIdToStorage(sessionId: string | null): void {
    this.sessionIdStore.value = sessionId;
  }

  get isAuthenticated(): boolean {
    return this.user !== null;
  }

  get isAdmin(): boolean {
    return this.user?.role === "admin";
  }

  get canUseServerCookieAuth(): boolean {
    return this.cookieAuthMode === "supported";
  }

  get shouldUseCustomMediaAuthFetch(): boolean {
    return this.cookieAuthMode !== "supported";
  }

  get shouldUseCustomImageAuthFetch(): boolean {
    return this.shouldUseCustomMediaAuthFetch;
  }

  async login(username: string, password: string): Promise<void> {
    try {
      const response = await authFetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Login failed");
      }

      const data: LoginResponse = await response.json();

      this.user = data.user;
      this.saveUserToStorage(data.user);
      this.sessionId = data.sessionId;
      this.saveSessionIdToStorage(data.sessionId);
      void this.probeServerCookieAuth();
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  async register(username: string, password: string): Promise<void> {
    try {
      const response = await authFetch("/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Registration failed");
      }

      const data: RegisterResponse = await response.json();

      this.user = data.user;
      this.saveUserToStorage(data.user);
      this.sessionId = data.sessionId;
      this.saveSessionIdToStorage(data.sessionId);
      void this.probeServerCookieAuth();
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    this.restoreUserFromStorage();

    if ("onLine" in navigator && !navigator.onLine) {
      return this.user;
    }

    try {
      const response = await authFetch("/auth/me");

      if (!response.ok) {
        if (response.status === 401) {
          await this.logout();
          return null;
        }
        throw new Error("Failed to get current user");
      }

      const data: GetCurrentUserResponse = await response.json();
      this.user = data.data;
      this.saveUserToStorage(data.data);
      void this.probeServerCookieAuth();
      return data.data;
    } catch (error) {
      console.error("Failed to get current user:", error);
      return this.user;
    }
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    try {
      const response = await authFetch("/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Failed to change password:", error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    const hadSession = this.user !== null;

    this.userStore.clear();
    this.sessionIdStore.clear();
    this.user = null;
    this.sessionId = null;

    if (hadSession && "onLine" in navigator && navigator.onLine) {
      try {
        await authFetch("/auth/logout", {
          method: "POST",
        });
      } catch (error) {
        console.warn("Failed to revoke session on server:", error);
      }
    }
  }
}

export const authStore = new AuthStore();
