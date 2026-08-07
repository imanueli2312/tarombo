"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, FileText, Files, FileImage, ImageDown, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { exportTree, type ExportFormat } from "@/lib/export";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  svg: SVGSVGElement | null;
  width: number;
  height: number;
}

interface Option {
  format: ExportFormat;
  label: string;
  desc: string;
  icon: React.ReactNode;
}

const OPTIONS: Option[] = [
  {
    format: "pdf",
    label: "PDF (single page)",
    desc: "Fit the whole tree onto one A4 landscape page.",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    format: "pdf-multi",
    label: "Multiple PDFs (paginated)",
    desc: "Tile the tree across several A4 pages for printing.",
    icon: <Files className="h-5 w-5" />,
  },
  {
    format: "pdf-large",
    label: "Large-format PDF",
    desc: "One oversized PDF page that fits the entire tree at high resolution.",
    icon: <FileImage className="h-5 w-5" />,
  },
  {
    format: "png",
    label: "PNG image",
    desc: "High-resolution raster image with transparency-free background.",
    icon: <ImageIcon className="h-5 w-5" />,
  },
  {
    format: "jpg",
    label: "JPG image",
    desc: "Compressed raster image, ideal for sharing.",
    icon: <ImageDown className="h-5 w-5" />,
  },
];

export function ExportDialog({ open, onOpenChange, svg, width, height }: ExportDialogProps) {
  const [title, setTitle] = useState("Tarombo Hariandja");
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [includeBackground, setIncludeBackground] = useState(true);
  const [busy, setBusy] = useState(false);

  async function handleExport(format: ExportFormat) {
    if (!svg) {
      toast.error("Tree is not ready yet.");
      return;
    }
    setBusy(true);
    try {
      await exportTree(svg, width, height, {
        format,
        includeWatermark,
        includeBackground,
        title: title || "Tarombo Hariandja",
      });
      toast.success("Export ready — check your downloads.");
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export tarombo</DialogTitle>
          <DialogDescription>
            Choose an export format. The Hariandja clan emblem is applied as a centered watermark,
            sized to the file dimensions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Document title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Watermark (emblem)</Label>
              <Switch checked={includeWatermark} onCheckedChange={setIncludeWatermark} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Background texture</Label>
              <Switch checked={includeBackground} onCheckedChange={setIncludeBackground} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {OPTIONS.map((opt) => (
              <button
                key={opt.format}
                onClick={() => handleExport(opt.format)}
                disabled={busy}
                className="flex items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
              >
                <span className="mt-0.5 text-primary">{opt.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </div>
                {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
