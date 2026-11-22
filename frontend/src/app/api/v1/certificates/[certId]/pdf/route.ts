import { type NextRequest } from "next/server";
import { getInternalApiUrl } from "@/lib/server_connect_client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certId: string }> },
) {
  const { certId } = await params;
  const backendUrl = getInternalApiUrl().replace(/\/+$/, "");
  const targetUrl = `${backendUrl}/api/v1/certificates/${encodeURIComponent(certId)}/pdf${request.nextUrl.search}`;

  const headers = new Headers();
  const token = request.cookies.get("access_token")?.value;
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  try {
    const backendResponse = await fetch(targetUrl, {
      method: "GET",
      headers,
      redirect: "manual",
    });

    const responseHeaders = new Headers(backendResponse.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[Certificate PDF Proxy] Failed to forward to ${targetUrl}:`, error);
    return new Response(
      JSON.stringify({
        detail: "Dịch vụ tạo PDF chứng chỉ tạm thời không phản hồi.",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      },
    );
  }
}
