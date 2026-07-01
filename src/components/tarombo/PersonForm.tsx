"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";
import { Loader2, ArrowLeft, Upload, X } from "lucide-react";

interface Person {
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
  fatherId: string | null;
  motherId: string | null;
}

export function PersonForm() {
  const editingPersonId = useAppStore((s) => s.editingPersonId);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const setEditingPersonId = useAppStore((s) => s.setEditingPersonId);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    fullName: "",
    nickname: "",
    birthPlace: "",
    birthDate: "",
    deathPlace: "",
    deathDate: "",
    birthOrder: "",
    gender: "MALE" as "MALE" | "FEMALE",
    address: "",
    religion: "",
    phone: "",
    photoPath: "",
    maritalStatus: "SINGLE",
    isDeceased: false,
    fatherId: "",
    motherId: "",
  });

  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const isEditing = !!editingPersonId;

  // Fetch existing person data if editing
  const { data: existingPerson, isLoading: loadingPerson } = useQuery({
    queryKey: ["person", editingPersonId],
    queryFn: () =>
      fetch(`/api/persons/${editingPersonId}`).then((r) => r.json()),
    enabled: isEditing,
  });

  // Fetch persons for parent selection
  const { data: persons = [] } = useQuery<Person[]>({
    queryKey: ["persons-list"],
    queryFn: () => fetch("/api/persons").then((r) => r.json()),
  });

  useEffect(() => {
    if (existingPerson) {
      setForm({
        fullName: existingPerson.fullName || "",
        nickname: existingPerson.nickname || "",
        birthPlace: existingPerson.birthPlace || "",
        birthDate: existingPerson.birthDate
          ? existingPerson.birthDate.split("T")[0]
          : "",
        deathPlace: existingPerson.deathPlace || "",
        deathDate: existingPerson.deathDate
          ? existingPerson.deathDate.split("T")[0]
          : "",
        birthOrder: existingPerson.birthOrder?.toString() || "",
        gender: existingPerson.gender || "MALE",
        address: existingPerson.address || "",
        religion: existingPerson.religion || "",
        phone: existingPerson.phone || "",
        photoPath: existingPerson.photoPath || "",
        maritalStatus: existingPerson.maritalStatus || "SINGLE",
        isDeceased: existingPerson.isDeceased || false,
        fatherId: existingPerson.fatherId || "",
        motherId: existingPerson.motherId || "",
      });
    }
  }, [existingPerson]);

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const url = isEditing
        ? `/api/persons/${editingPersonId}`
        : "/api/persons";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["person"] });
      queryClient.invalidateQueries({ queryKey: ["tree"] });
      setEditingPersonId(null);
      setActiveView("persons");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const data: Record<string, unknown> = {
      fullName: form.fullName,
      nickname: form.nickname || null,
      birthPlace: form.birthPlace || null,
      birthDate: form.birthDate || null,
      deathPlace: form.deathPlace || null,
      deathDate: form.deathDate || null,
      birthOrder: form.birthOrder ? parseInt(form.birthOrder) : null,
      gender: form.gender,
      address: form.address || null,
      religion: form.religion || null,
      phone: form.phone || null,
      maritalStatus: form.maritalStatus,
      isDeceased: form.isDeceased,
      fatherId: form.fatherId || null,
      motherId: form.motherId || null,
    };

    if (form.photoPath) {
      data.photoPath = form.photoPath;
    }

    mutation.mutate(data);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setForm((prev) => ({ ...prev, photoPath: data.photoPath }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  };

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Filter fathers (male persons) and mothers (female persons) for selection
  const fathers = persons.filter(
    (p) =>
      p.gender === "MALE" &&
      (!isEditing || p.id !== editingPersonId)
  );
  const mothers = persons.filter(
    (p) =>
      p.gender === "FEMALE" &&
      (!isEditing || p.id !== editingPersonId)
  );

  if (isEditing && loadingPerson) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => {
          setEditingPersonId(null);
          setActiveView(isEditing ? "person-detail" : "persons");
        }}
        className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </button>

      <Card className="border-amber-200/50">
        <CardHeader>
          <CardTitle className="text-amber-900">
            {isEditing ? "Edit Data Anggota" : "Tambah Anggota Baru"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "Perbarui informasi anggota keluarga"
              : "Tambahkan anggota baru ke pohon keluarga Marga Hariandja"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-amber-800 text-sm uppercase tracking-wide">
                Informasi Dasar
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fullName">Nama Lengkap *</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    placeholder="Contoh: Raja Hariandja"
                    required
                    className="border-amber-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nickname">Nama Panggilan</Label>
                  <Input
                    id="nickname"
                    value={form.nickname}
                    onChange={(e) => updateField("nickname", e.target.value)}
                    placeholder="Contoh: Ompu"
                    className="border-amber-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Jenis Kelamin *</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(v) => updateField("gender", v)}
                  >
                    <SelectTrigger className="border-amber-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Laki-laki</SelectItem>
                      <SelectItem value="FEMALE">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthOrder">Urutan Kelahiran</Label>
                  <Input
                    id="birthOrder"
                    type="number"
                    min="1"
                    value={form.birthOrder}
                    onChange={(e) => updateField("birthOrder", e.target.value)}
                    placeholder="Contoh: 1"
                    className="border-amber-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maritalStatus">Status Pernikahan</Label>
                  <Select
                    value={form.maritalStatus}
                    onValueChange={(v) => updateField("maritalStatus", v)}
                  >
                    <SelectTrigger className="border-amber-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">Belum Menikah</SelectItem>
                      <SelectItem value="MARRIED">Menikah</SelectItem>
                      <SelectItem value="DIVORCED">Cerai</SelectItem>
                      <SelectItem value="WIDOWED">Janda/Duda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Birth & Death */}
            <div className="space-y-4">
              <h3 className="font-semibold text-amber-800 text-sm uppercase tracking-wide">
                Kelahiran & Kematian
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Tanggal Lahir</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => updateField("birthDate", e.target.value)}
                    className="border-amber-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthPlace">Tempat Lahir</Label>
                  <Input
                    id="birthPlace"
                    value={form.birthPlace}
                    onChange={(e) => updateField("birthPlace", e.target.value)}
                    placeholder="Contoh: Samosir"
                    className="border-amber-200"
                  />
                </div>
                <div className="flex items-center gap-3 md:col-span-2">
                  <Switch
                    checked={form.isDeceased}
                    onCheckedChange={(v) => updateField("isDeceased", v)}
                  />
                  <Label>Telah Meninggal Dunia</Label>
                </div>
                {form.isDeceased && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="deathDate">Tanggal Meninggal</Label>
                      <Input
                        id="deathDate"
                        type="date"
                        value={form.deathDate}
                        onChange={(e) =>
                          updateField("deathDate", e.target.value)
                        }
                        className="border-amber-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deathPlace">Tempat Meninggal</Label>
                      <Input
                        id="deathPlace"
                        value={form.deathPlace}
                        onChange={(e) =>
                          updateField("deathPlace", e.target.value)
                        }
                        placeholder="Contoh: Medan"
                        className="border-amber-200"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Contact & Other */}
            <div className="space-y-4">
              <h3 className="font-semibold text-amber-800 text-sm uppercase tracking-wide">
                Kontak & Lainnya
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="religion">Agama</Label>
                  <Input
                    id="religion"
                    value={form.religion}
                    onChange={(e) => updateField("religion", e.target.value)}
                    placeholder="Contoh: Kristen Protestan"
                    className="border-amber-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Nomor Telepon</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="Contoh: +6281234567890"
                    className="border-amber-200"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Textarea
                    id="address"
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Contoh: Jl. Sisingamangaraja No. 10, Medan"
                    className="border-amber-200 min-h-[60px]"
                  />
                </div>
              </div>
            </div>

            {/* Photo */}
            <div className="space-y-4">
              <h3 className="font-semibold text-amber-800 text-sm uppercase tracking-wide">
                Foto
              </h3>
              <div className="space-y-2">
                {form.photoPath ? (
                  <div className="relative inline-block">
                    <img
                      src={form.photoPath}
                      alt="Foto"
                      className="w-24 h-24 object-cover rounded-lg border border-amber-200"
                    />
                    <button
                      type="button"
                      onClick={() => updateField("photoPath", "")}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : null}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      document.getElementById("photo-upload")?.click()
                    }
                    disabled={uploading}
                    className="border-amber-200"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {form.photoPath ? "Ganti Foto" : "Upload Foto"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maks. 5MB, format JPEG/PNG/WebP/GIF
                  </p>
                </div>
              </div>
            </div>

            {/* Parent Relations */}
            <div className="space-y-4">
              <h3 className="font-semibold text-amber-800 text-sm uppercase tracking-wide">
                Orang Tua
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ayah</Label>
                  <Select
                    value={form.fatherId}
                    onValueChange={(v) => updateField("fatherId", v)}
                  >
                    <SelectTrigger className="border-amber-200">
                      <SelectValue placeholder="Pilih ayah..." />
                    </SelectTrigger>
                    <SelectContent>
                      {fathers.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.fullName}
                          {f.nickname ? ` (${f.nickname})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ibu</Label>
                  <Select
                    value={form.motherId}
                    onValueChange={(v) => updateField("motherId", v)}
                  >
                    <SelectTrigger className="border-amber-200">
                      <SelectValue placeholder="Pilih ibu..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mothers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.fullName}
                          {m.nickname ? ` (${m.nickname})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                className="bg-amber-700 hover:bg-amber-800 text-white"
                disabled={mutation.isPending}
              >
                {mutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isEditing ? "Simpan Perubahan" : "Tambah Anggota"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingPersonId(null);
                  setActiveView(isEditing ? "person-detail" : "persons");
                }}
              >
                Batal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}