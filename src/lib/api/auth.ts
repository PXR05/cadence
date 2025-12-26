import * as v from "valibot";
import {
  GetCurrentUserResponseSchema,
  ListUsersResponseSchema,
  CreateUserResponseSchema,
  ResetPasswordResponseSchema,
  DeleteUserResponseSchema,
} from "$lib/schemas/auth";
import { authFetch } from "./fetch";

export interface ListUsersOptions {
  page?: number;
  limit?: number;
}

export interface CreateUserInput {
  username: string;
  password: string;
}

export interface ResetPasswordInput {
  userId: string;
  newPassword: string;
}

export async function listUsers(options: ListUsersOptions = {}) {
  const { page = 1, limit = 10 } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await authFetch(`/auth/users?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to list users: ${response.statusText}`);
  }

  const data = await response.json();
  return v.parse(ListUsersResponseSchema, data);
}

export async function createUser(input: CreateUserInput) {
  const response = await authFetch("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create user");
  }

  const data = await response.json();
  return v.parse(CreateUserResponseSchema, data);
}

export async function resetUserPassword(input: ResetPasswordInput) {
  const response = await authFetch(`/auth/users/${input.userId}/password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ newPassword: input.newPassword }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to reset password");
  }

  const data = await response.json();
  return v.parse(ResetPasswordResponseSchema, data);
}

export async function deleteUser(id: string) {
  const response = await authFetch(`/auth/users/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete user: ${response.statusText}`);
  }

  const data = await response.json();
  return v.parse(DeleteUserResponseSchema, data);
}
