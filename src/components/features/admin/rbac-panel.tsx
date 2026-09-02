'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Shield, Save, Loader2, Lock } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { RBACPermission, UserRole } from '@/types';
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '@/types';

type LocalPermission = RBACPermission & { _dirty?: boolean };

type GroupedPerms = Record<UserRole, LocalPermission[]>;

function buildGrouped(permissions: RBACPermission[]): GroupedPerms {
  const grouped: GroupedPerms = { viewer: [], editor: [], admin: [] };
  for (const perm of permissions) {
    if (grouped[perm.role]) {
      grouped[perm.role].push({ ...perm, _dirty: false });
    }
  }
  for (const role of ['viewer', 'editor', 'admin'] as UserRole[]) {
    const existing = new Set(grouped[role].map((p) => p.permission));
    for (const perm of ALL_PERMISSIONS) {
      if (!existing.has(perm)) {
        grouped[role].push({
          id: crypto.randomUUID(), role, permission: perm,
          allowed: false, created_at: new Date().toISOString(), _dirty: false,
        });
      }
    }
    grouped[role].sort((a, b) => ALL_PERMISSIONS.indexOf(a.permission) - ALL_PERMISSIONS.indexOf(b.permission));
  }
  return grouped;
}

const emptyGrouped: GroupedPerms = {
  viewer: ALL_PERMISSIONS.map(p => ({ id: '', role: 'viewer' as UserRole, permission: p, allowed: false, created_at: '' })),
  editor: ALL_PERMISSIONS.map(p => ({ id: '', role: 'editor' as UserRole, permission: p, allowed: false, created_at: '' })),
  admin: ALL_PERMISSIONS.map(p => ({ id: '', role: 'admin' as UserRole, permission: p, allowed: true, created_at: '' })),
};

export function RBACPanel() {
  const [activeRole, setActiveRole] = useState<UserRole>('viewer');
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const queryClient = useQueryClient();

  const { data: permissions = [], isLoading } = useQuery<RBACPermission[]>({
    queryKey: ['rbac-permissions'],
    queryFn: async () => {
      const res = await fetch('/api/rbac/permissions', { credentials: 'include' });
      if (!res.ok) throw new Error('Gagal memuat permissions');
      return res.json();
    },
  });

  const grouped = useMemo(() => buildGrouped(permissions), [permissions]);

  const displayGrouped = useMemo((): GroupedPerms => {
    const result: GroupedPerms = { viewer: [], editor: [], admin: [] };
    for (const role of ['viewer', 'editor', 'admin'] as UserRole[]) {
      result[role] = grouped[role].map((p) => {
        const isDirty = overrides[p.id] !== undefined;
        return isDirty ? { ...p, allowed: overrides[p.id], _dirty: true } : p;
      });
    }
    return result;
  }, [grouped, overrides]);

  const dirtyCount = useMemo(
    () => displayGrouped[activeRole].filter((p) => p._dirty).length,
    [displayGrouped, activeRole],
  );

  const isAdmin = activeRole === 'admin';

  const togglePermission = (role: UserRole, permissionId: string) => {
    const currentPerm = displayGrouped[role].find(p => p.id === permissionId);
    if (!currentPerm) return;
    setOverrides((prev) => ({ ...prev, [permissionId]: !currentPerm.allowed }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const dirty = displayGrouped[activeRole].filter((p) => p._dirty);
      await Promise.all(
        dirty.map((p) =>
          fetch('/api/rbac/permissions', {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: p.id, allowed: p.allowed }),
          }),
        ),
      );
    },
    onSuccess: () => {
      toast.success('Hak akses berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['rbac-permissions'] });
      setOverrides({});
    },
    onError: () => toast.error('Gagal menyimpan hak akses'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const shownGrouped = permissions.length > 0 ? displayGrouped : emptyGrouped;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Kelola Hak Akses</h2>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={isAdmin || dirtyCount === 0 || saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Simpan
          {dirtyCount > 0 && <Badge variant="secondary" className="ml-1">{dirtyCount}</Badge>}
        </Button>
      </div>

      <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as UserRole)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="viewer">Viewer</TabsTrigger>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="admin">Admin<Lock className="size-3 ml-1" /></TabsTrigger>
        </TabsList>

        {(['viewer', 'editor', 'admin'] as UserRole[]).map((role) => (
          <TabsContent key={role} value={role}>
            {role === 'admin' && (
              <div className="rounded-lg border bg-muted/30 p-3 mb-4 text-sm text-muted-foreground flex items-center gap-2">
                <Lock className="size-4" />
                Role Admin memiliki semua hak akses dan tidak dapat diubah.
              </div>
            )}
            <div className="grid gap-1 rounded-lg border divide-y">
              {shownGrouped[role].map((perm) => (
                <div key={perm.id} className={`flex items-center justify-between px-4 py-3 ${perm._dirty ? 'bg-primary/5' : ''}`}>
                  <Label htmlFor={perm.id} className="text-sm cursor-pointer select-none">
                    {PERMISSION_LABELS[perm.permission] || perm.permission}
                  </Label>
                  <Switch
                    id={perm.id}
                    checked={role === 'admin' ? true : perm.allowed}
                    disabled={role === 'admin'}
                    onCheckedChange={() => togglePermission(role, perm.id)}
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
