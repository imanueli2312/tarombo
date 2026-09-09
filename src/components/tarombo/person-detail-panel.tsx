"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pencil,
  Heart,
  Baby,
  Trash2,
  MapPin,
  Phone,
  Home,
  Cross,
  CalendarDays,
  User,
  Hash,
  Church,
  Users as UsersIcon,
  Frown,
} from "lucide-react";
import { fetchPersonDetail } from "@/lib/tarombo/api-client";
import {
  formatDate,
  genderLabel,
  maritalLabel,
  partnershipLabel,
} from "@/lib/tarombo/types";
import { cn } from "@/lib/utils";

interface Props {
  personId: string | null;
  onEdit: (id: string) => void;
  onAddPartner: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onJumpToTree: (id: string) => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1">
      <Icon className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-[12.5px] text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

export function PersonDetailPanel({
  personId,
  onEdit,
  onAddPartner,
  onAddChild,
  onDelete,
  onJumpToTree,
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["person-detail", personId],
    queryFn: () => fetchPersonDetail(personId!),
    enabled: !!personId,
  });

  if (!personId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="grid size-14 place-items-center rounded-full bg-muted">
          <User className="size-7 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Belum ada orang dipilih</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
            Pilih kartu orang di pohon silsilah atau di daftar untuk melihat detail
            lengkapnya.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-3 p-4">
        <div className="h-24 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  const p = data.data;
  const r = data.relations;
  const isMale = p.gender === "MALE";

  return (
    <ScrollArea className="tarombo-scroll h-full">
      <div className="p-3 space-y-3">
        {/* Banner profil */}
        <Card className="relative overflow-hidden p-3">
          <div
            className={cn(
              "absolute inset-x-0 top-0 h-16",
              isMale ? "bg-primary/90" : "bg-amber-500/90",
            )}
          />
          <div className="relative flex items-end gap-3 pt-6">
            <Avatar className="size-16 border-4 border-card shadow-md">
              {p.photo ? (
                 
                <img
                  src={p.photo}
                  alt={p.fullName}
                  className="size-full object-cover"
                />
              ) : (
                <AvatarFallback
                  className={cn(
                    "text-lg font-bold",
                    isMale
                      ? "bg-primary/15 text-primary"
                      : "bg-amber-500/20 text-amber-700",
                  )}
                >
                  {initials(p.fullName)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0 flex-1 pb-1">
              <h3 className="text-[15px] font-bold leading-tight">{p.fullName}</h3>
              {p.nickname && (
                <p className="text-[11px] text-muted-foreground">
                  “{p.nickname}”
                </p>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                isMale
                  ? "border-primary/30 text-primary bg-primary/5"
                  : "border-amber-500/40 text-amber-700 bg-amber-500/10",
              )}
            >
              {genderLabel(p.gender)}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {maritalLabel(p.maritalStatus)}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                p.alive
                  ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10"
                  : "border-stone-400/40 text-stone-500 bg-stone-400/10",
              )}
            >
              {p.alive ? "Hidup" : "Wafat"}
            </Badge>
            {p.generationNumber != null && (
              <Badge variant="secondary" className="text-[10px]">
                <Hash className="size-2.5 mr-0.5" />
                Gen {p.generationNumber}
              </Badge>
            )}
          </div>

          {/* Aksi cepat */}
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <Button size="sm" variant="outline" onClick={() => onEdit(p.id)} className="h-8 text-xs">
              <Pencil className="size-3.5 mr-1.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddChild(p.id)}
              className="h-8 text-xs"
            >
              <Baby className="size-3.5 mr-1.5" />
              Tambah Anak
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddPartner(p.id)}
              className="h-8 text-xs"
            >
              <Heart className="size-3.5 mr-1.5" />
              Pasangan
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(p.id)}
              className="h-8 text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5 mr-1.5" />
              Hapus
            </Button>
          </div>
        </Card>

        {/* Identitas */}
        <Card className="p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Identitas
          </p>
          <Row icon={CalendarDays} label="Tanggal Lahir" value={p.birthDate ? formatDate(p.birthDate) : null} />
          <Row icon={Home} label="Tempat Lahir" value={p.birthPlace} />
          {p.deathDate && (
            <Row icon={Cross} label="Tanggal Wafat" value={formatDate(p.deathDate)} />
          )}
          {p.birthOrder != null && (
            <Row icon={Hash} label="Urutan Lahir" value={`Anak ke-${p.birthOrder}`} />
          )}
        </Card>

        {/* Kontak */}
        {(p.address || p.phone || p.religion) && (
          <Card className="p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Kontak & Domisili
            </p>
            <Row icon={Home} label="Alamat" value={p.address} />
            <Row icon={Phone} label="Telepon" value={p.phone} />
            <Row icon={Church} label="Agama" value={p.religion} />
          </Card>
        )}

        {/* Lokasi pemakaman */}
        {p.burialName && (
          <Card className="p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Lokasi Pemakaman
            </p>
            <Row icon={MapPin} label="Nama Pemakaman" value={p.burialName} />
            <Row icon={Home} label="Alamat Pemakaman" value={p.burialAddress} />
            {p.burialLat != null && p.burialLng != null && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${p.burialLat}&mlon=${p.burialLng}#map=15/${p.burialLat}/${p.burialLng}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-accent/60 px-2 py-1 text-[11px] text-accent-foreground hover:bg-accent transition-colors"
              >
                <MapPin className="size-3" />
                Lihat di peta ({p.burialLat.toFixed(4)}, {p.burialLng.toFixed(4)})
              </a>
            )}
          </Card>
        )}

