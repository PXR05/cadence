import * as v from "valibot";
import {
  UserSettingMessageResponseSchema,
  UserSettingResponseSchema,
  type UserSettingItem,
} from "$lib/schemas/settings";
import { backendRequest } from "../client";
import { backendConfig } from "../config";
import { requireBackendCapability } from "../capabilities";

export async function getUserSetting(
  key: string,
): Promise<UserSettingItem | null> {
  requireBackendCapability("settingsSync");
  const response = await backendRequest(backendConfig.routes.settings.item(key));
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to get setting: ${response.statusText}`);
  return v.parse(UserSettingResponseSchema, await response.json()).data;
}

export async function upsertUserSetting(
  key: string,
  value: string,
): Promise<UserSettingItem> {
  requireBackendCapability("settingsSync");
  const response = await backendRequest(backendConfig.routes.settings.item(key), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to upsert setting");
  }
  return v.parse(UserSettingResponseSchema, await response.json()).data;
}

export async function deleteUserSetting(key: string): Promise<void> {
  requireBackendCapability("settingsSync");
  const response = await backendRequest(backendConfig.routes.settings.item(key), {
    method: "DELETE",
  });
  if (response.status === 404) return;
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete setting");
  }
  await response
    .json()
    .then((data) => v.parse(UserSettingMessageResponseSchema, data))
    .catch(() => undefined);
}
