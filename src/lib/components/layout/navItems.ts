import {
  HouseIcon,
  ListMusicIcon,
  SearchIcon,
  ShieldIcon,
  SettingsIcon,
  DiamondIcon,
  LibraryIcon,
} from "@lucide/svelte";
import type { Component } from "svelte";
import { page } from "$app/state";

export interface NavItem {
  path: string;
  label: string;
  icon: Component;
  action?: () => void;
}

export const navItems: NavItem[] = [
  { path: "/", label: "Home", icon: DiamondIcon },
  {
    path: "/search",
    label: "Search",
    icon: SearchIcon,
    action: () => {
      const input = document.querySelector("input[type='search']");
      if (input && input instanceof HTMLInputElement) {
        input.focus();
      }
    },
  },
  { path: "/library", label: "Library", icon: LibraryIcon },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
];

export function isActive(tabPath: string, currentPath?: string): boolean {
  if (tabPath === "/") {
    return (currentPath ?? page.url.pathname) === "/";
  }
  return (currentPath ?? page.url.pathname).startsWith(tabPath);
}
