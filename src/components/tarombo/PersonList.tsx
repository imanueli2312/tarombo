"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  UserPlus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Person {
  id: string;
  fullName: string;
  nickname: string | null;
  gender: "MALE" | "FEMALE";
  birthDate: string | null;
  deathDate: string | null;
  birthPlace: string | null;
  isDeceased: boolean;
  maritalStatus: string;
  birthOrder: number | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
  });
}

export function PersonList() {
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const setSelectedPersonId = useAppStore((s) => s.setSelectedPersonId);
  const setEditingPersonId = useAppStore((s) => s.setEditingPersonId);
  const canCreate = useAppStore((s) => s.canCreate);
  const canUpdate = useAppStore((s) => s.canUpdate);
  const canDelete = useAppStore((s) => s.canDelete);
  const queryClient = useQueryClient();

  const { data: response, isLoading, error } = useQuery<{
    data: Person[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: ["persons", search, genderFilter, page, limit],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (genderFilter !== "all") params.set("gender", genderFilter);
      params.set("page", String(page));
      params.set("limit", String(limit));
      return fetch(`/api/persons?${params.toString()}`).then((r) => r.json());
    },
  });

  const persons = response?.data ?? [];
  const total = response?.total ?? 0;
  const totalPages = response?.totalPages ?? 1;
  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/persons/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error); });
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["tree"] });
      toast.success("Data berhasil dihapus");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#3E2723]">Data Anggota</h2>
          <p className="text-sm text-muted-foreground">
            Daftar seluruh anggota Marga Hariandja
          </p>
        </div>
        {canCreate() && (
          <Button
            onClick={() => {
              setEditingPersonId(null);
              setActiveView("person-form");
            }}
            className="bg-[#7F1D1D] hover:bg-[#991B1B] text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Tambah Anggota
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau nama panggilan..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 border-[#D4A574]"
          />
        </div>
        <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40 border-[#D4A574]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="MALE">Laki-laki</SelectItem>
            <SelectItem value="FEMALE">Perempuan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-[#D4A574]/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#7F1D1D]" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              Gagal memuat data
            </div>
          ) : persons.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 text-[#D4A574]" />
              <p>Belum ada data anggota</p>
              {canCreate() && (
                <Button
                  variant="outline"
                  className="mt-3 border-[#D4A574]"
                  onClick={() => {
                    setEditingPersonId(null);
                    setActiveView("person-form");
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Tambah Anggota Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-[#F5E6D3]/50">
                    <TableHead className="text-[#3E2723]">Nama</TableHead>
                    <TableHead className="text-[#3E2723]">Jenis Kelamin</TableHead>
                    <TableHead className="text-[#3E2723]">Lahir</TableHead>
                    <TableHead className="text-[#3E2723]">Status</TableHead>
                    <TableHead className="text-[#3E2723] text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {persons.map((person) => (
                    <TableRow
                      key={person.id}
                      className="hover:bg-[#F5E6D3]/50 cursor-pointer"
                      onClick={() => {
                        setSelectedPersonId(person.id);
                        setActiveView("person-detail");
                      }}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#3E2723]">
                            {person.fullName}
                          </p>
                          {person.nickname && (
                            <p className="text-xs text-muted-foreground">
                              &quot;{person.nickname}&quot;
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-sm ${
                            person.gender === "MALE"
                              ? "text-[#795548]"
                              : "text-pink-600"
                          }`}
                        >
                          {person.gender === "MALE" ? "♂ Laki-laki" : "♀ Perempuan"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(person.birthDate)}
                        {person.birthPlace && (
                          <span className="text-muted-foreground">
                            {" "}
                            • {person.birthPlace}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {person.isDeceased && (
                            <Badge variant="destructive" className="text-xs">
                              ✝
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {person.maritalStatus}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex gap-1 justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedPersonId(person.id);
                              setActiveView("person-detail");
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canUpdate() && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingPersonId(person.id);
                                setActiveView("person-form");
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete() && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Hapus {person.fullName}?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tindakan ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      deleteMutation.mutate(person.id)
                                    }
                                    className="bg-destructive text-white"
                                  >
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
              className="border-[#D4A574]"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[#D4A574]"
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