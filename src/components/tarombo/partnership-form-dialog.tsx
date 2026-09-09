"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Heart } from "lucide-react";
import { toast } from "sonner";
import {
  createPartnership,
  fetchPersons,
} from "@/lib/tarombo/api-client";
import {
  PARTNERSHIP_STATUS,
  partnershipLabel,
} from "@/lib/tarombo/types";
import type { PartnershipInput, TreeNodePerson } from "@/lib/tarombo/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** pre-set salah satu pihak (misal dari detail orang) */
  presetPersonId?: string | null;
  presetRole?: "husband" | "wife" | null;
  onSaved: () => void;
}

function toDateInput(d: string | null): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function PartnershipFormDialog({
  open,
  onOpenChange,
  presetPersonId,
  presetRole,
  onSaved,
}: Props) {
  const [males, setMales] = useState<TreeNodePerson[]>([]);
  const [females, setFemales] = useState<TreeNodePerson[]>([]);
  const [husbandId, setHusbandId] = useState<string | null>(null);
  const [wifeId, setWifeId] = useState<string | null>(null);
  const [marriageDate, setMarriageDate] = useState<string>("");
  const [status, setStatus] = useState<PartnershipInput["status"]>("ACTIVE");
  const [divorceDate, setDivorceDate] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchPersons().then((all) => {
      setMales(all.filter((p) => p.gender === "MALE"));
      setFemales(all.filter((p) => p.gender === "FEMALE"));
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setHusbandId(presetRole === "husband" ? presetPersonId ?? null : null);
    setWifeId(presetRole === "wife" ? presetPersonId ?? null : null);
    setMarriageDate("");
    setDivorceDate("");
    setStatus("ACTIVE");
  }, [open, presetPersonId, presetRole]);

  const onSubmit = async () => {
    setError(null);
    if (!husbandId) {
      setError("Pilih suami terlebih dahulu.");
      return;
    }
    if (!wifeId) {
      setError("Pilih istri terlebih dahulu.");
      return;
    }
    if (husbandId === wifeId) {
      setError("Suami dan istri tidak boleh orang yang sama.");
      return;
    }
    setSaving(true);
    try {
      await createPartnership({
        husbandId,
        wifeId,
        marriageDate: marriageDate ? new Date(marriageDate) : null,
        divorceDate:
          status !== "ACTIVE" && divorceDate
            ? new Date(divorceDate)
            : null,
        status,
      });
      toast.success("Pasangan berhasil ditambahkan.");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="size-4 text-rose-500" />
            Tambah Pasangan
          </DialogTitle>
          <DialogDescription className="text-xs">
            Satu orang laki-laki &amp; perempuan maksimal 1 pasangan aktif.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label className="text-[11.5px]">
              Suami <span className="text-destructive">*</span>
            </Label>
            <Select value={husbandId ?? "__none__"} onValueChange={(v) => setHusbandId(v === "__none__" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih laki-laki" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— pilih —</SelectItem>
                {males.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.fullName}
                    {m.nickname ? ` (${m.nickname})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11.5px]">
              Istri <span className="text-destructive">*</span>
            </Label>
            <Select value={wifeId ?? "__none__"} onValueChange={(v) => setWifeId(v === "__none__" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih perempuan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— pilih —</SelectItem>
                {females.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.fullName}
                    {m.nickname ? ` (${m.nickname})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11.5px]">Tanggal Menikah</Label>
              <Input
                type="date"
                value={marriageDate}
                onChange={(e) => setMarriageDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11.5px]">Status Pasangan</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PartnershipInput["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARTNERSHIP_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {partnershipLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {status !== "ACTIVE" && (
            <div className="space-y-1">
              <Label className="text-[11.5px]">Tanggal Cerai</Label>
              <Input
                type="date"
                value={divorceDate}
                onChange={(e) => setDivorceDate(e.target.value)}
              />
              <p className="text-[10.5px] text-muted-foreground">
                Catatan: jika salah satu pasangan meninggal, tanggal cerai akan{" "}
                <b>otomatis diset</b> sama dengan tanggal kematian.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
            Simpan Pasangan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hilangkan unused import warning
void toDateInput;
