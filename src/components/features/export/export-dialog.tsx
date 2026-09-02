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
    img.src = '/tarombo-bg01.png';
  });
}

async function captureWithWatermark(): Promise<HTMLCanvasElement> {
  const container = document.getElementById('tree-svg-container');
  if (!container) throw new Error('Container pohon keluarga tidak ditemukan');

  // Dynamically import html2canvas
  const html2canvas = (await import('html2canvas')).default;

  // Capture the tree container
  const canvas = await html2canvas(container, {
    backgroundColor: '#ffffff',
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

  return compositeCanvas;
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
      const compositeCanvas = await captureWithWatermark();

      switch (format) {
        case 'png': {
          downloadCanvas(compositeCanvas, 'tarombo-hariandja.png', 'image/png');
          toast.success('Export PNG berhasil!');
          break;
        }

        case 'jpg': {
          // Convert to JPEG
          const jpgCanvas = document.createElement('canvas');
          jpgCanvas.width = compositeCanvas.width;
          jpgCanvas.height = compositeCanvas.height;
          const jpgCtx = jpgCanvas.getContext('2d')!;
          jpgCtx.fillStyle = '#ffffff';
          jpgCtx.fillRect(0, 0, jpgCanvas.width, jpgCanvas.height);
          jpgCtx.drawImage(compositeCanvas, 0, 0);
          downloadCanvas(jpgCanvas, 'tarombo-hariandja.jpg', 'image/jpeg');
          toast.success('Export JPG berhasil!');
          break;
        }

        case 'pdf': {
          const { jsPDF } = await import('jspdf');
          const imgData = compositeCanvas.toDataURL('image/png', 1.0);

          // A4: 210 x 297 mm
          const pdfWidth = 210;
          const pdfHeight = 297;
          const pdf = new jsPDF({
            orientation: compositeCanvas.width > compositeCanvas.height ? 'l' : 'p',
            unit: 'mm',
            format: 'a4',
          });

          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();

          // Fit image to page with margin
          const margin = 10;
          const availW = pageWidth - margin * 2;
          const availH = pageHeight - margin * 2;
          const imgRatio = compositeCanvas.width / compositeCanvas.height;
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
          const imgData = compositeCanvas.toDataURL('image/png', 1.0);

          // Custom large format based on tree dimensions
          const margin = 10;
          const pxToMm = 0.264583; // 1px at 96dpi = 0.264583mm
          // Composite canvas is at 2x scale, so halve for actual size
          const actualW = (compositeCanvas.width / 2) * pxToMm + margin * 2;
          const actualH = (compositeCanvas.height / 2) * pxToMm + margin * 2;

          // Cap at A2 (420x594mm), fall back to custom
          const pageW = Math.min(actualW, 420);
          const pageH = Math.min(actualH, 594);

          const pdf = new jsPDF({
            orientation: pageW > pageH ? 'l' : 'p',
            unit: 'mm',
            format: [pageW, pageH],
          });

          const availW = pageW - margin * 2;
          const availH = pageH - margin * 2;
          const imgRatio = compositeCanvas.width / compositeCanvas.height;
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
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
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
