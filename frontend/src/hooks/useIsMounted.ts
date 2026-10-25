import { useSyncExternalStore } from "react";

function emptySubscribe() {
  return () => {};
}

/**
 * Hook to determine if the component has mounted on the client.
 * Uses `useSyncExternalStore` to avoid cascading render passes from `useEffect` setState.
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
