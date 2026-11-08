/** Text shown when an error has no server-approved public message. */
export const DEFAULT_PUBLIC_FALLBACK = "Something went wrong.";

/**
 * Text that is safe to show to end users. Returns the error's `public.message`
 * when the server approved one, and `fallback` otherwise. It never returns the
 * developer `message`, which can contain API text, keys or internal detail.
 *
 * @example
 * ```tsx
 * const { error } = useChat({ api: "/api/chat" });
 * if (error) return <p>{getPublicMessage(error)}</p>;
 * ```
 */
export function getPublicMessage(
  error: unknown,
  fallback: string = DEFAULT_PUBLIC_FALLBACK
): string {
  if (typeof error !== "object" || error === null) return fallback;
  const publicDetails = (error as { public?: unknown }).public;
  if (typeof publicDetails !== "object" || publicDetails === null) {
    return fallback;
  }
  const message = (publicDetails as { message?: unknown }).message;
  return typeof message === "string" && message.trim().length > 0
    ? message
    : fallback;
}
