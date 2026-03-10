"use client";

import { useEffect, useMemo, useState } from "react";

import { useSession } from "@/lib/useSession";

export type EventOrganizerSummary = {
  id: string;
  name: string;
  slug: string;
};

export function useEventOrganizers() {
  const session = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EventOrganizerSummary[]>([]);

  const authHeader = useMemo(() => {
    if (!session.accessToken) return "";
    return `Bearer ${session.accessToken}`;
  }, [session.accessToken]);

  useEffect(() => {
    if (!session.accessToken) return;

    setLoading(true);
    setError(null);

    fetch("/api/event-organizers", { headers: { Authorization: authHeader } })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "Failed to load event organizers");
        setData(body.data ?? []);
      })
      .catch((e: any) => setError(e?.message ?? "Failed to load event organizers"))
      .finally(() => setLoading(false));
  }, [authHeader, session.accessToken]);

  return { loading, error, data };
}

