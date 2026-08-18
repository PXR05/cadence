import { createLocalStorageState } from "./localStorage.svelte";
import type { User } from "$lib/schemas/auth";
import { backendCapabilities } from "$lib/backend/config";
import { setBackendSessionProvider } from "$lib/backend/client";
import { getBackendUrl } from "$lib/backend/runtime.svelte";
import {
  changePassword as changeBackendPassword,
  getCurrentUser as fetchCurrentUser,
  login as loginToBackend,
  logout as logoutFromBackend,
  probeCookieAuthentication,
  register as registerWithBackend,
} from "$lib/backend/services/auth";

class AuthStore {
  private userStore = createLocalStorageState<User | null>(
    "cadence.user",
    null,
  );
  private sessionIdStore = createLocalStorageState<string | null>(
    "cadence.session_id",
    null,
    "cadence.sessionId",
  );

  user = $state<User | null>(null);
  sessionId = $state<string | null>(null);
  private cookieAuthMode = $state<"unknown" | "supported" | "unsupported">(
    "unknown",
  );

  constructor() {
    setBackendSessionProvider(() => this.sessionId);
    if (
      typeof window !== "undefined" &&
      backendCapabilities.auth.enabled &&
      this.user === null
    ) {
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
      const response = await probeCookieAuthentication();

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
    if (!backendCapabilities.auth.enabled) return;
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

  get canAccessApp(): boolean {
    return !backendCapabilities.auth.enabled || this.isAuthenticated;
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
      const data = await loginToBackend(username, password);

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
      const data = await registerWithBackend(username, password);

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
    if (!backendCapabilities.auth.enabled) return null;
    this.restoreUserFromStorage();

    if ("onLine" in navigator && !navigator.onLine) {
      return this.user;
    }

    try {
      const user = await fetchCurrentUser();
      this.user = user;
      this.saveUserToStorage(user);
      void this.probeServerCookieAuth();
      return user;
    } catch (error) {
      if (error instanceof Response && error.status === 401) {
        await this.logout();
        return null;
      }
      console.error("Failed to get current user:", error);
      return this.user;
    }
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    try {
      await changeBackendPassword(currentPassword, newPassword);
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
        await logoutFromBackend();
      } catch (error) {
        console.warn("Failed to revoke session on server:", error);
      }
    }
  }
}

export const authStore = new AuthStore();
