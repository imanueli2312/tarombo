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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Person, Spouse } from "@/lib/types";
import { useLanguage } from "@/hooks/use-language";

interface SpouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spouse: Spouse | null;
  allPersons: Person[];
  defaultHusbandId?: string;
  defaultWifeId?: string;
  onSaved?: () => void;
  onDeleted?: () => void;
}

function fmt(d: string | null | undefined): string {
  if (!d) return "";
  return d.length > 10 ? d.slice(0, 10) : d;
}

export function SpouseDialog({
  open,
  onOpenChange,
  spouse,
  allPersons,
  defaultHusbandId,
  defaultWifeId,
  onSaved,
  onDeleted,
}: SpouseDialogProps) {
  const [form, setForm] = useState<Partial<Spouse>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (spouse) {
      setForm({ ...spouse });
    } else {
      setForm({
        husband_id: defaultHusbandId ?? "",
        wife_id: defaultWifeId ?? "",
        marriage_date: null,
        divorce_date: null,
        is_active: 1,
      });
    }
  }, [spouse, defaultHusbandId, defaultWifeId]);

  const males = allPersons.filter((p) => p.gender === "male");
  const females = allPersons.filter((p) => p.gender === "female");

  function update<K extends keyof Spouse>(key: K, value: Spouse[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.husband_id || !form.wife_id) {
      toast.error(t("spouse.errorBothRequired"));
      return;
    }
    setSaving(true);
    try {
      const isExisting = !!spouse;
      const url = isExisting ? `/api/spouses/${spouse!.id}` : "/api/spouses";
      const method = isExisting ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || t("spouse.saveFailed"));
      }
      toast.success(isExisting ? t("spouse.marriageUpdated") : t("spouse.marriageCreated"));
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || t("spouse.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!spouse) return;
    if (!confirm(t("spouse.confirmDelete"))) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/spouses/${spouse.id}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || t("spouse.deleteFailed"));
      }
      toast.success(t("spouse.marriageDeleted"));
      onDeleted?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || t("spouse.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{spouse ? t("spouse.editTitle") : t("spouse.addTitle")}</DialogTitle>
          <DialogDescription>{t("spouse.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("spouse.husband")}</Label>
            <Select value={form.husband_id ?? "none"} onValueChange={(v) => update("husband_id", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={t("spouse.selectHusband")} /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="none">{t("admin.noneOption")}</SelectItem>
                {males.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("spouse.wife")}</Label>
            <Select value={form.wife_id ?? "none"} onValueChange={(v) => update("wife_id", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={t("spouse.selectWife")} /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="none">{t("admin.noneOption")}</SelectItem>
                {females.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("spouse.marriageDate")}</Label>
              <Input type="date" value={fmt(form.marriage_date)} onChange={(e) => update("marriage_date", e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("spouse.divorceDate")}</Label>
              <Input type="date" value={fmt(form.divorce_date)} onChange={(e) => update("divorce_date", e.target.value || null)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">{t("spouse.activeMarriage")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("spouse.activeHint")}
              </p>
            </div>
            <Switch
              checked={form.is_active === 1}
              onCheckedChange={(v) => update("is_active", v ? 1 : 0)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {spouse && (
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="mr-auto">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t("spouse.delete")}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("spouse.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t("spouse.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
