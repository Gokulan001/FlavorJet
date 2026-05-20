type CookieAttrs = Record<string, unknown>;

const cookieStore = new Map<string, { value: string; attributes?: CookieAttrs }>();
const headerStore = new Map<string, string>();

export function setMockHeader(name: string, value: string) {
  headerStore.set(name.toLowerCase(), value);
}

export function setMockCookie(name: string, value: string) {
  cookieStore.set(name, { value });
}

export function getMockCookie(name: string) {
  return cookieStore.get(name);
}

export function clearMockHeadersAndCookies() {
  cookieStore.clear();
  headerStore.clear();
}

export const cookies = async () => ({
  get: (name: string) => {
    const entry = cookieStore.get(name);
    return entry !== undefined ? { name, value: entry.value } : undefined;
  },
  set: (
    nameOrObj: string | { name: string; value: string; [k: string]: unknown },
    value?: string,
    attributes?: CookieAttrs,
  ) => {
    if (typeof nameOrObj === "string") {
      cookieStore.set(nameOrObj, { value: value ?? "", attributes });
    } else {
      const { name, value: v, ...rest } = nameOrObj;
      cookieStore.set(name, { value: String(v ?? ""), attributes: rest });
    }
  },
  delete: (name: string) => {
    cookieStore.delete(name);
  },
});

export const headers = async () => ({
  get: (name: string) => headerStore.get(name.toLowerCase()) ?? null,
});
