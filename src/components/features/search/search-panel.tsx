'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Search, User, UserRound, X, Cross, BookOpen, Gem } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Person, OralHistoryCategory, PusakaType } from '@/types';
import { getOralHistoryCategoryLabel, getPusakaTypeLabel } from '@/lib/batak-culture';
import { PersonDetail } from '@/components/features/persons/person-detail';
import { PersonForm } from '@/components/features/persons/person-form';
import { useAuthStore } from '@/store/auth';

function formatDate(date: string | null): string {
  if (!date) return '-';
  try {
    return format(new Date(date), 'd MMM yyyy', { locale: idLocale });
  } catch {
    return date;
  }
}

interface SearchPanelProps {
  initialPersonId?: string | null;
}

export function SearchPanel({ initialPersonId }: SearchPanelProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canDelete = hasPermission('delete_person');
  const canEdit = hasPermission('edit_person');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(initialPersonId ?? null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | undefined>(undefined);

  const handleEdit = useCallback((person: Person) => {
    setSelectedPersonId(null);
    setEditingPerson(person);
    setFormOpen(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  interface HeritageOralResult { id: string; title: string; category: OralHistoryCategory; content: string; person_nama: string; person_panggilan: string; person_id: string; result_type: string; }
  interface HeritagePusakaResult { id: string; name: string; type: PusakaType; description: string; person_nama: string; person_panggilan: string; person_id: string; result_type: string; is_sacred: boolean; }
  interface HeritageResults { oral: HeritageOralResult[]; pusaka: HeritagePusakaResult[]; }

  const { data: results = [], isLoading } = useQuery<Person[]>({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery.trim())}`);
      if (!res.ok) throw new Error('Gagal mencari');
      return res.json();
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  const { data: heritageResults } = useQuery<HeritageResults>({
    queryKey: ['search-heritage', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { oral: [], pusaka: [] };
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery.trim())}&heritage=1`);
      if (!res.ok) return { oral: [], pusaka: [] };
      return res.json();
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setSelectedPersonId(null);
  }, []);

  const handleSelectPerson = useCallback((id: string) => {
    setSelectedPersonId(id);
  }, []);

  // If a person is selected, show their detail
  if (selectedPersonId) {
    return (
      <div className="relative h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setSelectedPersonId(null)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search className="size-4" />
            Kembali ke hasil pencarian
          </button>
        </div>
        <ScrollArea className="flex-1">
          <PersonDetail
            personId={selectedPersonId}
            onEdit={canEdit ? handleEdit : undefined}
            onDelete={canDelete ? (id) => { setSelectedPersonId(null); } : undefined}
          />
        </ScrollArea>
      </div>
    );
  }

  const isSearching = debouncedQuery.trim().length > 0;

  return (
    <>
    <div className="flex flex-col gap-4 h-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Cari anggota, turian, pusaka..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10 h-11"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Results */}
      {isSearching ? (
        <div className="flex-1 overflow-y-auto rounded-lg border bg-card">
          {isLoading ? (
            <div className="p-2 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                  <Skeleton className="size-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-muted-foreground">
              <Search className="size-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Tidak ditemukan</p>
              <p className="text-xs mt-1">
                Tidak ada hasil untuk &ldquo;{debouncedQuery}&rdquo;
              </p>
            </div>
          ) : (
            <>
            {/* Heritage search results */}
            {heritageResults && (heritageResults.oral.length > 0 || heritageResults.pusaka.length > 0) && (
              <div className="border-b">
                <p className="px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Warisan Budaya
                </p>
                {heritageResults.oral.map((item) => {
                  const cat = getOralHistoryCategoryLabel(item.category);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => item.person_id && handleSelectPerson(item.person_id)}
                      className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left border-b last:border-b-0 cursor-pointer"
                    >
                      <div className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 p-2 shrink-0">
                        <BookOpen className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{item.title || 'Tanpa judul'}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400/40 text-amber-700 dark:text-amber-400">{cat.label}</Badge>
                        </div>
                        {item.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.content}</p>}
                        <p className="text-[10px] text-muted-foreground mt-0.5">Turian &middot; {item.person_panggilan || item.person_nama}</p>
                      </div>
                    </motion.div>
                  );
                })}
                {heritageResults.pusaka.map((item) => {
                  const t = getPusakaTypeLabel(item.type);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => item.person_id && handleSelectPerson(item.person_id)}
                      className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left border-b last:border-b-0 cursor-pointer"
                    >
                      <div className={`rounded-full p-2 shrink-0 ${item.is_sacred ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'}`}>
                        <Gem className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{item.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400/40 text-amber-700 dark:text-amber-400">{t.label}</Badge>
                          {item.is_sacred && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-400/40 text-red-700 dark:text-red-400">Sakral</Badge>}
                        </div>
                        {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>}
                        <p className="text-[10px] text-muted-foreground mt-0.5">Pusaka &middot; {item.person_panggilan || item.person_nama}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
            {/* Person search results */}
            <AnimatePresence mode="popLayout">
              {results.map((person, idx) => (
                  <motion.button
                    key={person.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15, delay: idx * 0.03 }}
                    onClick={() => handleSelectPerson(person.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left border-b last:border-b-0"
                  >
                    {/* Gender Avatar */}
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

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {person.nama_panggilan || person.nama}
                        </span>
                        {person.tanggal_kematian && (
                          <Cross className="size-3 text-muted-foreground shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Gen {person.nomor_generasi}
                        </Badge>
                        {person.marga_asal && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400/50 text-amber-700 dark:text-amber-400">
                            {person.marga_asal}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(person.tanggal_lahir)}
                        </span>
                        {person.tanggal_kematian && (
                          <span className="text-xs text-muted-foreground">
                            &ndash; {formatDate(person.tanggal_kematian)}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Search className="size-12 mb-3 opacity-20" />
          <p className="text-sm">Ketik nama untuk mencari anggota keluarga</p>
        </div>
      )}
    </div>

    {/* Edit Person Form */}
    <PersonForm
      person={editingPerson}
      open={formOpen}
      onOpenChange={(open) => {
        setFormOpen(open);
        if (!open) setEditingPerson(undefined);
      }}
    />
    </>
  );
}
