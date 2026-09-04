'use client';

import { useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  BookOpen,
  Library,
  Printer,
  FileJson,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Layers,
  CalendarRange,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useAuthStore } from '@/store/auth';
import type { MargaBook, MargaDirectoryEntry, MargaBookEntry } from '@/types';

interface MargaBookResponse {
  book: MargaBook;
  directory: MargaDirectoryEntry[];
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.25, ease: 'easeOut' as const },
  }),
};

function StatCard({
  icon: Icon,
  label,
  value,
  i,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  i: number;
}) {
  return (
    <motion.div variants={cardVariants} custom={i} initial='hidden' animate='visible'>
      <Card>
        <CardContent className='pt-4 pb-3 px-4'>
          <div className='flex items-center gap-3'>
            <div className='h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0'>
              <Icon className='h-4 w-4 text-primary' />
            </div>
            <div className='min-w-0'>
              <p className='text-[11px] text-muted-foreground leading-tight'>{label}</p>
              <p className='text-lg font-bold leading-tight truncate'>{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EntryRow({ entry }: { entry: MargaBookEntry }) {
  return (
    <div className='flex gap-3 py-2 border-b border-border/60 last:border-0'>
      <span className='font-mono text-xs text-primary font-semibold w-16 flex-shrink-0 pt-0.5'>
        {entry.nomor_buku}
      </span>
      <div className='min-w-0 flex-1'>
        <p className='text-sm font-medium leading-snug'>
          {entry.nama}
          {entry.tanggal_kematian && <span className='ml-1 text-muted-foreground' title='Almarhum/ah'>✝</span>}
          <span className={`ml-1.5 text-[10px] font-semibold ${entry.jenis_kelamin === 'L' ? 'text-blue-600 dark:text-blue-400' : 'text-pink-600 dark:text-pink-400'}`}>
            {entry.jenis_kelamin === 'L' ? 'L' : 'P'}
          </span>
        </p>
        <div className='flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5'>
          {entry.tanggal_lahir && (
            <span className='text-[11px] text-muted-foreground'>
              {entry.tanggal_lahir.slice(0, 4)}
              {entry.tanggal_kematian ? ` – ${entry.tanggal_kematian.slice(0, 4)}` : ''}
            </span>
          )}
          {entry.pasangan && (
            <span className='text-[11px] text-muted-foreground'>
              {entry.jenis_kelamin === 'L' ? 'Boru' : 'Doli'}: {entry.pasangan.nama}
              {entry.pasangan.marga && ` (${entry.pasangan.marga})`}
            </span>
          )}
          {entry.ayah_nama && (
            <span className='text-[11px] text-muted-foreground'>
              Anak dari {entry.ayah_nama}
            </span>
          )}
          {entry.jumlah_anak > 0 && (
            <span className='text-[11px] text-muted-foreground'>{entry.jumlah_anak} anak</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function MargaBookPanel() {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedMarga, setSelectedMarga] = useState<string>('');
  const [openGens, setOpenGens] = useState<Set<number>>(new Set([1]));

  const { data, isLoading } = useQuery<MargaBookResponse>({
    queryKey: ['marga-book', selectedMarga],
    queryFn: async () => {
      const url = selectedMarga ? `/api/marga-book?marga=${encodeURIComponent(selectedMarga)}` : '/api/marga-book';
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || 'Gagal memuat Buku Marga');
      }
      return res.json();
    },
    staleTime: 30000,
  });

  const book = data?.book;
  const directory = data?.directory ?? [];

  const totalLaki = useMemo(
    () => book?.generations.reduce((a, g) => a + g.jumlah_laki, 0) ?? 0,
    [book],
  );
  const totalPerempuan = useMemo(
    () => book?.generations.reduce((a, g) => a + g.jumlah_perempuan, 0) ?? 0,
    [book],
  );
  const totalWafat = useMemo(
    () => book?.generations.reduce((a, g) => a + g.jumlah_wafat, 0) ?? 0,
    [book],
  );

  const periode = useMemo(() => {
    if (!book?.lahir_terawal || !book.lahir_terakhir) return null;
    return `${book.lahir_terawal.slice(0, 4)} – ${book.lahir_terakhir.slice(0, 4)}`;
  }, [book]);

  const toggleGen = useCallback((g: number) => {
    setOpenGens((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }, []);

  const handleExportHtml = useCallback(() => {
    const url = selectedMarga
      ? `/api/marga-book/export?format=html&marga=${encodeURIComponent(selectedMarga)}`
      : '/api/marga-book/export?format=html';
    window.open(url, '_blank');
  }, [selectedMarga]);

  const handleExportJson = useCallback(async () => {
    try {
      const url = selectedMarga
        ? `/api/marga-book/export?format=json&marga=${encodeURIComponent(selectedMarga)}`
        : '/api/marga-book/export?format=json';
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || 'Ekspor gagal');
      }
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `buku-marga-${(book?.marga || 'marga').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Buku Marga (JSON) berhasil diunduh');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ekspor gagal');
    }
  }, [selectedMarga, book]);

  const handleRecompute = useCallback(async () => {
    try {
      const res = await fetch('/api/marga-book', { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Rekomputasi gagal');
      toast.success(`Generasi diperiksa: ${j.checked} orang, ${j.corrected} dikoreksi`);
      queryClient.invalidateQueries({ queryKey: ['marga-book'] });
      queryClient.invalidateQueries({ queryKey: ['tree'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rekomputasi gagal');
    }
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-8 w-64' />
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className='h-20' />)}
        </div>
        <Skeleton className='h-64' />
      </div>
    );
  }

  return (
    <div className='space-y-5'>
      {/* Header + kontrol */}
      <div className='flex flex-col sm:flex-row sm:items-end gap-3 justify-between'>
        <div>
          <h2 className='text-lg font-bold flex items-center gap-2'>
            <BookOpen className='h-5 w-5 text-primary' />
            Buku Marga {book ? book.marga : ''}
          </h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Buku silsilah digital ala tarombo tradisional — anggota garis marga per generasi dengan penomoran keturunan.
            {book?.subetnis && ` Sub-etnis: ${book.subetnis}.`}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Select value={selectedMarga || undefined} onValueChange={(v) => setSelectedMarga(v === '__all__' ? '' : v)}>
            <SelectTrigger className='w-44 h-9'>
              <SelectValue placeholder='Pilih marga' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>Marga utama (otomatis)</SelectItem>
              {directory.map((d) => (
                <SelectItem key={d.marga} value={d.marga}>
                  {d.marga} ({d.jumlah})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant='outline' size='sm' className='gap-2' onClick={handleExportHtml}>
            <Printer className='size-4' /> Cetak / PDF
          </Button>
          <Button variant='outline' size='sm' className='gap-2' onClick={handleExportJson}>
            <FileJson className='size-4' /> JSON
          </Button>
          {hasPermission('edit_person') && (
            <Button variant='outline' size='sm' className='gap-2' onClick={handleRecompute}>
              <RefreshCw className='size-4' /> Sinkronkan Generasi
            </Button>
          )}
        </div>
      </div>

      {/* Statistik ringkas */}
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3'>
        <StatCard i={0} icon={Users} label='Total Anggota' value={book?.total_anggota ?? 0} />
        <StatCard i={1} icon={Layers} label='Generasi' value={book?.jumlah_generasi ?? 0} />
        <StatCard i={2} icon={UserCheck} label='Laki-laki' value={totalLaki} />
        <StatCard i={3} icon={UserCheck} label='Perempuan' value={totalPerempuan} />
        <StatCard i={4} icon={UserX} label='Telah Wafat' value={totalWafat} />
        <StatCard i={5} icon={CalendarRange} label='Rentang Lahir' value={periode ?? '—'} />
      </div>

      <Tabs defaultValue='buku'>
        <TabsList className='h-9'>
          <TabsTrigger value='buku' className='text-xs gap-1.5'>
            <BookOpen className='size-3.5' /> Buku
          </TabsTrigger>
          <TabsTrigger value='direktori' className='text-xs gap-1.5'>
            <Library className='size-3.5' /> Direktori Marga
          </TabsTrigger>
        </TabsList>

        {/* Tab Buku: generasi + entri */}
        <TabsContent value='buku' className='mt-4 space-y-3'>
          {!book || book.generations.length === 0 ? (
            <Card>
              <CardContent className='py-10 text-center'>
                <BookOpen className='h-10 w-10 text-muted-foreground/40 mx-auto mb-3' />
                <p className='text-sm text-muted-foreground'>
                  Belum ada data marga untuk dibukukan. Tambahkan anggota keluarga terlebih dahulu.
                </p>
              </CardContent>
            </Card>
          ) : (
            book.generations.map((gen) => {
              const open = openGens.has(gen.generasi);
              return (
                <Collapsible key={gen.generasi} open={open} onOpenChange={() => toggleGen(gen.generasi)}>
                  <Card className='overflow-hidden'>
                    <CollapsibleTrigger asChild>
                      <CardHeader className='py-3.5 cursor-pointer hover:bg-muted/40 transition-colors'>
                        <div className='flex items-center justify-between gap-3'>
                          <div className='flex items-center gap-2 min-w-0'>
                            {open ? (
                              <ChevronDown className='h-4 w-4 text-muted-foreground flex-shrink-0' />
                            ) : (
                              <ChevronRight className='h-4 w-4 text-muted-foreground flex-shrink-0' />
                            )}
                            <CardTitle className='text-sm font-semibold truncate'>
                              {gen.label}
                            </CardTitle>
                          </div>
                          <div className='flex items-center gap-1.5 flex-shrink-0'>
                            <Badge variant='secondary' className='text-[10px]'>{gen.jumlah} anggota</Badge>
                            <Badge variant='outline' className='text-[10px]'>
                              {gen.jumlah_laki}L · {gen.jumlah_perempuan}P
                            </Badge>
                            {gen.jumlah_wafat > 0 && (
                              <Badge variant='outline' className='text-[10px] text-muted-foreground'>
                                {gen.jumlah_wafat} wafat
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className='pt-0 pb-2'>
                        {gen.entries.map((entry) => (
                          <EntryRow key={entry.id} entry={entry} />
                        ))}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })
          )}
        </TabsContent>

        {/* Tab Direktori: statistik per marga */}
        <TabsContent value='direktori' className='mt-4'>
          <Card>
            <CardHeader className='py-3.5'>
              <CardTitle className='text-sm flex items-center gap-2'>
                <Library className='h-4 w-4 text-primary' /> Direktori Marga dalam Data
              </CardTitle>
              <CardDescription className='text-xs'>
                Statistik seluruh marga yang tercatat pada basis data silsilah. Klik nama marga untuk membukukan.
              </CardDescription>
            </CardHeader>
            <CardContent className='pt-0'>
              {directory.length === 0 ? (
                <p className='text-sm text-muted-foreground py-6 text-center'>
                  Belum ada data marga. Lengkapi kolom marga pada profil anggota.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-xs'>Marga</TableHead>
                      <TableHead className='text-xs'>Sub-etnis</TableHead>
                      <TableHead className='text-xs text-right'>Anggota</TableHead>
                      <TableHead className='text-xs text-right'>L / P</TableHead>
                      <TableHead className='text-xs text-right'>Hidup / Wafat</TableHead>
                      <TableHead className='text-xs text-right'>Generasi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {directory.map((d) => (
                      <TableRow
                        key={d.marga}
                        className='cursor-pointer'
                        onClick={() => {
                          setSelectedMarga(d.marga);
                          toast.info(`Buku Marga ${d.marga} dipilih`);
                        }}
                      >
                        <TableCell className='text-xs font-medium'>
                          {d.marga}
                          {d.is_utama && (
                            <Badge className='ml-2 text-[9px] h-4 px-1.5' variant='default'>Utama</Badge>
                          )}
                        </TableCell>
                        <TableCell className='text-xs text-muted-foreground'>
                          {d.subetnis ?? '—'}
                        </TableCell>
                        <TableCell className='text-xs text-right font-semibold'>{d.jumlah}</TableCell>
                        <TableCell className='text-xs text-right'>{d.laki_laki} / {d.perempuan}</TableCell>
                        <TableCell className='text-xs text-right'>{d.hidup} / {d.wafat}</TableCell>
                        <TableCell className='text-xs text-right'>
                          {d.generasi_min === d.generasi_max ? d.generasi_min : `${d.generasi_min}–${d.generasi_max}`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MargaBookPanel;
