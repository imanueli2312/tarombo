"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/app-store";
import {
  Heart,
  Plus,
  Loader2,
  Trash2,
  Ban,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface Person {
  id: string;
  fullName: string;
  nickname: string | null;
  gender: "MALE" | "FEMALE";
}

interface Marriage {
  id: string;
  husband: Person;
  wife: Person;
  marriageDate: string | null;
  divorceDate: string | null;
  isActive: boolean;
  createdAt: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function MarriageList() {
  const [formOpen, setFormOpen] = useState(false);
  const [husbandId, setHusbandId] = useState("");
  const [wifeId, setWifeId] = useState("");
  const [marriageDate, setMarriageDate] = useState("");
  const [formError, setFormError] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const canCreate = useAppStore((s) => s.canCreate);
  const canUpdate = useAppStore((s) => s.canUpdate);
  const canDelete = useAppStore((s) => s.canDelete);
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useQuery<{
    data: Marriage[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: ["marriages", page, limit],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      return fetch(`/api/marriages?${params.toString()}`).then((r) => r.json());
    },
  });

  const marriages = response?.data ?? [];
  const total = response?.total ?? 0;
  const totalPages = response?.totalPages ?? 1;
  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  const { data: persons = [] } = useQuery<Person[]>({
    queryKey: ["persons-list-marriage"],
    queryFn: () => fetch("/api/persons").then((r) => r.json()),
  });

  const males = persons.filter((p) => p.gender === "MALE");
  const females = persons.filter((p) => p.gender === "FEMALE");

  const createMutation = useMutation({
    mutationFn: (data: { husbandId: string; wifeId: string; marriageDate: string | null }) =>
      fetch("/api/marriages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error); });
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marriages"] });
      queryClient.invalidateQueries({ queryKey: ["tree"] });
      toast.success("Pernikahan berhasil ditambahkan");
      setFormOpen(false);
      resetForm();
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const divorceMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/marriages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false, divorceDate: new Date().toISOString() }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marriages"] });
      queryClient.invalidateQueries({ queryKey: ["tree"] });
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      toast.success("Status pernikahan diperbarui");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/marriages/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error); });
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marriages"] });
      queryClient.invalidateQueries({ queryKey: ["tree"] });
      toast.success("Data pernikahan dihapus");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const resetForm = () => {
    setHusbandId("");
    setWifeId("");
    setMarriageDate("");
    setFormError("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--t-text)]">Data Pernikahan</h2>
          <p className="text-sm text-muted-foreground">
            Daftar pernikahan dalam Marga Hariandja
          </p>
        </div>
        {canCreate() && (
          <Dialog
            open={formOpen}
            onOpenChange={(open) => {
              setFormOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-[var(--t-primary)] hover:bg-[var(--t-primary-light)] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Pernikahan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Pernikahan Baru</DialogTitle>
                <DialogDescription>
                  Satu laki-laki/perempuan hanya dapat memiliki maksimal 1 pasangan aktif.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {formError && (
                  <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md border border-red-200">
                    {formError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Suami *</Label>
                  <Select value={husbandId} onValueChange={setHusbandId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih suami..." />
                    </SelectTrigger>
                    <SelectContent>
                      {males.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.fullName}
                          {m.nickname ? ` (${m.nickname})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Istri *</Label>
                  <Select value={wifeId} onValueChange={setWifeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih istri..." />
                    </SelectTrigger>
                    <SelectContent>
                      {females.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.fullName}
                          {f.nickname ? ` (${f.nickname})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Pernikahan</Label>
                  <Input
                    type="date"
                    value={marriageDate}
                    onChange={(e) => setMarriageDate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setFormOpen(false)}>
                  Batal
                </Button>
                <Button
                  onClick={() =>
                    createMutation.mutate({
                      husbandId,
                      wifeId,
                      marriageDate: marriageDate || null,
                    })
                  }
                  disabled={!husbandId || !wifeId || createMutation.isPending}
                  className="bg-[var(--t-primary)] hover:bg-[var(--t-primary-light)]"
                >
                  {createMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Simpan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-[var(--t-border)]/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--t-primary)]" />
            </div>
          ) : marriages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-3 text-[var(--t-border)]" />
              <p>Belum ada data pernikahan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-[var(--t-bg-warm)]/50">
                    <TableHead className="text-[var(--t-text)]">Suami</TableHead>
                    <TableHead className="text-[var(--t-text)]">Istri</TableHead>
                    <TableHead className="text-[var(--t-text)]">
                      Tgl. Pernikahan
                    </TableHead>
                    <TableHead className="text-[var(--t-text)]">Status</TableHead>
                    <TableHead className="text-[var(--t-text)] text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marriages.map((marriage) => (
                    <TableRow
                      key={marriage.id}
                      className="hover:bg-[var(--t-bg-warm)]/50"
                    >
                      <TableCell>
                        <p className="font-medium text-[var(--t-text)]">
                          {marriage.husband.fullName}
                        </p>
                        {marriage.husband.nickname && (
                          <p className="text-xs text-muted-foreground">
                            &quot;{marriage.husband.nickname}&quot;
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-pink-700">
                          {marriage.wife.fullName}
                        </p>
                        {marriage.wife.nickname && (
                          <p className="text-xs text-muted-foreground">
                            &quot;{marriage.wife.nickname}&quot;
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(marriage.marriageDate)}
                      </TableCell>
                      <TableCell>
                        {marriage.isActive ? (
                          <Badge className="bg-green-100 text-green-800">
                            Aktif
                          </Badge>
                        ) : (
                          <div className="space-y-1">
                            <Badge variant="secondary">Tidak Aktif</Badge>
                            {marriage.divorceDate && (
                              <p className="text-xs text-red-500">
                                {formatDate(marriage.divorceDate)}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {marriage.isActive && canUpdate() && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:text-red-600"
                              onClick={() =>
                                divorceMutation.mutate(marriage.id)
                              }
                              title="Nonaktifkan pernikahan"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete() && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:text-red-600"
                              onClick={() =>
                                deleteMutation.mutate(marriage.id)
                              }
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
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
              className="border-[var(--t-border)]"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[var(--t-border)]"
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