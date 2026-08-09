import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient, Client, Interceptor } from "@connectrpc/connect";
import type { DescService } from "@bufbuild/protobuf";
import { cookies } from "next/headers";

const API_BASE_URL =
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Server-side ConnectRPC Interceptor to inject Authorization Bearer token from cookies.
 */
const serverAuthInterceptor: Interceptor = (next) => async (req) => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (token) {
      req.header.set("Authorization", `Bearer ${token}`);
    }
  } catch {
    // If called outside request context (e.g. static build generation), ignore header injection
  }
  return await next(req);
};

/**
 * Obtain a public ConnectRPC client without reading cookies/request-headers.
 * Safe for use inside Next.js 16 `"use cache"` cached scopes.
 */
export function getPublicRpcServerClient<T extends DescService>(service: T): Client<T> {
  const transport = createConnectTransport({
    baseUrl: API_BASE_URL,
    fetch: (input, init) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      return fetch(input, {
        ...init,
        signal: init?.signal
          ? AbortSignal.any([init.signal, controller.signal])
          : controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  });
  return createClient(service, transport);
}

/**
 * Factory function to obtain a typed ConnectRPC client configured for Server Components (RSC).
 * Automatically attaches Authorization header from cookies.
 *
 * @example
 * import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
 * const catalogClient = await getRpcServerClient(CatalogService);
 */
export async function getRpcServerClient<T extends DescService>(service: T): Promise<Client<T>> {
  const transport = createConnectTransport({
    baseUrl: API_BASE_URL,
    interceptors: [serverAuthInterceptor],
  });
  return createClient(service, transport);
}
