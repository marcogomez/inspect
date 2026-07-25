const DEFAULT_STORAGE_KEY = "inspect-visible";

/** read persisted visibility from localStorage; null when unset, not a stored boolean, or unreadable. */
export function getVisibilityFromStorage(storageKey: string = DEFAULT_STORAGE_KEY): boolean | null {
  try {
    const value = localStorage.getItem(storageKey);
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    return null;
  } catch {
    return null;
  }
}

/** persist panel visibility to localStorage. */
export function setVisibilityToStorage(visible: boolean, storageKey: string = DEFAULT_STORAGE_KEY): void {
  try {
    localStorage.setItem(storageKey, visible ? "true" : "false");
  } catch {
    // ignore
  }
}

/** trigger a browser download of the given state serialized as JSON. */
export function exportStateAsJSON(state: unknown, filename?: string): void {
  const jsonString = JSON.stringify(state, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = filename || `inspect-settings-${formatDateForFilename()}.json`;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

/** open a file picker for a JSON file and pass the parsed result to the callback. */
export function importStateFromJSON(callback: (state: unknown) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        try {
          const state = JSON.parse(loadEvent.target?.result as string);
          callback(state);
        } catch (err) {
          console.error("Error parsing JSON:", err);
        }
      };
      reader.readAsText(file);
    }
  });
  input.click();
}

/** serialize a config object to localStorage under the given key. */
export function saveConfig<T extends object>(storageKey: string, config: T): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(config));
  } catch {
    // ignore
  }
}

/** load a config from localStorage, merging stored values into defaults by matching key/type. */
export function loadConfig<T extends object>(storageKey: string, defaults: T): T {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return { ...defaults };
    }

    const stored = JSON.parse(raw) as Record<string, unknown>;
    const result = { ...defaults } as Record<string, unknown>;
    const defaultsRec = defaults as unknown as Record<string, unknown>;

    for (const key of Object.keys(defaultsRec)) {
      if (key in stored && typeof stored[key] === typeof defaultsRec[key]) {
        result[key] = stored[key];
      }
    }

    return result as T;
  } catch {
    return { ...defaults };
  }
}

/** remove a config entry from localStorage. */
export function clearConfig(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}

/** format a config as readable text and copy it to the clipboard. returns the text. */
export async function copyConfigToClipboard<T extends object>(config: T): Promise<string> {
  const lines: string[] = ["{"];
  const rec = config as unknown as Record<string, unknown>;
  const keys = Object.keys(rec);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = rec[key];
    const comma = i < keys.length - 1 ? "," : "";
    if (typeof value === "number") {
      // 6 decimal places keeps stored floats compact
      lines.push(`  ${key}: ${Number((value as number).toFixed(6))}${comma}`);
    } else if (typeof value === "string") {
      lines.push(`  ${key}: "${value}"${comma}`);
    } else if (typeof value === "boolean") {
      lines.push(`  ${key}: ${value}${comma}`);
    } else {
      lines.push(`  ${key}: ${JSON.stringify(value)}${comma}`);
    }
  }

  lines.push("}");
  const text = lines.join("\n");

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    console.warn("Failed to copy to clipboard");
  }

  return text;
}

/** local timestamp formatted as YYYY-MM-DD_HH-MM-SS for use in default export filenames. */
function formatDateForFilename(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}
