"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

function getPasswordStrength(password: string): {
  label: string;
  color: string;
  bgColor: string;
  percent: number;
} {
  if (!password || password.length < 8) {
    return { label: "Lemah", color: "text-red-600", bgColor: "bg-red-500", percent: 25 };
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const hasLetterMix = hasUpper && hasLower;

  if (hasLetterMix && hasNumber && hasSpecial) {
    return { label: "Kuat", color: "text-green-600", bgColor: "bg-green-500", percent: 100 };
  }
  if ((hasLetterMix && hasNumber) || (hasLetterMix && hasSpecial) || (hasNumber && hasSpecial)) {
    return { label: "Sedang", color: "text-amber-600", bgColor: "bg-amber-500", percent: 60 };
  }
  return { label: "Lemah", color: "text-red-600", bgColor: "bg-red-500", percent: 40 };
}

export function PasswordChange() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = getPasswordStrength(newPassword);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah password");
      return data;
    },
    onSuccess: () => {
      toast.success("Password berhasil diubah");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Semua field wajib diisi");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password baru minimal 8 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak sesuai");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("Password baru harus berbeda dari password lama");
      return;
    }

    mutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-amber-900">Ubah Password</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Perbarui password akun Anda
        </p>
      </div>

      <Card className="border-amber-200/50 max-w-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-amber-900 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Keamanan Akun
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="current-password" className="text-xs font-medium text-amber-900">
                Password Lama
              </Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="border-amber-200 pr-9"
                  placeholder="Masukkan password lama"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-xs font-medium text-amber-900">
                Password Baru
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="border-amber-200 pr-9"
                  placeholder="Minimal 8 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength indicator */}
              {newPassword.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Kekuatan password</span>
                    <span className={`text-[10px] font-semibold ${strength.color}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.bgColor}`}
                      style={{ width: `${strength.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-xs font-medium text-amber-900">
                Konfirmasi Password Baru
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`border-amber-200 pr-9 ${
                    confirmPassword.length > 0 && confirmPassword !== newPassword
                      ? "border-red-400 focus-visible:ring-red-400"
                      : confirmPassword.length > 0 && confirmPassword === newPassword
                        ? "border-green-400 focus-visible:ring-green-400"
                        : ""
                  }`}
                  placeholder="Ulangi password baru"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                <p className="text-[10px] text-red-500">Password tidak cocok</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-amber-700 hover:bg-amber-800"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Ubah Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}