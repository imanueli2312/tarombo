'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Download, Image, FileImage, FileText, FileTextIcon, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

async function loadWatermark(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat watermark'));
    img.src = '/tarombo-bg02.png';
  });
}

function drawExportDecorations(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  isDark: boolean
) {
  const w = canvas.width;
  const h = canvas.height;
  const textColor = isDark ? '#e5e5e5' : '#1a1a1a';
  const mutedColor = isDark ? '#a0a0a0' : '#666666';
  const dividerColor = isDark ? '#333333' : '#e0e0e0';
  const headerH = 80;
  const footerH = 60;
  const legendW = 240;
  const legendH = 100;
  const margin = 30;

  // Expand canvas for header + footer
  const newH = h + headerH + footerH;
  const expanded = document.createElement('canvas');
  expanded.width = w;
  expanded.height = newH;
  const ectx = expanded.getContext('2d')!;

  // Background
  ectx.fillStyle = isDark ? '#1a1a1a' : '#ffffff';
  ectx.fillRect(0, 0, w, newH);

  // Header
  ectx.fillStyle = textColor;
  ectx.font = 'bold 28px sans-serif';
  ectx.fillText('Tarombo Hariandja', margin, 38);
  ectx.fillStyle = mutedColor;
  ectx.font = '14px sans-serif';
  ectx.fillText('Pohon Keluarga Digital Marga Hariandja', margin, 60);

  // Header divider
  ectx.strokeStyle = dividerColor;
  ectx.lineWidth = 1;
  ectx.beginPath();
  ectx.moveTo(margin, headerH - 8);
  ectx.lineTo(w - margin, headerH - 8);
  ectx.stroke();

  // Draw tree content
  ectx.drawImage(canvas, 0, headerH);

  // Footer divider
  ectx.beginPath();
  ectx.moveTo(margin, h + headerH + 8);
  ectx.lineTo(w - margin, h + headerH + 8);
  ectx.stroke();

  // Footer
  ectx.fillStyle = mutedColor;
  ectx.font = '11px sans-serif';
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  ectx.fillText(`Diekspor pada ${dateStr}`, margin, h + headerH + 32);
  ectx.textAlign = 'right';
  ectx.fillText('tarombo-hariandja', w - margin, h + headerH + 32);
  ectx.textAlign = 'left';

  // Legend (bottom-right of tree area)
  const legX = w - legendW - margin;
  const legY = h + headerH - legendH - 10;

  // Legend background
  ectx.fillStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  ectx.beginPath();
  ectx.roundRect(legX - 10, legY - 10, legendW + 20, legendH + 20, 8);
  ectx.fill();

  ectx.font = 'bold 11px sans-serif';
  ectx.fillStyle = mutedColor;
  ectx.fillText('Keterangan:', legX, legY + 4);

  ectx.font = '11px sans-serif';
  const items = [
    { color: 'oklch(0.6 0.2 250)', label: 'Laki-laki' },
    { color: 'oklch(0.65 0.2 350)', label: 'Perempuan' },
    { symbol: '\u271D', label: 'Meninggal' },
    { dash: true, label: 'Cerai' },
  ];

  items.forEach((item, i) => {
    const y = legY + 24 + i * 18;
    if (item.color) {
      ectx.fillStyle = item.color;
      ectx.beginPath();
      ectx.arc(legX + 6, y - 3, 5, 0, Math.PI * 2);
      ectx.fill();
    } else if (item.symbol) {
      ectx.fillStyle = mutedColor;
      ectx.font = '14px sans-serif';
      ectx.fillText(item.symbol, legX + 1, y);
      ectx.font = '11px sans-serif';
    } else if (item.dash) {
      ectx.strokeStyle = 'var(--destructive, #ef4444)';
      ectx.setLineDash([4, 3]);
      ectx.lineWidth = 1.5;
      ectx.beginPath();
      ectx.moveTo(legX, y - 3);
      ectx.lineTo(legX + 16, y - 3);
      ectx.stroke();
      ectx.setLineDash([]);
    }
    ectx.fillStyle = textColor;
    ectx.fillText(item.label, legX + 18, y);
  });

  return expanded;
}

async function captureWithWatermark(): Promise<HTMLCanvasElement> {
  const container = document.getElementById('tree-svg-container');
  if (!container) throw new Error('Container pohon keluarga tidak ditemukan');

  const isDark = document.documentElement.classList.contains('dark');

  // Dynamically import html2canvas
  const html2canvas = (await import('html2canvas')).default;

  // Capture the tree container
  const canvas = await html2canvas(container, {
    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
  });

  // Create composite canvas
  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width = canvas.width;
  compositeCanvas.height = canvas.height;
  const ctx = compositeCanvas.getContext('2d')!;

  // Draw tree capture
  ctx.drawImage(canvas, 0, 0);

  // Draw watermark centered at 30% opacity
  try {
    const watermark = await loadWatermark();
    const maxW = compositeCanvas.width * 0.4;
    const maxH = compositeCanvas.height * 0.4;
    const ratio = Math.min(maxW / watermark.width, maxH / watermark.height);
    const w = watermark.width * ratio;
    const h = watermark.height * ratio;
    const x = (compositeCanvas.width - w) / 2;
    const y = (compositeCanvas.height - h) / 2;

    ctx.globalAlpha = 0.3;
    ctx.drawImage(watermark, x, y, w, h);
    ctx.globalAlpha = 1.0;
  } catch {
    // Watermark load failed — continue without it
  }

  // Add header, footer, and legend
  return drawExportDecorations(ctx, compositeCanvas, isDark);
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string, mimeType: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL(mimeType, 0.95);
  link.click();
}

