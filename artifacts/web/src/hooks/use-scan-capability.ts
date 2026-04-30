import { useAuth } from "@clerk/react";

/**
 * "Can the current user trigger an inbox scan?"
 *
 * TODO: backend not implemented — this used to call
 * `GET /bills/scan-status`, which doesn't exist on the real API. Until
 * we add it, we conservatively return `canScan: false` for everyone so
 * scan buttons stay disabled rather than 403'ing on click.
 *
 * Tri-state on purpose: `undefined` while Clerk loads, then `false`
 * once we know the user is signed in. Callers must NOT default
 * `undefined` to `true` — that would flash the scan button at users
 * who can't actually use it.
 */
export function useScanCapability(): {
  canScan: boolean | undefined;
  isLoaded: boolean;
} {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return { canScan: undefined, isLoaded: false };
  if (!isSignedIn) return { canScan: false, isLoaded: true };
  return { canScan: false, isLoaded: true };
}
