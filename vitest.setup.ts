import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// happy-dom defines HTMLInputElement.files as a getter-only property. The signup page's
// useEffect re-attaches the selected file via `fileInputRef.current.files = dataTransfer.files`
// (DataTransfer trick to preserve files across re-renders). Override to allow the assignment
// so the effect doesn't throw inside React's commit phase during tests.
if (typeof HTMLInputElement !== "undefined") {
  const filesStore = new WeakMap<HTMLInputElement, FileList | null>();
  Object.defineProperty(HTMLInputElement.prototype, "files", {
    configurable: true,
    get(this: HTMLInputElement) {
      return filesStore.get(this) ?? null;
    },
    set(this: HTMLInputElement, value: FileList | null) {
      filesStore.set(this, value);
    },
  });
}

afterEach(async () => {
  cleanup();
  // Clear router push/replace tracking arrays so they don't leak across tests.
  // Import dynamically — the mock module is only loaded when a test mocks next/navigation.
  try {
    const mod = await import("./src/test/mocks/next-navigation");
    mod.routerPush.length = 0;
    mod.routerReplace.length = 0;
    mod.clearRedirects();
  } catch {
    // mock not loaded — fine
  }
});
