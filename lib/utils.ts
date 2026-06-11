import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a collision-resistant unique id.
 * Uses crypto.randomUUID() (browser + Node 16+/Edge); falls back to a
 * timestamp + random string on the rare environment without it.
 * Pass a prefix to namespace ids (e.g. newId('lbl') → "lbl_<uuid>").
 */
export function newId(prefix?: string): string {
  const uuid =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${uuid}` : uuid;
}
