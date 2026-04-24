import type { NextRequest } from "next/server";

const hopByHopHeaders = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

function getApiProxyTarget() {
  return (
    process.env.API_PROXY_TARGET ??
    process.env.API_INTERNAL_BASE_URL ??
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

export async function proxyToApi(
  request: NextRequest,
  pathname: string
) {
  const upstreamUrl = new URL(`${getApiProxyTarget()}${pathname}`);
  upstreamUrl.search = new URL(request.url).search;

  const requestHeaders = new Headers(request.headers);

  for (const header of hopByHopHeaders) {
    requestHeaders.delete(header);
  }

  const requestInit: RequestInit = {
    method: request.method,
    headers: requestHeaders,
    cache: "no-store",
    redirect: "manual"
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    requestInit.body = await request.arrayBuffer();
  }

  const response = await fetch(upstreamUrl, requestInit);

  const responseHeaders = new Headers(response.headers);

  for (const header of hopByHopHeaders) {
    responseHeaders.delete(header);
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders
  });
}
