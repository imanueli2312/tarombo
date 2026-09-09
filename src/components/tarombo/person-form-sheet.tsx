"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, UserPlus, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  createPerson,
  fetchPersons,
  updatePerson,
} from "@/lib/tarombo/api-client";
import {
  GENDER,
  MARITAL_STATUS,
  genderLabel,
  maritalLabel,
} from "@/lib/tarombo/types";
import type { PersonInput, TreeNodePerson } from "@/lib/tarombo/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** bila mode edit */
  editPerson?: TreeNodePerson | null;
  /** defaults untuk mode tambah anak: pre-set ayah/ibu & generasi */
  defaults?: Partial<PersonInput> & { labelHint?: string };
  onSaved: () => void;
}

const RELIGIONS = [
  "Kristen Protestan",
  "Kristen Katolik",
  "Islam",
  "Hindu",
  "Buddha",
  "Konghucu",
  "Lainnya",
];

const empty: PersonInput = {
  fullName: "",
  nickname: null,
  birthPlace: null,
  birthDate: null,
  deathDate: null,
  birthOrder: null,
  gender: "MALE",
  address: null,
  religion: null,
  phone: null,
  photo: null,
  maritalStatus: "SINGLE",
  generationNumber: null,
  burialName: null,
  burialAddress: null,
  burialLat: null,
  burialLng: null,
  fatherId: null,
  motherId: null,
};

