import {
  HouseIcon,
  ListMusicIcon,
  SearchIcon,
  ShieldIcon,
  SettingsIcon,
} from "@lucide/svelte";
import type { Component } from "svelte";
import { page } from "$app/state";

export interface NavItem {
  path: string;
  label: string;
  icon: Component;
}

export const navItems: NavItem[] = [
  { path: "/", label: "Home", icon: HouseIcon },
  { path: "/search", label: "Search", icon: SearchIcon },
  { path: "/library", label: "Library", icon: ListMusicIcon },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
];

export function isActive(tabPath: string, currentPath?: string): boolean {
  if (tabPath === "/") {
    return (currentPath ?? page.url.pathname) === "/";
  }
  return (currentPath ?? page.url.pathname).startsWith(tabPath);
}
