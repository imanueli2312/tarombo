import { NextResponse } from "next/server";
import { HTTPError } from "./auth";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function handleApi<T>(
  fn: () => Promise<T> | T
): Promise<NextResponse> {
  try {
    const result = await fn();
    if (result instanceof NextResponse) return result;
    return json(result);
  } catch (e: any) {
    if (e instanceof HTTPError) {
      return errorResponse(e.status, e.message);
    }
    console.error("[api] error:", e);
    return errorResponse(500, e?.message ?? "Internal server error");
  }
}
