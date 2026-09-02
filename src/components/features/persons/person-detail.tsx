'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  User,
  UserRound,
  Pencil,
  Trash2,
  MapPin,
  Cross,
  Heart,
  Users,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { Person } from '@/types';

interface PersonDetailResponse extends Person {
  parents?: { father?: Person; mother?: Person };
  children?: Person[];
  spouse?: Person | null;
}

interface PersonDetailProps {
  personId: string;
  onEdit?: (person: Person) => void;
  onDelete?: (personId: string) => void;
}

const MARITAL_STATUS_LABELS: Record<string, string> = {
  belum_menikah: 'Belum Menikah',
  menikah: 'Menikah',
  cerai: 'Cerai',
  duda: 'Duda',
  janda: 'Janda',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'd MMMM yyyy', { locale: idLocale });
  } catch {
    return dateStr;
  }
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{String(value)}</span>
    </div>
  );
}

export function PersonDetail({ personId, onEdit, onDelete }: PersonDetailProps) {
  const queryClient = useQueryClient();

  const { data: person, isLoading, error } = useQuery<PersonDetailResponse>({
    queryKey: ['person', personId],
    queryFn: () => fetch(`/api/persons/${personId}`).then((r) => r.json()),
    enabled: !!personId,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/persons/${personId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      queryClient.invalidateQueries({ queryKey: ['tree'] });
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
      toast.success('Anggota keluarga berhasil dihapus');
      onDelete?.(personId);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !person) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Data anggota tidak ditemukan</p>
        </CardContent>
      </Card>
    );
  }

  const isDeceased = !!person.tanggal_kematian;
  const father = person.parents?.father;
  const mother = person.parents?.mother;

  return (
    <Card className={isDeceased ? 'opacity-80' : ''}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center rounded-full size-10 shrink-0 ${
              person.jenis_kelamin === 'L'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
            }`}
          >
            {person.jenis_kelamin === 'L' ? (
              <User className="size-5" />
            ) : (
              <UserRound className="size-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg truncate">
              {person.nama_panggilan || person.nama}
              {isDeceased && (
                <Cross className="inline-block size-4 ml-2 text-muted-foreground" />
              )}
            </CardTitle>
            <CardDescription className="truncate">
              {person.nama_panggilan && person.nama !== person.nama_panggilan
                ? person.nama
                : `Generasi ${person.nomor_generasi}`}
              {' · '}
              {person.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
            </CardDescription>
          </div>
        </div>
        <CardAction>
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(person)}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          )}
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="size-3.5" />
                  Hapus
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Anggota Keluarga</AlertDialogTitle>
                  <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus <strong>{person.nama}</strong>? Tindakan ini
                    tidak dapat dibatalkan dan akan menghapus semua data terkait.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {deleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* --- Data Pribadi --- */}
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Data Pribadi
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <InfoRow label="Nama Lengkap" value={person.nama} />
            <InfoRow label="Nama Panggilan" value={person.nama_panggilan || undefined} />
            <InfoRow label="Jenis Kelamin" value={person.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'} />
            <InfoRow label="Tempat Lahir" value={person.tempat_lahir || undefined} />
            <InfoRow
              label="Tanggal Lahir"
              value={formatDate(person.tanggal_lahir)}
            />
            {isDeceased && (
              <InfoRow
                label="Tanggal Kematian"
                value={formatDate(person.tanggal_kematian)}
              />
            )}
            <InfoRow
              label="Nomor Urut Kelahiran"
              value={person.nomor_urut_lahir ?? undefined}
            />
            <InfoRow label="Generasi" value={person.nomor_generasi} />
            <InfoRow
              label="Status Pernikahan"
              value={MARITAL_STATUS_LABELS[person.status_pernikahan] || person.status_pernikahan}
            />
          </div>
        </div>

        <Separator />

        {/* --- Kontak & Alamat --- */}
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Kontak & Alamat
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow label="Agama" value={person.agama || undefined} />
            <InfoRow label="Nomor Telepon" value={person.nomor_telepon || undefined} />
            {person.alamat && (
              <div className="flex flex-col gap-0.5 sm:col-span-2">
                <span className="text-xs text-muted-foreground">Alamat</span>
                <span className="text-sm font-medium">{person.alamat}</span>
              </div>
            )}
          </div>
        </div>

        {/* --- Orang Tua --- */}
        {(father || mother) && (
          <>
            <Separator />
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Users className="size-3.5" />
                Orang Tua
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {father && (
                  <div className="flex items-center gap-2 rounded-md border p-2.5">
                    <div className="flex items-center justify-center rounded-full size-8 bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 shrink-0">
                      <User className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {father.nama_panggilan || father.nama}
                      </p>
                      <p className="text-xs text-muted-foreground">Ayah</p>
                    </div>
                  </div>
                )}
                {mother && (
                  <div className="flex items-center gap-2 rounded-md border p-2.5">
                    <div className="flex items-center justify-center rounded-full size-8 bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 shrink-0">
                      <UserRound className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {mother.nama_panggilan || mother.nama}
                      </p>
                      <p className="text-xs text-muted-foreground">Ibu</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* --- Pasangan Aktif --- */}
        {person.spouse && (
          <>
            <Separator />
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Heart className="size-3.5" />
                Pasangan
              </h4>
              <div className="flex items-center gap-2 rounded-md border p-2.5">
                <div
                  className={`flex items-center justify-center rounded-full size-8 shrink-0 ${
                    person.spouse.jenis_kelamin === 'L'
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                      : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                  }`}
                >
                  {person.spouse.jenis_kelamin === 'L' ? (
                    <User className="size-4" />
                  ) : (
                    <UserRound className="size-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {person.spouse.nama_panggilan || person.spouse.nama}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {person.spouse.tanggal_lahir
                      ? `Lahir ${formatDate(person.spouse.tanggal_lahir)}`
                      : `Generasi ${person.spouse.nomor_generasi}`}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-auto shrink-0">
                  Menikah
                </Badge>
              </div>
            </div>
          </>
        )}

        {/* --- Anak-anak --- */}
        {person.children && person.children.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Users className="size-3.5" />
                Anak ({person.children.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {person.children.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center gap-2 rounded-md border p-2.5"
                  >
                    <div
                      className={`flex items-center justify-center rounded-full size-7 shrink-0 ${
                        child.jenis_kelamin === 'L'
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                          : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                      }`}
                    >
                      {child.jenis_kelamin === 'L' ? (
                        <User className="size-3.5" />
                      ) : (
                        <UserRound className="size-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {child.nama_panggilan || child.nama}
                      </p>
                      {child.tanggal_kematian && (
                        <p className="text-xs text-muted-foreground">Alm.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* --- Tempat Pemakaman --- */}
        {(person.burial_nama || person.burial_alamat) && (
          <>
            <Separator />
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                Tempat Pemakaman
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow label="Nama" value={person.burial_nama} />
                <InfoRow label="Alamat" value={person.burial_alamat} />
                {person.burial_latitude != null && (
                  <InfoRow label="Latitude" value={person.burial_latitude} />
                )}
                {person.burial_longitude != null && (
                  <InfoRow label="Longitude" value={person.burial_longitude} />
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
