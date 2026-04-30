import { useAuth } from "@clerk/react";
import { useCallback } from "react";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

export function useApiClient() {
  const { getToken } = useAuth();

  const request = useCallback(async (method: string, path: string, body?: unknown) => {
    const token = await getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }

    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return null;
    }

    return res.json();
  }, [getToken]);

  return {
    get: (path: string) => request("GET", path),
    post: (path: string, body?: unknown) => request("POST", path, body),
    put: (path: string, body?: unknown) => request("PUT", path, body),
    patch: (path: string, body?: unknown) => request("PATCH", path, body),
    delete: (path: string) => request("DELETE", path),
  };
}
