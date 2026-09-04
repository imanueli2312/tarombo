'use client';

import { useState } from 'react';
import { BookOpen, ChevronRight, Heart, Users, Landmark, ScrollText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  PANDUAN_ADAT,
  MARGA_BY_SUBGROUP,
  MARGA_SUBGROUP_LABELS,
  ATURAN_ADAT_PERNIKAHAN,
} from '@/lib/batak-culture';

type SectionKey = 'dalihan' | 'pernikahan' | 'marga' | 'glosarium' | 'tujuan';

const SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
  { key: 'dalihan', label: 'Dalihan Na Tolu', icon: <Landmark className='h-4 w-4' /> },
  { key: 'pernikahan', label: 'Adat Pernikahan', icon: <Heart className='h-4 w-4' /> },
  { key: 'marga', label: 'Marga Batak', icon: <Users className='h-4 w-4' /> },
  { key: 'glosarium', label: 'Istilah Kekerabatan', icon: <ScrollText className='h-4 w-4' /> },
];

export function AdatGuideDialog() {
  const [section, setSection] = useState<SectionKey>('dalihan');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant='ghost'
          size='sm'
          className='gap-1.5 h-8'
          title='Panduan Adat Batak'
        >
          <BookOpen className='h-4 w-4' />
          <span className='hidden lg:inline text-xs'>Panduan Adat</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-2xl max-h-[85vh] overflow-hidden flex flex-col'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <BookOpen className='h-5 w-5 text-primary' />
            Panduan Adat Batak
          </DialogTitle>
          <DialogDescription>
            Ringkasan adat yang menjadi pedoman aplikasi Tarombo — versi lengkap
            tersedia pada dokumen <span className='font-medium'>docs/PANDUAN_ADAT.md</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Tab navigasi */}
        <div className='flex gap-1 overflow-x-auto pb-1 -mx-1 px-1'>
          {SECTIONS.map((s) => (
            <Button
              key={s.key}
              variant={section === s.key ? 'secondary' : 'ghost'}
              size='sm'
              className='gap-1.5 h-8 flex-shrink-0'
              onClick={() => setSection(s.key)}
            >
              {s.icon}
              <span className='text-xs'>{s.label}</span>
            </Button>
          ))}
        </div>

        <div className='overflow-y-auto pr-2 -mr-2 space-y-4 text-sm'>
          {/* ---- DALIHAN NA TOLU ---- */}
          {section === 'dalihan' && (
            <div className='space-y-4'>
              <p className='text-muted-foreground leading-relaxed'>
                {PANDUAN_ADAT.dalihanNaTolu.description}
              </p>
              <div className='grid grid-cols-1 gap-2'>
                {PANDUAN_ADAT.dalihanNaTolu.pillars.map((p) => (
                  <div
                    key={p.term}
                    className='flex items-start gap-3 rounded-lg border p-3 bg-muted/30'
                  >
                    <ChevronRight className='h-4 w-4 mt-0.5 text-primary flex-shrink-0' />
                    <div>
                      <p className='font-medium text-sm'>{p.term}</p>
                      <p className='text-xs text-muted-foreground'>{p.role}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className='text-xs text-muted-foreground'>
                Relasi Hula-hula, Boru, dan Dongan Sabutuha untuk setiap anggota
                dihitung otomatis dari data silsilah dan ditampilkan pada detail
                anggota keluarga.
              </p>
            </div>
          )}

          {/* ---- ADAT PERNIKAHAN ---- */}
          {section === 'pernikahan' && (
            <div className='space-y-3'>
              <p className='text-muted-foreground'>
                Setiap pernikahan yang dicatat melalui aplikasi divalidasi
                terhadap aturan adat berikut:
              </p>
              {ATURAN_ADAT_PERNIKAHAN.map((r) => (
                <div key={r.code} className='rounded-lg border p-3 space-y-1.5'>
                  <div className='flex items-center justify-between gap-2 flex-wrap'>
                    <p className='font-medium text-sm flex items-center gap-2'>
                      {r.title}
                      {r.batak && (
                        <span className='text-xs font-normal italic text-muted-foreground'>
                          {r.batak}
                        </span>
                      )}
                    </p>
                    {r.enforcement === 'blocked' ? (
                      <Badge variant='destructive' className='text-[10px]'>Dilarang</Badge>
                    ) : (
                      <Badge variant='default' className='text-[10px]'>Dianjurkan</Badge>
                    )}
                  </div>
                  <p className='text-xs text-muted-foreground leading-relaxed'>{r.rule}</p>
                </div>
              ))}
            </div>
          )}

          {/* ---- MARGA ---- */}
          {section === 'marga' && (
            <div className='space-y-4'>
              <p className='text-muted-foreground leading-relaxed'>
                {PANDUAN_ADAT.marga.description}
              </p>
              <div className='space-y-3'>
                {Object.entries(MARGA_BY_SUBGROUP).map(([key, margaList]) => (
                  <div key={key} className='space-y-1.5'>
                    <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                      {MARGA_SUBGROUP_LABELS[key]} ({margaList.length})
                    </p>
                    <div className='flex flex-wrap gap-1'>
                      {margaList.map((m) => (
                        <Badge key={m} variant='outline' className='text-[10px] font-normal'>
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className='text-xs text-muted-foreground'>
                Daftar bersifat representatif — marga lain tetap dapat diisi
                secara bebas pada formulir anggota.
              </p>
            </div>
          )}

          {/* ---- GLOSARIUM ---- */}
          {section === 'glosarium' && (
            <div className='space-y-2'>
              {Object.entries(PANDUAN_ADAT.glosarium.entries).map(([key, t]) => (
                <div
                  key={key}
                  className='flex items-baseline justify-between gap-4 rounded-lg border p-2.5'
                >
                  <span className='font-medium text-sm whitespace-nowrap'>{t.term}</span>
                  <span className='text-xs text-muted-foreground text-right'>
                    {t.meaning}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />
        <p className='text-[11px] text-muted-foreground leading-relaxed'>
          <strong>Hasangapon · Hagabeon · Hamoraon</strong> — kehormatan,
          kesejahteraan, dan kemakmuran; tiga tujuan hidup orang Batak yang
          menjadi semboyan aplikasi ini.
        </p>
      </DialogContent>
    </Dialog>
  );
}
