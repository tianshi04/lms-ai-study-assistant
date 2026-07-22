import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient, Client, Interceptor, ConnectError, Code } from "@connectrpc/connect";
import type { DescService } from "@bufbuild/protobuf";
import { IdentityService } from "@/gen/identity/v1/identity_pb";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function doSilentRefreshToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;

  try {
    // Create direct un-intercepted client for refresh call to prevent infinite loop
    const rawTransport = createConnectTransport({ baseUrl: API_BASE_URL });
    const client = createClient(IdentityService, rawTransport);
    const res = await client.refreshToken({ refreshToken });

    if (res.accessToken) {
      localStorage.setItem("access_token", res.accessToken);
      if (res.refreshToken) {
        localStorage.setItem("refresh_token", res.refreshToken);
      }
      return res.accessToken;
    }
  } catch (err) {
    console.warn("Silent token refresh failed:", err);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_id");
  }
  return null;
}

/**
 * ConnectRPC Interceptor for automatic Bearer Authorization injection & Silent Token Refresh.
 */
const authInterceptor: Interceptor = (next) => async (req) => {
  // 1. Attach Authorization: Bearer <access_token> header if available
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      req.header.set("Authorization", `Bearer ${token}`);
    }
  }

  try {
    return await next(req);
  } catch (err) {
    // 2. Catch Unauthenticated (401) errors and attempt silent auto-refresh
    if (err instanceof ConnectError && err.code === Code.Unauthenticated) {
      if (req.service.typeName === "identity.v1.IdentityService" && req.method.name === "RefreshToken") {
        throw err;
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = doSilentRefreshToken().finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        // Retry the failed request transparently with new Access Token
        req.header.set("Authorization", `Bearer ${newToken}`);
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
