"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Users, Shield, Plus, Trash2, Save, Pencil, Lock } from "lucide-react";
import { toast } from "sonner";
import type { Permissions, Role } from "@/lib/types";
import { useLanguage } from "@/hooks/use-language";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role_id: string;
  role_name: string;
  person_id: string | null;
  person_name: string | null;
  is_active: number;
  created_at: string;
}

const PAGE_LABELS: Record<keyof Permissions["pages"], string> = {
  search: "perm.page.search",
  familyTree: "perm.page.familyTree",
  familyChart: "perm.page.familyChart",
  birthdays: "perm.page.birthdays",
  weddings: "perm.page.weddings",
  profile: "perm.page.profile",
};

const ACTION_LABELS: Record<keyof Permissions["actions"], string> = {
  managePersons: "perm.action.managePersons",
  manageSpouses: "perm.action.manageSpouses",
  manageUsers: "perm.action.manageUsers",
  manageRoles: "perm.action.manageRoles",
  exportData: "perm.action.exportData",
};

interface AdminViewProps {
  canManageUsers: boolean;
  canManageRoles: boolean;
}

export function AdminView({ canManageUsers, canManageRoles }: AdminViewProps) {
  const { t } = useLanguage();
  const [tab, setTab] = useState(canManageUsers ? "users" : "roles");

  return (
    <div className="scroll-area-thin h-full overflow-auto">
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Shield className="h-6 w-6 text-primary" />
            {t("admin.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("admin.subtitle")}
          </p>
        </header>

        {!canManageUsers && !canManageRoles && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {t("admin.noAccess")}
            </CardContent>
          </Card>
        )}

        {(canManageUsers || canManageRoles) && (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {canManageUsers && <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" /> {t("admin.users")}</TabsTrigger>}
              {canManageRoles && <TabsTrigger value="roles"><Shield className="mr-2 h-4 w-4" /> {t("admin.roles")}</TabsTrigger>}
            </TabsList>

            {canManageUsers && (
              <TabsContent value="users">
                <UsersPanel />
              </TabsContent>
            )}
            {canManageRoles && (
              <TabsContent value="roles">
                <RolesPanel />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
}

// ============ USERS PANEL ============

function UsersPanel() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [persons, setPersons] = useState<{ id: string; name: string; gender: string; generation: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [u, r, p] = await Promise.all([
        fetch("/api/users").then((x) => x.json()),
        fetch("/api/roles").then((x) => x.json()),
        fetch("/api/persons").then((x) => x.json()),
      ]);
      setUsers(u);
      setRoles(r);
      setPersons(p.map((x: any) => ({ id: x.id, name: x.name, gender: x.gender, generation: x.generation })));
    } catch (e: any) {
      toast.error(e?.message || t("common.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(u: UserRow) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: u.is_active ? 0 : 1 }),
    });
    if (!res.ok) {
      toast.error(t("common.updateFailed"));
      return;
    }
    toast.success(t("common.updated"));
    load();
  }

  async function deleteUser(u: UserRow) {
    if (!confirm(t("admin.confirmDeleteUser", { name: u.name }))) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const e = await res.json();
      toast.error(e.error || t("common.updateFailed"));
      return;
    }
    toast.success(t("admin.userDeleted"));
    load();
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("admin.userCount", { count: users.length })}</p>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> {t("admin.addUser")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-3 font-medium">{t("admin.colName")}</th>
                  <th className="p-3 font-medium">{t("admin.colEmail")}</th>
                  <th className="p-3 font-medium">{t("admin.colRole")}</th>
                  <th className="p-3 font-medium">{t("admin.colLinkedPerson")}</th>
                  <th className="p-3 font-medium">{t("admin.colStatus")}</th>
                  <th className="p-3 text-right font-medium">{t("admin.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{u.name}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3"><Badge variant="secondary">{u.role_name}</Badge></td>
                    <td className="p-3 text-muted-foreground">{u.person_name || "—"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Switch checked={u.is_active === 1} onCheckedChange={() => toggleActive(u)} />
                        <span className="text-xs">{u.is_active ? t("admin.active") : t("admin.disabled")}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(u); setDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteUser(u)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        roles={roles}
        persons={persons}
        onSaved={load}
      />
    </div>
  );
}

function UserDialog({
  open,
  onOpenChange,
  editing,
  roles,
  persons,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: UserRow | null;
  roles: Role[];
  persons: { id: string; name: string; gender: string; generation: number }[];
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [personId, setPersonId] = useState("none");
  const [isActive, setIsActive] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setEmail(editing.email);
      setPassword("");
      setRoleId(editing.role_id);
      setPersonId(editing.person_id ?? "none");
      setIsActive(editing.is_active);
    } else {
      setName("");
      setEmail("");
      setPassword("");
      setRoleId(roles[0]?.id ?? "");
      setPersonId("none");
      setIsActive(1);
    }
  }, [editing, roles, open]);

  async function handleSave() {
    if (!name || !email || !roleId) {
      toast.error(t("admin.errorNameEmailRole"));
      return;
    }
    if (!editing && !password) {
      toast.error(t("admin.errorPasswordRequired"));
      return;
    }
    setSaving(true);
    try {
      const body: any = { name, email, role_id: roleId, person_id: personId === "none" ? null : personId, is_active: isActive };
      if (password) body.password = password;
      const url = editing ? `/api/users/${editing.id}` : "/api/users";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || t("common.updateFailed"));
      }
      toast.success(editing ? t("admin.userUpdated") : t("admin.userCreated"));
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || t("common.updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? t("admin.editUser") : t("admin.addUserTitle")}</DialogTitle>
          <DialogDescription>
            {t("admin.userDialogDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t("admin.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.colEmail")}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{editing ? t("admin.newPasswordHint") : t("admin.password")}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.colRole")}</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger><SelectValue placeholder={t("admin.selectRole")} /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.linkedPersonOptional")}</Label>
            <Select value={personId} onValueChange={setPersonId}>
              <SelectTrigger><SelectValue placeholder={t("admin.noneOption")} /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="none">{t("admin.noneOption")}</SelectItem>
                {persons.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} (Gen {p.generation})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label className="text-sm">{t("admin.activeLabel")}</Label>
            <Switch checked={isActive === 1} onCheckedChange={(v) => setIsActive(v ? 1 : 0)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ ROLES PANEL ============

function RolesPanel() {
  const { t } = useLanguage();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Role | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/roles");
      setRoles(await res.json());
    } catch (e: any) {
      toast.error(e?.message || t("common.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function deleteRole(r: Role) {
    if (r.is_system === 1) {
      toast.error(t("admin.cannotDeleteSystem"));
      return;
    }
    if (!confirm(t("admin.confirmDeleteRole", { name: r.name }))) return;
    const res = await fetch(`/api/roles/${r.id}`, { method: "DELETE" });
    if (!res.ok) {
      const e = await res.json();
      toast.error(e.error || t("common.updateFailed"));
      return;
    }
    toast.success(t("admin.roleDeleted"));
    load();
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("admin.rolesCount", { count: roles.length })}
        </p>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> {t("admin.addRole")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {roles.map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  {r.name}
                  {r.is_system === 1 && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Lock className="h-2.5 w-2.5" /> {t("admin.system")}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setDialogOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {r.is_system !== 1 && (
                    <Button size="icon" variant="ghost" onClick={() => deleteRole(r)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
              {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div>
                <p className="mb-1 font-medium uppercase tracking-wide text-muted-foreground">{t("admin.pageAccess")}</p>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(r.permissions.pages) as (keyof Permissions["pages"])[]).map((k) => (
                    <Badge
                      key={k}
                      variant={r.permissions.pages[k] ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {t(PAGE_LABELS[k])}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 font-medium uppercase tracking-wide text-muted-foreground">{t("profile.actions")}</p>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(r.permissions.actions) as (keyof Permissions["actions"])[]).map((k) => (
                    <Badge
                      key={k}
                      variant={r.permissions.actions[k] ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {t(ACTION_LABELS[k])}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <RoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={load}
      />
    </div>
  );
}

function RoleDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Role | null;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [perms, setPerms] = useState<Permissions>({
    pages: { familyTree: false, familyChart: false, birthdays: false, weddings: false, profile: false },
    actions: { managePersons: false, manageSpouses: false, manageUsers: false, manageRoles: false, exportData: false },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? "");
      setPerms(editing.permissions);
    } else {
      setName("");
      setDescription("");
      setPerms({
        pages: { familyTree: true, familyChart: false, birthdays: false, weddings: false, profile: false },
        actions: { managePersons: false, manageSpouses: false, manageUsers: false, manageRoles: false, exportData: false },
      });
    }
  }, [editing, open]);

  function togglePage(k: keyof Permissions["pages"]) {
    setPerms((p) => ({ ...p, pages: { ...p.pages, [k]: !p.pages[k] } }));
  }
  function toggleAction(k: keyof Permissions["actions"]) {
    setPerms((p) => ({ ...p, actions: { ...p.actions, [k]: !p.actions[k] } }));
  }

  async function handleSave() {
    if (!name) {
      toast.error(t("admin.errorRoleName"));
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/roles/${editing.id}` : "/api/roles";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, permissions: perms }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || t("common.updateFailed"));
      }
      toast.success(editing ? t("admin.roleUpdated") : t("admin.roleCreated"));
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || t("common.updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t("admin.editRole") : t("admin.addRoleTitle")}</DialogTitle>
          <DialogDescription>
            {t("admin.roleDialogDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("admin.roleName")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.description")}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="rounded-lg border p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("admin.pageAccess")}
            </p>
            <div className="space-y-2">
              {(Object.keys(PAGE_LABELS) as (keyof Permissions["pages"])[]).map((k) => (
                <div key={k} className="flex items-center justify-between">
                  <Label className="text-sm">{t(PAGE_LABELS[k])}</Label>
                  <Switch checked={perms.pages[k]} onCheckedChange={() => togglePage(k)} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("profile.actions")}
            </p>
            <div className="space-y-2">
              {(Object.keys(ACTION_LABELS) as (keyof Permissions["actions"])[]).map((k) => (
                <div key={k} className="flex items-center justify-between">
                  <Label className="text-sm">{t(ACTION_LABELS[k])}</Label>
                  <Switch checked={perms.actions[k]} onCheckedChange={() => toggleAction(k)} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
