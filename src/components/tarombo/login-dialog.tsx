"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, LogIn, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { setActiveUser } from "@/lib/tarombo/api-client";
import type { PublicUser } from "@/lib/tarombo/api-client";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** user yang dipilih untuk login */
  user: PublicUser | null;
  onLoggedIn: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function LoginDialog({ open, onOpenChange, user, onLoggedIn }: Props) {
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = (o: boolean) => {
    if (!o) {
      setPassword("");
      setError(null);
      setShowPass(false);
    }
    onOpenChange(o);
  };

  const submit = async () => {
    if (!user) return;
    setError(null);
    if (!password) {
      setError("Password wajib diisi.");
      return;
    }
    setBusy(true);
    try {
      await setActiveUser(user.id, password);
      toast.success(`Berhasil login sebagai ${user.name}.`);
      setPassword("");
      setShowPass(false);
      onOpenChange(false);
      onLoggedIn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="size-4 text-primary" />
            Login Pengguna
          </DialogTitle>
          <DialogDescription className="text-xs">
            Masukkan password untuk mengakses akun ini. Viewer tetap bisa
            melihat pohon tanpa login.
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div className="flex items-center gap-2.5 rounded-md border bg-card p-2.5">
            <Avatar className="size-10 border">
              <AvatarFallback
                className="text-[11px] font-semibold bg-primary/15 text-primary"
                style={
                  user.roleColor
                    ? {
                        color: user.roleColor,
                        backgroundColor: user.roleColor + "20",
                      }
                    : {}
                }
              >
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold truncate">{user.name}</p>
              {user.roleName && (
                <Badge
                  variant="outline"
                  className="text-[9px] h-[15px] px-1 mt-0.5"
                  style={
                    user.roleColor
                      ? {
                          color: user.roleColor,
                          borderColor: user.roleColor + "40",
                          backgroundColor: user.roleColor + "10",
                        }
                      : {}
                  }
                >
                  {user.roleName}
                </Badge>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-1.5 py-1">
          <Label className="text-[11.5px] flex items-center gap-1">
            <Lock className="size-3" />
            Password
          </Label>
          <div className="relative">
            <Input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="••••••••"
              autoFocus
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title={showPass ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPass ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {user?.roleName === "Administrator" && (
            <p className="text-[10px] text-muted-foreground">
              Demo: password admin default adalah <code className="bg-muted px-1 rounded">admin123</code>
            </p>
          )}
          {user?.roleName === "Editor" && (
            <p className="text-[10px] text-muted-foreground">
              Demo: password editor default adalah <code className="bg-muted px-1 rounded">robby123</code>
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={busy}>
            Batal
          </Button>
          <Button onClick={submit} disabled={busy || !password}>
            {busy ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : (
              <LogIn className="size-4 mr-1.5" />
            )}
            Login
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
