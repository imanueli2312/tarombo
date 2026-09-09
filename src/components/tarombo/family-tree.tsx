"use client";

import { useRef, useState, type WheelEvent } from "react";
import { TreeNode } from "./tree-node";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { FamilyNode } from "@/lib/tarombo/types";
import { cn } from "@/lib/utils";

interface Props {
  trees: FamilyNode[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

const MIN_SCALE = 0.35;
const MAX_SCALE = 1.6;
const PAN_STEP = 220;

export function FamilyTree({ trees, selectedId, onSelect }: Props) {
  const [scale, setScale] = useState(0.85);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

  const zoomIn = () => setScale((s) => clamp(+(s + 0.15).toFixed(2), MIN_SCALE, MAX_SCALE));
  const zoomOut = () => setScale((s) => clamp(+(s - 0.15).toFixed(2), MIN_SCALE, MAX_SCALE));
  const reset = () => {
    setScale(0.85);
    setTx(0);
    setTy(0);
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setScale((s) => clamp(+(s + delta).toFixed(2), MIN_SCALE, MAX_SCALE));
    }
  };

  const pan = (dx: number, dy: number) => {
    setTx((x) => x + dx);
    setTy((y) => y + dy);
  };

  if (trees.length === 0) {
    return null;
  }

  return (
    <div className="relative h-full w-full">
      {/* Kontrol zoom & pan */}
      <div className="no-print absolute top-3 right-3 z-20 flex flex-col gap-1.5">
        <Button
          size="icon"
          variant="secondary"
          className="size-8 shadow-md"
          onClick={zoomIn}
          title="Perbesar"
        >
          <ZoomIn className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="size-8 shadow-md"
          onClick={zoomOut}
          title="Perkecil"
        >
          <ZoomOut className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="size-8 shadow-md"
          onClick={reset}
          title="Reset tampilan"
        >
          <Maximize2 className="size-4" />
        </Button>
      </div>

      {/* Tombol pan */}
      <div className="no-print absolute bottom-3 right-3 z-20 grid grid-cols-3 gap-1">
        <span />
        <Button
          size="icon"
          variant="secondary"
          className="size-7 shadow"
          onClick={() => pan(0, PAN_STEP)}
          title="Geser naik"
        >
          <ChevronLeft className="size-3.5 rotate-90" />
        </Button>
        <span />
        <Button
          size="icon"
          variant="secondary"
          className="size-7 shadow"
          onClick={() => pan(PAN_STEP, 0)}
          title="Geser kiri"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <span />
        <Button
          size="icon"
          variant="secondary"
          className="size-7 shadow"
          onClick={() => pan(-PAN_STEP, 0)}
          title="Geser kanan"
        >
          <ChevronRight className="size-3.5" />
        </Button>
        <span />
        <Button
          size="icon"
          variant="secondary"
          className="size-7 shadow"
          onClick={() => pan(0, -PAN_STEP)}
          title="Geser turun"
        >
          <ChevronRight className="size-3.5 rotate-90" />
        </Button>
      </div>

      {/* Indikator zoom */}
      <div className="no-print absolute top-3 left-3 z-20">
        <span className="inline-flex items-center gap-1 rounded-md bg-secondary/90 px-2 py-1 text-[10px] font-medium text-secondary-foreground shadow">
          Zoom {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Area pohon yang dapat di-scroll & di-zoom */}
      <div
        ref={scrollRef}
        className="tarombo-scroll h-full w-full overflow-auto"
        onWheel={onWheel}
      >
        <div
          className={cn("min-w-max min-h-full flex justify-center p-8")}
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: "top center",
            transition: "transform 0.18s ease-out",
          }}
        >
          {trees.length === 1 ? (
            <ul className="tarombo-tree">
              <TreeNode
                node={trees[0]}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            </ul>
          ) : (
            <div className="flex items-start gap-16">
              {trees.map((tree, i) => (
                <div key={i}>
                  <ul className="tarombo-tree">
                    <TreeNode
                      node={tree}
                      selectedId={selectedId}
                      onSelect={onSelect}
                    />
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
