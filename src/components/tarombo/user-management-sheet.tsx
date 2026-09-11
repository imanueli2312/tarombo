"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "./confirm-dialog";
import {
  createUser,
  deleteUser,
  fetchActiveUser,
  fetchPersons,
  fetchPublicUsers,
  fetchRoles,
  fetchUsers,
  updateUser,
} from "@/lib/tarombo/api-client";
import type { PublicUser } from "@/lib/tarombo/api-client";
import type { UserInput, UserPublic, RolePublic, ActiveUserPublic } from "@/lib/tarombo/types";
import { useActiveUser } from "@/lib/tarombo/use-permissions";
import { LoginDialog } from "./login-dialog";
import {
  UserPlus,
  LogOut,
  Trash2,
  Pencil,
  CheckCircle2,
  UserCog,
  Shield,
  Eye,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyForm: UserInput = {
  email: "",
  name: "",
  password: "",
  photo: null,
  phone: null,
  roleId: null,
  linkedPersonId: null,
};

export function UserManagementSheet({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { can } = useActiveUser();
  const [editing, setEditing] = useState<UserPublic | null>(null);
  const [form, setForm] = useState<UserInput>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loginTarget, setLoginTarget] = useState<PublicUser | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const canManageUsers = can("user:manage");

  const usersQ = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: open && can("user:view"),
  });
  const personsQ = useQuery({
    queryKey: ["persons"],
    queryFn: () => fetchPersons(),
    enabled: open,
  });
  const rolesQ = useQuery({
    queryKey: ["roles"],
    queryFn: () => fetchRoles(),
    enabled: open && can("user:view"),
  });

  const activeQ = useQuery({
    queryKey: ["active-user"],
    queryFn: fetchActiveUser,
    enabled: open,
  });

  const setActiveMut = useMutation({
    mutationFn: async (user: { id: string; name: string; roleName: string | null; roleColor: string | null }) => {
      setLoginTarget(user);
      setLoginOpen(true);
    },
    onSuccess: async () => {
      toast.success("Login dialog dibuka.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) {
        return updateUser(editing.id, {
          ...form,
          password: form.password || undefined,
        });
      }
      return createUser(form);
    },
    onSuccess: async () => {
      toast.success(editing ? "User diperbarui." : "User baru ditambahkan.");
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      setError(null);
      await qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => setError((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: async () => {
      toast.success("User dihapus.");
      await qc.invalidateQueries({ queryKey: ["users"] });
      await qc.invalidateQueries({ queryKey: ["active-user"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const startEdit = (u: UserPublic) => {
    setEditing(u);
    setForm({
      email: u.email,
      name: u.name,
      password: "", // kosong = tidak diubah
      photo: u.photo,
      phone: u.phone,
      roleId: u.roleId,
      linkedPersonId: u.linkedPersonId,
    });
    setError(null);
    setShowForm(true);
  };

  const submit = async () => {
    setError(null);
    if (!form.email.trim() || !form.name.trim()) {
      setError("Email dan nama wajib diisi.");
      return;
    }
    if (!editing && !form.password) {
      setError("Password wajib diisi untuk user baru.");
      return;
    }
    setSaving(true);
    try {
      await saveMut.mutateAsync();
    } catch {
      // error sudah ditangani
    } finally {
      setSaving(false);
    }
  };

  const users = usersQ.data ?? [];
  const persons = personsQ.data ?? [];
  const activeUser = activeQ.data?.data ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <UserCog className="size-4 text-primary" />
            Manajemen Pengguna
          </SheetTitle>
          <SheetDescription className="text-xs">
            Pengguna aplikasi (akun login) dipisahkan dari data orang di pohon
            tarombo. Satu pengguna dapat ditautkan opsional ke satu Person.
          </SheetDescription>
        </SheetHeader>

        <div className="tarombo-scroll flex-1 min-h-0 overflow-y-scroll">
          <div className="space-y-3 p-5">
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            {/* Form tambah/edit */}
            {showForm && (
              <div className="rounded-lg border bg-card p-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                  {editing ? "Edit Pengguna" : "Tambah Pengguna"}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1 col-span-2">
                    <Label className="text-[11.5px]">Nama</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Nama lengkap pengguna"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11.5px]">Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="user@email.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11.5px]">
                      Password {editing && <span className="text-muted-foreground">(kosongkan = tetap)</span>}
                    </Label>
                    <Input
                      type="text"
                      value={form.password ?? ""}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={editing ? "••••••" : "password"}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11.5px]">Telepon</Label>
                    <Input
                      value={form.phone ?? ""}
                      onChange={(e) => setForm({ ...form, phone: e.target.value || null })}
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11.5px]">Role</Label>
                    <Select
                      value={form.roleId ?? "__none__"}
                      onValueChange={(v) =>
                        setForm({ ...form, roleId: v === "__none__" ? null : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="— pilih role —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— tanpa role —</SelectItem>
                        {(rolesQ.data?.roles ?? []).map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name} ({r.permissions.length} permission)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11.5px] flex items-center gap-1">
                    <LinkIcon className="size-3" />
                    Tautkan ke Person di pohon tarombo (opsional)
                  </Label>
                  <Select
                    value={form.linkedPersonId ?? "__none__"}
                    onValueChange={(v) =>
                      setForm({ ...form, linkedPersonId: v === "__none__" ? null : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="— tidak ditautkan —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— tidak ditautkan —</SelectItem>
                      {persons.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.fullName}
                          {p.nickname ? ` (${p.nickname})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditing(null);
                    }}
                  >
                    Batal
                  </Button>
                  <Button size="sm" onClick={submit} disabled={saving}>
                    {editing ? "Simpan" : "Tambah"}
                  </Button>
                </div>
              </div>
            )}

            {!showForm && canManageUsers && (
              <Button onClick={startCreate} size="sm" className="w-full">
                <UserPlus className="size-4 mr-1.5" />
                Tambah Pengguna
              </Button>
            )}

            <Separator />

            {/* Daftar user */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Daftar Pengguna ({users.length})
              </p>
              {usersQ.isLoading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
                  ))}
                </div>
              )}
              {users.map((u) => {
                const isActive = activeUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    className={cn(
                      "rounded-md border p-2.5 flex items-center gap-2.5 transition-colors",
                      isActive
                        ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                        : "hover:bg-accent/50",
                    )}
                  >
                    <Avatar className="size-9 border border-border shrink-0">
                      {u.photo ? (
                        
                        <img src={u.photo} alt={u.name} className="size-full object-cover" />
                      ) : (
                        <AvatarFallback className="text-[11px] font-semibold bg-primary/15 text-primary">
                          {initials(u.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[12.5px] font-medium">{u.name}</p>
                        {isActive && (
                          <Badge className="text-[9px] h-[16px] px-1 bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                            <CheckCircle2 className="size-2.5 mr-0.5" />
                            Aktif
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-[10.5px] text-muted-foreground">
                        {u.email}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {u.roleName ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] h-[15px] px-1"
                            style={
                              u.roleColor
                                ? {
                                    color: u.roleColor,
                                    borderColor: u.roleColor + "40",
                                    backgroundColor: u.roleColor + "10",
                                  }
                                : {}
                            }
                          >
                            {u.roleName}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] h-[15px] px-1 text-muted-foreground">
                            Tanpa role
                          </Badge>
                        )}
                        {u.linkedPersonName && (
                          <span className="text-[9.5px] text-amber-700 bg-amber-500/10 rounded px-1 py-0.5 flex items-center gap-0.5">
                            <LinkIcon className="size-2.5" />
                            {u.linkedPersonName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!isActive && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px]"
                          onClick={() =>
                            setActiveMut.mutate({
                              id: u.id,
                              name: u.name,
                              roleName: u.roleName,
                              roleColor: u.roleColor,
                            })
                          }
                          title="Login sebagai user ini"
                        >
                          <LogOut className="size-3 mr-1 rotate-180" />
                          Login
                        </Button>
                      )}
                      {canManageUsers && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-7 p-0"
                            onClick={() => startEdit(u)}
                            title="Edit"
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(u.id)}
                            title="Hapus"
                            disabled={isActive}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {users.length === 0 && !usersQ.isLoading && (
                <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                  Belum ada pengguna terdaftar.
                </div>
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Tutup
          </Button>
        </SheetFooter>
      </SheetContent>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Hapus pengguna ini?"
        description="Akun pengguna akan dihapus permanen. Data Person yang ditautkan tetap aman di pohon tarombo."
        confirmText="Hapus"
        destructive
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget)}
      />

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        user={loginTarget}
        onLoggedIn={async () => {
          await qc.invalidateQueries({ queryKey: ["active-user"] });
          await qc.invalidateQueries({ queryKey: ["users"] });
        }}
      />
    </Sheet>
  );
}

// ============================================================================
// User Menu Button (untuk header) — dropdown switch user cepat
// ============================================================================

interface MenuProps {
  onOpenManage: () => void;
  onOpenManageRoles: () => void;
}

export function UserMenuButton({ onOpenManage, onOpenManageRoles }: MenuProps) {
  const qc = useQueryClient();
  const [loginTarget, setLoginTarget] = useState<PublicUser | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const activeQ = useQuery({
    queryKey: ["active-user"],
    queryFn: fetchActiveUser,
  });
  const isGuest = activeQ.data?.data?.id === "guest";

  const usersQ = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: !isGuest && activeQ.data?.data?.permissions.includes("user:view") === true,
  });

  // Guest pakai endpoint publik (id, name, roleName only — no sensitive data)
  const publicUsersQ = useQuery({
    queryKey: ["users-public"],
    queryFn: fetchPublicUsers,
    enabled: isGuest,
  });

  const active = activeQ.data?.data ?? null;
  const users = usersQ.data ?? [];
  const publicUsers = publicUsersQ.data ?? [];
  const hasUsers = activeQ.data?.hasUsers ?? false;
  const canManageRoles = active?.permissions.includes("role:manage") ?? false;
  const canViewUsers = active?.permissions.includes("user:view") ?? false;

  // Buka login dialog dengan user terpilih
  const openLogin = (user: PublicUser) => {
    setLoginTarget(user);
    setLoginOpen(true);
  };

  // Switch user (admin/editor yang sudah login) — juga perlu password
  const switchMut = useMutation({
    mutationFn: async (target: { id: string; name: string }) => {
      // Bila target sama dengan aktif → skip
      if (active?.id === target.id) return;
      // Buka login dialog untuk user target (perlu password)
      const pubUser = [...users, ...publicUsers].find((u) => u.id === target.id);
      if (pubUser) {
        setLoginTarget(pubUser);
        setLoginOpen(true);
      }
    },
  });

  const logoutMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users/active", { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal logout");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["active-user"] });
      toast.success("Anda keluar — kembali sebagai Tamu (Viewer).");
    },
  });

  // Handler logout langsung — tidak bergantung pada lifecycle dropdown.
  // Pakai onSelect + preventDefault agar dropdown tidak auto-close sebelum
  // fetch selesai, lalu invalidate queries untuk refresh UI.
  const handleLogout = async () => {
    try {
      const res = await fetch("/api/users/active", { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal logout");
      await qc.invalidateQueries({ queryKey: ["active-user"] });
      await qc.invalidateQueries({ queryKey: ["users"] });
      await qc.invalidateQueries({ queryKey: ["users-public"] });
      toast.success("Anda keluar — kembali sebagai Tamu (Viewer).");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onLoggedIn = async () => {
    await qc.invalidateQueries({ queryKey: ["active-user"] });
    await qc.invalidateQueries({ queryKey: ["users"] });
    await qc.invalidateQueries({ queryKey: ["users-public"] });
  };

  if (!active) return null;

  return (
    <>
      <GuestOrUserMenu
        active={active}
        isGuest={isGuest}
        hasUsers={hasUsers}
        users={users}
        publicUsers={publicUsers}
        canManageRoles={canManageRoles}
        canViewUsers={canViewUsers}
        onLogin={openLogin}
        onSwitch={(u) => switchMut.mutate({ id: u.id, name: u.name })}
        onLogout={handleLogout}
        onOpenManage={onOpenManage}
        onOpenManageRoles={onOpenManageRoles}
      />
      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        user={loginTarget}
        onLoggedIn={onLoggedIn}
      />
    </>
  );
}

interface GuestOrUserMenuProps {
  active: NonNullable<Awaited<ReturnType<typeof fetchActiveUser>>["data"]>;
  isGuest: boolean;
  hasUsers: boolean;
  users: UserPublic[];
  publicUsers: PublicUser[];
  canManageRoles: boolean;
  canViewUsers: boolean;
  onLogin: (user: PublicUser) => void;
  onSwitch: (user: PublicUser) => void;
  onLogout: () => void;
  onOpenManage: () => void;
  onOpenManageRoles: () => void;
}

function GuestOrUserMenu({
  active,
  isGuest,
  hasUsers,
  users,
  publicUsers,
  canManageRoles,
  canViewUsers,
  onLogin,
  onSwitch,
  onLogout,
  onOpenManage,
  onOpenManageRoles,
}: GuestOrUserMenuProps) {

  // Guest (Viewer tanpa login) — tampilkan tombol login
  if (isGuest) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full border border-border bg-card pl-1 pr-2.5 py-1 hover:bg-accent/60 transition-colors">
            <Avatar className="size-7 border border-border">
              <AvatarFallback className="text-[10px] font-semibold bg-stone-500/15 text-stone-600 dark:text-stone-300">
                <Eye className="size-3.5" />
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden sm:block leading-none">
              <p className="text-[11.5px] font-medium">Tamu</p>
              <p className="text-[9.5px] text-muted-foreground">Viewer (publik)</p>
            </div>
            {hasUsers && (
              <span className="text-[9px] font-semibold text-primary bg-primary/10 rounded px-1 py-0.5">
                Login
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        {hasUsers ? (
          <DropdownMenuContent align="end" className="w-60">
            <div className="px-2 py-1.5">
              <p className="text-[11px] font-semibold">Mode Tamu (Viewer)</p>
              <p className="text-[10px] text-muted-foreground">
                Anda melihat pohon sebagai publik. Login untuk mengelola data.
              </p>
            </div>
            <DropdownMenuSeparator />
            <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Pilih akun untuk login
            </p>
            {publicUsers.slice(0, 6).map((u) => (
              <DropdownMenuItem
                key={u.id}
                onClick={() => onLogin(u)}
                className="gap-2 py-1.5"
              >
                <Avatar className="size-6 border">
                  <AvatarFallback className="text-[9px] font-semibold bg-secondary text-secondary-foreground">
                    {initials(u.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] truncate">{u.name}</p>
                  <p className="text-[9.5px] text-muted-foreground truncate">
                    {u.roleName ?? "—"}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenManage} className="text-muted-foreground">
              <UserCog className="size-3.5 mr-2" />
              Kelola Pengguna
            </DropdownMenuItem>
          </DropdownMenuContent>
        ) : (
          <DropdownMenuContent align="end" className="w-60">
            <div className="px-2 py-1.5">
              <p className="text-[11px] font-semibold">Mode Tamu (Viewer)</p>
              <p className="text-[10px] text-muted-foreground">
                Belum ada akun terdaftar. Setup pengguna untuk mulai mengelola.
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenManage}>
              <UserPlus className="size-3.5 mr-2 text-primary" />
              Setup Pengguna
            </DropdownMenuItem>
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    );
  }

  // User login (Editor / Administrator / custom)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full border border-border bg-card pl-1 pr-2.5 py-1 hover:bg-accent/60 transition-colors">
          <Avatar className="size-7 border border-border">
            {active.photo ? (
              
              <img src={active.photo} alt={active.name} className="size-full object-cover" />
            ) : (
              <AvatarFallback className="text-[10px] font-semibold bg-primary/15 text-primary">
                {initials(active.name)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="text-left hidden sm:block leading-none">
            <p className="text-[11.5px] font-medium">{active.name}</p>
            <p className="text-[9.5px] text-muted-foreground">
              {active.roleName ?? "Tanpa role"}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2 py-1.5">
          <p className="text-[11px] font-semibold truncate">{active.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">{active.email}</p>
          {active.linkedPersonName && (
            <p className="text-[9.5px] text-amber-700 mt-0.5 flex items-center gap-0.5">
              <LinkIcon className="size-2.5" />
              Terkait: {active.linkedPersonName}
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          Ganti pengguna
        </p>
        {users.slice(0, 6).map((u) => (
          <DropdownMenuItem
            key={u.id}
            onClick={() =>
              onSwitch({
                id: u.id,
                name: u.name,
                roleName: u.roleName,
                roleColor: u.roleColor,
              })
            }
            disabled={u.id === active.id}
            className="gap-2 py-1.5"
          >
            <Avatar className="size-6 border">
              {u.photo ? (
                
                <img src={u.photo} alt={u.name} className="size-full object-cover" />
              ) : (
                <AvatarFallback className="text-[9px] font-semibold bg-secondary text-secondary-foreground">
                  {initials(u.name)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] truncate">{u.name}</p>
              <p className="text-[9.5px] text-muted-foreground truncate">{u.email}</p>
            </div>
            {u.id === active.id && <CheckCircle2 className="size-3.5 text-emerald-600" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {canViewUsers && (
          <DropdownMenuItem onClick={onOpenManage}>
            <UserCog className="size-3.5 mr-2" />
            Kelola Pengguna
          </DropdownMenuItem>
        )}
        {canManageRoles && (
          <DropdownMenuItem onClick={onOpenManageRoles}>
            <Shield className="size-3.5 mr-2 text-primary" />
            Kelola Role &amp; Permission
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => onLogout()}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="size-3.5 mr-2" />
          Keluar (kembali ke Viewer)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
