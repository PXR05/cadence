import { createLocalStorageState } from "./localStorage.svelte";

const AUTH_URL = "/api/auth";

interface User {
  id: string;
  username: string;
  role: "admin" | "user";
  createdAt?: string;
  lastLoginAt?: string;
}

interface LoginResponse {
  message: string;
  user: User;
  token: string;
}

interface RegisterResponse {
  message: string;
  user: User;
  token: string;
}

interface GetCurrentUserResponse {
  data: User;
}

class AuthStore {
  private tokenStore = createLocalStorageState<string | null>(
    "cadence.token",
    null
  );

  user = $state<User | null>(null);

  get token(): string | null {
    return this.tokenStore.value;
  }

  get isAuthenticated(): boolean {
    return this.tokenStore.value !== null && this.user !== null;
  }

  get isAdmin(): boolean {
    return this.user?.role === "admin";
  }

  async login(username: string, password: string): Promise<void> {
    try {
      const response = await fetch(`${AUTH_URL}/login`, {
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
      await this.setToken(data.token);
      this.user = data.user;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  async register(username: string, password: string): Promise<void> {
    try {
      const response = await fetch(`${AUTH_URL}/register`, {
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
      await this.setToken(data.token);
      this.user = data.user;
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.token) {
      return null;
    }

    try {
      const response = await fetch(`${AUTH_URL}/me`);

      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
          return null;
        }
        throw new Error("Failed to get current user");
      }

      const data: GetCurrentUserResponse = await response.json();
      this.user = data.data;
      return data.data;
    } catch (error) {
      console.error("Failed to get current user:", error);
      return null;
    }
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const response = await fetch(`${AUTH_URL}/change-password`, {
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

  async setToken(token: string): Promise<void> {
    try {
      this.tokenStore.value = token;

      if (typeof document !== "undefined") {
        document.cookie = `cadence.token=${token}; path=/; max-age=604800; SameSite=Strict`;
      }
    } catch (error) {
      console.error("Failed to set token:", error);
      throw new Error("Failed to set token");
    }
  }

  logout(): void {
    this.tokenStore.clear();
    this.user = null;

    if (typeof document !== "undefined") {
      document.cookie = "cadence.token=; path=/; max-age=0";
    }
  }

  clearToken(): void {
    this.logout();
  }
}

export const authStore = new AuthStore();
