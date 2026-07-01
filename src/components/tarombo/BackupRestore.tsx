"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Upload, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function BackupRestore() {
  const canManageUsers = useAppStore((s) => s.canManageUsers);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Gagal mengekspor data");
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `tarombo-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Data berhasil diekspor");
      queryClient.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err.message || "Gagal mengekspor data");
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal mengimpor data");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Data berhasil diimpor. Semua data telah diganti.");
      queryClient.invalidateQueries();
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => {
      toast.error(err.message || "Gagal mengimpor data");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      toast.error("Hanya file JSON yang diperbolehkan");
      return;
    }
    setPendingFile(file);
    setConfirmOpen(true);
  };

  const handleImportConfirm = () => {
    if (pendingFile) {
      importMutation.mutate(pendingFile);
    }
    setConfirmOpen(false);
  };

  if (!canManageUsers()) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-amber-900">Pencadangan Data</h2>
        <p className="text-sm text-muted-foreground">
          Ekspor dan impor data seluruh sistem Tarombo
        </p>
      </div>

      {/* Export Card */}
      <Card className="border-amber-200/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-amber-900 flex items-center gap-2">
            <Download className="w-5 h-5" />
            Ekspor Data
          </CardTitle>
          <CardDescription>
            Unduh seluruh data anggota dan pernikahan dalam format JSON
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="bg-amber-700 hover:bg-amber-800 text-white"
          >
            {exportMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export Data
          </Button>
        </CardContent>
      </Card>

      {/* Import Card */}
      <Card className="border-amber-200/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-amber-900 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Impor Data
          </CardTitle>
          <CardDescription>
            Ganti seluruh data dengan file cadangan JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>Peringatan:</strong> Impor data akan mengganti seluruh data yang ada saat ini. Pastikan Anda telah membuat cadangan terlebih dahulu.
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              className="border-amber-200"
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Pilih File JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Konfirmasi Impor Data
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Anda akan mengimpor data dari file{" "}
                  <strong>{pendingFile?.name}</strong>.
                </p>
                <p className="text-red-600 font-medium">
                  Tindakan ini akan mengganti SEMUA data yang ada saat ini dan tidak dapat dibatalkan.
                </p>
                <p>Apakah Anda yakin ingin melanjutkan?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImportConfirm}
              className="bg-amber-700 hover:bg-amber-800 text-white"
            >
              Ya, Impor Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}