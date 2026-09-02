'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Heart } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { Person, Partnership } from '@/types';

const partnershipSchema = z.object({
  person1_id: z.string().min(1, 'Suami/Istri 1 wajib diisi'),
  person2_id: z.string().min(1, 'Suami/Istri 2 wajib diisi'),
  marriage_date: z.string(),
  divorce_date: z.string(),
});

type PartnershipFormData = z.infer<typeof partnershipSchema>;

interface PartnershipFormProps {
  partnership?: Partnership;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PartnershipForm({ partnership, open, onOpenChange }: PartnershipFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!partnership;

  const { data: allPersons = [] } = useQuery<Person[]>({
    queryKey: ['persons'],
    queryFn: () => fetch('/api/persons').then((r) => r.json()),
    enabled: open,
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PartnershipFormData>({
    resolver: zodResolver(partnershipSchema),
    defaultValues: {
      person1_id: '',
      person2_id: '',
      marriage_date: '',
      divorce_date: '',
    },
  });

  // Reset form when dialog opens or partnership changes
  useEffect(() => {
    if (open && partnership) {
      reset({
        person1_id: partnership.person1_id,
        person2_id: partnership.person2_id,
        marriage_date: partnership.marriage_date
          ? partnership.marriage_date.slice(0, 10)
          : '',
        divorce_date: partnership.divorce_date
          ? partnership.divorce_date.slice(0, 10)
          : '',
      });
    } else if (open && !partnership) {
      reset({
        person1_id: '',
        person2_id: '',
        marriage_date: '',
        divorce_date: '',
      });
    }
  }, [partnership, open, reset]);

  const createMutation = useMutation({
    mutationFn: async (data: PartnershipFormData) => {
      const payload: Record<string, unknown> = {
        person1_id: data.person1_id,
        person2_id: data.person2_id,
      };
      if (data.marriage_date) payload.marriage_date = data.marriage_date;

      const res = await fetch('/api/partnerships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('Orang ini sudah memiliki pasangan aktif');
        }
        throw new Error(json.error || 'Gagal menambah pernikahan');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
      queryClient.invalidateQueries({ queryKey: ['tree'] });
      toast.success('Pernikahan berhasil ditambahkan');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PartnershipFormData) => {
      const payload: Record<string, unknown> = {
        marriage_date: data.marriage_date || null,
        divorce_date: data.divorce_date || null,
      };

      const res = await fetch(`/api/partnerships/${partnership!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mengupdate pernikahan');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
      queryClient.invalidateQueries({ queryKey: ['tree'] });
      toast.success('Pernikahan berhasil diperbarui');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: PartnershipFormData) {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  }

  function personLabel(p: Person): string {
    const displayName = p.nama_panggilan || p.nama;
    const gender = p.jenis_kelamin === 'L' ? 'L' : 'P';
    return `${displayName} (${gender}) — Gen ${p.nomor_generasi}`;
  }

  const selectedPerson2 = watch('person2_id');
  const selectedPerson1 = watch('person1_id');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="size-5 text-rose-500" />
            {isEditing ? 'Edit Pernikahan' : 'Tambah Pernikahan'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Perbarui data pernikahan'
              : 'Pilih dua anggota keluarga untuk menambah pernikahan'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <form id="partnership-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Person 1 */}
              <div className="flex flex-col gap-1.5">
                <Label>Suami/Istri 1 *</Label>
                <Controller
                  name="person1_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isEditing}>
                      <SelectTrigger
                        className="w-full"
                        aria-invalid={!!errors.person1_id}
                      >
                        <SelectValue placeholder="Pilih anggota" />
                      </SelectTrigger>
                      <SelectContent>
                        {allPersons.length === 0 && (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Tidak ada data
                          </div>
                        )}
                        {allPersons
                          .filter((p) => p.id !== selectedPerson2)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {personLabel(p)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.person1_id && (
                  <p className="text-xs text-destructive">{errors.person1_id.message}</p>
                )}
              </div>

              {/* Person 2 */}
              <div className="flex flex-col gap-1.5">
                <Label>Suami/Istri 2 *</Label>
                <Controller
                  name="person2_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isEditing}>
                      <SelectTrigger
                        className="w-full"
                        aria-invalid={!!errors.person2_id}
                      >
                        <SelectValue placeholder="Pilih anggota" />
                      </SelectTrigger>
                      <SelectContent>
                        {allPersons.length === 0 && (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Tidak ada data
                          </div>
                        )}
                        {allPersons
                          .filter((p) => p.id !== selectedPerson1)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {personLabel(p)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.person2_id && (
                  <p className="text-xs text-destructive">{errors.person2_id.message}</p>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Marriage Date */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="marriage_date">Tanggal Pernikahan</Label>
                <Controller
                  name="marriage_date"
                  control={control}
                  render={({ field }) => (
                    <input
                      id="marriage_date"
                      type="date"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              {/* Divorce Date (edit only) */}
              {isEditing && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="divorce_date">Tanggal Cerai</Label>
                  <Controller
                    name="divorce_date"
                    control={control}
                    render={({ field }) => (
                      <input
                        id="divorce_date"
                        type="date"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              )}
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button type="submit" form="partnership-form" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                Menyimpan…
              </>
            ) : isEditing ? (
              'Simpan Perubahan'
            ) : (
              'Tambah Pernikahan'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