function toDateInput(d: string | null): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function PersonFormSheet({
  open,
  onOpenChange,
  editPerson,
  defaults,
  onSaved,
}: Props) {
  const [form, setForm] = useState<PersonInput>(empty);
  const [saving, setSaving] = useState(false);
  const [males, setMales] = useState<TreeNodePerson[]>([]);
  const [females, setFemales] = useState<TreeNodePerson[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Ambil daftar orang untuk pilih ayah / ibu
  useEffect(() => {
    if (!open) return;
    fetchPersons().then((all) => {
      setMales(all.filter((p) => p.gender === "MALE"));
      setFemales(all.filter((p) => p.gender === "FEMALE"));
    });
  }, [open]);

  // Sync form saat editPerson / defaults berubah
  useEffect(() => {
    if (!open) return;
    if (editPerson) {
      setForm({
        ...empty,
        ...editPerson,
        birthDate: editPerson.birthDate,
        deathDate: editPerson.deathDate,
        birthOrder: editPerson.birthOrder,
        generationNumber: editPerson.generationNumber,
        burialLat: editPerson.burialLat,
        burialLng: editPerson.burialLng,
        photo: editPerson.photo,
        fatherId: editPerson.fatherId,
        motherId: editPerson.motherId,
        nickname: editPerson.nickname,
        birthPlace: editPerson.birthPlace,
        address: editPerson.address,
        religion: editPerson.religion,
        phone: editPerson.phone,
        burialName: editPerson.burialName,
        burialAddress: editPerson.burialAddress,
      });
    } else {
      setForm({ ...empty, ...(defaults ?? {}) });
    }
    setError(null);
  }, [open, editPerson, defaults]);

  const set = <K extends keyof PersonInput>(key: K, value: PersonInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async () => {
    setError(null);
    if (!form.fullName.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const payload: PersonInput = {
        ...form,
        fullName: form.fullName.trim(),
        birthDate: form.birthDate ? new Date(form.birthDate as string) : null,
        deathDate: form.deathDate ? new Date(form.deathDate as string) : null,
        birthOrder:
          form.birthOrder === null || form.birthOrder === undefined || (form.birthOrder as unknown) === ""
            ? null
            : Number(form.birthOrder),
        generationNumber:
          form.generationNumber === null ||
          form.generationNumber === undefined ||
          (form.generationNumber as unknown) === ""
            ? null
            : Number(form.generationNumber),
        burialLat:
          form.burialLat === null || form.burialLat === undefined || (form.burialLat as unknown) === ""
            ? null
            : Number(form.burialLat),
        burialLng:
          form.burialLng === null || form.burialLng === undefined || (form.burialLng as unknown) === ""
            ? null
            : Number(form.burialLng),
      };
      if (editPerson) {
        await updatePerson(editPerson.id, payload);
        toast.success("Data orang berhasil diperbarui.");
      } else {
        await createPerson(payload);
        toast.success("Orang baru berhasil ditambahkan.");
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b gap-2">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="flex items-center gap-2 text-base">
              {editPerson ? (
                <>
                  <Pencil className="size-4 text-primary" />
                  Edit Orang
                </>
              ) : (
                <>
                  <UserPlus className="size-4 text-primary" />
                  Tambah Orang
                </>
              )}
            </SheetTitle>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="h-8"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={onSubmit}
                disabled={saving}
                className="h-8"
              >
                {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
                {editPerson ? "Simpan Perubahan" : "Tambah Orang"}
              </Button>
            </div>
          </div>
          <SheetDescription className="text-xs">
            {defaults?.labelHint
              ? defaults.labelHint
              : "Lengkapi data orang. Bidang bertanda * wajib diisi."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="tarombo-scroll flex-1">
          <div className="space-y-5 p-5">
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            {/* Identitas */}
            <Section title="Identitas">
              <Field label="Nama Lengkap" required>
                <Input
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  placeholder="cth. Raja Mangatur Sianipar"
                />
              </Field>
              <Field label="Nama Panggilan">
                <Input
                  value={form.nickname ?? ""}
                  onChange={(e) =>
                    set("nickname", e.target.value || null)
                  }
                  placeholder="cth. Tuan Mangatur"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Jenis Kelamin">
                  <Select
                    value={form.gender}
                    onValueChange={(v) =>
                      set("gender", v as PersonInput["gender"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER.map((g) => (
                        <SelectItem key={g} value={g}>
                          {genderLabel(g)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Urutan Lahir">
                  <Input
                    type="number"
                    min={0}
                    value={form.birthOrder ?? ""}
                    onChange={(e) =>
                      set(
                        "birthOrder",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                    placeholder="cth. 1"
                  />
                </Field>
              </div>
              <Field label="Tempat Lahir">
                <Input
                  value={form.birthPlace ?? ""}
                  onChange={(e) =>
                    set("birthPlace", e.target.value || null)
                  }
                  placeholder="cth. Balige, Toba Samosir"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Tanggal Lahir">
                  <Input
                    type="date"
                    value={toDateInput(
                      form.birthDate ? String(form.birthDate) : null,
                    )}
                    onChange={(e) =>
                      set(
                        "birthDate",
                        e.target.value ? e.target.value : null,
                      )
                    }
                  />
                </Field>
                <Field label="Tanggal Wafat">
                  <Input
                    type="date"
                    value={toDateInput(
                      form.deathDate ? String(form.deathDate) : null,
                    )}
                    onChange={(e) =>
                      set(
                        "deathDate",
                        e.target.value ? e.target.value : null,
                      )
                    }
                  />
                </Field>
              </div>
              <Field label="Nomor Generasi">
                <Input
                  type="number"
                  min={1}
                  value={form.generationNumber ?? ""}
                  onChange={(e) =>
                    set(
                      "generationNumber",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                  placeholder="1 = leluhur tertinggi"
                />
              </Field>
            </Section>

            <Separator />

            {/* Kontak & Domisili */}
            <Section title="Kontak & Domisili">
              <Field label="Alamat">
                <Textarea
                  rows={2}
                  value={form.address ?? ""}
                  onChange={(e) => set("address", e.target.value || null)}
                  placeholder="Alamat tempat tinggal"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Agama">
                  <Select
                    value={form.religion ?? "__none__"}
                    onValueChange={(v) =>
                      set("religion", v === "__none__" ? null : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih agama" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— tidak diisi —</SelectItem>
                      {RELIGIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Telepon">
                  <Input
                    value={form.phone ?? ""}
                    onChange={(e) => set("phone", e.target.value || null)}
                    placeholder="08xxxxxxxxxx"
                  />
                </Field>
              </div>
              <Field label="URL Photo">
                <Input
                  value={form.photo ?? ""}
                  onChange={(e) => set("photo", e.target.value || null)}
                  placeholder="https://… (URL gambar)"
                />
              </Field>
            </Section>

            <Separator />

            {/* Orang tua */}
            <Section title="Orang Tua">
              <p className="text-[10.5px] text-muted-foreground -mt-1 mb-1">
                Ayah &amp; ibu dapat dipilih tanpa harus berpasangan resmi.
              </p>
              <Field label="Ayah">
                <Select
                  value={form.fatherId ?? "__none__"}
                  onValueChange={(v) =>
                    set("fatherId", v === "__none__" ? null : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih ayah (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— tidak ada —</SelectItem>
                    {males
                      .filter((m) => m.id !== editPerson?.id)
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.fullName}
                          {m.nickname ? ` (${m.nickname})` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Ibu">
                <Select
                  value={form.motherId ?? "__none__"}
                  onValueChange={(v) =>
                    set("motherId", v === "__none__" ? null : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih ibu (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— tidak ada —</SelectItem>
                    {females
                      .filter((m) => m.id !== editPerson?.id)
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.fullName}
                          {m.nickname ? ` (${m.nickname})` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
            </Section>

            <Separator />

            {/* Status */}
            <Section title="Status">
              <Field label="Status Pernikahan">
                <Select
                  value={form.maritalStatus}
                  onValueChange={(v) =>
                    set("maritalStatus", v as PersonInput["maritalStatus"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARITAL_STATUS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {maritalLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </Section>

            <Separator />

            {/* Lokasi pemakaman */}
            <Section title="Lokasi Pemakaman">
              <Field label="Nama Pemakaman / TPU">
                <Input
                  value={form.burialName ?? ""}
                  onChange={(e) =>
                    set("burialName", e.target.value || null)
                  }
                  placeholder="cth. TPU Lumban Dolok"
                />
              </Field>
              <Field label="Alamat Pemakaman">
                <Input
                  value={form.burialAddress ?? ""}
                  onChange={(e) =>
                    set("burialAddress", e.target.value || null)
                  }
                  placeholder="Alamat pemakaman"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Garis Lintang (lat)">
                  <Input
                    type="number"
                    step="any"
                    value={form.burialLat ?? ""}
                    onChange={(e) =>
                      set(
                        "burialLat",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                    placeholder="cth. 2.3359"
                  />
                </Field>
                <Field label="Garis Bujur (lng)">
                  <Input
                    type="number"
                    step="any"
                    value={form.burialLng ?? ""}
                    onChange={(e) =>
                      set(
                        "burialLng",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                    placeholder="cth. 99.0687"
                  />
                </Field>
              </div>
            </Section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11.5px] text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
