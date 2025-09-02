// src/lib/ageGate.ts
const KEY = "age-ok-v1";

export function isAgeAccepted(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    return v === "yes";
  } catch {
    return false;
  }
}

export function acceptAge(): void {
  try {
    localStorage.setItem(KEY, "yes");
    document.documentElement.setAttribute("data-age-ok", "yes");
  } catch {
    // noop
  }
}

export function applyAgeAttrFromStorage(): void {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "yes") document.documentElement.setAttribute("data-age-ok", "yes");
    else document.documentElement.removeAttribute("data-age-ok");
  } catch {
    // noop
  }
}

