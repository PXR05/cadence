import * as v from "valibot";
import {
  CreateUserResponseSchema,
  DeleteUserResponseSchema,
  ListUsersResponseSchema,
  ResetPasswordResponseSchema,
  type User,
} from "$lib/schemas/auth";
import { backendConfig } from "../config";
import { backendRequest } from "../client";
import { requireBackendCapability } from "../capabilities";

export interface SessionResponse {
  message: string;
  user: User;
  sessionId: string;
}

export async function probeCookieAuthentication(): Promise<Response> {
  requireBackendCapability("auth");
  return backendRequest(backendConfig.routes.auth.me, {
    method: "GET",
    authenticated: false,
  });
}

export async function login(username: string, password: string) {
  requireBackendCapability("auth");
  const response = await backendRequest(backendConfig.routes.auth.login, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Login failed");
  }
  return response.json() as Promise<SessionResponse>;
}

export async function register(username: string, password: string) {
  requireBackendCapability("auth.registration");
  const response = await backendRequest(backendConfig.routes.auth.register, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Registration failed");
  }
  return response.json() as Promise<SessionResponse>;
}

export async function getCurrentUser(): Promise<User> {
  requireBackendCapability("auth");
  const response = await backendRequest(backendConfig.routes.auth.me);
  if (!response.ok) throw response;
  const data = (await response.json()) as { data: User };
  return data.data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  requireBackendCapability("auth.passwordChange");
  const response = await backendRequest(
    backendConfig.routes.auth.changePassword,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    },
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to change password");
  }
}

export async function logout(): Promise<void> {
  if (!backendConfig.capabilities.auth.enabled) return;
  await backendRequest(backendConfig.routes.auth.logout, { method: "POST" });
}

export async function listUsers(
  options: { page?: number; limit?: number } = {},
) {
  requireBackendCapability("auth.userManagement");
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 10),
  });
  const response = await backendRequest(
    `${backendConfig.routes.auth.users}?${params}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to list users: ${response.statusText}`);
  }
  return v.parse(ListUsersResponseSchema, await response.json());
}

export async function createUser(input: {
  username: string;
  password: string;
}) {
  requireBackendCapability("auth.userManagement");
  const response = await backendRequest(backendConfig.routes.auth.register, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create user");
  }
  return v.parse(CreateUserResponseSchema, await response.json());
}

export async function resetUserPassword(input: {
  userId: string;
  newPassword: string;
}) {
  requireBackendCapability("auth.userManagement");
  const response = await backendRequest(
    backendConfig.routes.auth.userPassword(input.userId),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: input.newPassword }),
    },
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to reset password");
  }
  return v.parse(ResetPasswordResponseSchema, await response.json());
}

export async function deleteUser(id: string) {
  requireBackendCapability("auth.userManagement");
  const response = await backendRequest(backendConfig.routes.auth.user(id), {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete user: ${response.statusText}`);
  }
  return v.parse(DeleteUserResponseSchema, await response.json());
}

