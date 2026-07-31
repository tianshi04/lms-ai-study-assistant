import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient, Client, Interceptor, ConnectError, Code } from "@connectrpc/connect";
import type { DescService } from "@bufbuild/protobuf";
import { refreshSessionAction } from "@/app/auth/actions";

const API_BASE_URL =
  typeof window !== "undefined"
    ? "/api/rpc"
    : process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * ConnectRPC Interceptor for handling 401 Unauthenticated errors.
 * Triggers a silent token refresh via Server Action (which manages HttpOnly cookies).
 */
const refreshInterceptor: Interceptor = (next) => async (req) => {
  try {
    return await next(req);
  } catch (err) {
    if (err instanceof ConnectError && err.code === Code.Unauthenticated) {
      if (
        req.service.typeName === "identity.v1.IdentityService" &&
        req.method.name === "RefreshToken"
      ) {
        throw err;
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshSessionAction()
          .then((res) => res.success)
          .finally(() => {
            isRefreshing = false;
            refreshPromise = null;
          });
      }

      const refreshed = await refreshPromise;
      if (refreshed) {
        // Retry the failed request transparently — browser will auto-send the updated access_token cookie
        return await next(req);
      } else if (typeof window !== "undefined") {
        // Refresh failed, redirect to login if on client
        window.location.href = "/auth/login";
      }
    }
    throw err;
  }
};

/**
 * Shared ConnectRPC Transport instance configured to include cookies on all requests.
 */
export const transport = createConnectTransport({
  baseUrl: API_BASE_URL,
  fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
  interceptors: [refreshInterceptor],
});

/**
 * Module-level cache for ConnectRPC client instances.
 * Avoids redundant createClient() calls on every render or hook invocation.
 */
const clientCache = new Map<string, Client<DescService>>();

/**
 * Factory function to obtain a typed ConnectRPC client for any generated service schema.
 * Returns a cached instance if one already exists for the given service.
 *
 * @example
 * import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
 * const catalogClient = getRpcClient(CatalogService);
 */
export function getRpcClient<T extends DescService>(service: T): Client<T> {
  const key = service.typeName;
  if (!clientCache.has(key)) {
    clientCache.set(key, createClient(service, transport));
  }
  return clientCache.get(key) as Client<T>;
}
