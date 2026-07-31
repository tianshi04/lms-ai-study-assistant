import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient, Client, Interceptor, ConnectError, Code } from "@connectrpc/connect";
import type { DescService } from "@bufbuild/protobuf";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function doSilentRefreshToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const res = await fetch("/api/auth/refresh", { method: "POST" });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    console.warn("Silent token refresh failed:", err);
  }

  // If refresh fails, clear user metadata and redirect to login
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_email");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_role");
  return false;
}

/**
 * ConnectRPC Interceptor for Silent Token Refresh.
 * Note: Authorization header is no longer manually attached here because
 * HttpOnly cookies are automatically sent by the browser.
 */
const authInterceptor: Interceptor = (next) => async (req) => {
  try {
    return await next(req);
  } catch (err) {
    // Catch Unauthenticated (401) errors and attempt silent auto-refresh via Next.js API
    if (err instanceof ConnectError && err.code === Code.Unauthenticated) {
      if (
        req.service.typeName === "identity.v1.IdentityService" &&
        req.method.name === "RefreshToken"
      ) {
        throw err;
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = doSilentRefreshToken().finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
      }

      const success = await refreshPromise;
      if (success) {
        // Retry the failed request. The browser will automatically send the new HttpOnly cookies.
        return await next(req);
      }
    }
    throw err;
  }
};

/**
 * Shared ConnectRPC Transport instance configured with auth interceptors.
 */
export const transport = createConnectTransport({
  baseUrl: API_BASE_URL,
  interceptors: [authInterceptor],
  fetch: (input, init) => {
    const options = init || {};
    options.credentials = "include"; // Send HttpOnly cookies cross-origin
    return fetch(input, options);
  },
});

/**
 * Factory function to obtain a typed ConnectRPC client for any generated service schema.
 *
 * @example
 * import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
 * const catalogClient = getRpcClient(CatalogService);
 */
export function getRpcClient<T extends DescService>(service: T): Client<T> {
  return createClient(service, transport);
}
