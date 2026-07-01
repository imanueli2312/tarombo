"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";
import { TreePine, Loader2, ArrowLeft } from "lucide-react";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Password tidak cocok");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mendaftar");
        return;
      }

      // Registration successful, redirect to login
      setActiveView("login");
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FDF6E3] via-[#F5E6D3] to-[#FFF8F0] p-4">
      <Card className="w-full max-w-md shadow-xl border-[#D4A574] overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-[#7F1D1D] via-[#DAA520] to-[#7F1D1D]" />
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-[#7F1D1D] rounded-full flex items-center justify-center mb-2">
            <TreePine className="w-8 h-8 text-[#DAA520]" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#3E2723]">
            Daftar Akun Baru
          </CardTitle>
          <CardDescription className="text-[#795548]">
            Buat akun untuk mengakses Tarombo Hariandja
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                type="text"
                placeholder="Nama lengkap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="border-[#D4A574] focus:border-[#B8860B]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="email@contoh.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-[#D4A574] focus:border-[#B8860B]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-[#D4A574] focus:border-[#B8860B]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Konfirmasi Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Ulangi password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="border-[#D4A574] focus:border-[#B8860B]"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full bg-[#7F1D1D] hover:bg-[#991B1B] text-white"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Daftar
            </Button>
            <button
              type="button"
              className="text-sm text-[#7F1D1D] hover:text-[#991B1B] flex items-center gap-1"
              onClick={() => setActiveView("login")}
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Login
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}