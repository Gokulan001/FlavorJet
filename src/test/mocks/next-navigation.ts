export const redirectCalls: string[] = [];

export class RedirectError extends Error {
  // Real next/navigation redirect throws an Error with a `digest` property that
  // server-action catch blocks check for (`"digest" in e`) to detect and re-throw.
  // We mirror that shape so tests for actions that wrap redirect in try/catch pass.
  public digest: string;
  constructor(public to: string) {
    super(`NEXT_REDIRECT: ${to}`);
    this.name = "RedirectError";
    this.digest = `NEXT_REDIRECT;${to}`;
  }
}

export function redirect(url: string): never {
  redirectCalls.push(url);
  throw new RedirectError(url);
}

export class NotFoundError extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export function notFound(): never {
  throw new NotFoundError();
}

export function clearRedirects() {
  redirectCalls.length = 0;
}

export function useSearchParams() {
  return new URLSearchParams();
}

export const routerPush: string[] = [];
export const routerReplace: string[] = [];

export function useRouter() {
  return {
    push: (url: string) => {
      routerPush.push(url);
    },
    replace: (url: string) => {
      routerReplace.push(url);
    },
    refresh: () => {},
    back: () => {},
    forward: () => {},
    prefetch: () => {},
  };
}

export function usePathname() {
  return "/";
}
