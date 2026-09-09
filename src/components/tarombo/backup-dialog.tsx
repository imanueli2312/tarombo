"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Database,
  Download,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileJson,
} from "lucide-react";
import { toast } from "sonner";
import { useActiveUser } from "@/lib/tarombo/use-permissions";
import { cn } from "@/lib/utils";

interface RestoreStats {
  persons: number;
  partnerships: number;
  users: number;
  roles: number;
  skipped: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored?: () => void;
}

export function BackupDialog({ open, onOpenChange, onRestored }: Props) {
  const { can } = useActiveUser();
  const canReset = can("data:reset");

  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [stats, setStats] = useState<RestoreStats | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body && typeof body === "object" && "error" in body && (body.error as string)) ||
            `Gagal mengunduh backup (${res.status})`,
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Ambil nama file dari header Content-Disposition kalau ada
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="?([^";]+)"?/);
      const fallbackStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const fname = match?.[1] ?? `tarombo-backup-${fallbackStamp}.json`;

      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup JSON berhasil diunduh.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileName(f?.name ?? null);
    setStats(null);
  };

  const handleRestore = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Pilih file JSON backup terlebih dahulu.");
      return;
    }

    setUploading(true);
    setStats(null);
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("File bukan JSON yang valid.");
      }
      if (!parsed || typeof parsed !== "object" || !("data" in parsed)) {
        throw new Error("Format backup tidak valid: field 'data' tidak ditemukan.");
      }

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body && typeof body === "object" && "error" in body && (body.error as string)) ||
            `Gagal memulihkan data (${res.status})`,
        );
      }
      const data = (await res.json()) as { success: boolean; stats: RestoreStats; message: string };
      setStats(data.stats);
      toast.success("Backup berhasil dipulihkan.");
      onRestored?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFileName(null);
    setStats(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="size-4 text-primary" />
            Backup &amp; Restore Data
          </DialogTitle>
          <DialogDescription className="text-xs">
            Unduh seluruh data Tarombo (orang, pasangan, pengguna, role) sebagai
            file JSON, atau pulihkan dari file backup sebelumnya.
          </DialogDescription>
        </DialogHeader>

        {!canReset ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            Anda tidak memiliki permission <code>data:reset</code>. Hubungi
            administrator untuk mengelola backup.
          </div>
        ) : (
          <div className="space-y-4 py-1">
            {/* Backup section */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary border border-primary/30">
                  <FileJson className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[12.5px] font-semibold leading-tight">
                    Backup (Export JSON)
                  </p>
                  <p className="text-[10.5px] text-muted-foreground leading-snug">
                    Unduh seluruh data sebagai file JSON.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full"
                size="sm"
              >
                {downloading ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <Download className="size-4 mr-1.5" />
                )}
                Unduh Backup JSON
              </Button>
            </section>

            <Separator />

            {/* Restore section */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  <Upload className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[12.5px] font-semibold leading-tight">
                    Restore (Import JSON)
                  </p>
                  <p className="text-[10.5px] text-muted-foreground leading-snug">
                    Pulihkan data dari file backup JSON.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="backup-file" className="text-[11.5px]">
                  File Backup (.json)
                </Label>
                <input
                  ref={fileInputRef}
                  id="backup-file"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className={cn(
                    "flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs",
                    "file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:text-primary file:px-2.5 file:py-1 file:text-[11px] file:font-medium",
                    "hover:border-primary/40 cursor-pointer transition-colors",
                  )}
                />
                {fileName && (
                  <p className="text-[10.5px] text-muted-foreground truncate">
                    File: <span className="font-medium text-foreground">{fileName}</span>
                  </p>
                )}
              </div>

              <Button
                onClick={handleRestore}
                disabled={uploading || !fileName}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {uploading ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <Upload className="size-4 mr-1.5" />
                )}
                Pulihkan dari File
              </Button>

              {stats && (
                <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300 mb-1.5">
                    <CheckCircle2 className="size-3.5" />
                    Restore berhasil
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10.5px] text-emerald-800 dark:text-emerald-200">
                    <span>Orang ditambah: <strong>{stats.persons}</strong></span>
                    <span>Pasangan ditambah: <strong>{stats.partnerships}</strong></span>
                    <span>Pengguna ditambah: <strong>{stats.users}</strong></span>
                    <span>Role ditambah: <strong>{stats.roles}</strong></span>
                    <span className="col-span-2">
                      Di-skip (sudah ada): <strong>{stats.skipped}</strong>
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-[10.5px] text-amber-800 dark:text-amber-200">
                <AlertTriangle className="size-3.5 mt-0.5 shrink-0 text-amber-600" />
                <span>
                  Restore akan menambah data yang belum ada (merge). Data yang
                  sudah ada tidak ditimpa.
                </span>
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
