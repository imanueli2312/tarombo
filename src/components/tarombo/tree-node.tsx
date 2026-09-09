"use client";

import { PersonNodeCard } from "./person-node-card";
import { Badge } from "@/components/ui/badge";
import { formatDateShort, partnershipLabel } from "@/lib/tarombo/types";
import type { FamilyNode } from "@/lib/tarombo/types";
import { cn } from "@/lib/utils";

interface Props {
  node: FamilyNode;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

/** Satu node pohon: orang (+ pasangan) beserta cabang anak. */
export function TreeNode({ node, selectedId, onSelect }: Props) {
  const { person, spouse, partnership, children } = node;

  const hasSpouse = !!spouse;
  const hasChildren = children.length > 0;

  return (
    <li>
      {/* Kartu pasangan (orang utama + pasangan) */}
      <div className="flex items-stretch justify-center gap-0 relative z-[1]">
        <PersonNodeCard
          person={person}
          selected={selectedId === person.id}
          onClick={() => onSelect?.(person.id)}
        />

        {hasSpouse && spouse && (
          <>
            {/* penghubung antar pasangan + info pernikahan */}
            <div className="flex flex-col items-center justify-center px-1">
              <div className="flex items-center gap-1">
                <span className="couple-link" />
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[9px] h-[16px] px-1 whitespace-nowrap",
                    partnership?.status === "ACTIVE"
                      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                      : partnership?.status === "WIDOWED"
                        ? "bg-stone-500/15 text-stone-600 border-stone-400/40"
                        : "bg-rose-500/15 text-rose-700 border-rose-500/30",
                  )}
                  title={
                    partnership?.marriageDate
                      ? `Menikah ${formatDateShort(partnership.marriageDate)}`
                      : "Pasangan"
                  }
                >
                  {partnership ? partnershipLabel(partnership.status) : "Pasangan"}
                </Badge>
                <span className="couple-link" />
              </div>
            </div>
            <PersonNodeCard
              person={spouse}
              isSpouse
              selected={selectedId === spouse.id}
              onClick={() => onSelect?.(spouse.id)}
            />
          </>
        )}
      </div>

      {/* Cabang anak-anak (rekursif) */}
      {hasChildren && (
        <ul>
          {children.map((child) => (
            <TreeNode
              key={child.person.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
