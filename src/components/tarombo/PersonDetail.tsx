"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  MapPin,
  Calendar,
  Phone,
  User,
  Heart,
  Users,
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getAge(birthDate: string | null, deathDate: string | null): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const end = deathDate ? new Date(deathDate) : new Date();
  const age = end.getFullYear() - birth.getFullYear();
  return `${age} tahun`;
}

interface PersonDetail {
  id: string;
  fullName: string;
  nickname: string | null;
  birthPlace: string | null;
  birthDate: string | null;
  deathPlace: string | null;
  deathDate: string | null;
  birthOrder: number | null;
  gender: "MALE" | "FEMALE";
  address: string | null;
  religion: string | null;
  phone: string | null;
  photoPath: string | null;
  maritalStatus: string;
  isDeceased: boolean;
  father: { id: string; fullName: string; nickname: string | null; gender: string } | null;
  mother: { id: string; fullName: string; nickname: string | null; gender: string } | null;
  allChildren: Array<{
    id: string;
    fullName: string;
    nickname: string | null;
    gender: string;
    birthOrder: number | null;
    birthDate: string | null;
    isDeceased: boolean;
    parentRelation: string;
  }>;
  marriagesAsHusband: Array<{
    id: string;
    wife: { id: string; fullName: string; nickname: string | null; gender: string };
    marriageDate: string | null;
    divorceDate: string | null;
    isActive: boolean;
  }>;
  marriagesAsWife: Array<{
    id: string;
    husband: { id: string; fullName: string; nickname: string | null; gender: string };
    marriageDate: string | null;
    divorceDate: string | null;
    isActive: boolean;
  }>;
}