export function ExportDialog() {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = useCallback(async (format: 'png' | 'jpg' | 'pdf' | 'pdf-large') => {
    setExporting(format);
    try {
      const finalCanvas = await captureWithWatermark();

      switch (format) {
        case 'png': {
          downloadCanvas(finalCanvas, 'tarombo-hariandja.png', 'image/png');
          toast.success('Export PNG berhasil!');
          break;
        }

        case 'jpg': {
          const jpgCanvas = document.createElement('canvas');
          jpgCanvas.width = finalCanvas.width;
          jpgCanvas.height = finalCanvas.height;
          const jpgCtx = jpgCanvas.getContext('2d')!;
          jpgCtx.fillStyle = '#ffffff';
          jpgCtx.fillRect(0, 0, jpgCanvas.width, jpgCanvas.height);
          jpgCtx.drawImage(finalCanvas, 0, 0);
          downloadCanvas(jpgCanvas, 'tarombo-hariandja.jpg', 'image/jpeg');
          toast.success('Export JPG berhasil!');
          break;
        }

        case 'pdf': {
          const { jsPDF } = await import('jspdf');
          const imgData = finalCanvas.toDataURL('image/png', 1.0);

          const pdf = new jsPDF({
            orientation: finalCanvas.width > finalCanvas.height ? 'l' : 'p',
            unit: 'mm',
            format: 'a4',
          });

          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();

          const margin = 10;
          const availW = pageWidth - margin * 2;
          const availH = pageHeight - margin * 2;
          const imgRatio = finalCanvas.width / finalCanvas.height;
          const pageRatio = availW / availH;

          let drawW: number, drawH: number;
          if (imgRatio > pageRatio) {
            drawW = availW;
            drawH = availW / imgRatio;
          } else {
            drawH = availH;
            drawW = availH * imgRatio;
          }

          const offsetX = (pageWidth - drawW) / 2;
          const offsetY = (pageHeight - drawH) / 2;

          pdf.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH);
          pdf.save('tarombo-hariandja.pdf');
          toast.success('Export PDF berhasil!');
          break;
        }

        case 'pdf-large': {
          const { jsPDF } = await import('jspdf');
          const imgData = finalCanvas.toDataURL('image/png', 1.0);

          const margin = 10;
          const pxToMm = 0.264583;
          const actualW = (finalCanvas.width / 2) * pxToMm + margin * 2;
          const actualH = (finalCanvas.height / 2) * pxToMm + margin * 2;

          const pageW = Math.min(actualW, 420);
          const pageH = Math.min(actualH, 594);

          const pdf = new jsPDF({
            orientation: pageW > pageH ? 'l' : 'p',
            unit: 'mm',
            format: [pageW, pageH],
          });

          const availW = pageW - margin * 2;
          const availH = pageH - margin * 2;
          const imgRatio = finalCanvas.width / finalCanvas.height;
          const pageRatio = availW / availH;

          let drawW: number, drawH: number;
          if (imgRatio > pageRatio) {
            drawW = availW;
            drawH = availW / imgRatio;
          } else {
            drawH = availH;
            drawW = availH * imgRatio;
          }

          const offsetX = (pageW - drawW) / 2;
          const offsetY = (pageH - drawH) / 2;

          pdf.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH);
          pdf.save('tarombo-hariandja-besar.pdf');
          toast.success('Export PDF Besar berhasil!');
          break;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export gagal';
      toast.error(msg);
    } finally {
      setExporting(null);
    }
  }, []);

  const options = [
    {
      id: 'png' as const,
      label: 'PNG',
      description: 'Gambar transparan, cocok untuk digital',
      icon: Image,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      id: 'jpg' as const,
      label: 'JPG',
      description: 'File ringan, cocok untuk dibagikan',
      icon: FileImage,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
    },
    {
      id: 'pdf' as const,
      label: 'PDF',
      description: 'Format A4, cocok untuk dicetak',
      icon: FileText,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/50',
    },
    {
      id: 'pdf-large' as const,
      label: 'PDF Besar',
      description: 'Format besar, detail penuh',
      icon: FileTextIcon,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/50',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="size-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Pohon Keluarga</DialogTitle>
          <DialogDescription>
            Pilih format untuk mengekspor pohon keluarga Hariandja.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isExporting = exporting === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleExport(opt.id)}
                disabled={!!exporting}
                className={`flex flex-col items-center gap-3 rounded-xl border p-5 transition-all hover:shadow-md hover:border-primary/40 disabled:opacity-50 disabled:pointer-events-none ${opt.bg}`}
              >
                {isExporting ? (
                  <Loader2 className={`size-8 ${opt.color} animate-spin`} />
                ) : (
                  <Icon className={`size-8 ${opt.color}`} />
                )}
                <div className="text-center">
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
