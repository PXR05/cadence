import {
    HouseIcon,
    ListMusicIcon,
    SearchIcon,
    ShieldIcon,
    SettingsIcon,
} from "@lucide/svelte";
import type { Component } from "svelte";

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
