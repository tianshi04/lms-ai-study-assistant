import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient, Client } from "@connectrpc/connect";
import type { DescService } from "@bufbuild/protobuf";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Shared ConnectRPC Transport instance configured for browser API calls.
 */
export const transport = createConnectTransport({
  baseUrl: API_BASE_URL,
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
