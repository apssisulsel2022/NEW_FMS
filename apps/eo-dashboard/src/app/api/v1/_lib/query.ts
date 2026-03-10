export type Pagination = { limit: number; offset: number };

export function parsePagination(url: URL, defaults?: { limit?: number; offset?: number; maxLimit?: number }) {
  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");
  const pageRaw = url.searchParams.get("page");
  const perPageRaw = url.searchParams.get("perPage");

  const maxLimit = defaults?.maxLimit ?? 100;
  const defaultLimit = defaults?.limit ?? 50;
  const defaultOffset = defaults?.offset ?? 0;

  let limit = defaultLimit;
  let offset = defaultOffset;

  if (pageRaw || perPageRaw) {
    const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
    const perPage = Math.max(1, Number.parseInt(perPageRaw ?? `${defaultLimit}`, 10) || defaultLimit);
    limit = Math.min(maxLimit, perPage);
    offset = (page - 1) * limit;
    return { limit, offset } satisfies Pagination;
  }

  if (limitRaw) limit = Math.min(maxLimit, Math.max(1, Number.parseInt(limitRaw, 10) || defaultLimit));
  if (offsetRaw) offset = Math.max(0, Number.parseInt(offsetRaw, 10) || defaultOffset);

  return { limit, offset } satisfies Pagination;
}

export function parseSort<T extends string>(
  url: URL,
  allowed: readonly T[],
  defaults?: { sortBy?: T; sortOrder?: "asc" | "desc" }
) {
  const sortBy = (url.searchParams.get("sortBy") as T | null) ?? defaults?.sortBy ?? null;
  const sortOrderRaw = (url.searchParams.get("sortOrder") ?? defaults?.sortOrder ?? "desc").toLowerCase();
  const sortOrder = sortOrderRaw === "asc" ? "asc" : "desc";

  if (!sortBy) return null;
  if (!allowed.includes(sortBy)) return null;
  return { sortBy, sortOrder } as const;
}

export function parseSearch(url: URL) {
  const q = url.searchParams.get("q") ?? url.searchParams.get("search") ?? "";
  return q.trim() ? q.trim() : null;
}
