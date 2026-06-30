"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { UserCog, Plus, Loader2, Trash2, Pencil } from "lucide-react";
import { getAllRoles } from "@/lib/rbac";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-800",
  EDITOR: "bg-amber-100 text-amber-800",
  VIEWER: "bg-gray-100 text-gray-800",
};

export function UserManagement() {
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("VIEWER");
  const [formError, setFormError] = useState("");
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const currentUserId = (session?.user as Record<string, unknown>)?.userId as string;

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/auth/register").then((r) => r.json()),
  });

  const addMutation = useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: string }) =>
      fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error); });
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Pengguna berhasil ditambahkan");
      setAddOpen(false);
      resetForm();
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Pengguna diperbarui");
      setEditUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/users/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error); });
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Pengguna dihapus");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("VIEWER");
    setFormError("");
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormPassword("");
    setFormError("");
  };

  const handleEditSave = () => {
    if (!editUser) return;
    const data: Record<string, unknown> = { name: formName, role: formRole };
    if (formPassword) data.password = formPassword;
    updateMutation.mutate({ id: editUser.id, data });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-amber-900">Kelola Pengguna</h2>
          <p className="text-sm text-muted-foreground">
            Manajemen akun pengguna dan hak akses (RBAC)
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-amber-700 hover:bg-amber-800 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pengguna
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {formError && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md border border-red-200">
                  {formError}
                </div>
              )}
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nama lengkap" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@contoh.com" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Minimal 6 karakter" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllRoles().map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
              <Button
                onClick={() => addMutation.mutate({ name: formName, email: formEmail, password: formPassword, role: formRole })}
                disabled={!formName || !formEmail || !formPassword || addMutation.isPending}
                className="bg-amber-700 hover:bg-amber-800"
              >
                {addMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* RBAC Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-red-50 rounded-lg border border-red-100">
          <p className="font-semibold text-red-800 text-sm">Administrator</p>
          <p className="text-xs text-red-600 mt-1">Akses penuh: Tambah, Edit, Hapus data dan kelola pengguna</p>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
          <p className="font-semibold text-amber-800 text-sm">Editor</p>
          <p className="text-xs text-amber-600 mt-1">Tambah dan edit data anggota & pernikahan</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
          <p className="font-semibold text-gray-800 text-sm">Pengamat</p>
          <p className="text-xs text-gray-600 mt-1">Hanya dapat melihat data (read-only)</p>
        </div>
      </div>

      <Card className="border-amber-200/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-amber-50/50">
                    <TableHead className="text-amber-800">Nama</TableHead>
                    <TableHead className="text-amber-800">Email</TableHead>
                    <TableHead className="text-amber-800">Role</TableHead>
                    <TableHead className="text-amber-800">Status</TableHead>
                    <TableHead className="text-amber-800 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-amber-50/50">
                      <TableCell className="font-medium text-amber-900">{user.name}</TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge className={roleColors[user.role] || ""}>{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.id === currentUserId ? (
                          <Badge variant="outline">Anda</Badge>
                        ) : (
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={(checked) =>
                              updateMutation.mutate({ id: user.id, data: { isActive: checked } })
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(user)}
                            disabled={user.id === currentUserId}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-red-600"
                            onClick={() => deleteMutation.mutate(user.id)}
                            disabled={user.id === currentUserId || deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md border border-red-200">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={formEmail} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Password Baru (kosongkan jika tidak diubah)</Label>
              <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAllRoles().map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Batal</Button>
            <Button
              onClick={handleEditSave}
              disabled={updateMutation.isPending}
              className="bg-amber-700 hover:bg-amber-800"
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}