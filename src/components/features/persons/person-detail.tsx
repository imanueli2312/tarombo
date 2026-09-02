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
  BookOpen,
  Shield,
  Flame,
  Sparkles,
  ChevronRight,
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

import type { Person, PersonDetailResponse } from '@/types';
import { getMargaLabel, MARGA_UTAMA, MARITAL_STATUS_BATAK, getKinshipTerm, ORAL_HISTORY_CATEGORIES, PUSAKA_TYPES, getOralHistoryCategoryLabel, getPusakaTypeLabel } from '@/lib/batak-culture';

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

function PersonOralHistories({ personId }: { personId: string }) {
  const { data: oralHistories = [] } = useQuery({
    queryKey: ['oral-histories-by-person', personId],
    queryFn: () => fetch(`/api/oral-histories?person_id=${personId}`).then(r => r.json()),
    enabled: !!personId,
    staleTime: 30000,
  });
  if (oralHistories.length === 0) return null;
  return (
    <>
      <Separator />
      <div>
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <BookOpen className="size-3.5" />
          Turian (Oral History)
          <Badge variant="secondary" className="text-[10px] ml-1">{oralHistories.length}</Badge>
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {oralHistories.map((item: { id: string; title: string; category: string; content: string; is_verified: boolean; source_person_name: string }) => {
            const cat = getOralHistoryCategoryLabel(item.category);
            return (
              <div key={item.id} className="flex items-start gap-2.5 rounded-md border p-2.5 hover:bg-muted/30 transition-colors">
                <div className="rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 p-1.5 mt-0.5 shrink-0">
                  <BookOpen className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium truncate">{item.title || 'Tanpa judul'}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400/40 text-amber-700 dark:text-amber-400">
                      {cat.label}
                    </Badge>
                    {item.is_verified && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-400/40 text-emerald-700 dark:text-emerald-400">
                        <Shield className="size-2.5 mr-0.5" /> Terverifikasi
                      </Badge>
                    )}
                  </div>
                  {item.content && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.content}</p>
                  )}
                  {item.source_person_name && (
                    <p className="text-[10px] text-muted-foreground mt-1">Sumber: {item.source_person_name}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function PersonPusakaItems({ personId }: { personId: string }) {
  const { data: pusakaItems = [] } = useQuery({
    queryKey: ['pusaka-by-person', personId],
    queryFn: () => fetch(`/api/pusaka?person_id=${personId}`).then(r => r.json()),
    enabled: !!personId,
    staleTime: 30000,
  });
  if (pusakaItems.length === 0) return null;
  return (
    <>
      <Separator />
      <div>
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Sparkles className="size-3.5" />
          Pusaka (Warisan)
          <Badge variant="secondary" className="text-[10px] ml-1">{pusakaItems.length}</Badge>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {pusakaItems.map((item: { id: string; name: string; type: string; description: string; origin: string; is_sacred: boolean; year_acquired: string | null }) => {
            const t = getPusakaTypeLabel(item.type);
            return (
              <div key={item.id} className="flex items-start gap-2.5 rounded-md border p-2.5 hover:bg-muted/30 transition-colors">
                <div className={`rounded-md p-1.5 mt-0.5 shrink-0 ${item.is_sacred ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'}`}>
                  {item.is_sacred ? <Flame className="size-3.5" /> : <Sparkles className="size-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {item.is_sacred && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-400/40 text-red-700 dark:text-red-400">
                        Sakral
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1 border-amber-400/40 text-amber-700 dark:text-amber-400">
                    {t.label}
                  </Badge>
                  {item.origin && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">Asal: {item.origin}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
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
  const margaDisplay = getMargaLabel((person as Record<string, unknown>).marga_asal as string);
  const isDifferentMarga = !!(person as Record<string, unknown>).marga_asal;

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
              {isDifferentMarga && (
                <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 border-amber-400/50 text-amber-700 dark:text-amber-400">
                  {margaDisplay}
                </Badge>
              )}
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

        <Separator />

        {/* --- Data Budaya Batak --- */}
        {(() => {
          const p = person as Record<string, unknown>;
          const hasBatakData = p.marga_asal || p.tempat_asal || p.pendidikan || p.pekerjaan || p.keterangan;
          if (!hasBatakData) return null;
          return (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Data Budaya Batak
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <InfoRow label="Marga" value={margaDisplay !== MARGA_UTAMA ? margaDisplay : undefined} />
                <InfoRow label="Tempat Asal (Huta)" value={(p.tempat_asal as string) || undefined} />
                <InfoRow label="Pendidikan" value={(p.pendidikan as string) || undefined} />
                <InfoRow label="Pekerjaan" value={(p.pekerjaan as string) || undefined} />
                {p.keterangan && (
                  <div className="flex flex-col gap-0.5 sm:col-span-2 lg:col-span-3">
                    <span className="text-xs text-muted-foreground">Keterangan</span>
                    <span className="text-sm font-medium">{p.keterangan as string}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        <Separator />

        {/* --- Orang Tua --- */}
        {(father || mother) && (
          <>
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
                      <p className="text-xs text-muted-foreground">Ayah <span className="text-muted-foreground/60">(Amang)</span></p>
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
                      <p className="text-xs text-muted-foreground">Ibu <span className="text-muted-foreground/60">(Inang)</span></p>
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
                    {person.spouse.marga_asal && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">
                        · {person.spouse.marga_asal}
                      </span>
                    )}
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

        <PersonOralHistories personId={personId} />
        <PersonPusakaItems personId={personId} />
      </CardContent>
    </Card>
  );
}
