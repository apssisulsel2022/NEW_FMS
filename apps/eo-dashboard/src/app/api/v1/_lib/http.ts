export function getAccessToken(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const parts = header.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") return parts[1];
  return null;
}

export function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip") ?? null;
}

export async function readJson<T>(req: Request): Promise<T | null> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) return null;
  return (await req.json().catch(() => null)) as T | null;
}

