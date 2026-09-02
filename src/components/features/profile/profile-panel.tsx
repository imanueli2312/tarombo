'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  Search,
  User,
  UserRound,
  LayoutGrid,
  List,
  ArrowUpDown,
  Plus,
  Cross,
  Heart,
  HeartCrack,
  CalendarDays,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { Person, MaritalStatus } from '@/types';
import { useAuthStore } from '@/store/auth';
import { PersonDetail } from '@/components/features/persons/person-detail';
import { PersonForm } from '@/components/features/persons/person-form';

type SortKey = 'name' | 'generation' | 'birthDate';
type ViewMode = 'grid' | 'table';

const MARITAL_LABELS: Record<MaritalStatus, string> = {
  belum_menikah: 'Belum Menikah',
  menikah: 'Menikah',
  cerai: 'Cerai',
  duda: 'Duda',
  janda: 'Janda',
};

const MARITAL_VARIANT: Record<MaritalStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  belum_menikah: 'outline',
  menikah: 'default',
  cerai: 'destructive',
  duda: 'secondary',
  janda: 'secondary',
};

function formatDate(date: string | null): string {
  if (!date) return '-';
  try {
    return format(new Date(date), 'd MMM yyyy', { locale: idLocale });
  } catch {
    return date;
  }
}

interface ProfilePanelProps {
  initialPersonId?: string | null;
}

export function ProfilePanel({ initialPersonId }: ProfilePanelProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('create_person');
  const canDelete = hasPermission('delete_person');
  const canEdit = hasPermission('edit_person');

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(initialPersonId ?? null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | undefined>(undefined);

  const { data: persons = [], isLoading } = useQuery<Person[]>({
    queryKey: ['persons'],
    queryFn: async () => {
      const res = await fetch('/api/persons', { credentials: 'include' });
      if (!res.ok) throw new Error('Gagal memuat data');
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    let list = [...persons];

    // Filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.nama.toLowerCase().includes(q) ||
          p.nama_panggilan.toLowerCase().includes(q),
      );
    }

    // Sort
    list.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.nama.localeCompare(b.nama, 'id');
        case 'generation':
          return a.nomor_generasi - b.nomor_generasi || a.nama.localeCompare(b.nama, 'id');
        case 'birthDate': {
          const da = a.tanggal_lahir ? new Date(a.tanggal_lahir).getTime() : Infinity;
          const db = b.tanggal_lahir ? new Date(b.tanggal_lahir).getTime() : Infinity;
          return da - db;
        }
        default:
          return 0;
      }
    });

    return list;
  }, [persons, search, sortKey]);

  const handleEdit = useCallback((person: Person) => {
    setEditingPerson(person);
    setFormOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingPerson(undefined);
    setFormOpen(true);
  }, []);

  const handleRowClick = useCallback((id: string) => {
    setSelectedPersonId(id);
  }, []);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort */}
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger size="sm" className="w-[160px]">
              <ArrowUpDown className="size-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nama</SelectItem>
              <SelectItem value="generation">Generasi</SelectItem>
              <SelectItem value="birthDate">Tanggal Lahir</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0 rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0 rounded-l-none"
              onClick={() => setViewMode('table')}
            >
              <List className="size-4" />
            </Button>
          </div>

          {/* Add Person */}
          {canCreate && (
            <Button size="sm" className="gap-1.5" onClick={handleAdd}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Tambah</span>
            </Button>
          )}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        Menampilkan {filtered.length} dari {persons.length} anggota
      </p>

      {/* Content */}
      {isLoading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <User className="size-12 mb-3 opacity-20" />
          <p className="text-sm font-medium">Tidak ada data</p>
          <p className="text-xs mt-1">
            {search ? 'Coba ubah kata kunci pencarian' : 'Belum ada anggota keluarga'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((person) => {
              const isDeceased = !!person.tanggal_kematian;
              return (
                <motion.div
                  key={person.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={`cursor-pointer hover:shadow-md hover:border-primary/40 transition-all py-4 ${isDeceased ? 'opacity-70' : ''}`}
                    onClick={() => handleRowClick(person.id)}
                  >
                    <CardContent className="space-y-3 px-4">
                      {/* Avatar + Name */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
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
                          <p className="font-medium text-sm truncate leading-tight">
                            {person.nama_panggilan || person.nama}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {person.nama}
                          </p>
                        </div>
                        {isDeceased && (
                          <Cross className="size-3.5 text-muted-foreground shrink-0" />
                        )}
                      </div>

                      {/* Generation + Marital */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Gen {person.nomor_generasi}
                        </Badge>
                        <Badge variant={MARITAL_VARIANT[person.status_pernikahan]} className="text-[10px] px-1.5 py-0">
                          {MARITAL_LABELS[person.status_pernikahan]}
                        </Badge>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="size-3" />
                        <span>{formatDate(person.tanggal_lahir)}</span>
                        {isDeceased && (
                          <span className="ml-1">
                            &ndash; {formatDate(person.tanggal_kematian)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden md:table-cell">Jenis Kelamin</TableHead>
                <TableHead>Generasi</TableHead>
                <TableHead className="hidden sm:table-cell">Lahir</TableHead>
                <TableHead className="hidden lg:table-cell">Meninggal</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((person) => {
                const isDeceased = !!person.tanggal_kematian;
                return (
                  <TableRow
                    key={person.id}
                    className={`cursor-pointer ${isDeceased ? 'opacity-70' : ''}`}
                    onClick={() => handleRowClick(person.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {person.jenis_kelamin === 'L' ? (
                          <User className="size-4 text-blue-500" />
                        ) : (
                          <UserRound className="size-4 text-rose-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {person.nama_panggilan || person.nama}
                          </p>
                          <p className="text-xs text-muted-foreground md:hidden">
                            {person.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm">
                        {person.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        Gen {person.nomor_generasi}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                      {formatDate(person.tanggal_lahir)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                      {isDeceased ? formatDate(person.tanggal_kematian) : '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant={MARITAL_VARIANT[person.status_pernikahan]} className="text-[10px]">
                        {MARITAL_LABELS[person.status_pernikahan]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Person Detail Dialog */}
      <Dialog open={!!selectedPersonId} onOpenChange={(open) => !open && setSelectedPersonId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Anggota Keluarga</DialogTitle>
            <DialogDescription>Informasi lengkap anggota keluarga Hariandja.</DialogDescription>
          </DialogHeader>
          {selectedPersonId && (
            <PersonDetail
              personId={selectedPersonId}
              onEdit={canEdit ? (person) => {
                setSelectedPersonId(null);
                handleEdit(person);
              } : undefined}
              onDelete={canDelete ? (id) => {
                setSelectedPersonId(null);
              } : undefined}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Person Form */}
      <PersonForm
        person={editingPerson}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingPerson(undefined);
        }}
      />
    </div>
  );
}
