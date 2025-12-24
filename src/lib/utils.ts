import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

export function vaulEase(x: number) {
  const x1 = 0.32, y1 = 0.72;
  const x2 = 0,    y2 = 1;

  function getT(t: number, p1: number, p2: number) {
    return 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
  }

  function getSlope(t: number, p1: number, p2: number) {
    return 3 * (1 - t) * (1 - t) * p1 + 6 * (1 - t) * t * (p2 - p1) + 3 * t * t * (1 - p2);
  }

  let t = x; 
  for (let i = 0; i < 8; i++) {
    const currentX = getT(t, x1, x2) - x;
    const currentSlope = getSlope(t, x1, x2);
    if (Math.abs(currentSlope) < 1e-7) break;
    t -= currentX / currentSlope;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
  }

  return getT(t, y1, y2);
}