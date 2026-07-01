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
        setError("Email atau password salah");
      } else if (result?.ok) {
        setActiveView("tree");
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-amber-200/50">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-2">
            <TreePine className="w-8 h-8 text-amber-700" />
          </div>
          <CardTitle className="text-2xl font-bold text-amber-900">
            Tarombo Hariandja
          </CardTitle>
          <CardDescription className="text-amber-700/70">
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
                className="border-amber-200 focus:border-amber-400"
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
                className="border-amber-200 focus:border-amber-400"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full bg-amber-700 hover:bg-amber-800 text-white"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Masuk
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Belum punya akun?{" "}
              <button
                type="button"
                className="text-amber-700 hover:text-amber-800 font-medium underline"
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