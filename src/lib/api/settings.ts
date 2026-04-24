import * as v from "valibot";
import {
  UserSettingMessageResponseSchema,
  UserSettingResponseSchema,
  type UserSettingItem,
} from "$lib/schemas/settings";
import { authFetch } from "./fetch";

function buildSettingPath(key: string) {
  return `/user/settings/${encodeURIComponent(key)}`;
}

export async function getUserSetting(
  key: string,
): Promise<UserSettingItem | null> {
  const response = await authFetch(buildSettingPath(key));

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to get setting: ${response.statusText}`);
  }

  const data = await response.json();
  const parsed = v.parse(UserSettingResponseSchema, data);
  return parsed.data;
}

export async function upsertUserSetting(
  key: string,
  value: string,
): Promise<UserSettingItem> {
  const response = await authFetch(buildSettingPath(key), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to upsert setting");
  }

  const data = await response.json();
  const parsed = v.parse(UserSettingResponseSchema, data);
  return parsed.data;
}

export async function deleteUserSetting(key: string): Promise<void> {
  const response = await authFetch(buildSettingPath(key), {
    method: "DELETE",
  });

  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete setting");
  }

  await response
    .json()
    .then((data) => v.parse(UserSettingMessageResponseSchema, data))
    .catch(() => undefined);
}
