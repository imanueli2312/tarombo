'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Flame,
  BookOpen,
  ShieldCheck,
  ScrollText,
  ArrowRightLeft,
  CalendarDays,
  User,
  Landmark,
} from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import type {
  OralHistory,
  OralHistoryCreate,
  OralHistoryCategory,
  PusakaItem,
  PusakaCreate,
  PusakaType,
  Person,
} from '@/types';
import { useAuthStore } from '@/store/auth';
import {
  ORAL_HISTORY_CATEGORIES,
  PUSAKA_TYPES,
  getOralHistoryCategoryLabel,
  getPusakaTypeLabel,
} from '@/lib/batak-culture';

// ============================================================================
// Category badge color mapping (warm earth tones with oklch)
// ============================================================================

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  turian_asal_usul:
    'bg-[oklch(0.75_0.15_75)]/20 text-[oklch(0.55_0.15_75)] border-[oklch(0.65_0.12_75)]/40',
  turian_migrasi:
    'bg-[oklch(0.75_0.12_55)]/20 text-[oklch(0.50_0.12_55)] border-[oklch(0.65_0.10_55)]/40',
  turian_peristiwa:
    'bg-[oklch(0.75_0.14_85)]/20 text-[oklch(0.50_0.14_85)] border-[oklch(0.65_0.11_85)]/40',
  gondang:
    'bg-[oklch(0.70_0.14_25)]/20 text-[oklch(0.45_0.14_25)] border-[oklch(0.60_0.11_25)]/40',
  mangalahat:
    'bg-[oklch(0.75_0.10_150)]/20 text-[oklch(0.50_0.10_150)] border-[oklch(0.65_0.08_150)]/40',
  saur_matua:
    'bg-[oklch(0.70_0.10_0)]/20 text-[oklch(0.40_0.10_0)] border-[oklch(0.60_0.08_0)]/40',
  pesta_pernikahan:
    'bg-[oklch(0.75_0.12_350)]/20 text-[oklch(0.50_0.12_350)] border-[oklch(0.65_0.10_350)]/40',
  turian_umum:
    'bg-[oklch(0.75_0.06_260)]/15 text-[oklch(0.50_0.06_260)] border-[oklch(0.65_0.05_260)]/30',
};

const PUSAKA_TYPE_BADGE_STYLES: Record<string, string> = {
  tombak:
    'bg-[oklch(0.70_0.14_25)]/20 text-[oklch(0.45_0.14_25)] border-[oklch(0.60_0.11_25)]/40',
  ulos:
    'bg-[oklch(0.75_0.14_75)]/20 text-[oklch(0.55_0.14_75)] border-[oklch(0.65_0.11_75)]/40',
  tunggal_panaluan:
    'bg-[oklch(0.65_0.16_50)]/20 text-[oklch(0.40_0.16_50)] border-[oklch(0.55_0.13_50)]/40',
  gorga:
    'bg-[oklch(0.75_0.12_55)]/20 text-[oklch(0.50_0.12_55)] border-[oklch(0.65_0.10_55)]/40',
  gabe:
    'bg-[oklch(0.70_0.12_85)]/20 text-[oklch(0.45_0.12_85)] border-[oklch(0.60_0.10_85)]/40',
  hasangapon:
    'bg-[oklch(0.75_0.15_85)]/20 text-[oklch(0.55_0.15_85)] border-[oklch(0.65_0.12_85)]/40',
  rattan_box:
    'bg-[oklch(0.70_0.12_90)]/20 text-[oklch(0.45_0.12_90)] border-[oklch(0.60_0.10_90)]/40',
  kalung_bulan:
    'bg-[oklch(0.70_0.14_55)]/20 text-[oklch(0.45_0.14_55)] border-[oklch(0.60_0.11_55)]/40',
  gutar_guar:
    'bg-[oklch(0.75_0.10_150)]/20 text-[oklch(0.50_0.10_150)] border-[oklch(0.65_0.08_150)]/40',
  tali_tiga:
    'bg-[oklch(0.70_0.10_260)]/20 text-[oklch(0.45_0.10_260)] border-[oklch(0.60_0.08_260)]/40',
  porhala:
    'bg-[oklch(0.65_0.14_310)]/20 text-[oklch(0.42_0.14_310)] border-[oklch(0.55_0.11_310)]/40',
  jamita:
    'bg-[oklch(0.75_0.15_75)]/20 text-[oklch(0.55_0.15_75)] border-[oklch(0.65_0.12_75)]/40',
  sial_solam_sial_sao:
    'bg-[oklch(0.70_0.14_85)]/20 text-[oklch(0.45_0.14_85)] border-[oklch(0.60_0.11_85)]/40',
  lainnya:
    'bg-[oklch(0.75_0.06_260)]/15 text-[oklch(0.50_0.06_260)] border-[oklch(0.65_0.05_260)]/30',
};

