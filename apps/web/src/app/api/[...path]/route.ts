import type { NextRequest } from "next/server";

import { proxyToApi } from "../../../lib/api-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function handleRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;

  return proxyToApi(request, `/api/${path.join("/")}`);
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const OPTIONS = handleRequest;
export const HEAD = handleRequest;
