"use client";

import * as d3 from "d3";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { FamilyNode, TreeNodePerson } from "@/lib/tarombo/types";
import { formatDateShort, partnershipLabel } from "@/lib/tarombo/types";

interface Props {
  trees: FamilyNode[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

// ============================================================================
// Layout constants
// ============================================================================
const NODE_WIDTH = 170;
const NODE_HEIGHT = 92;
const SPOUSE_OFFSET = 200; // center-to-center distance between person & spouse
const TREE_GAP = 80; // horizontal gap between multiple root trees
const NODE_GAP_X = 420; // d3.tree nodeSize x (sibling separation)
const NODE_GAP_Y = 180; // d3.tree nodeSize y (depth separation)
const MIN_SCALE = 0.35;
const MAX_SCALE = 1.6;
const INITIAL_SCALE = 0.85;
const PAN_STEP = 180;

// ============================================================================
// Types
// ============================================================================
interface Point {
  x: number;
  y: number;
}

interface LayoutTree {
  root: d3.HierarchyPointNode<FamilyNode>;
  minX: number;
  maxX: number;
  maxY: number;
}

interface CardColors {
  card: string;
  border: string;
  text: string;
  muted: string;
  link: string;
  stripMale: string;
  stripFemale: string;
  stripDeceased: string;
  avatarMaleBg: string;
  avatarFemaleBg: string;
  avatarMaleText: string;
  avatarFemaleText: string;
  shadow: string;
}

// ============================================================================
// Helpers
// ============================================================================

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

/** Horizontal center of the couple (used as the source x for parent→child links). */
function coupleSourceX(node: d3.HierarchyPointNode<FamilyNode>): number {
  return node.data.spouse ? node.x + SPOUSE_OFFSET / 2 : node.x;
}

/** Custom cubic-bezier path from source point to target point (vertical-ish curve). */
function coupleLinkPath(s: Point, t: Point): string {
  const my = (s.y + t.y) / 2;
  return `M${s.x},${s.y} C${s.x},${my} ${t.x},${my} ${t.x},${t.y}`;
}

function getColors(isDark: boolean): CardColors {
  return isDark
    ? {
        card: "oklch(0.21 0.02 40)",
        border: "oklch(0.4 0.04 40)",
        text: "oklch(0.96 0.01 75)",
        muted: "oklch(0.7 0.02 50)",
        link: "oklch(0.55 0.05 50 / 0.5)",
        stripMale: "var(--primary)",
        stripFemale: "#d97706",
        stripDeceased: "oklch(0.5 0.02 50)",
        avatarMaleBg: "oklch(0.35 0.08 28 / 0.5)",
        avatarFemaleBg: "oklch(0.4 0.08 75 / 0.5)",
        avatarMaleText: "oklch(0.92 0.05 28)",
        avatarFemaleText: "oklch(0.92 0.06 75)",
        shadow: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
      }
    : {
        card: "#ffffff",
        border: "oklch(0.88 0.02 60)",
        text: "oklch(0.22 0.02 35)",
        muted: "oklch(0.5 0.025 50)",
        link: "oklch(0.6 0.1 50 / 0.5)",
        stripMale: "var(--primary)",
        stripFemale: "#d97706",
        stripDeceased: "oklch(0.6 0.02 50)",
        avatarMaleBg: "oklch(0.92 0.04 28 / 0.6)",
        avatarFemaleBg: "oklch(0.93 0.06 75 / 0.6)",
        avatarMaleText: "var(--primary)",
        avatarFemaleText: "#b45309",
        shadow: "drop-shadow(0 2px 3px rgba(0,0,0,0.08))",
      };
}

function partnershipPillColor(
  status: "ACTIVE" | "DIVORCED" | "WIDOWED" | null | undefined,
): string {
  if (status === "ACTIVE") return "#059669";
  if (status === "WIDOWED") return "#78716c";
  if (status === "DIVORCED") return "#dc2626";
  return "#a8a29e";
}

/** Build the initial centering transform so root sits at top-center. */
function makeInitialTransform(
  contentWidth: number,
  viewportWidth: number,
): d3.ZoomTransform {
  const cx = contentWidth / 2;
  const tx = viewportWidth / 2 - INITIAL_SCALE * cx;
  const ty = 36;
  return d3.zoomIdentity.translate(tx, ty).scale(INITIAL_SCALE);
}

// ============================================================================
// Card rendering (top-level function for clarity)
// ============================================================================

function drawCard(
  parent: d3.Selection<
    SVGGElement,
    d3.HierarchyPointNode<FamilyNode>,
    SVGGElement | null,
    unknown
  >,
  person: TreeNodePerson,
  xCenter: number,
  colors: CardColors,
  selectedId: string | null | undefined,
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
  isSpouse: boolean,
  onSelectRef: React.MutableRefObject<((id: string) => void) | undefined>,
): void {
  const xLeft = xCenter - NODE_WIDTH / 2;
  const selected = selectedId === person.id;
  const isMale = person.gender === "MALE";
  const alive = person.alive;

  const cardG = parent
    .append<SVGGElement>("g")
    .attr("transform", `translate(${xLeft}, 0)`)
    .style("cursor", "pointer")
    .on("click", (event: MouseEvent) => {
      event.stopPropagation();
      onSelectRef.current?.(person.id);
    });

  // Selection highlight ring (drawn first, behind the card)
  if (selected) {
    cardG
      .append<SVGRectElement>("rect")
      .attr("x", -3)
      .attr("y", -3)
      .attr("width", NODE_WIDTH + 6)
      .attr("height", NODE_HEIGHT + 6)
      .attr("rx", 12)
      .attr("ry", 12)
      .attr("fill", "none")
      .attr("stroke", "var(--primary)")
      .attr("stroke-width", 2.5)
      .attr("opacity", 0.55);
  }

  // Card body with subtle shadow
  cardG
    .append<SVGRectElement>("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", NODE_WIDTH)
    .attr("height", NODE_HEIGHT)
    .attr("rx", 10)
    .attr("ry", 10)
    .attr("fill", colors.card)
    .attr("stroke", selected ? "var(--primary)" : colors.border)
    .attr("stroke-width", selected ? 2 : 1)
    .attr("filter", colors.shadow);

  // Top color strip (marun for MALE, amber for FEMALE, gray if deceased)
  const stripColor = !alive
    ? colors.stripDeceased
    : isMale
      ? colors.stripMale
      : colors.stripFemale;
  cardG
    .append<SVGRectElement>("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", NODE_WIDTH)
    .attr("height", 4)
    .attr("fill", stripColor);

  // Clip path (circular) for the avatar image
  const clipId = `clip-avatar-${person.id}`;
  const clip = defs
    .append<SVGClipPathElement>("clipPath")
    .attr("id", clipId)
    .attr("clipPathUnits", "userSpaceOnUse");
  clip
    .append<SVGCircleElement>("circle")
    .attr("cx", 24)
    .attr("cy", 26)
    .attr("r", 18);

  // Avatar background circle (gender-tinted)
  cardG
    .append<SVGCircleElement>("circle")
    .attr("cx", 24)
    .attr("cy", 26)
    .attr("r", 18)
    .attr("fill", isMale ? colors.avatarMaleBg : colors.avatarFemaleBg)
    .attr("stroke", colors.border)
    .attr("stroke-width", 1);

  // Avatar content: photo (if present) clipped to circle, else initials
  if (person.photo) {
    cardG
      .append<SVGImageElement>("image")
      .attr("href", person.photo)
      .attr("xlinkHref", person.photo)
      .attr("x", 6)
      .attr("y", 8)
      .attr("width", 36)
      .attr("height", 36)
      .attr("preserveAspectRatio", "xMidYMid slice")
      .attr("clip-path", `url(#${clipId})`);
  } else {
    cardG
      .append<SVGTextElement>("text")
      .attr("x", 24)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("font-family", "inherit")
      .attr("font-size", "12px")
      .attr("font-weight", "700")
      .attr("fill", isMale ? colors.avatarMaleText : colors.avatarFemaleText)
      .text(initials(person.fullName));
  }

  // Alive (emerald pulse dot) / deceased (stone) indicator on avatar
  cardG
    .append<SVGCircleElement>("circle")
    .attr("cx", 38)
    .attr("cy", 40)
    .attr("r", 4)
    .attr("fill", alive ? "#10b981" : "#a8a29e")
    .attr("stroke", colors.card)
    .attr("stroke-width", 1.5)
    .attr("class", alive ? "alive-dot" : "");

  // Full name (truncated)
  cardG
    .append<SVGTextElement>("text")
    .attr("x", 50)
    .attr("y", 18)
    .attr("font-family", "inherit")
    .attr("font-size", "12px")
    .attr("font-weight", "700")
    .attr("fill", colors.text)
    .text(truncate(person.fullName, 17));

  // Nickname in quotes
  if (person.nickname) {
    cardG
      .append<SVGTextElement>("text")
      .attr("x", 50)
      .attr("y", 32)
      .attr("font-family", "inherit")
      .attr("font-size", "10px")
      .attr("fill", colors.muted)
      .text(`"${truncate(person.nickname, 17)}"`);
  }

  // Gender pill (♂ L or ♀ P)
  cardG
    .append<SVGRectElement>("rect")
    .attr("x", 50)
    .attr("y", 38)
    .attr("width", 28)
    .attr("height", 14)
    .attr("rx", 3)
    .attr("fill", isMale ? colors.avatarMaleBg : colors.avatarFemaleBg);
  cardG
    .append<SVGTextElement>("text")
    .attr("x", 64)
    .attr("y", 48)
    .attr("text-anchor", "middle")
    .attr("font-family", "inherit")
    .attr("font-size", "9px")
    .attr("font-weight", "600")
    .attr("fill", isMale ? colors.avatarMaleText : colors.avatarFemaleText)
    .text(isMale ? "♂ L" : "♀ P");

  // Generation badge
  cardG
    .append<SVGTextElement>("text")
    .attr("x", 84)
    .attr("y", 48)
    .attr("font-family", "inherit")
    .attr("font-size", "9px")
    .attr("fill", colors.muted)
    .text(`Gen ${person.generationNumber ?? "?"}`);

  // Birth date
  cardG
    .append<SVGTextElement>("text")
    .attr("x", 8)
    .attr("y", 70)
    .attr("font-family", "inherit")
    .attr("font-size", "9.5px")
    .attr("fill", colors.muted)
    .text(`● ${formatDateShort(person.birthDate)}`);

  // Death date (✝) or "Pasangan" label
  if (!alive && person.deathDate) {
    cardG
      .append<SVGTextElement>("text")
      .attr("x", 8)
      .attr("y", 83)
      .attr("font-family", "inherit")
      .attr("font-size", "9.5px")
      .attr("fill", colors.muted)
      .text(`✝ ${formatDateShort(person.deathDate)}`);
  } else if (isSpouse) {
    cardG
      .append<SVGTextElement>("text")
      .attr("x", 8)
      .attr("y", 83)
      .attr("font-family", "inherit")
      .attr("font-size", "9px")
      .attr("fill", colors.muted)
      .text("Pasangan");
  }
}

// ============================================================================
// Main component
// ============================================================================

export function FamilyTree({ trees, selectedId, onSelect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const onSelectRef = useRef(onSelect);
  const initRef = useRef(false);
  const [scale, setScale] = useState(INITIAL_SCALE);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [isDark, setIsDark] = useState(false);

  // Keep latest onSelect reference without triggering tree re-render
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // Observe dark mode changes on <html> class
  useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => mo.disconnect();
  }, []);

  // Observe container size for responsiveness
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const update = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Build D3 layout per tree (memoized on trees change)
  const layout = useMemo<LayoutTree[]>(() => {
    return trees.map((rootData) => {
      const h = d3.hierarchy<FamilyNode>(
        rootData,
        (d: FamilyNode) => d.children,
      );
      const treeLayout = d3
        .tree<FamilyNode>()
        .nodeSize([NODE_GAP_X, NODE_GAP_Y]);
      const root = treeLayout(h);
      let minX = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      root.each((node) => {
        const left = node.x - NODE_WIDTH / 2;
        const right = node.data.spouse
          ? node.x + SPOUSE_OFFSET + NODE_WIDTH / 2
          : node.x + NODE_WIDTH / 2;
        minX = Math.min(minX, left);
        maxX = Math.max(maxX, right);
        maxY = Math.max(maxY, node.y + NODE_HEIGHT);
      });
      if (!Number.isFinite(minX)) {
        minX = 0;
        maxX = NODE_WIDTH;
        maxY = NODE_HEIGHT;
      }
      return { root, minX, maxX, maxY };
    });
  }, [trees]);

  // Total content size (across all trees)
  const contentSize = useMemo(() => {
    let width = 0;
    let height = 0;
    layout.forEach((t, i) => {
      width += t.maxX - t.minX + (i > 0 ? TREE_GAP : 0);
      height = Math.max(height, t.maxY);
    });
    return { width, height };
  }, [layout]);

  // Setup D3 zoom behavior (only once on mount)
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_SCALE, MAX_SCALE])
      .on("zoom", (event) => {
        const g = d3.select(gRef.current);
        g.attr("transform", event.transform.toString());
        setScale(event.transform.k);
      });
    svg.call(zoom);
    zoomRef.current = zoom;
    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  // Apply initial centering transform once content size & viewport are ready
  useEffect(() => {
    if (initRef.current) return;
    if (!svgRef.current || !zoomRef.current) return;
    if (contentSize.width === 0 || dims.w === 0) return;
    initRef.current = true;
    d3.select(svgRef.current).call(
      zoomRef.current.transform,
      makeInitialTransform(contentSize.width, dims.w),
    );
  }, [contentSize.width, dims.w]);

  // Render the tree (links + nodes) into <g ref={gRef}>
  useEffect(() => {
    if (!gRef.current) return;
    const g = d3.select(gRef.current);
    g.selectAll("*").remove();
    const colors = getColors(isDark);
    const defs = g.append<SVGDefsElement>("defs");

    let cursorX = 0;
    layout.forEach((tree) => {
      const offset = -tree.minX + cursorX;
      const treeG = g
        .append<SVGGElement>("g")
        .attr("transform", `translate(${offset}, 0)`);

      // Parent→child curved links (from couple bottom-center to child top-center)
      const links = tree.root.links();
      treeG
        .append<SVGGElement>("g")
        .attr("class", "links")
        .selectAll<SVGPathElement, d3.HierarchyPointLink<FamilyNode>>("path")
        .data(links)
        .join("path")
        .attr("d", (d) => {
          const src: Point = {
            x: coupleSourceX(d.source),
            y: d.source.y + NODE_HEIGHT,
          };
          const tgt: Point = { x: d.target.x, y: d.target.y };
          return coupleLinkPath(src, tgt);
        })
        .attr("fill", "none")
        .attr("stroke", colors.link)
        .attr("stroke-width", 1.5);

      // Nodes (one <g> per FamilyNode, translated to (node.x, node.y))
      const nodes = tree.root.descendants();
      const nodeG = treeG
        .append<SVGGElement>("g")
        .attr("class", "nodes")
        .selectAll<SVGGElement, d3.HierarchyPointNode<FamilyNode>>("g.node")
        .data(nodes)
        .join("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

      nodeG.each(function (d) {
        const grp = d3.select<SVGGElement, d3.HierarchyPointNode<FamilyNode>>(
          this,
        );
        const person = d.data.person;
        const spouse = d.data.spouse;
        const partnership = d.data.partnership;

        // Person card (centered at x=0 of node group)
        drawCard(
          grp,
          person,
          0,
          colors,
          selectedId,
          defs,
          false,
          onSelectRef,
        );

        // Spouse card + couple-link line + partnership pill
        if (spouse) {
          const coupleColor = partnershipPillColor(partnership?.status);

          // Horizontal couple link line
          grp
            .append<SVGLineElement>("line")
            .attr("x1", NODE_WIDTH / 2)
            .attr("y1", NODE_HEIGHT / 2)
            .attr("x2", SPOUSE_OFFSET - NODE_WIDTH / 2)
            .attr("y2", NODE_HEIGHT / 2)
            .attr("stroke", coupleColor)
            .attr("stroke-width", 2)
            .attr("opacity", 0.7);

          // Partnership status pill at midpoint
          const bx = (NODE_WIDTH / 2 + (SPOUSE_OFFSET - NODE_WIDTH / 2)) / 2;
          const by = NODE_HEIGHT / 2;
          const pillLabel = partnership
            ? partnershipLabel(partnership.status)
            : "Pasangan";
          const pillW = Math.min(
            56,
            Math.max(38, pillLabel.length * 6 + 10),
          );
          grp
            .append<SVGRectElement>("rect")
            .attr("x", bx - pillW / 2)
            .attr("y", by - 8)
            .attr("width", pillW)
            .attr("height", 16)
            .attr("rx", 8)
            .attr("fill", coupleColor)
            .attr("opacity", 0.92)
            .attr("stroke", colors.card)
            .attr("stroke-width", 1);
          grp
            .append<SVGTextElement>("text")
            .attr("x", bx)
            .attr("y", by + 3.5)
            .attr("text-anchor", "middle")
            .attr("font-family", "inherit")
            .attr("font-size", "9px")
            .attr("font-weight", "600")
            .attr("fill", "#ffffff")
            .text(pillLabel);

          // Spouse card (centered at x = SPOUSE_OFFSET of node group)
          drawCard(
            grp,
            spouse,
            SPOUSE_OFFSET,
            colors,
            selectedId,
            defs,
            true,
            onSelectRef,
          );
        }
      });

      cursorX += tree.maxX - tree.minX + TREE_GAP;
    });
  }, [layout, selectedId, isDark]);

  // ---- Zoom & pan button handlers (manipulate the D3 zoom transform) ----

  const zoomIn = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(180)
      .call(zoomRef.current.scaleBy, 1.2);
  };

  const zoomOut = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(180)
      .call(zoomRef.current.scaleBy, 1 / 1.2);
  };

  const reset = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(220)
      .call(
        zoomRef.current.transform,
        makeInitialTransform(contentSize.width, dims.w),
      );
  };

  const pan = (dx: number, dy: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(180)
      .call(zoomRef.current.translateBy, dx, dy);
  };

  if (trees.length === 0) {
    return null;
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Zoom controls (top-right vertical) */}
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

      {/* Pan controls (bottom-right 3x3 grid) */}
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

      {/* Zoom percentage badge (top-left) */}
      <div className="no-print absolute top-3 left-3 z-20">
        <span className="inline-flex items-center gap-1 rounded-md bg-secondary/90 px-2 py-1 text-[10px] font-medium text-secondary-foreground shadow">
          Zoom {Math.round(scale * 100)}%
        </span>
      </div>

      {/* SVG canvas — fills container, D3 zoom/pan applies to inner <g> */}
      <svg
        ref={svgRef}
        width={dims.w}
        height={dims.h}
        className="block touch-none select-none"
        style={{ background: "transparent" }}
      >
        <g ref={gRef} />
      </svg>
    </div>
  );
}
