"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
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
import { TreePine, Loader2 } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // NextAuth doesn't easily pass custom errors, so we check for common patterns
        setError("Email atau password salah");
      } else if (result?.ok) {
        setActiveView("tree");
      }
    } catch (err) {
      // Rate limit errors from our custom authorize throw
      if (err instanceof Error && err.message.includes("Terlalu banyak")) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--t-bg-cream)] via-[var(--t-bg-warm)] to-[var(--t-bg-card)] p-4">
      <Card className="w-full max-w-md shadow-xl border-[var(--t-border)] overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-[var(--t-primary)] via-[var(--t-secondary)] to-[var(--t-primary)]" />
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-[var(--t-primary)] rounded-full flex items-center justify-center mb-2">
            <TreePine className="w-8 h-8 text-[var(--t-secondary)]" />
          </div>
          <CardTitle className="text-2xl font-bold text-[var(--t-text)]">
            Tarombo Hariandja
          </CardTitle>
          <CardDescription className="text-[var(--t-text-sec)]">
            Sistem Pohon Keluarga Marga Hariandja
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@hariandja.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-[var(--t-border)] focus:border-[var(--t-accent)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-[var(--t-border)] focus:border-[var(--t-accent)]"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full bg-[var(--t-primary)] hover:bg-[var(--t-primary-light)] text-white"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Masuk
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Belum punya akun?{" "}
              <button
                type="button"
                className="text-[var(--t-primary)] hover:text-[var(--t-primary-light)] font-medium underline"
                onClick={() => setActiveView("register")}
              >
                Daftar di sini
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}