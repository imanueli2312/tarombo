'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Users, Plus, Pencil, Trash2, Loader2, UserPlus } from 'lucide-react';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import type { User, UserRole } from '@/types';
import { useAuthStore } from '@/store/auth';

const ROLE_LABELS: Record<UserRole, string> = { viewer: 'Viewer', editor: 'Editor', admin: 'Admin' };

export function UserManagement() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'viewer' as UserRole });
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '', role: 'viewer' as UserRole });
  const [deleteId, setDeleteId] = useState('');

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['rbac-users'],
    queryFn: async () => {
      const res = await fetch('/api/rbac/users', { credentials: 'include' });
      if (!res.ok) throw new Error('Gagal memuat pengguna');
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/rbac/users', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Gagal'); }
    },
    onSuccess: () => { toast.success('Pengguna ditambahkan'); queryClient.invalidateQueries({ queryKey: ['rbac-users'] }); setAddOpen(false); setAddForm({ name: '', email: '', password: '', role: 'viewer' }); },
    onError: (e) => toast.error(e.message),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      const data: Record<string, string> = { name: editForm.name.trim() };
      if (editForm.password.trim()) data.password = editForm.password;
      data.role = editForm.role;
      const res = await fetch(`/api/rbac/users/${editId}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Gagal'); }
    },
    onSuccess: () => { toast.success('Pengguna diperbarui'); queryClient.invalidateQueries({ queryKey: ['rbac-users'] }); setEditOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/rbac/users/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Gagal'); }
    },
    onSuccess: () => { toast.success('Pengguna dihapus'); queryClient.invalidateQueries({ queryKey: ['rbac-users'] }); setDeleteId(''); },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (u: User) => { setEditId(u.id); setEditForm({ name: u.name, email: u.email, password: '', role: u.role }); setEditOpen(true); };

  if (isLoading) return <div className='space-y-4'><Skeleton className='h-10 w-60' /><Skeleton className='h-64 w-full rounded-lg' /></div>;

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Users className='size-5 text-primary' />
          <h2 className='text-lg font-semibold'>Kelola Pengguna</h2>
          <Badge variant='secondary'>{users.length}</Badge>
        </div>
        <Button onClick={() => setAddOpen(true)} className='gap-2'><UserPlus className='size-4' />Tambah</Button>
      </div>

      <div className='rounded-lg border'>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead>
            <TableHead className='hidden sm:table-cell'>Dibuat</TableHead><TableHead className='text-right'>Aksi</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow><TableCell colSpan={5} className='text-center py-12 text-muted-foreground'>
                <Users className='size-10 mx-auto mb-2 opacity-20' /><p className='text-sm'>Belum ada pengguna</p>
              </TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className='font-medium'>{u.name}</TableCell>
                <TableCell className='text-muted-foreground'>{u.email}</TableCell>
                <TableCell><Badge variant='outline'>{ROLE_LABELS[u.role]}</Badge></TableCell>
                <TableCell className='hidden sm:table-cell text-muted-foreground text-xs'>
                  {u.created_at ? format(new Date(u.created_at), 'd MMM yyyy, HH:mm') : '-'}
                </TableCell>
                <TableCell className='text-right'>
                  <div className='flex items-center justify-end gap-1'>
                    <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => openEdit(u)}><Pencil className='size-3.5' /></Button>
                    {currentUser?.id !== u.id && (
                      <Button variant='ghost' size='sm' className='h-8 w-8 p-0 text-destructive hover:text-destructive'
                        onClick={() => setDeleteId(u.id)}><Trash2 className='size-3.5' /></Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader><DialogTitle>Tambah Pengguna</DialogTitle><DialogDescription>Tambahkan pengguna baru.</DialogDescription></DialogHeader>
          <div className='grid gap-4 py-2'>
            <div className='grid gap-2'><Label>Nama</Label><Input value={addForm.name} onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className='grid gap-2'><Label>Email</Label><Input type='email' value={addForm.email} onChange={(e) => setAddForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className='grid gap-2'><Label>Password</Label><Input type='password' value={addForm.password} onChange={(e) => setAddForm(f => ({ ...f, password: e.target.value }))} /></div>
            <div className='grid gap-2'><Label>Role</Label>
              <Select value={addForm.role} onValueChange={(v) => setAddForm(f => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value='viewer'>Viewer</SelectItem><SelectItem value='editor'>Editor</SelectItem><SelectItem value='admin'>Admin</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAddOpen(false)}>Batal</Button>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !addForm.name.trim() || !addForm.email.trim() || !addForm.password.trim()} className='gap-2'>
              {addMutation.isPending && <Loader2 className='size-4 animate-spin' />}Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader><DialogTitle>Edit Pengguna</DialogTitle><DialogDescription>Ubah data pengguna.</DialogDescription></DialogHeader>
          <div className='grid gap-4 py-2'>
            <div className='grid gap-2'><Label>Email</Label><Input value={editForm.email} disabled className='bg-muted' /></div>
            <div className='grid gap-2'><Label>Nama</Label><Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className='grid gap-2'><Label>Password Baru</Label><Input type='password' placeholder='Kosongkan jika tidak diubah' value={editForm.password} onChange={(e) => setEditForm(f => ({ ...f, password: e.target.value }))} /></div>
            <div className='grid gap-2'><Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm(f => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value='viewer'>Viewer</SelectItem><SelectItem value='editor'>Editor</SelectItem><SelectItem value='admin'>Admin</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditOpen(false)}>Batal</Button>
            <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending || !editForm.name.trim()} className='gap-2'>
              {editMutation.isPending && <Loader2 className='size-4 animate-spin' />}Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId('')}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Pengguna?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}
              className='bg-destructive text-white hover:bg-destructive/90'>
              {deleteMutation.isPending && <Loader2 className='size-4 mr-2 animate-spin' />}Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