        {/* Orang tua */}
        {(r.father || r.mother) && (
          <Card className="p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Orang Tua
            </p>
            {r.father && (
              <ParentItem
                label="Ayah"
                name={r.father.fullName}
                nickname={r.father.nickname}
                onClick={() => onJumpToTree(r.father!.id)}
              />
            )}
            {r.mother && (
              <ParentItem
                label="Ibu"
                name={r.mother.fullName}
                nickname={r.mother.nickname}
                onClick={() => onJumpToTree(r.mother!.id)}
              />
            )}
          </Card>
        )}

        {/* Pasangan */}
        {r.partnerships.length > 0 && (
          <Card className="p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Pasangan
            </p>
            <div className="space-y-1.5">
              {r.partnerships.map((rel, i) => {
                const partner = rel.partner;
                const status = (rel as { status?: string }).status;
                const mDate = (rel as { marriageDate?: string | null }).marriageDate;
                const dDate = (rel as { divorceDate?: string | null }).divorceDate;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 cursor-pointer rounded-md p-1.5 hover:bg-accent/60"
                    onClick={() => onJumpToTree(partner.id)}
                  >
                    <Avatar className="size-7 border border-border">
                      <AvatarFallback className="text-[10px] font-semibold bg-secondary text-secondary-foreground">
                        {initials(partner.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium">{partner.fullName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {partnershipLabel(status)}
                        {mDate ? ` · ⚭ ${formatDate(mDate)}` : ""}
                        {dDate ? ` · ✕ ${formatDate(dDate)}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Anak-anak */}
        {r.children.length > 0 && (
          <Card className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Anak ({r.children.length})
              </p>
              <UsersIcon className="size-3.5 text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              {r.children.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 cursor-pointer rounded-md p-1.5 hover:bg-accent/60"
                  onClick={() => onJumpToTree(c.id)}
                >
                  <Avatar className="size-7 border border-border">
                    <AvatarFallback
                      className={cn(
                        "text-[10px] font-semibold",
                        c.gender === "MALE"
                          ? "bg-primary/15 text-primary"
                          : "bg-amber-500/20 text-amber-700",
                      )}
                    >
                      {initials(c.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">{c.fullName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {c.birthOrder != null ? `Anak ke-${c.birthOrder}` : ""}
                      {c.birthDate ? ` · ${formatDate(c.birthDate)}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {!p.alive && (
          <div className="flex items-center gap-2 rounded-md border border-stone-300/50 bg-stone-100/50 dark:bg-stone-900/30 p-2 text-[11px] text-stone-600 dark:text-stone-400">
            <Frown className="size-3.5" />
            Telah wafat
            {p.deathDate && ` pada ${formatDate(p.deathDate)}`}. Almarhum/almarhumah.
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function ParentItem({
  label,
  name,
  nickname,
  onClick,
}: {
  label: string;
  name: string;
  nickname?: string | null;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 cursor-pointer rounded-md p-1.5 hover:bg-accent/60"
      onClick={onClick}
    >
      <div className="grid size-7 place-items-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
        {label === "Ayah" ? "♂" : "♀"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium">{name}</p>
        {nickname && (
          <p className="text-[10px] text-muted-foreground">“{nickname}”</p>
        )}
      </div>
    </div>
  );
}
