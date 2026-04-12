/**
 * Strips HTML and script tags from user input before passing to AI.
 * Prevents injection of markup into LLM context.
 */
export function sanitize(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .trim();
}