// ============================================================================
// Animation variants
// ============================================================================

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.25, ease: 'easeOut' },
  }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

// ============================================================================
// Helper
// ============================================================================

function formatDate(date: string | null): string {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return date;
  }
}

function getPersonName(persons: Person[], id: string): string {
  const p = persons.find((x) => x.id === id);
  return p ? (p.nama_panggilan || p.nama) : id;
}

// ============================================================================
// Main Component
// ============================================================================

export function HeritagePanel() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const canCreate = hasPermission('create_heritage');
  const canEdit = hasPermission('edit_heritage');
  const canDelete = hasPermission('delete_heritage');

  // Shared state
  const [activeTab, setActiveTab] = useState<string>('turian');
  const [turianSearch, setTurianSearch] = useState('');
  const [pusakaSearch, setPusakaSearch] = useState('');
  const [turianCategoryFilter, setTurianCategoryFilter] = useState<string>('all');
  const [pusakaTypeFilter, setPusakaTypeFilter] = useState<string>('all');

  // Dialog states
  const [turianFormOpen, setTurianFormOpen] = useState(false);
  const [pusakaFormOpen, setPusakaFormOpen] = useState(false);
  const [editingTurian, setEditingTurian] = useState<OralHistory | undefined>(undefined);
  const [editingPusaka, setEditingPusaka] = useState<PusakaItem | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'turian' | 'pusaka';
    id: string;
    title: string;
  } | null>(null);

  // Person detail (inline display)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // ========================================================================
  // Data queries
  // ========================================================================

  const { data: oralHistories = [], isLoading: loadingTurian } = useQuery<OralHistory[]>({
    queryKey: ['oral-histories'],
    queryFn: async () => {
      const res = await fetch('/api/oral-histories', { credentials: 'include' });
      if (!res.ok) throw new Error('Gagal memuat data turian');
      return res.json();
    },
  });

  const { data: pusakaItems = [], isLoading: loadingPusaka } = useQuery<PusakaItem[]>({
    queryKey: ['pusaka-items'],
    queryFn: async () => {
      const res = await fetch('/api/pusaka', { credentials: 'include' });
      if (!res.ok) throw new Error('Gagal memuat data pusaka');
      return res.json();
    },
  });

  const { data: persons = [] } = useQuery<Person[]>({
    queryKey: ['persons'],
    queryFn: async () => {
      const res = await fetch('/api/persons', { credentials: 'include' });
      if (!res.ok) throw new Error('Gagal memuat data anggota');
      return res.json();
    },
  });

  // ========================================================================
  // Mutations - Turian
  // ========================================================================

  const turianCreateMutation = useMutation({
    mutationFn: async (data: OralHistoryCreate) => {
      const res = await fetch('/api/oral-histories', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Gagal menambahkan turian');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oral-histories'] });
      toast.success('Turian berhasil ditambahkan');
      setTurianFormOpen(false);
      setEditingTurian(undefined);
    },
    onError: (err) => toast.error(err.message),
  });

  const turianUpdateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: OralHistoryCreate }) => {
      const res = await fetch(`/api/oral-histories/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Gagal mengubah turian');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oral-histories'] });
      toast.success('Turian berhasil diperbarui');
      setTurianFormOpen(false);
      setEditingTurian(undefined);
    },
    onError: (err) => toast.error(err.message),
  });

  const turianDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/oral-histories/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Gagal menghapus turian');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oral-histories'] });
      toast.success('Turian berhasil dihapus');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  // ========================================================================
  // Mutations - Pusaka
  // ========================================================================

  const pusakaCreateMutation = useMutation({
    mutationFn: async (data: PusakaCreate) => {
      const res = await fetch('/api/pusaka', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Gagal menambahkan pusaka');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pusaka-items'] });
      toast.success('Pusaka berhasil ditambahkan');
      setPusakaFormOpen(false);
      setEditingPusaka(undefined);
    },
    onError: (err) => toast.error(err.message),
  });

  const pusakaUpdateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PusakaCreate }) => {
      const res = await fetch(`/api/pusaka/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Gagal mengubah pusaka');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pusaka-items'] });
      toast.success('Pusaka berhasil diperbarui');
      setPusakaFormOpen(false);
      setEditingPusaka(undefined);
    },
    onError: (err) => toast.error(err.message),
  });

  const pusakaDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/pusaka/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Gagal menghapus pusaka');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pusaka-items'] });
      toast.success('Pusaka berhasil dihapus');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  // ========================================================================
  // Handlers
  // ========================================================================

  const handleAddTurian = useCallback(() => {
    setEditingTurian(undefined);
    setTurianFormOpen(true);
  }, []);

  const handleEditTurian = useCallback((item: OralHistory) => {
    setEditingTurian(item);
    setTurianFormOpen(true);
  }, []);

  const handleAddPusaka = useCallback(() => {
    setEditingPusaka(undefined);
    setPusakaFormOpen(true);
  }, []);

  const handleEditPusaka = useCallback((item: PusakaItem) => {
    setEditingPusaka(item);
    setPusakaFormOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'turian') {
      turianDeleteMutation.mutate(deleteTarget.id);
    } else {
      pusakaDeleteMutation.mutate(deleteTarget.id);
    }
  }, [deleteTarget, turianDeleteMutation, pusakaDeleteMutation]);

  // ========================================================================
  // Filtering
  // ========================================================================

  const filteredTurian = useMemo(() => {
    let list = [...oralHistories];
    if (turianSearch.trim()) {
      const q = turianSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q) ||
          t.source_person_name?.toLowerCase().includes(q),
      );
    }
    if (turianCategoryFilter !== 'all') {
      list = list.filter((t) => t.category === turianCategoryFilter);
    }
    return list;
  }, [oralHistories, turianSearch, turianCategoryFilter]);

  const filteredPusaka = useMemo(() => {
    let list = [...pusakaItems];
    if (pusakaSearch.trim()) {
      const q = pusakaSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.origin?.toLowerCase().includes(q),
      );
    }
    if (pusakaTypeFilter !== 'all') {
      list = list.filter((p) => p.type === pusakaTypeFilter);
    }
    return list;
  }, [pusakaItems, pusakaSearch, pusakaTypeFilter]);

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="turian" className="gap-2">
            <ScrollText className="size-4" />
            <span>Turian</span>
            <span className="hidden sm:inline text-muted-foreground">(Oral History)</span>
          </TabsTrigger>
          <TabsTrigger value="pusaka" className="gap-2">
            <Landmark className="size-4" />
            <span>Pusaka</span>
            <span className="hidden sm:inline text-muted-foreground">(Warisan)</span>
          </TabsTrigger>
        </TabsList>

        {/* ================================================================== */}
        {/* TURIAN TAB */}
        {/* ================================================================== */}
        <TabsContent value="turian" className="mt-4 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari turian..."
                value={turianSearch}
                onChange={(e) => setTurianSearch(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={turianCategoryFilter}
                onValueChange={setTurianCategoryFilter}
              >
                <SelectTrigger size="sm" className="w-[180px]">
                  <SelectValue placeholder="Semua kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {Object.entries(ORAL_HISTORY_CATEGORIES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canCreate && (
                <Button size="sm" className="gap-1.5" onClick={handleAddTurian}>
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">Tambah</span>
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Menampilkan {filteredTurian.length} dari {oralHistories.length} turian
          </p>

          {/* Content */}
          {loadingTurian ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredTurian.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BookOpen className="size-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Belum ada turian tercatat</p>
              <p className="text-xs mt-1 text-center max-w-xs">
                {turianSearch || turianCategoryFilter !== 'all'
                  ? 'Coba ubah kata kunci pencarian atau filter kategori'
                  : 'Turian (tradisi lisan) belum didokumentasikan. Tambahkan cerita lisan dari leluhur.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              <AnimatePresence mode="popLayout">
                {filteredTurian.map((item, idx) => {
                  const catLabel = getOralHistoryCategoryLabel(item.category);
                  const personName = getPersonName(persons, item.person_id);
                  return (
                    <TurianCard
                      key={item.id}
                      item={item}
                      index={idx}
                      catLabel={catLabel}
                      personName={personName}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      onEdit={handleEditTurian}
                      onDelete={setDeleteTarget}
                      onPersonClick={setSelectedPersonId}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* ================================================================== */}
        {/* PUSAKA TAB */}
        {/* ================================================================== */}
        <TabsContent value="pusaka" className="mt-4 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari pusaka..."
                value={pusakaSearch}
                onChange={(e) => setPusakaSearch(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={pusakaTypeFilter}
                onValueChange={setPusakaTypeFilter}
              >
                <SelectTrigger size="sm" className="w-[180px]">
                  <SelectValue placeholder="Semua jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  {Object.entries(PUSAKA_TYPES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canCreate && (
                <Button size="sm" className="gap-1.5" onClick={handleAddPusaka}>
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">Tambah</span>
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Menampilkan {filteredPusaka.length} dari {pusakaItems.length} pusaka
          </p>

          {/* Content */}
          {loadingPusaka ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : filteredPusaka.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Landmark className="size-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Belum ada pusaka tercatat</p>
              <p className="text-xs mt-1 text-center max-w-xs">
                {pusakaSearch || pusakaTypeFilter !== 'all'
                  ? 'Coba ubah kata kunci pencarian atau filter jenis'
                  : 'Pusaka (warisan pusaka) belum didokumentasikan. Tambahkan pusaka turun-temurun keluarga.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              <AnimatePresence mode="popLayout">
                {filteredPusaka.map((item, idx) => {
                  const typeLabel = getPusakaTypeLabel(item.type);
                  const ownerName = getPersonName(persons, item.person_id);
                  const passedFromName = item.passed_from_person_id
                    ? getPersonName(persons, item.passed_from_person_id)
                    : null;
                  return (
                    <PusakaCard
                      key={item.id}
                      item={item}
                      index={idx}
                      typeLabel={typeLabel}
                      ownerName={ownerName}
                      passedFromName={passedFromName}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      onEdit={handleEditPusaka}
                      onDelete={setDeleteTarget}
                      onPersonClick={setSelectedPersonId}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ================================================================== */}
      {/* TURIAN FORM DIALOG */}
      {/* ================================================================== */}
      <Dialog open={turianFormOpen} onOpenChange={(open) => {
        setTurianFormOpen(open);
        if (!open) setEditingTurian(undefined);
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTurian ? 'Edit Turian' : 'Tambah Turian'}
            </DialogTitle>
            <DialogDescription>
              {editingTurian
                ? 'Ubah data tradisi lisan yang telah tercatat.'
                : 'Dokumentasikan tradisi lisan (turian) dari leluhur.'}
            </DialogDescription>
          </DialogHeader>
          <TurianForm
            persons={persons}
            initialData={editingTurian}
            onSubmit={(data) => {
              if (editingTurian) {
                turianUpdateMutation.mutate({ id: editingTurian.id, data });
              } else {
                turianCreateMutation.mutate(data);
              }
            }}
            isSubmitting={
              turianCreateMutation.isPending || turianUpdateMutation.isPending
            }
          />
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* PUSAKA FORM DIALOG */}
      {/* ================================================================== */}
      <Dialog open={pusakaFormOpen} onOpenChange={(open) => {
        setPusakaFormOpen(open);
        if (!open) setEditingPusaka(undefined);
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPusaka ? 'Edit Pusaka' : 'Tambah Pusaka'}
            </DialogTitle>
            <DialogDescription>
              {editingPusaka
                ? 'Ubah data pusaka yang telah tercatat.'
                : 'Dokumentasikan pusaka (warisan) turun-temurun keluarga.'}
            </DialogDescription>
          </DialogHeader>
          <PusakaForm
            persons={persons}
            initialData={editingPusaka}
            onSubmit={(data) => {
              if (editingPusaka) {
                pusakaUpdateMutation.mutate({ id: editingPusaka.id, data });
              } else {
                pusakaCreateMutation.mutate(data);
              }
            }}
            isSubmitting={
              pusakaCreateMutation.isPending || pusakaUpdateMutation.isPending
            }
          />
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* PERSON DETAIL INLINE DIALOG */}
      {/* ================================================================== */}
      <Dialog open={!!selectedPersonId} onOpenChange={(open) => !open && setSelectedPersonId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Anggota</DialogTitle>
            <DialogDescription>
              Informasi anggota keluarga terkait warisan budaya.
            </DialogDescription>
          </DialogHeader>
          {selectedPersonId && (
            <PersonMiniDetail
              personId={selectedPersonId}
              persons={persons}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* DELETE CONFIRMATION */}
      {/* ================================================================== */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleteTarget?.type === 'turian' ? 'Turian' : 'Pusaka'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus &ldquo;{deleteTarget?.title}&rdquo;? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Turian Card
// ============================================================================

function TurianCard({
  item,
  index,
  catLabel,
  personName,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onPersonClick,
}: {
  item: OralHistory;
  index: number;
  catLabel: { label: string; batak: string };
  personName: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (item: OralHistory) => void;
  onDelete: (target: { type: 'turian' | 'pusaka'; id: string; title: string }) => void;
  onPersonClick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const badgeStyle = CATEGORY_BADGE_STYLES[item.category] || CATEGORY_BADGE_STYLES.turian_umum;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      <Card className="hover:shadow-md hover:border-primary/30 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Main content */}
            <div className="min-w-0 flex-1">
              {/* Category badge + verified */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] border ${badgeStyle}`}
                >
                  {catLabel.batak}
                </Badge>
                {item.is_verified && (
                  <Badge
                    className="bg-[oklch(0.65_0.15_160)]/20 text-[oklch(0.45_0.15_160)] border-[oklch(0.55_0.12_160)]/40 text-[10px] border gap-1"
                  >
                    <ShieldCheck className="size-3" />
                    Terverifikasi
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h3 className="font-semibold text-sm leading-tight mb-1">
                {item.title}
              </h3>

              {/* Collapsible content */}
              <Collapsible open={open} onOpenChange={setOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {open ? (
                      <ChevronDown className="size-3" />
                    ) : (
                      <ChevronRight className="size-3" />
                    )}
                    {open ? 'Sembunyikan' : 'Baca selengkapnya'}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {item.content || 'Tidak ada konten.'}
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {item.content && !open && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {item.content}
                </p>
              )}

              {/* Meta row */}
              <div className="flex items-center gap-3 mt-3 flex-wrap text-xs text-muted-foreground">
                <button
                  type="button"
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                  onClick={() => onPersonClick(item.person_id)}
                >
                  <User className="size-3" />
                  {personName}
                </button>
                {item.source_person_name && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="size-3" />
                    Sumber: {item.source_person_name}
                  </span>
                )}
                {item.recorded_date && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3" />
                    {formatDate(item.recorded_date)}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {(canEdit || canDelete) && (
              <div className="flex items-center gap-1 shrink-0">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => onEdit(item)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete({ type: 'turian', id: item.id, title: item.title })}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// Pusaka Card
// ============================================================================

function PusakaCard({
  item,
  index,
  typeLabel,
  ownerName,
  passedFromName,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onPersonClick,
}: {
  item: PusakaItem;
  index: number;
  typeLabel: { label: string; batak: string };
  ownerName: string;
  passedFromName: string | null;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (item: PusakaItem) => void;
  onDelete: (target: { type: 'turian' | 'pusaka'; id: string; title: string }) => void;
  onPersonClick: (id: string) => void;
}) {
  const badgeStyle = PUSAKA_TYPE_BADGE_STYLES[item.type] || PUSAKA_TYPE_BADGE_STYLES.lainnya;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      <Card className="hover:shadow-md hover:border-primary/30 transition-all h-full">
        <CardContent className="p-4 space-y-3">
          {/* Header: Type badge + sacred + actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={`text-[10px] border ${badgeStyle}`}
              >
                {typeLabel.batak}
              </Badge>
              {item.is_sacred && (
                <Badge className="bg-[oklch(0.65_0.18_25)]/20 text-[oklch(0.48_0.18_25)] border-[oklch(0.55_0.14_25)]/40 text-[10px] border gap-1">
                  <Flame className="size-3" />
                  Sakral
                </Badge>
              )}
            </div>
            {(canEdit || canDelete) && (
              <div className="flex items-center gap-0.5 shrink-0">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => onEdit(item)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete({ type: 'pusaka', id: item.id, title: item.name })}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Name */}
          <h3 className="font-semibold text-sm leading-tight">{item.name}</h3>

          {/* Description preview */}
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Meta info */}
          <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t">
            {/* Owner */}
            <button
              type="button"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors w-full text-left"
              onClick={() => onPersonClick(item.person_id)}
            >
              <User className="size-3 shrink-0" />
              <span className="truncate">Pemilik: {ownerName}</span>
            </button>

            {/* Passed from */}
            {passedFromName && (
              <button
                type="button"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors w-full text-left"
                onClick={() => item.passed_from_person_id && onPersonClick(item.passed_from_person_id)}
              >
                <ArrowRightLeft className="size-3 shrink-0" />
                <span className="truncate">Diterima dari: {passedFromName}</span>
              </button>
            )}

            {/* Origin + Year */}
            <div className="flex items-center gap-3">
              {item.origin && (
                <span className="flex items-center gap-1 truncate">
                  <Landmark className="size-3 shrink-0" />
                  {item.origin}
                </span>
              )}
              {item.year_acquired && (
                <span className="flex items-center gap-1 shrink-0">
                  <CalendarDays className="size-3" />
                  {item.year_acquired}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// Person Mini Detail (inline in dialog)
// ============================================================================

function PersonMiniDetail({
  personId,
  persons,
}: {
  personId: string;
  persons: Person[];
}) {
  const person = persons.find((p) => p.id === personId);

  if (!person) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Data anggota tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className={`size-12 rounded-full flex items-center justify-center shrink-0 ${
            person.jenis_kelamin === 'L'
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
              : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
          }`}
        >
          <User className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm">{person.nama}</p>
          {person.nama_panggilan && person.nama !== person.nama_panggilan && (
            <p className="text-xs text-muted-foreground">{person.nama_panggilan}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {person.marga_asal && (
          <div className="space-y-0.5">
            <p className="text-muted-foreground">Marga</p>
            <p className="font-medium">{person.marga_asal}</p>
          </div>
        )}
        <div className="space-y-0.5">
          <p className="text-muted-foreground">Generasi</p>
          <p className="font-medium">Ke-{person.nomor_generasi}</p>
        </div>
        {person.tempat_lahir && (
          <div className="space-y-0.5">
            <p className="text-muted-foreground">Tempat Lahir</p>
            <p className="font-medium">{person.tempat_lahir}</p>
          </div>
        )}
        {person.tanggal_lahir && (
          <div className="space-y-0.5">
            <p className="text-muted-foreground">Tanggal Lahir</p>
            <p className="font-medium">{formatDate(person.tanggal_lahir)}</p>
          </div>
        )}
        {person.pekerjaan && (
          <div className="col-span-2 space-y-0.5">
            <p className="text-muted-foreground">Pekerjaan</p>
            <p className="font-medium">{person.pekerjaan}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Turian Form (inline)
// ============================================================================

function TurianForm({
  persons,
  initialData,
  onSubmit,
  isSubmitting,
}: {
  persons: Person[];
  initialData?: OralHistory;
  onSubmit: (data: OralHistoryCreate) => void;
  isSubmitting: boolean;
}) {
  const [personId, setPersonId] = useState(initialData?.person_id ?? '');
  const [category, setCategory] = useState<string>(initialData?.category ?? '');
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [content, setContent] = useState(initialData?.content ?? '');
  const [sourcePersonName, setSourcePersonName] = useState(initialData?.source_person_name ?? '');
  const [recordedDate, setRecordedDate] = useState(initialData?.recorded_date ?? '');
  const [isVerified, setIsVerified] = useState(initialData?.is_verified ?? false);

  const isValid = personId && category && title.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({
      person_id: personId,
      category: category as OralHistoryCategory,
      title: title.trim(),
      content: content.trim() || undefined,
      source_person_name: sourcePersonName.trim() || undefined,
      recorded_date: recordedDate || null,
      is_verified: isVerified,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Person */}
        <div className="space-y-2">
          <Label htmlFor="turian-person">Anggota Terkait *</Label>
          <Select value={personId} onValueChange={setPersonId}>
            <SelectTrigger id="turian-person">
              <SelectValue placeholder="Pilih anggota..." />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {persons
                .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nama_panggilan || p.nama}
                    {p.marga_asal ? ` ${p.marga_asal}` : ''}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="turian-category">Kategori *</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="turian-category">
              <SelectValue placeholder="Pilih kategori..." />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {Object.entries(ORAL_HISTORY_CATEGORIES).map(([key, val]) => (
                <SelectItem key={key} value={key}>
                  <span>{val.batak}</span>
                  <span className="ml-2 text-muted-foreground text-xs">({val.label})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="turian-title">Judul *</Label>
        <Input
          id="turian-title"
          placeholder="Judul turian..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="turian-content">Isi Turian</Label>
        <Textarea
          id="turian-content"
          placeholder="Tuliskan isi tradisi lisan di sini..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="resize-y"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Source person */}
        <div className="space-y-2">
          <Label htmlFor="turian-source">Nama Sumber</Label>
          <Input
            id="turian-source"
            placeholder="Nama pemberi informasi..."
            value={sourcePersonName}
            onChange={(e) => setSourcePersonName(e.target.value)}
          />
        </div>

        {/* Recorded date */}
        <div className="space-y-2">
          <Label htmlFor="turian-date">Tanggal Pencatatan</Label>
          <Input
            id="turian-date"
            type="date"
            value={recordedDate}
            onChange={(e) => setRecordedDate(e.target.value)}
          />
        </div>
      </div>

      {/* Verified checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="turian-verified"
          checked={isVerified}
          onCheckedChange={(checked) => setIsVerified(checked === true)}
        />
        <Label htmlFor="turian-verified" className="flex items-center gap-1.5 cursor-pointer">
          <ShieldCheck className="size-3.5 text-[oklch(0.55_0.15_160)]" />
          Terverifikasi (data telah dikonfirmasi)
        </Label>
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            // Close handled by parent Dialog onOpenChange
            const event = new Event('close-form', { bubbles: true });
            document.dispatchEvent(event);
          }}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting
            ? 'Menyimpan...'
            : initialData
              ? 'Perbarui'
              : 'Simpan'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ============================================================================
// Pusaka Form (inline)
// ============================================================================

function PusakaForm({
  persons,
  initialData,
  onSubmit,
  isSubmitting,
}: {
  persons: Person[];
  initialData?: PusakaItem;
  onSubmit: (data: PusakaCreate) => void;
  isSubmitting: boolean;
}) {
  const [personId, setPersonId] = useState(initialData?.person_id ?? '');
  const [name, setName] = useState(initialData?.name ?? '');
  const [type, setType] = useState<string>(initialData?.type ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [origin, setOrigin] = useState(initialData?.origin ?? '');
  const [yearAcquired, setYearAcquired] = useState(initialData?.year_acquired ?? '');
  const [isSacred, setIsSacred] = useState(initialData?.is_sacred ?? false);
  const [passedFromPersonId, setPassedFromPersonId] = useState(
    initialData?.passed_from_person_id ?? '',
  );

  const isValid = personId && type && name.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({
      person_id: personId,
      name: name.trim(),
      type: type as PusakaType,
      description: description.trim() || undefined,
      origin: origin.trim() || undefined,
      year_acquired: yearAcquired.trim() || null,
      is_sacred: isSacred,
      passed_from_person_id: passedFromPersonId || null,
    });
  };

  const sortedPersons = useMemo(
    () => [...persons].sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    [persons],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Owner */}
        <div className="space-y-2">
          <Label htmlFor="pusaka-person">Pemilik / Pengaman *</Label>
          <Select value={personId} onValueChange={setPersonId}>
            <SelectTrigger id="pusaka-person">
              <SelectValue placeholder="Pilih anggota..." />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {sortedPersons.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nama_panggilan || p.nama}
                  {p.marga_asal ? ` ${p.marga_asal}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type */}
        <div className="space-y-2">
          <Label htmlFor="pusaka-type">Jenis Pusaka *</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="pusaka-type">
              <SelectValue placeholder="Pilih jenis..." />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {Object.entries(PUSAKA_TYPES).map(([key, val]) => (
                <SelectItem key={key} value={key}>
                  <span>{val.batak}</span>
                  <span className="ml-2 text-muted-foreground text-xs">({val.label})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="pusaka-name">Nama Pusaka *</Label>
        <Input
          id="pusaka-name"
          placeholder="Nama pusaka..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="pusaka-desc">Deskripsi</Label>
        <Textarea
          id="pusaka-desc"
          placeholder="Deskripsi pusaka..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="resize-y"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Origin */}
        <div className="space-y-2">
          <Label htmlFor="pusaka-origin">Asal</Label>
          <Input
            id="pusaka-origin"
            placeholder="Asal pusaka..."
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
        </div>

        {/* Year acquired */}
        <div className="space-y-2">
          <Label htmlFor="pusaka-year">Tahun Diperoleh</Label>
          <Input
            id="pusaka-year"
            placeholder="Contoh: 1950"
            value={yearAcquired}
            onChange={(e) => setYearAcquired(e.target.value)}
          />
        </div>
      </div>

      {/* Passed from */}
      <div className="space-y-2">
        <Label htmlFor="pusaka-passed">Diterima Dari</Label>
        <Select value={passedFromPersonId} onValueChange={setPassedFromPersonId}>
          <SelectTrigger id="pusaka-passed">
            <SelectValue placeholder="Pilih (opsional)..." />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {sortedPersons.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nama_panggilan || p.nama}
                {p.marga_asal ? ` ${p.marga_asal}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sacred checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="pusaka-sacred"
          checked={isSacred}
          onCheckedChange={(checked) => setIsSacred(checked === true)}
        />
        <Label htmlFor="pusaka-sacred" className="flex items-center gap-1.5 cursor-pointer">
          <Flame className="size-3.5 text-[oklch(0.55_0.18_25)]" />
          Sakral (pusaka yang dianggap keramat)
        </Label>
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const event = new Event('close-form', { bubbles: true });
            document.dispatchEvent(event);
          }}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting
            ? 'Menyimpan...'
            : initialData
              ? 'Perbarui'
              : 'Simpan'}
        </Button>
      </DialogFooter>
    </form>
  );
}