export function PersonDetail() {
  const selectedPersonId = useAppStore((s) => s.selectedPersonId);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const setEditingPersonId = useAppStore((s) => s.setEditingPersonId);
  const setSelectedPersonId = useAppStore((s) => s.setSelectedPersonId);
  const canUpdate = useAppStore((s) => s.canUpdate);
  const canDelete = useAppStore((s) => s.canDelete);
  const queryClient = useQueryClient();

  const { data: person, isLoading, error } = useQuery<PersonDetail>({
    queryKey: ["person", selectedPersonId],
    queryFn: () =>
      fetch(`/api/persons/${selectedPersonId}`).then((r) => {
        if (!r.ok) throw new Error("Data tidak ditemukan");
        return r.json();
      }),
    enabled: !!selectedPersonId,
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/persons/${selectedPersonId}`, { method: "DELETE" }).then(
        (r) => {
          const data = r.json();
          if (!r.ok) return data.then((d) => { throw new Error(d.error); });
          return data;
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["tree"] });
      setSelectedPersonId(null);
      setActiveView("persons");
    },
  });

  if (isLoading || !person) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Data tidak ditemukan</p>
        <Button variant="outline" onClick={() => setActiveView("persons")}>
          Kembali ke Daftar
        </Button>
      </div>
    );
  }

  // Get all marriages
  const allMarriages = [
    ...person.marriagesAsHusband.map((m) => ({
      ...m,
      spouse: m.wife,
      role: "Suami" as const,
    })),
    ...person.marriagesAsWife.map((m) => ({
      ...m,
      spouse: m.husband,
      role: "Istri" as const,
    })),
  ];

  const maritalStatusLabel: Record<string, string> = {
    SINGLE: "Belum Menikah",
    MARRIED: "Menikah",
    DIVORCED: "Cerai",
    WIDOWED: "Janda/Duda",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => {
          setSelectedPersonId(null);
          setActiveView("persons");
        }}
        className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Daftar
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <Card className="lg:col-span-2 border-amber-200/50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-amber-900">
                    {person.fullName}
                  </h1>
                  {person.isDeceased && (
                    <Badge variant="destructive" className="text-xs">
                      ✝ Telah Meninggal
                    </Badge>
                  )}
                </div>
                {person.nickname && (
                  <p className="text-amber-600">
                    &quot;{person.nickname}&quot;
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {canUpdate() && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-200"
                    onClick={() => {
                      setEditingPersonId(person.id);
                      setActiveView("person-form");
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
                {canDelete() && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-1" />
                        Hapus
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Hapus {person.fullName}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Tindakan ini tidak dapat dibatalkan. Data anggota ini
                          akan dihapus secara permanen.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate()}
                          className="bg-destructive text-white"
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Hapus"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg">
                <User className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Jenis Kelamin</p>
                  <p className="text-sm font-medium">
                    {person.gender === "MALE" ? "Laki-laki" : "Perempuan"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg">
                <Heart className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Status Pernikahan
                  </p>
                  <p className="text-sm font-medium">
                    {maritalStatusLabel[person.maritalStatus] ||
                      person.maritalStatus}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg">
                <Calendar className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal Lahir</p>
                  <p className="text-sm font-medium">
                    {formatDate(person.birthDate)}
                  </p>
                  {person.birthDate && (
                    <p className="text-xs text-muted-foreground">
                      {getAge(person.birthDate, person.deathDate)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg">
                <MapPin className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Tempat Lahir</p>
                  <p className="text-sm font-medium">
                    {person.birthPlace || "—"}
                  </p>
                </div>
              </div>
              {person.isDeceased && (
                <>
                  <div className="flex items-start gap-3 p-3 bg-red-50/50 rounded-lg">
                    <Calendar className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Tanggal Meninggal
                      </p>
                      <p className="text-sm font-medium">
                        {formatDate(person.deathDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-red-50/50 rounded-lg">
                    <MapPin className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Tempat Meninggal
                      </p>
                      <p className="text-sm font-medium">
                        {person.deathPlace || "—"}
                      </p>
                    </div>
                  </div>
                </>
              )}
              <div className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg">
                <Calendar className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Urutan Kelahiran
                  </p>
                  <p className="text-sm font-medium">
                    {person.birthOrder ? `Anak ke-${person.birthOrder}` : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg">
                <Users className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Agama</p>
                  <p className="text-sm font-medium">
                    {person.religion || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg">
                <Phone className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Telepon</p>
                  <p className="text-sm font-medium">
                    {person.phone || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Address */}
            {person.address && (
              <div className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg">
                <MapPin className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Alamat</p>
                  <p className="text-sm font-medium">{person.address}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side Info */}
        <div className="space-y-4">
          {/* Photo */}
          <Card className="border-amber-200/50">
            <CardContent className="p-4">
              <div className="flex justify-center">
                {person.photoPath ? (
                  <img
                    src={person.photoPath}
                    alt={person.fullName}
                    className="w-32 h-32 object-cover rounded-xl border-2 border-amber-200"
                  />
                ) : (
                  <div className="w-32 h-32 bg-amber-100 rounded-xl flex items-center justify-center border-2 border-amber-200 border-dashed">
                    <User className="w-12 h-12 text-amber-300" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Parents */}
          <Card className="border-amber-200/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-amber-800">
                Orang Tua
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {person.father ? (
                <button
                  onClick={() => {
                    setSelectedPersonId(person.father!.id);
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  <p className="text-xs text-muted-foreground">Ayah</p>
                  <p className="text-sm font-medium text-amber-900">
                    {person.father.fullName}
                  </p>
                </button>
              ) : (
                <p className="text-sm text-muted-foreground p-2">
                  Ayah tidak diketahui
                </p>
              )}
              <Separator />
              {person.mother ? (
                <button
                  onClick={() => {
                    setSelectedPersonId(person.mother!.id);
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  <p className="text-xs text-muted-foreground">Ibu</p>
                  <p className="text-sm font-medium text-amber-900">
                    {person.mother.fullName}
                  </p>
                </button>
              ) : (
                <p className="text-sm text-muted-foreground p-2">
                  Ibu tidak diketahui
                </p>
              )}
            </CardContent>
          </Card>

          {/* Spouses */}
          {allMarriages.length > 0 && (
            <Card className="border-amber-200/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-amber-800">
                  Pernikahan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {allMarriages.map((m) => (
                  <div
                    key={m.id}
                    className="p-2 rounded-lg bg-amber-50/50"
                  >
                    <button
                      onClick={() => setSelectedPersonId(m.spouse.id)}
                      className="w-full text-left"
                    >
                      <p className="text-xs text-muted-foreground">
                        {m.role} dari
                      </p>
                      <p className="text-sm font-medium text-amber-900">
                        {m.spouse.fullName}
                      </p>
                    </button>
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      {m.marriageDate && (
                        <span>Nikah: {formatDate(m.marriageDate)}</span>
                      )}
                      {m.divorceDate && (
                        <span className="text-red-500">
                          Cerai: {formatDate(m.divorceDate)}
                        </span>
                      )}
                    </div>
                    {!m.isActive && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        Tidak Aktif
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Children */}
          {person.allChildren && person.allChildren.length > 0 && (
            <Card className="border-amber-200/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-amber-800">
                  Anak ({person.allChildren.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {person.allChildren.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedPersonId(child.id)}
                      className="w-full text-left p-2 rounded-lg hover:bg-amber-50 transition-colors flex items-center gap-2"
                    >
                      <span className="text-xs">
                        {child.gender === "MALE" ? "♂" : "♀"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-900 truncate">
                          {child.fullName}
                          {child.isDeceased && " ✝"}
                        </p>
                      </div>
                      {child.birthOrder && (
                        <span className="text-xs text-muted-foreground bg-amber-100 px-1.5 py-0.5 rounded">
                          #{child.birthOrder}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}