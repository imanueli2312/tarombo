"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Trash2, MapPin, Phone, Calendar, User, Cross, Heart } from "lucide-react";
import { toast } from "sonner";
import type { Person, Gender, MaritalStatus } from "@/lib/types";
import type { TreeNode } from "@/lib/types-tree";
import { useLanguage } from "@/hooks/use-language";

interface PersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: TreeNode | Person | null;
  allPersons: Person[];
  canEdit: boolean;
  onSaved?: () => void;
  onDeleted?: () => void;
}

const RELIGIONS = [
  "Kristen Protestan",
  "Katolik",
  "Islam",
  "Buddha",
  "Hindu",
  "Konghucu",
  "Parmalim (traditional)",
  "Lainnya",
];

const MARITAL_STATUSES: MaritalStatus[] = ["single", "married", "widowed", "divorced"];

function fmt(d: string | null | undefined): string {
  if (!d) return "";
  return d.length > 10 ? d.slice(0, 10) : d;
}

export function PersonDialog({
  open,
  onOpenChange,
  person,
  allPersons,
  canEdit,
  onSaved,
  onDeleted,
}: PersonDialogProps) {
  const [tab, setTab] = useState("detail");
  const [form, setForm] = useState<Partial<Person>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { t } = useLanguage();

  // Independently verify edit permission from the server.
  // This ensures the Edit tab is correctly enabled/disabled even if the
  // parent component's canEdit prop is stale (e.g., due to timing or cache).
  const [canEditVerified, setCanEditVerified] = useState(canEdit);
  useEffect(() => {
    if (!open) return;
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        setCanEditVerified(data?.permissions?.actions?.managePersons === true);
      })
      .catch(() => {
        // If the fetch fails, fall back to the prop
        setCanEditVerified(canEdit);
      });
  }, [open, canEdit]);

  const effectiveCanEdit = canEdit || canEditVerified;

  useEffect(() => {
    if (person) {
      setForm({ ...person });
      setTab("detail");
    }
  }, [person]);

  if (!person) return null;

  const isDeceased = !!person.date_of_death;

  function update<K extends keyof Person>(key: K, value: Person[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || t("person.uploadFailed"));
      }
      const data = await res.json();
      update("photo", data.url);
      toast.success(t("person.photoUploaded"));
    } catch (e: any) {
      toast.error(e?.message || t("person.uploadFailed"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    if (!form.name) {
      toast.error(t("person.errorName"));
      return;
    }
    setSaving(true);
    try {
      const isExisting = !!(person as Person).id && allPersons.some((p) => p.id === (person as Person).id);
      const url = isExisting ? `/api/persons/${(person as Person).id}` : "/api/persons";
      const method = isExisting ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || t("person.saveFailed"));
      }
      toast.success(isExisting ? t("person.personUpdated") : t("person.personCreated"));
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || t("person.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t("person.confirmDelete", { name: person.name }))) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/persons/${(person as Person).id}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || t("person.deleteFailed"));
      }
      toast.success(t("person.personDeleted"));
      onDeleted?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || t("person.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  const fatherOptions = allPersons.filter((p) => p.gender === "male" && p.id !== person.id);
  const motherOptions = allPersons.filter((p) => p.gender === "female" && p.id !== person.id);
  const parentOptions = allPersons.filter((p) => p.id !== person.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8">
            <span className="text-xl">{person.name}</span>
            {isDeceased && (
              <Badge variant="secondary" className="gap-1">
                <Cross className="h-3 w-3" /> {t("person.almarhum")}
              </Badge>
            )}
            <Badge variant="outline" className="capitalize">
              {t("person.gen", { n: person.generation })}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {person.gender === "male" ? t("person.male") : t("person.female")}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {person.nickname ? t("person.nicknameLabel", { name: person.nickname }) : t("person.noNickname")}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="detail">{t("person.tabDetail")}</TabsTrigger>
            <TabsTrigger value="edit" disabled={!effectiveCanEdit}>
              {effectiveCanEdit ? t("person.tabEdit") : t("person.tabEditLocked")}
            </TabsTrigger>
          </TabsList>

          {/* DETAIL VIEW */}
          <TabsContent value="detail" className="space-y-4 pt-2">
            <div className="flex gap-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border bg-muted">
                {person.photo ? (
                   
                  <img src={person.photo} alt={person.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <User className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <InfoRow icon={<Calendar />} label={t("person.born")}>
                  {person.place_of_birth ? `${person.place_of_birth}, ` : ""}
                  {fmt(person.date_of_birth) || "—"}
                </InfoRow>
                {isDeceased && (
                  <InfoRow icon={<Cross />} label={t("person.died")}>
                    {fmt(person.date_of_death)}
                  </InfoRow>
                )}
                <InfoRow icon={<Heart />} label={t("person.marital")}>
                  <span className="capitalize">{person.marital_status || "—"}</span>
                </InfoRow>
                <InfoRow icon={<User />} label={t("person.birthOrder")}>
                  {person.birth_order || "—"}
                </InfoRow>
                {person.residential_address && (
                  <InfoRow icon={<MapPin />} label={t("person.address")}>
                    {person.residential_address}
                  </InfoRow>
                )}
                {person.phone_number && (
                  <InfoRow icon={<Phone />} label={t("person.phone")}>
                    {person.phone_number}
                  </InfoRow>
                )}
                {person.religion && (
                  <InfoRow icon={<User />} label={t("person.religion")}>
                    {person.religion}
                  </InfoRow>
                )}
              </div>
            </div>

            {/* parents */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("person.familyRelations")}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("person.father")} </span>
                  {(person as TreeNode).father?.name || "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">{t("person.mother")} </span>
                  {(person as TreeNode).mother?.name || "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">{t("person.officialParent")} </span>
                  {(person as TreeNode).parent?.name || "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">{t("person.spouse")} </span>
                  {(person as TreeNode).spouse?.name || "—"}
                </div>
              </div>
              {((person as TreeNode).children?.length ?? 0) > 0 && (
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">{t("person.children", { count: (person as TreeNode).children!.length })} </span>
                  {(person as TreeNode).children!.map((c) => c.name).join(", ")}
                </div>
              )}
            </div>

            {/* burial */}
            {(person.burial_name || person.burial_address) && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("person.burialLocation")}
                </p>
                <div className="text-sm">
                  {person.burial_name && <div>{person.burial_name}</div>}
                  {person.burial_address && <div className="text-muted-foreground">{person.burial_address}</div>}
                  {person.burial_lat != null && person.burial_lng != null && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {person.burial_lat.toFixed(4)}, {person.burial_lng.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* EDIT VIEW */}
          {effectiveCanEdit && (
            <TabsContent value="edit" className="space-y-4 pt-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("person.fullName")}</Label>
                  <Input value={form.name ?? ""} onChange={(e) => update("name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("person.nickname")}</Label>
                  <Input value={form.nickname ?? ""} onChange={(e) => update("nickname", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("person.gender")}</Label>
                  <Select value={form.gender ?? "male"} onValueChange={(v) => update("gender", v as Gender)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t("person.male")}</SelectItem>
                      <SelectItem value="female">{t("person.female")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("person.generation")}</Label>
                  <Input type="number" min={1} value={form.generation ?? 1} onChange={(e) => update("generation", parseInt(e.target.value) || 1)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("person.placeOfBirth")}</Label>
                  <Input value={form.place_of_birth ?? ""} onChange={(e) => update("place_of_birth", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("person.dateOfBirth")}</Label>
                  <Input type="date" value={fmt(form.date_of_birth)} onChange={(e) => update("date_of_birth", e.target.value || null)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("person.dateOfDeath")}</Label>
                  <Input type="date" value={fmt(form.date_of_death)} onChange={(e) => update("date_of_death", e.target.value || null)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("person.birthOrder")}</Label>
                  <Input type="number" min={0} value={form.birth_order ?? 0} onChange={(e) => update("birth_order", parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("person.maritalStatus")}</Label>
                  <Select value={form.marital_status ?? "single"} onValueChange={(v) => update("marital_status", v as MaritalStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MARITAL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("person.religion")}</Label>
                  <Select value={form.religion ?? ""} onValueChange={(v) => update("religion", v)}>
                    <SelectTrigger><SelectValue placeholder={t("person.selectPlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      {RELIGIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t("person.residentialAddress")}</Label>
                <Textarea value={form.residential_address ?? ""} onChange={(e) => update("residential_address", e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("person.phoneNumber")}</Label>
                  <Input value={form.phone_number ?? ""} onChange={(e) => update("phone_number", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("person.photo")}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={uploadingPhoto}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePhotoUpload(f);
                      }}
                    />
                    {uploadingPhoto && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  {form.photo && (
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      { }
                      <img src={form.photo} alt="" className="h-10 w-10 rounded object-cover" />
                      <Button size="sm" variant="ghost" onClick={() => update("photo", null)}>{t("person.remove")}</Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Family relations */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("person.familyRelations")}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>{t("person.father")}</Label>
                    <Select value={form.father_id ?? "none"} onValueChange={(v) => update("father_id", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="none">{t("admin.noneOption")}</SelectItem>
                        {fatherOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("person.mother")}</Label>
                    <Select value={form.mother_id ?? "none"} onValueChange={(v) => update("mother_id", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="none">{t("admin.noneOption")}</SelectItem>
                        {motherOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("person.officialParentTree")}</Label>
                    <Select value={form.parent_id ?? "none"} onValueChange={(v) => update("parent_id", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="none">{t("person.noneRoot")}</SelectItem>
                        {parentOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Burial */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("person.burialLocation")}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t("person.burialName")}</Label>
                    <Input value={form.burial_name ?? ""} onChange={(e) => update("burial_name", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("person.burialAddress")}</Label>
                    <Input value={form.burial_address ?? ""} onChange={(e) => update("burial_address", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("person.latitude")}</Label>
                    <Input type="number" step="any" value={form.burial_lat ?? ""} onChange={(e) => update("burial_lat", e.target.value ? parseFloat(e.target.value) : null)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("person.longitude")}</Label>
                    <Input type="number" step="any" value={form.burial_lng ?? ""} onChange={(e) => update("burial_lng", e.target.value ? parseFloat(e.target.value) : null)} />
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter className="gap-2">
          {effectiveCanEdit && (
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="mr-auto">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t("person.delete")}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("person.close")}</Button>
          {effectiveCanEdit && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t("person.save")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-foreground">{children}</div>
      </div>
    </div>
  );
}
