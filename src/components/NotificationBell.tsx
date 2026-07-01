"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export function NotificationBell() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const lastCheckRef = useRef<string>(new Date().toISOString());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!session) return;

    const checkChanges = async () => {
      try {
        const res = await fetch(`/api/notifications?since=${lastCheckRef.current}`);
        const data = await res.json();
        if (data.hasChanges) {
          setHasChanges(true);
          toast.info("Data telah diperbarui oleh pengguna lain", {
            action: {
              label: "Refresh",
              onClick: () => {
                queryClient.invalidateQueries();
                setHasChanges(false);
                lastCheckRef.current = data.timestamp;
              },
            },
          });
          lastCheckRef.current = data.timestamp;
        }
      } catch {
        // Silently fail
      }
    };

    // Check every 30 seconds
    intervalRef.current = setInterval(checkChanges, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session, queryClient]);

  if (!session) return null;

  const handleRefresh = () => {
    queryClient.invalidateQueries();
    setHasChanges(false);
    lastCheckRef.current = new Date().toISOString();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      className="relative h-8 w-8"
    >
      <Bell className="h-4 w-4" />
      {hasChanges && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full" />
      )}
    </Button>
  );
}