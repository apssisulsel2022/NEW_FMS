"use client";

import { useEffect, useState } from "react";

const storageKey = "fms.activeEventOrganizerId";

export function useActiveEventOrganizer() {
  const [eventOrganizerId, setEventOrganizerId] = useState<string>("");

  useEffect(() => {
    const existing = window.localStorage.getItem(storageKey);
    if (existing) setEventOrganizerId(existing);
  }, []);

  useEffect(() => {
    if (!eventOrganizerId) return;
    window.localStorage.setItem(storageKey, eventOrganizerId);
  }, [eventOrganizerId]);

  return { eventOrganizerId, setEventOrganizerId };
}

