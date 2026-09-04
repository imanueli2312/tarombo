'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MARGA_BATAK } from '@/lib/batak-culture';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { Person, PersonDetailResponse } from '@/types';

const personSchema = z.object({
  nama: z.string().min(1, 'Nama Lengkap wajib diisi'),
  nama_panggilan: z.string(),
  jenis_kelamin: z.enum(['L', 'P']),
  tempat_lahir: z.string(),
  tanggal_lahir: z.string(),
  tanggal_kematian: z.string(),
  nomor_urut_lahir: z.number().int().positive().nullable(),
  nomor_generasi: z.number().int().min(1),
  agama: z.string(),
  alamat: z.string(),
  nomor_telepon: z.string(),
  status_pernikahan: z.enum(['belum_menikah', 'menikah', 'cerai', 'duda', 'janda']),
  burial_nama: z.string(),
  burial_alamat: z.string(),
  burial_latitude: z.number().nullable(),
  burial_longitude: z.number().nullable(),
  marga_asal: z.string(),
  tempat_asal: z.string(),
  pendidikan: z.string(),
  pekerjaan: z.string(),
  keterangan: z.string(),
  father_id: z.string(),
  mother_id: z.string(),
});

type PersonFormData = z.infer<typeof personSchema>;

interface PersonFormProps {
  person?: Person;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonForm({ person, open, onOpenChange }: PersonFormProps) {
  const queryClient = useQueryClient();
  const [burialOpen, setBurialOpen] = useState(false);
  const isEditing = !!person;

  const { data: allPersons = [] } = useQuery<Person[]>({
    queryKey: ['persons'],
    queryFn: () => fetch('/api/persons').then((r) => r.json()),
    enabled: open,
  });

  // Fetch current parents when editing
  const { data: personDetail } = useQuery<PersonDetailResponse>({
    queryKey: ['person', person?.id],
    queryFn: () => fetch(`/api/persons/${person!.id}`).then((r) => r.json()),
    enabled: !!person && open,
  });

  // Filter out self from parent options
  const otherMales = allPersons.filter((p) => p.jenis_kelamin === 'L' && p.id !== person?.id);
  const otherFemales = allPersons.filter((p) => p.jenis_kelamin === 'P' && p.id !== person?.id);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      nama: '',
      nama_panggilan: '',
      jenis_kelamin: 'L',
      tempat_lahir: '',
      tanggal_lahir: '',
      tanggal_kematian: '',
      nomor_urut_lahir: null,
      nomor_generasi: 1,
      agama: '',
      alamat: '',
      nomor_telepon: '',
      status_pernikahan: 'belum_menikah',
      burial_nama: '',
      burial_alamat: '',
      burial_latitude: null,
      burial_longitude: null,
      marga_asal: '',
      tempat_asal: '',
      pendidikan: '',
      pekerjaan: '',
      keterangan: '',
      father_id: '',
      mother_id: '',
    },
  });

  // Reset form when person changes or dialog opens
  useEffect(() => {
    if (open && person) {
      reset({
        nama: person.nama ?? '',
        nama_panggilan: person.nama_panggilan ?? '',
        jenis_kelamin: person.jenis_kelamin,
        tempat_lahir: person.tempat_lahir ?? '',
        tanggal_lahir: person.tanggal_lahir ? person.tanggal_lahir.slice(0, 10) : '',
        tanggal_kematian: person.tanggal_kematian ? person.tanggal_kematian.slice(0, 10) : '',
        nomor_urut_lahir: person.nomor_urut_lahir,
        nomor_generasi: person.nomor_generasi,
        agama: person.agama ?? '',
        alamat: person.alamat ?? '',
        nomor_telepon: person.nomor_telepon ?? '',
        status_pernikahan: person.status_pernikahan,
        burial_nama: person.burial_nama ?? '',
        burial_alamat: person.burial_alamat ?? '',
        burial_latitude: person.burial_latitude,
        burial_longitude: person.burial_longitude,
        marga_asal: person.marga_asal || '',
        tempat_asal: person.tempat_asal || '',
        pendidikan: person.pendidikan || '',
        pekerjaan: person.pekerjaan || '',
        keterangan: person.keterangan || '',
        father_id: personDetail?.parents?.father?.id ?? '',
        mother_id: personDetail?.parents?.mother?.id ?? '',
      });
      if (person.burial_nama || person.burial_alamat) {
        setBurialOpen(true);
      } else {
        setBurialOpen(false);
      }
    } else if (open && !person) {
      reset({
        nama: '',
        nama_panggilan: '',
        jenis_kelamin: 'L',
        tempat_lahir: '',
        tanggal_lahir: '',
        tanggal_kematian: '',
        nomor_urut_lahir: null,
        nomor_generasi: 1,
        agama: '',
        alamat: '',
        nomor_telepon: '',
        status_pernikahan: 'belum_menikah',
        burial_nama: '',
        burial_alamat: '',
        burial_latitude: null,
        burial_longitude: null,
        marga_asal: '',
        tempat_asal: '',
        pendidikan: '',
        pekerjaan: '',
        keterangan: '',
        father_id: '',
        mother_id: '',
      });
      setBurialOpen(false);
    }
  }, [person, open, reset]);

  const createMutation = useMutation({
    mutationFn: async (data: PersonFormData) => {
      const payload: Record<string, unknown> = {
        nama: data.nama,
        jenis_kelamin: data.jenis_kelamin,
      };
      if (data.nama_panggilan) payload.nama_panggilan = data.nama_panggilan;
      if (data.tempat_lahir) payload.tempat_lahir = data.tempat_lahir;
      if (data.tanggal_lahir) payload.tanggal_lahir = data.tanggal_lahir;
      if (data.tanggal_kematian) payload.tanggal_kematian = data.tanggal_kematian;
      if (data.nomor_urut_lahir) payload.nomor_urut_lahir = data.nomor_urut_lahir;
      if (data.nomor_generasi) payload.nomor_generasi = data.nomor_generasi;
      if (data.agama) payload.agama = data.agama;
      if (data.alamat) payload.alamat = data.alamat;
      if (data.nomor_telepon) payload.nomor_telepon = data.nomor_telepon;
      if (data.status_pernikahan) payload.status_pernikahan = data.status_pernikahan;
      if (data.burial_nama) payload.burial_nama = data.burial_nama;
      if (data.burial_alamat) payload.burial_alamat = data.burial_alamat;
      if (Number.isFinite(data.burial_latitude)) payload.burial_latitude = data.burial_latitude;
      if (Number.isFinite(data.burial_longitude)) payload.burial_longitude = data.burial_longitude;
      if (data.marga_asal) payload.marga_asal = data.marga_asal;
      if (data.tempat_asal) payload.tempat_asal = data.tempat_asal;
      if (data.pendidikan) payload.pendidikan = data.pendidikan;
      if (data.pekerjaan) payload.pekerjaan = data.pekerjaan;
      if (data.keterangan) payload.keterangan = data.keterangan;
      if (data.father_id) payload.father_id = data.father_id;
      if (data.mother_id) payload.mother_id = data.mother_id;

      const res = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menambah anggota');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      queryClient.invalidateQueries({ queryKey: ['tree'] });
      toast.success('Anggota keluarga berhasil ditambahkan');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PersonFormData) => {
      const payload: Record<string, unknown> = {
        nama: data.nama,
        jenis_kelamin: data.jenis_kelamin,
      };
      if (data.nama_panggilan) payload.nama_panggilan = data.nama_panggilan;
      if (data.tempat_lahir) payload.tempat_lahir = data.tempat_lahir;
      if (data.tanggal_lahir) payload.tanggal_lahir = data.tanggal_lahir;
      if (data.tanggal_kematian) payload.tanggal_kematian = data.tanggal_kematian;
      if (data.nomor_urut_lahir) payload.nomor_urut_lahir = data.nomor_urut_lahir;
      if (data.nomor_generasi) payload.nomor_generasi = data.nomor_generasi;
      if (data.agama) payload.agama = data.agama;
      if (data.alamat) payload.alamat = data.alamat;
      if (data.nomor_telepon) payload.nomor_telepon = data.nomor_telepon;
      if (data.status_pernikahan) payload.status_pernikahan = data.status_pernikahan;
      if (data.burial_nama) payload.burial_nama = data.burial_nama;
      if (data.burial_alamat) payload.burial_alamat = data.burial_alamat;
      if (Number.isFinite(data.burial_latitude)) payload.burial_latitude = data.burial_latitude;
      if (Number.isFinite(data.burial_longitude)) payload.burial_longitude = data.burial_longitude;
      if (data.marga_asal) payload.marga_asal = data.marga_asal;
      if (data.tempat_asal) payload.tempat_asal = data.tempat_asal;
      if (data.pendidikan) payload.pendidikan = data.pendidikan;
      if (data.pekerjaan) payload.pekerjaan = data.pekerjaan;
      if (data.keterangan) payload.keterangan = data.keterangan;
      // Explicitly clear optional fields when emptied during edit
      if (!data.tanggal_lahir) payload.tanggal_lahir = null;
      if (!data.tanggal_kematian) payload.tanggal_kematian = null;
      if (!data.nama_panggilan) payload.nama_panggilan = null;
      if (!data.tempat_lahir) payload.tempat_lahir = null;
      if (!data.agama) payload.agama = null;
      if (!data.nomor_telepon) payload.nomor_telepon = null;
      if (!data.alamat) payload.alamat = null;
      if (!data.burial_nama) payload.burial_nama = null;
      if (!data.burial_alamat) payload.burial_alamat = null;
      if (!Number.isFinite(data.burial_latitude)) payload.burial_latitude = null;
      if (!Number.isFinite(data.burial_longitude)) payload.burial_longitude = null;
      if (!data.marga_asal) payload.marga_asal = null;
      if (!data.tempat_asal) payload.tempat_asal = null;
      if (!data.pendidikan) payload.pendidikan = null;
      if (!data.pekerjaan) payload.pekerjaan = null;
      if (!data.keterangan) payload.keterangan = null;
      // Parent links
      if (data.father_id) payload.father_id = data.father_id; else payload.father_id = null;
      if (data.mother_id) payload.mother_id = data.mother_id; else payload.mother_id = null;

      const res = await fetch(`/api/persons/${person!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mengupdate anggota');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      queryClient.invalidateQueries({ queryKey: ['tree'] });
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
      toast.success('Anggota keluarga berhasil diperbarui');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: PersonFormData) {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Anggota Keluarga' : 'Tambah Anggota Keluarga'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Perbarui data anggota keluarga'
              : 'Isi data untuk menambah anggota keluarga baru'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <form id="person-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-4">
            {/* --- Data Pribadi --- */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Data Pribadi</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nama Lengkap */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nama">Nama Lengkap *</Label>
                  <Input
                    id="nama"
                    placeholder="Masukkan nama lengkap"
                    aria-invalid={!!errors.nama}
                    {...register('nama')}
                  />
                  {errors.nama && (
                    <p className="text-xs text-destructive">{errors.nama.message}</p>
                  )}
                </div>

                {/* Nama Panggilan */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nama_panggilan">Nama Panggilan</Label>
                  <Input
                    id="nama_panggilan"
                    placeholder="Masukkan nama panggilan"
                    {...register('nama_panggilan')}
                  />
                </div>

                {/* Jenis Kelamin */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="jenis_kelamin">Jenis Kelamin *</Label>
                  <Select
                    value={watch('jenis_kelamin')}
                    onValueChange={(val: 'L' | 'P') => setValue('jenis_kelamin', val)}
                  >
                    <SelectTrigger className="w-full" aria-invalid={!!errors.jenis_kelamin}>
                      <SelectValue placeholder="Pilih jenis kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Nomor Urut Kelahiran */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nomor_urut_lahir">Nomor Urut Kelahiran</Label>
                  <Input
                    id="nomor_urut_lahir"
                    type="number"
                    min={1}
                    placeholder="Contoh: 1"
                    {...register('nomor_urut_lahir', { valueAsNumber: true })}
                  />
                </div>

                {/* Tempat Lahir */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tempat_lahir">Tempat Lahir</Label>
                  <Input
                    id="tempat_lahir"
                    placeholder="Masukkan tempat lahir"
                    {...register('tempat_lahir')}
                  />
                </div>

                {/* Tanggal Lahir */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tanggal_lahir">Tanggal Lahir</Label>
                  <Input
                    id="tanggal_lahir"
                    type="date"
                    {...register('tanggal_lahir')}
                  />
                </div>

                {/* Tanggal Kematian */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tanggal_kematian">Tanggal Kematian</Label>
                  <Input
                    id="tanggal_kematian"
                    type="date"
                    {...register('tanggal_kematian')}
                  />
                </div>

                {/* Status Pernikahan */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="status_pernikahan">Status Pernikahan</Label>
                  <Select
                    value={watch('status_pernikahan')}
                    onValueChange={(val) =>
                      setValue('status_pernikahan', val as PersonFormData['status_pernikahan'])
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="belum_menikah">Belum Menikah</SelectItem>
                      <SelectItem value="menikah">Menikah</SelectItem>
                      <SelectItem value="cerai">Cerai</SelectItem>
                      <SelectItem value="duda">Duda</SelectItem>
                      <SelectItem value="janda">Janda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* --- Kontak & Alamat --- */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Kontak & Alamat</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Agama */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="agama">Agama</Label>
                  <Input
                    id="agama"
                    placeholder="Masukkan agama"
                    {...register('agama')}
                  />
                </div>

                {/* Nomor Telepon */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nomor_telepon">Nomor Telepon</Label>
                  <Input
                    id="nomor_telepon"
                    placeholder="Contoh: 08123456789"
                    {...register('nomor_telepon')}
                  />
                </div>

                {/* Alamat */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <Label htmlFor="alamat">Alamat</Label>
                  <Textarea
                    id="alamat"
                    placeholder="Masukkan alamat lengkap"
                    rows={2}
                    {...register('alamat')}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* --- Data Budaya Batak --- */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Data Budaya Batak</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="marga_asal">Marga Asal</Label>
                  <Input
                    id="marga_asal"
                    placeholder="Contoh: Siregar, Simatupang..."
                    list="marga-suggestions"
                    {...register('marga_asal')}
                  />
                  <datalist id="marga-suggestions">
                    {MARGA_BATAK.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                  <p className="text-[11px] text-muted-foreground">
                    Marga klan (diwariskan patrilineal — anak mengikuti marga ayah).
                    Jika dikosongkan dan ayah dipilih, marga otomatis mengikuti marga ayah.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tempat_asal">Tempat Asal (Huta)</Label>
                  <Input
                    id="tempat_asal"
                    placeholder="Contoh: Balige, Samosir..."
                    {...register('tempat_asal')}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pendidikan">Pendidikan Terakhir</Label>
                  <Input
                    id="pendidikan"
                    placeholder="Contoh: S1, SMA, SMP..."
                    {...register('pendidikan')}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pekerjaan">Pekerjaan</Label>
                  <Input
                    id="pekerjaan"
                    placeholder="Contoh: PNS, Wiraswasta..."
                    {...register('pekerjaan')}
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <Label htmlFor="keterangan">Keterangan</Label>
                  <Textarea
                    id="keterangan"
                    placeholder="Catatan tambahan (opsional)"
                    rows={2}
                    {...register('keterangan')}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* --- Orang Tua --- */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Orang Tua (opsional)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ayah */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="father_id">Ayah</Label>
                  <Select
                    value={watch('father_id')}
                    onValueChange={(val) => setValue('father_id', val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih ayah" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherMales.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Tidak ada data laki-laki
                        </div>
                      )}
                      {otherMales.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nama_panggilan || p.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ibu */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mother_id">Ibu</Label>
                  <Select
                    value={watch('mother_id')}
                    onValueChange={(val) => setValue('mother_id', val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih ibu" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherFemales.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Tidak ada data perempuan
                        </div>
                      )}
                      {otherFemales.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nama_panggilan || p.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* --- Data Pemakaman (collapsible) --- */}
            <Collapsible open={burialOpen} onOpenChange={setBurialOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>Data Tempat Pemakaman</span>
                  {burialOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="burial_nama">Nama Tempat Pemakaman</Label>
                    <Input
                      id="burial_nama"
                      placeholder="Nama pemakaman"
                      {...register('burial_nama')}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="burial_alamat">Alamat Pemakaman</Label>
                    <Input
                      id="burial_alamat"
                      placeholder="Alamat pemakaman"
                      {...register('burial_alamat')}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="burial_latitude">Garis Lintang (Latitude)</Label>
                    <Input
                      id="burial_latitude"
                      type="number"
                      step="any"
                      placeholder="Contoh: 2.5"
                      {...register('burial_latitude', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="burial_longitude">Garis Bujur (Longitude)</Label>
                    <Input
                      id="burial_longitude"
                      type="number"
                      step="any"
                      placeholder="Contoh: 99.0"
                      {...register('burial_longitude', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* --- Generasi (hanya tambah baru) --- */}
            {!isEditing && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nomor_generasi">Nomor Generasi</Label>
                <Input
                  id="nomor_generasi"
                  type="number"
                  min={1}
                  placeholder="1"
                  {...register('nomor_generasi', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Otomatis dihitung dari ayah jika orang tua dipilih
                </p>
              </div>
            )}
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
          <Button
            type="submit"
            form="person-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                Menyimpan…
              </>
            ) : isEditing ? (
              'Simpan Perubahan'
            ) : (
              'Tambah Anggota'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
