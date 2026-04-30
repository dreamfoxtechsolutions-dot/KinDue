import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Bell, Check } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  notificationsApi,
  type AppNotification,
} from "@/lib/notifications-api";

const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => notificationsApi.list(50),
    // Light polling so a freshly assigned bill shows up while the user
    // is logged in. 30s feels live without hammering the API.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });

  const markAllRead = useMutation({
    // Bell defaults to active-household scope so "Mark all read" only
    // clears what the user actually sees in the dropdown.
    mutationFn: () => notificationsApi.markAllRead({ household: "active" }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });

  const unread = data?.unread ?? 0;
  const items: AppNotification[] = data?.notifications ?? [];
  const activeHouseholdId = data?.activeHouseholdId ?? null;

  const handleClick = (n: AppNotification) => {
    setOpen(false);
    if (!n.readAt) {
      markRead.mutate(n.id);
    }
    if (n.link) {
      setLocation(n.link);
    }
  };

  // Re-poll whenever the popover opens so the user always sees fresh data.
  useEffect(() => {
    if (open) {
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    }
  }, [open, qc]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={
            unread > 0
              ? `Notifications, ${unread} unread`
              : "Notifications"
          }
          data-testid="notification-bell"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1",
                "rounded-full bg-destructive text-destructive-foreground",
                "text-[10px] font-semibold leading-none",
                "flex items-center justify-center",
                "border border-sidebar",
              )}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Notifications
          </div>
          {unread > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <Check className="h-3 w-3" />
              Mark all read
            </Button>
          ) : null}
        </div>

        <ScrollArea className="max-h-[420px]">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors",
                      "flex gap-3 items-start",
                      !n.readAt && "bg-muted/30",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 rounded-full shrink-0",
                        n.readAt ? "bg-transparent" : "bg-primary",
                      )}
                      aria-hidden
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-sm leading-snug">
                        {n.title}
                      </span>
                      {n.body ? (
                        <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">
                          {n.body}
                        </span>
                      ) : null}
                      <span className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          {formatRelative(n.createdAt)}
                        </span>
                        {n.householdName &&
                        n.householdId !== 0 &&
                        n.householdId !== activeHouseholdId ? (
                          <span
                            className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground border border-border rounded px-1.5 py-0.5"
                            data-testid={`notif-household-${n.id}`}
                          >
                            {n.householdName}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="border-t border-border px-4 py-2 flex justify-center">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setLocation("/notifications");
            }}
            className="text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors"
            data-testid="notifications-see-all"
          >
            See all
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
