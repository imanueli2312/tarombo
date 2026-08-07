"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, User, Mail, Shield, KeyRound, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";

interface ProfileData {
  user: {
    id: string;
    email: string;
    name: string;
    role_id: string;
    role_name: string;
    person_id: string | null;
    person: any | null;
  } | null;
  permissions: any | null;
}

export function ProfileView({ onRefresh }: { onRefresh: () => void }) {
  const { t } = useLanguage();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/me");
      const json = await res.json();
      setData(json);
      setName(json.user?.name ?? "");
      setEmail(json.user?.email ?? "");
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    if (!data?.user) return;
    setSaving(true);
    try {
      const body: any = { name, email };
      if (password) body.password = password;
      const res = await fetch(`/api/users/${data.user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || t("profile.saveFailed"));
      }
      toast.success(t("profile.updated"));
      setPassword("");
      await load();
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message || t("profile.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.user) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        {t("profile.signInPrompt")}
      </div>
    );
  }

  const { user } = data;

  return (
    <div className="scroll-area-thin h-full overflow-auto">
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <User className="h-6 w-6 text-primary" />
            {t("profile.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("profile.subtitle")}
          </p>
        </header>

        {/* account summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("profile.account")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                {user.name?.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?"}
              </div>
              <div>
                <div className="text-base font-medium">{user.name}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> {user.email}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t pt-3">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">{t("profile.role")}</span>
              <Badge variant="secondary">{user.role_name}</Badge>
            </div>
            {user.person && (
              <div className="flex items-center gap-2 border-t pt-3">
                <Link2 className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">{t("profile.linkedTo")}</span>
                <span className="text-sm font-medium">{user.person.name}</span>
                <span className="text-xs text-muted-foreground">(Gen {user.person.generation})</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* edit form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("profile.editDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("profile.displayName")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("profile.email")}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("profile.newPassword")}</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("profile.passwordHint")}
                  className="pl-9"
                />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t("profile.saveChanges")}
            </Button>
          </CardContent>
        </Card>

        {/* permissions */}
        {data.permissions && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("profile.yourPermissions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("profile.pageAccess")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(data.permissions.pages).map(([k, v]) => (
                    <Badge key={k} variant={v ? "default" : "outline"}>
                      {t("perm.page." + k)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("profile.actions")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(data.permissions.actions).map(([k, v]) => (
                    <Badge key={k} variant={v ? "default" : "outline"}>
                      {t("perm.action." + k)}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
