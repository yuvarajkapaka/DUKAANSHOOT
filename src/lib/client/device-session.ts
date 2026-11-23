"use client";

/**
 * Which device account is signed in — per browser TAB.
 * sessionStorage lets a presenter keep "Demo as Seller" in one window and
 * "Demo as Buyer" in another; localStorage remembers the last one for new tabs
 * and for the installed app.
 *
 * The `ds_roles` cookie lists the roles signed in on this device so the
 * middleware can guard /seller/* and /account/* before any page renders.
 */
const KEY = "ds_session";
export const ROLES_COOKIE = "ds_roles";

export function getDeviceUser(): string | null {
  try {
    return sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function writeRoles(roles: Set<string>) {
  const v = Array.from(roles).join(".");
  document.cookie = v
    ? `${ROLES_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`
    : `${ROLES_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function readRoles(): Set<string> {
  const m = document.cookie.match(new RegExp(`(?:^|; )${ROLES_COOKIE}=([^;]*)`));
  return new Set((m?.[1] ?? "").split(".").filter(Boolean));
}

export function setDeviceUser(userId: string, role: "seller" | "buyer" | null) {
  sessionStorage.setItem(KEY, userId);
  localStorage.setItem(KEY, userId);
  const roles = readRoles();
  roles.add("user");
  if (role) roles.add(role);
  writeRoles(roles);
}

export function addDeviceRole(role: "seller" | "buyer") {
  const roles = readRoles();
  roles.add(role);
  writeRoles(roles);
}

export function clearDeviceUser(role: "seller" | "buyer" | null) {
  sessionStorage.removeItem(KEY);
  localStorage.removeItem(KEY);
  const roles = readRoles();
  if (role) roles.delete(role);
  if (!roles.has("seller") && !roles.has("buyer")) roles.clear();
  writeRoles(roles);
}
