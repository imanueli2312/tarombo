"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  FileText,
  Files,
  Maximize,
  Image as ImageIcon,
  FileImage,
  Download,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildExportUrl,
  type ExportFormat,
  type ExportScope,
  type ExportSize,
} from "@/lib/tarombo/api-client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRootId?: string | null;
  currentRootName?: string | null;
}

type ExportKind =
  | "pdf-a4"
  | "pdf-a3"
  | "pdf-large"
  | "pdf-multiple"
  | "png"
  | "jpg";

interface ExportOption {
  kind: ExportKind;
  title: string;
  desc: string;
  icon: React.ElementType;
  accent: string;
  badge?: string;
}

const OPTIONS: ExportOption[] = [
  {
    kind: "pdf-a3",
    title: "PDF (A3)",
    desc: "Satu file PDF format A3 landscape. Cocok untuk dicetak di kertas besar.",
    icon: FileText,
    accent: "text-rose-700 bg-rose-500/10 border-rose-500/30",
    badge: "PDF",
  },
  {
    kind: "pdf-a4",
    title: "PDF (A4)",
    desc: "Satu file PDF format A4 landscape. Ukuran kantor standar, multi-halaman.",
    icon: FileText,
    accent: "text-primary bg-primary/10 border-primary/30",
    badge: "PDF",
  },
  {
    kind: "pdf-multiple",
    title: "Multiple PDF",
    desc: "PDF dengan tiap leluhur pada halaman terpisah. Satu file, banyak section.",
    icon: Files,
    accent: "text-emerald-700 bg-emerald-500/10 border-emerald-500/30",
    badge: "PDF",
  },
  {
    kind: "pdf-large",
    title: "PDF Ukuran Besar",
    desc: "PDF satu halaman ukuran penuh tanpa pagination. Ideal untuk plotter / cetak besar.",
    icon: Maximize,
    accent: "text-amber-700 bg-amber-500/10 border-amber-500/30",
    badge: "LARGE",
  },
  {
    kind: "png",
    title: "Gambar PNG",
    desc: "Ekspor pohon sebagai gambar PNG resolusi tinggi (skala 2x).",
    icon: ImageIcon,
    accent: "text-teal-700 bg-teal-500/10 border-teal-500/30",
    badge: "PNG",
  },
  {
    kind: "jpg",
    title: "Gambar JPG",
    desc: "Ekspor pohon sebagai gambar JPG (kompresi, ukuran lebih kecil).",
    icon: FileImage,
    accent: "text-orange-700 bg-orange-500/10 border-orange-500/30",
    badge: "JPG",
  },
];

export function ExportDialog({
  open,
  onOpenChange,
  currentRootId,
  currentRootName,
}: Props) {
  const [selected, setSelected] = useState<ExportKind>("pdf-a3");
  const [scope, setScope] = useState<ExportScope>("all");
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      let format: ExportFormat;
      let size: ExportSize | undefined;
      let multipleMode = false;

      switch (selected) {
        case "pdf-a4":
          format = "pdf";
          size = "A4";
          break;
        case "pdf-a3":
          format = "pdf";
          size = "A3";
          break;
        case "pdf-large":
          format = "pdf";
          size = "LARGE";
          break;
        case "pdf-multiple":
          format = "pdf";
          size = "A3";
          multipleMode = true;
          break;
        case "png":
          format = "png";
          break;
        case "jpg":
          format = "jpg";
          break;
      }

      // Multiple PDF: scope=all dengan tiap root di section terpisah
      const effectiveScope: ExportScope =
        multipleMode || scope === "all" ? "all" : "current";

      const url = buildExportUrl({
        format,
        scope: effectiveScope,
        size,
        rootId: effectiveScope === "current" ? currentRootId : undefined,
      });

      // trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("Export dimulai — file akan diunduh sebentar lagi.");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-4 text-primary" />
            Export Pohon Tarombo
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pilih format dan ruang lingkup export. Untuk PDF ukuran besar,
            gunakan format tanpa pagination agar pohon utuh dalam satu halaman.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Grid pilihan format */}
          <div className="grid grid-cols-2 gap-2">
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSel = selected === opt.kind;
              return (
                <button
                  key={opt.kind}
                  onClick={() => setSelected(opt.kind)}
                  className={cn(
                    "text-left rounded-lg border p-3 transition-all relative",
                    isSel
                      ? "border-primary ring-2 ring-primary/30 bg-card shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-accent/40",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={cn(
                        "grid size-9 place-items-center rounded-lg border shrink-0",
                        opt.accent,
                      )}
                    >
                      <Icon className="size-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[12.5px] font-semibold leading-tight">
                          {opt.title}
                        </p>
                        {opt.badge && (
                          <span className="text-[8.5px] font-bold px-1 py-0.5 rounded bg-muted text-muted-foreground">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-snug">
                        {opt.desc}
                      </p>
                    </div>
                  </div>
                  {isSel && (
                    <CheckCircle2 className="absolute top-2 right-2 size-3.5 text-primary" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Ruang lingkup */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-[11.5px]">Ruang Lingkup</Label>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as ExportScope)}
              className="flex flex-col gap-1.5"
            >
              <label
                className={cn(
                  "flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer transition-colors",
                  scope === "all"
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:bg-accent/40",
                )}
              >
                <RadioGroupItem value="all" className="mt-0.5" />
                <div className="flex-1">
                  <p className="text-[12px] font-medium">Semua leluhur</p>
                  <p className="text-[10.5px] text-muted-foreground">
                    Export seluruh pohon keluarga dari semua leluhur tertinggi.
                  </p>
                </div>
              </label>
              <label
                className={cn(
                  "flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer transition-colors",
                  scope === "current"
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:bg-accent/40",
                  !currentRootId && "opacity-50 cursor-not-allowed",
                )}
              >
                <RadioGroupItem
                  value="current"
                  className="mt-0.5"
                  disabled={!currentRootId}
                />
                <div className="flex-1">
                  <p className="text-[12px] font-medium">
                    Hanya leluhur terpilih
                  </p>
                  <p className="text-[10.5px] text-muted-foreground">
                    {currentRootId
                      ? `Export pohon dari ${currentRootName ?? "leluhur terpilih"} saja.`
                      : "Pilih leluhur di filter bar terlebih dahulu."}
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="rounded-md border border-blue-400/0 bg-accent/30 p-2.5 text-[10.5px] text-muted-foreground">
            <p className="flex items-start gap-1.5">
              <span className="text-amber-600">ℹ</span>
              <span>
                Export diproses di server menggunakan headless browser. Untuk
                pohon sangat besar, PDF ukuran besar (single page) memberikan
                hasil terbaik tanpa terpotong halaman.
              </span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Batal
          </Button>
          <Button onClick={handleExport} disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="size-4 mr-1.5" />
            )}
            Export Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
