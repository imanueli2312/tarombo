"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, AlertCircle, FileText, ChevronLeft, ChevronRight } from "lucide-react";

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE_PERSON: "Tambah Anggota",
  UPDATE_PERSON: "Ubah Anggota",
  DELETE_PERSON: "Hapus Anggota",
  CREATE_MARRIAGE: "Tambah Pernikahan",
  UPDATE_MARRIAGE: "Ubah Pernikahan",
  DELETE_MARRIAGE: "Hapus Pernikahan",
  CREATE_USER: "Tambah Pengguna",
  UPDATE_USER: "Ubah Pengguna",
  DELETE_USER: "Hapus Pengguna",
  EXPORT_BACKUP: "Ekspor Cadangan",
  IMPORT_BACKUP: "Impor Cadangan",
  LOGIN: "Login",
  SEED_DATA: "Data Awal",
};

const RESOURCE_LABELS: Record<string, string> = {
  PERSON: "Anggota",
  MARRIAGE: "Pernikahan",
  USER: "Pengguna",
  BACKUP: "Cadangan",
  SYSTEM: "Sistem",
};

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getActionBadgeVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.startsWith("CREATE") || action === "LOGIN" || action === "EXPORT_BACKUP") return "default";
  if (action.startsWith("DELETE") || action === "IMPORT_BACKUP") return "destructive";
  return "secondary";
}

export function AuditLogViewer() {
  const canManageUsers = useAppStore((s) => s.canManageUsers);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const { data: response, isLoading, error } = useQuery<{
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: ["audit-logs", page, limit],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      return fetch(`/api/audit-logs?${params.toString()}`).then((r) => r.json());
    },
  });

  const logs = response?.data ?? [];
  const total = response?.total ?? 0;
  const totalPages = response?.totalPages ?? 1;
  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  if (!canManageUsers()) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-amber-900">Log Audit</h2>
        <p className="text-sm text-muted-foreground">
          Riwayat aktivitas seluruh pengguna dalam sistem
        </p>
      </div>

      <Card className="border-amber-200/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              Gagal memuat log audit
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 text-amber-300" />
              <p>Belum ada log audit</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-amber-50/50">
                    <TableHead className="text-amber-800">Waktu</TableHead>
                    <TableHead className="text-amber-800">Pengguna</TableHead>
                    <TableHead className="text-amber-800">Aksi</TableHead>
                    <TableHead className="text-amber-800">Resource</TableHead>
                    <TableHead className="text-amber-800">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="hover:bg-amber-50/50"
                    >
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatTimestamp(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-amber-900">
                          {log.userName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-amber-200">
                          {RESOURCE_LABELS[log.resource] || log.resource}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.details || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Menampilkan {startIndex}-{endIndex} dari {total} data
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-amber-200"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-200"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}