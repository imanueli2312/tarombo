'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRightLeft,
  Download,
  Upload,
  FileJson,
  FileText,
  Gem,
  History,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  FileUp,
  ArrowRight,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useAuthStore } from '@/store/auth';
import type { Person, ImportResult, TransferLogEntry, PusakaItem } from '@/types';
import { getPusakaTypeLabel } from '@/lib/batak-culture';

interface PusakaWithHolder extends PusakaItem {
  person_nama: string;
  person_panggilan: string;
  marga_asal: string;
  passed_from_nama: string | null;
}

const KIND_LABELS: Record<string, { label: string; cls: string }> = {
  export_json: { label: 'Ekspor JSON', cls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  export_gedcom: { label: 'Ekspor GEDCOM', cls: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400' },
  import_json: { label: 'Impor JSON', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  import_csv: { label: 'Impor CSV', cls: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
  import_gedcom: { label: 'Impor GEDCOM', cls: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' },
  pusaka_transfer: { label: 'Transfer Pusaka', cls: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
  marga_book_export: { label: 'Ekspor Buku Marga', cls: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  generasi_recompute: { label: 'Rekomputasi Generasi', cls: 'bg-slate-500/15 text-slate-600 dark:text-slate-400' },
};

function IssueList({ issues }: { issues: NonNullable<ImportResult['issues']> }) {
  const errors = issues.filter((x) => x.severity === 'error');
  const warnings = issues.filter((x) => x.severity === 'warning');
  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <div className='space-y-1.5 max-h-64 overflow-y-auto mt-3'>
      {errors.map((iss, i) => (
        <div key={`e${i}`} className='flex items-start gap-2 text-xs rounded-md bg-destructive/10 px-2.5 py-1.5'>
          <AlertTriangle className='size-3.5 text-destructive flex-shrink-0 mt-px' />
          <span>{iss.message}</span>
        </div>
      ))}
      {warnings.map((iss, i) => (
        <div key={`w${i}`} className='flex items-start gap-2 text-xs rounded-md bg-amber-500/10 px-2.5 py-1.5'>
          <Info className='size-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-px' />
          <span>{iss.message}</span>
        </div>
      ))}
    </div>
  );
}

export function TransferPanel() {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();

  // ---- state impor ----
  const [importFormat, setImportFormat] = useState<'json' | 'csv' | 'gedcom'>('json');
  const [importMode, setImportMode] = useState<'validate' | 'apply'>('validate');
  const [importStrategy, setImportStrategy] = useState<'skip' | 'overwrite'>('skip');
  const [importData, setImportData] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportResult | null>(null);

  // ---- state transfer pusaka ----
  const [pusakaId, setPusakaId] = useState<string>('');
  const [targetPersonId, setTargetPersonId] = useState<string>('');
  const [transferring, setTransferring] = useState(false);

  const { data: personsData } = useQuery<Person[]>({
    queryKey: ['persons'],
    queryFn: async () => {
      const res = await fetch('/api/persons');
      if (!res.ok) throw new Error('Gagal memuat daftar orang');
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: pusakaData } = useQuery<PusakaWithHolder[]>({
    queryKey: ['pusaka'],
    queryFn: async () => {
      const res = await fetch('/api/pusaka');
      if (!res.ok) throw new Error('Gagal memuat daftar pusaka');
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery<{ logs: TransferLogEntry[] }>({
    queryKey: ['transfer-logs'],
    queryFn: async () => {
      const res = await fetch('/api/transfer/logs?limit=100');
      if (!res.ok) throw new Error('Gagal memuat riwayat transfer');
      return res.json();
    },
    staleTime: 15000,
  });

  const persons = personsData ?? [];
  const pusakaItems = pusakaData ?? [];

  const selectedPusaka = useMemo(
    () => pusakaItems.find((p) => p.id === pusakaId) ?? null,
    [pusakaItems, pusakaId],
  );

  // ---- aksi ekspor ----
  const handleExport = useCallback(async (format: 'json' | 'gedcom') => {
    try {
      const res = await fetch(`/api/transfer/export?format=${format}`);
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || 'Ekspor gagal');
      }
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = format === 'json'
        ? `tarombo-backup-${new Date().toISOString().slice(0, 10)}.json`
        : `tarombo-${new Date().toISOString().slice(0, 10)}.ged`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success(format === 'json' ? 'Backup JSON berhasil diunduh' : 'File GEDCOM berhasil diunduh');
      queryClient.invalidateQueries({ queryKey: ['transfer-logs'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ekspor gagal');
    }
  }, [queryClient]);

  // ---- aksi impor ----
  const handleFilePick = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file melebihi 5 MB');
      return;
    }
    const text = await file.text();
    setImportData(text);

    // deteksi format dari ekstensi/isian
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv')) setImportFormat('csv');
    else if (name.endsWith('.ged') || name.endsWith('.gedcom')) setImportFormat('gedcom');
    else setImportFormat('json');
    toast.info(`File "${file.name}" dimuat (${Math.ceil(file.size / 1024)} KB) — format terdeteksi: ${name.endsWith('.csv') ? 'CSV' : (name.endsWith('.ged') || name.endsWith('.gedcom')) ? 'GEDCOM' : 'JSON'}`);
  }, []);

  const handleImport = useCallback(async (mode: 'validate' | 'apply') => {
    if (!importData.trim()) {
      toast.error('Isi data terlebih dahulu (tempel isi file atau pilih file)');
      return;
    }
    setImporting(true);
    setImportMode(mode);
    try {
      let dataField: unknown = importData;
      if (importFormat === 'json') {
        try {
          dataField = JSON.parse(importData);
        } catch {
          // biarkan sebagai string — server akan mem-parse ulang
        }
      }

      const res = await fetch('/api/transfer/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: importFormat,
          mode,
          strategy: importStrategy,
          data: dataField,
        }),
      });
      const j = await res.json();
      if (!res.ok && !j?.ok) {
        setReport(j ?? null);
        throw new Error(j?.error || 'Impor gagal — periksa laporan validasi');
      }
      setReport(j);
      if (mode === 'validate') {
        if (j.ok) toast.success('Validasi lolos — data siap diterapkan');
        else toast.error(`Validasi menemukan ${j.issues?.filter((x: { severity: string }) => x.severity === 'error').length ?? 0} kesalahan`);
      } else {
        toast.success(`Impor selesai: +${j.inserted?.persons ?? 0} orang, +${j.inserted?.partnerships ?? 0} pernikahan`);
        queryClient.invalidateQueries({ queryKey: ['tree'] });
        queryClient.invalidateQueries({ queryKey: ['persons'] });
        queryClient.invalidateQueries({ queryKey: ['pusaka'] });
        queryClient.invalidateQueries({ queryKey: ['transfer-logs'] });
        queryClient.invalidateQueries({ queryKey: ['marga-book'] });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impor gagal');
    } finally {
      setImporting(false);
    }
  }, [importData, importFormat, importStrategy, queryClient]);

  // ---- aksi transfer pusaka ----
  const handleTransferPusaka = useCallback(async () => {
    if (!pusakaId || !targetPersonId) {
      toast.error('Pilih pusaka dan pemegang baru terlebih dahulu');
      return;
    }
    setTransferring(true);
    try {
      const res = await fetch(`/api/pusaka/${pusakaId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_person_id: targetPersonId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Transfer pusaka gagal');
      toast.success(j.message || 'Pusaka berhasil ditransfer');
      setPusakaId('');
      setTargetPersonId('');
      queryClient.invalidateQueries({ queryKey: ['pusaka'] });
      queryClient.invalidateQueries({ queryKey: ['transfer-logs'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transfer pusaka gagal');
    } finally {
      setTransferring(false);
    }
  }, [pusakaId, targetPersonId, queryClient]);

  const canTransferData = hasPermission('transfer_data');
  const canEditHeritage = hasPermission('edit_heritage');

  const importOptions = [
    {
      id: 'json' as const,
      label: 'JSON (Backup Tarombo)',
      desc: 'File hasil ekspor lengkap: orang, pernikahan, relasi, turian, pusaka.',
    },
    {
      id: 'csv' as const,
      label: 'CSV (Daftar Orang)',
      desc: 'Tabel dari Excel/Sheets. Kolom: nama, jenis_kelamin, tanggal_lahir, marga, nama_ayah, nama_ibu, dst.',
    },
    {
      id: 'gedcom' as const,
      label: 'GEDCOM 5.5.1',
      desc: 'Standar pertukaran silsilah antar aplikasi genealogi (.ged).',
    },
  ];

  return (
    <div className='space-y-5'>
      <div>
        <h2 className='text-lg font-bold flex items-center gap-2'>
          <ArrowRightLeft className='h-5 w-5 text-primary' />
          Transfer Data & Warisan
        </h2>
        <p className='text-xs text-muted-foreground mt-0.5'>
          Cadangkan, pulihkan, dan pindahkan data silsilah — plus transfer kepemilikan pusaka dengan jejak riwayat.
        </p>
      </div>

      <Tabs defaultValue='ekspor'>
        <TabsList className='h-9 flex-wrap'>
          <TabsTrigger value='ekspor' className='text-xs gap-1.5'>
            <Download className='size-3.5' /> Ekspor
          </TabsTrigger>
          <TabsTrigger value='impor' className='text-xs gap-1.5'>
            <Upload className='size-3.5' /> Impor
          </TabsTrigger>
          {canEditHeritage && (
            <TabsTrigger value='pusaka' className='text-xs gap-1.5'>
              <Gem className='size-3.5' /> Transfer Pusaka
            </TabsTrigger>
          )}
          {canTransferData && (
            <TabsTrigger value='riwayat' className='text-xs gap-1.5'>
              <History className='size-3.5' /> Riwayat
            </TabsTrigger>
          )}
        </TabsList>

        {/* ================= EKSPOR ================= */}
        <TabsContent value='ekspor' className='mt-4'>
          <div className='grid md:grid-cols-2 gap-3'>
            <Card className='border-blue-500/20'>
              <CardHeader className='py-4'>
                <CardTitle className='text-sm flex items-center gap-2'>
                  <FileJson className='h-4 w-4 text-blue-600 dark:text-blue-400' />
                  Backup JSON Lengkap
                </CardTitle>
                <CardDescription className='text-xs'>
                  Seluruh data silsilah dalam satu file: orang, pernikahan, relasi orang tua–anak,
                  turian (sejarah lisan), dan pusaka. Gunakan rutin sebagai cadangan — dapat
                  dipulihkan lewat tab Impor.
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                <Button
                  size='sm' variant='outline' className='gap-2 w-full'
                  onClick={() => handleExport('json')}
                  disabled={!canTransferData}
                >
                  <Download className='size-4' /> Unduh Backup JSON
                </Button>
              </CardContent>
            </Card>

            <Card className='border-cyan-500/20'>
              <CardHeader className='py-4'>
                <CardTitle className='text-sm flex items-center gap-2'>
                  <FileText className='h-4 w-4 text-cyan-600 dark:text-cyan-400' />
                  GEDCOM 5.5.1
                </CardTitle>
                <CardDescription className='text-xs'>
                  Format standar pertukaran data genealogi sedunia — kompatibel dengan
                  FamilySearch, MyHeritage, Gramps, dan aplikasi silsilah lainnya.
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                <Button
                  size='sm' variant='outline' className='gap-2 w-full'
                  onClick={() => handleExport('gedcom')}
                  disabled={!canTransferData}
                >
                  <Download className='size-4' /> Unduh GEDCOM
                </Button>
              </CardContent>
            </Card>
          </div>
          {!canTransferData && (
            <p className='text-xs text-muted-foreground mt-3'>
              Ekspor data terstruktur membutuhkan izin <b>Transfer Data</b> (hubungi administrator).
            </p>
          )}
        </TabsContent>

        {/* ================= IMPOR ================= */}
        <TabsContent value='impor' className='mt-4 space-y-3'>
          {!canTransferData ? (
            <Card>
              <CardContent className='py-10 text-center'>
                <Upload className='h-10 w-10 text-muted-foreground/40 mx-auto mb-3' />
                <p className='text-sm text-muted-foreground'>
                  Impor data membutuhkan izin <b>Transfer Data</b> (hubungi administrator).
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className='py-4'>
                  <CardTitle className='text-sm flex items-center gap-2'>
                    <FileUp className='h-4 w-4 text-primary' /> Sumber Data
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Pilih file (.json / .csv / .ged) atau tempel isinya di bawah. Maksimal 5 MB &amp; 10.000 entitas.
                  </CardDescription>
                </CardHeader>
                <CardContent className='pt-0 space-y-3'>
                  <div className='grid sm:grid-cols-3 gap-2'>
                    {importOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setImportFormat(opt.id)}
                        className={`text-left rounded-lg border p-3 transition-all ${importFormat === opt.id ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-primary/30'}`}
                      >
                        <p className='text-xs font-semibold'>{opt.label}</p>
                        <p className='text-[10px] text-muted-foreground mt-1 leading-snug'>{opt.desc}</p>
                      </button>
                    ))}
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs'>Pilih file</Label>
                    <Input
                      type='file'
                      accept='.json,.csv,.ged,.gedcom,.txt'
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFilePick(f);
                      }}
                      className='text-xs'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs'>Atau tempel isi file</Label>
                    <Textarea
                      value={importData}
                      onChange={(e) => setImportData(e.target.value)}
                      placeholder={importFormat === 'json' ? '{ "persons": [...] }' : importFormat === 'csv' ? 'nama,jenis_kelamin,tanggal_lahir,marga,nama_ayah' : '0 HEAD ...'}
                      className='font-mono text-[11px] min-h-24'
                    />
                  </div>

                  <div className='grid sm:grid-cols-2 gap-3'>
                    <div className='space-y-1.5'>
                      <Label className='text-xs'>Jika ID sudah ada di data</Label>
                      <Select value={importStrategy} onValueChange={(v) => setImportStrategy(v as 'skip' | 'overwrite')}>
                        <SelectTrigger className='h-9 text-xs'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='skip'>Lewati data lama (aman)</SelectItem>
                          <SelectItem value='overwrite'>Perbarui data lama</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='flex items-end gap-2'>
                      <Button
                        variant='outline' size='sm' className='gap-2 flex-1'
                        onClick={() => handleImport('validate')}
                        disabled={importing}
                      >
                        {importing && importMode === 'validate' ? (
                          <Loader2 className='size-4 animate-spin' />
                        ) : (
                          <CheckCircle2 className='size-4' />
                        )}
                        Validasi Dulu
                      </Button>
                      <Button
                        size='sm' className='gap-2 flex-1'
                        onClick={() => handleImport('apply')}
                        disabled={importing}
                      >
                        {importing && importMode === 'apply' ? (
                          <Loader2 className='size-4 animate-spin' />
                        ) : (
                          <Upload className='size-4' />
                        )}
                        Terapkan
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {report && (
                <Card>
                  <CardHeader className='py-3.5'>
                    <CardTitle className='text-sm flex items-center gap-2'>
                      {report.ok ? (
                        <CheckCircle2 className='h-4 w-4 text-emerald-600 dark:text-emerald-400' />
                      ) : (
                        <AlertTriangle className='h-4 w-4 text-destructive' />
                      )}
                      Laporan {report.applied ? 'Penerapan' : 'Validasi'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='pt-0 space-y-3'>
                    <div className='flex flex-wrap gap-2'>
                      <Badge variant='secondary' className='text-[10px]'>
                        Orang: {report.summary?.persons ?? 0}
                      </Badge>
                      <Badge variant='secondary' className='text-[10px]'>
                        Baru: {report.applied ? report.inserted?.persons ?? 0 : report.summary?.persons_baru ?? 0}
                      </Badge>
                      <Badge variant='secondary' className='text-[10px]'>
                        Duplikat: {report.summary?.persons_duplikat ?? 0}
                      </Badge>
                      <Badge variant='secondary' className='text-[10px]'>
                        Pernikahan: {report.summary?.partnerships ?? 0}
                      </Badge>
                      <Badge variant='secondary' className='text-[10px]'>
                        Relasi: {report.summary?.parent_child ?? 0}
                      </Badge>
                      <Badge variant='secondary' className='text-[10px]'>
                        Turian: {report.summary?.oral_histories ?? 0}
                      </Badge>
                      <Badge variant='secondary' className='text-[10px]'>
                        Pusaka: {report.summary?.pusaka_items ?? 0}
                      </Badge>
                    </div>
                    {report.applied && (
                      <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs'>
                        <div className='rounded-md bg-emerald-500/10 px-2.5 py-1.5'>
                          <p className='text-[10px] text-muted-foreground'>Ditambah</p>
                          <p className='font-semibold'>{report.inserted?.persons ?? 0} orang</p>
                        </div>
                        <div className='rounded-md bg-blue-500/10 px-2.5 py-1.5'>
                          <p className='text-[10px] text-muted-foreground'>Diperbarui</p>
                          <p className='font-semibold'>{report.updated?.persons ?? 0} orang</p>
                        </div>
                        <div className='rounded-md bg-slate-500/10 px-2.5 py-1.5'>
                          <p className='text-[10px] text-muted-foreground'>Dilewati</p>
                          <p className='font-semibold'>{report.skipped?.persons ?? 0} orang</p>
                        </div>
                        <div className='rounded-md bg-amber-500/10 px-2.5 py-1.5'>
                          <p className='text-[10px] text-muted-foreground'>Peringatan</p>
                          <p className='font-semibold'>
                            {report.issues?.filter((x) => x.severity === 'warning').length ?? 0}
                          </p>
                        </div>
                      </div>
                    )}
                    <IssueList issues={report.issues ?? []} />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ================= TRANSFER PUSAKA ================= */}
        <TabsContent value='pusaka' className='mt-4'>
          {!canEditHeritage ? (
            <Card>
              <CardContent className='py-10 text-center'>
                <Gem className='h-10 w-10 text-muted-foreground/40 mx-auto mb-3' />
                <p className='text-sm text-muted-foreground'>
                  Transfer pusaka membutuhkan izin <b>Edit Warisan Budaya</b>.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className='py-4'>
                <CardTitle className='text-sm flex items-center gap-2'>
                  <Gem className='h-4 w-4 text-purple-600 dark:text-purple-400' />
                  Transfer Kepemilikan Pusaka
                </CardTitle>
                <CardDescription className='text-xs'>
                  Pindahkan pusaka ke pemegang baru — pemegang lama otomatis tercatat sebagai
                  sumber pewarisan, dan seluruh riwayat transfer tersimpan.
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0 space-y-4'>
                {pusakaItems.length === 0 ? (
                  <p className='text-sm text-muted-foreground py-4 text-center'>
                    Belum ada pusaka yang tercatat. Tambahkan pusaka pada tab Warisan Budaya.
                  </p>
                ) : (
                  <>
                    <div className='space-y-1.5'>
                      <Label className='text-xs'>Pusaka (pemegang saat ini)</Label>
                      <Select value={pusakaId || undefined} onValueChange={setPusakaId}>
                        <SelectTrigger className='h-9 text-xs'>
                          <SelectValue placeholder='Pilih pusaka' />
                        </SelectTrigger>
                        <SelectContent>
                          {pusakaItems.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} — {getPusakaTypeLabel(p.type).label} ({p.person_nama})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                      <span>{selectedPusaka ? `Pemegang: ${selectedPusaka.person_nama}` : 'Pilih pusaka'}</span>
                      <ArrowRight className='size-3.5' />
                      <span>{targetPersonId ? persons.find((p) => p.id === targetPersonId)?.nama : 'Pilih pemegang baru'}</span>
                    </div>

                    <div className='space-y-1.5'>
                      <Label className='text-xs'>Pemegang baru</Label>
                      <Select value={targetPersonId || undefined} onValueChange={setTargetPersonId}>
                        <SelectTrigger className='h-9 text-xs'>
                          <SelectValue placeholder='Pilih orang' />
                        </SelectTrigger>
                        <SelectContent>
                          {persons
                            .filter((p) => p.id !== selectedPusaka?.person_id)
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nama}{p.marga_asal ? ` (${p.marga_asal})` : ''}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      size='sm' className='gap-2'
                      onClick={handleTransferPusaka}
                      disabled={transferring || !pusakaId || !targetPersonId}
                    >
                      {transferring ? <Loader2 className='size-4 animate-spin' /> : <ArrowRightLeft className='size-4' />}
                      Transfer Pusaka
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ================= RIWAYAT ================= */}
        <TabsContent value='riwayat' className='mt-4'>
          <Card>
            <CardHeader className='py-3.5'>
              <CardTitle className='text-sm flex items-center gap-2'>
                <History className='h-4 w-4 text-primary' /> Riwayat Transfer (Audit Trail)
              </CardTitle>
              <CardDescription className='text-xs'>
                Semua operasi transfer data tercatat: siapa, kapan, dan apa yang dipindahkan.
              </CardDescription>
            </CardHeader>
            <CardContent className='pt-0'>
              {logsLoading ? (
                <div className='space-y-2'>
                  {[0, 1, 2].map((i) => <Skeleton key={i} className='h-10' />)}
                </div>
              ) : !logsData || logsData.logs.length === 0 ? (
                <p className='text-sm text-muted-foreground py-6 text-center'>
                  Belum ada operasi transfer yang tercatat.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-xs'>Jenis</TableHead>
                      <TableHead className='text-xs'>Ringkasan</TableHead>
                      <TableHead className='text-xs'>Oleh</TableHead>
                      <TableHead className='text-xs text-right'>Waktu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData.logs.map((log) => {
                      const kind = KIND_LABELS[log.kind] ?? { label: log.kind, cls: 'bg-muted' };
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-medium ${kind.cls}`}>
                              {kind.label}
                            </span>
                          </TableCell>
                          <TableCell className='text-xs max-w-sm'>{log.summary}</TableCell>
                          <TableCell className='text-xs text-muted-foreground'>{log.actor_email}</TableCell>
                          <TableCell className='text-xs text-right text-muted-foreground whitespace-nowrap'>
                            {new Date(log.created_at + 'Z').toLocaleString('id-ID', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

export default TransferPanel;
