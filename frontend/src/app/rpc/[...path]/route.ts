import { type NextRequest } from "next/server";
import { getInternalApiUrl } from "@/lib/server_connect_client";

async function handleRpcProxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const targetPath = path.join("/");
  const backendUrl = getInternalApiUrl();
  const targetUrl = `${backendUrl.replace(/\/+$/, "")}/${targetPath}${request.nextUrl.search}`;

  // 1. Forward request headers while stripping hop-by-hop headers
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");

  try {
    const isBodyAllowed = request.method !== "GET" && request.method !== "HEAD";
    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: isBodyAllowed ? request.body : undefined,
      // @ts-expect-error duplex is required in Node.js fetch for streaming request bodies
      duplex: "half",
      redirect: "manual",
    });

    // 2. Stream the response directly back to client
    const responseHeaders = new Headers(backendResponse.headers);
    // Remove compression and content-length headers since fetch transparently decompresses
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[ConnectRPC Proxy] Failed to forward to ${targetUrl}:`, error);
    return new Response(
      JSON.stringify({
        code: "unavailable",
        message: "Dịch vụ backend tạm thời không phản hồi",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export const GET = handleRpcProxy;
export const POST = handleRpcProxy;
export const OPTIONS = handleRpcProxy;
