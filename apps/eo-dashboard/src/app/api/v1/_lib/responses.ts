import { NextResponse } from "next/server";

export type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { status: init?.status ?? 200, headers: init?.headers });
}

export function okMeta<T>(
  data: T,
  meta: { limit: number; offset: number; count: number | null },
  init?: ResponseInit
) {
  return NextResponse.json({ data, meta }, { status: init?.status ?? 200, headers: init?.headers });
}

export function created<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { status: init?.status ?? 201, headers: init?.headers });
}

export function noContent(init?: ResponseInit) {
  return new NextResponse(null, { status: init?.status ?? 204, headers: init?.headers });
}

export function fail(status: number, error: ApiErrorPayload, init?: ResponseInit) {
  return NextResponse.json({ error }, { status, headers: init?.headers });
}

