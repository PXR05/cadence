import { argon2id } from "hash-wasm";
import { createLocalStorageState } from "./localStorage.svelte";

class AuthStore {
  private hashedPasswordStore = createLocalStorageState<string | null>(
    "cadence.auth_hash",
    null
  );

  get hashedPassword(): string | null {
    return this.hashedPasswordStore.value;
  }

  get isAuthenticated(): boolean {
    return this.hashedPasswordStore.value !== null;
  }

  async setPassword(password: string): Promise<void> {
    try {
      const hashed = await argon2id({
        password,
        salt: new Uint8Array(16),
        parallelism: 1,
        iterations: 2,
        memorySize: 19456,
        hashLength: 32,
        outputType: "encoded",
      });
      this.hashedPasswordStore.value = hashed;

      if (typeof document !== "undefined") {
        document.cookie = `cadence.auth_hash=${hashed}; path=/; max-age=31536000; SameSite=Strict`;
      }
    } catch (error) {
      console.error("Failed to hash password:", error);
      throw new Error("Failed to hash password");
    }
  }

  clearPassword(): void {
    this.hashedPasswordStore.clear();

    if (typeof document !== "undefined") {
      document.cookie = "cadence.auth_hash=; path=/; max-age=0";
    }
  }
}

export const authStore = new AuthStore();
