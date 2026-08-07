"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as d3 from "d3";
import type { TreeData, TreeNode } from "@/lib/types-tree";
import { useLanguage } from "@/hooks/use-language";

interface D3TreeProps {
  data: TreeData | null;
  selectedId?: string | null;
  onSelect?: (personId: string) => void;
  onReady?: (svg: SVGSVGElement, width: number, height: number) => void;
}

const NODE_W = 200;
const NODE_H = 76;
const SPOUSE_GAP = 16;
const LEVEL_GAP = 120;

interface LayoutNode {
  id: string;
  person: TreeNode;
  x: number;
  y: number;
  spouse: TreeNode | null;
  children: LayoutNode[];
}

// Compute a vertical tree layout manually so we can render couples side by side.
function buildLayout(roots: TreeNode[]): { width: number; height: number; allNodes: LayoutNode[] } {
  const allNodes: LayoutNode[] = [];

  function layoutUnit(node: TreeNode, depth: number): { root: LayoutNode; width: number } {
    const children = node.children || [];
    const childLayouts = children.map((c) => layoutUnit(c, depth + 1));

    const childrenWidth =
      childLayouts.reduce((a, b) => a + b.width, 0) +
      Math.max(0, (children.length - 1) * 40);

    // Only one card per node (spouse info shown as text, not a separate card)
    const selfWidth = NODE_W;
    const unitWidth = Math.max(selfWidth, childrenWidth);

    let childCursor = -unitWidth / 2;
    for (const cl of childLayouts) {
      const centerX = childCursor + cl.width / 2;
      cl.root.x = centerX;
      cl.root.y = (depth + 1) * LEVEL_GAP;
      childCursor += cl.width + 40;
    }

    const layoutNode: LayoutNode = {
      id: node.id,
      person: node,
      x: 0,
      y: depth * LEVEL_GAP,
      spouse: node.spouse ?? null,
      children: childLayouts.map((c) => c.root),
    };
    allNodes.push(layoutNode);

    return { root: layoutNode, width: unitWidth };
  }

  const laid: LayoutNode[] = [];
  let xOffset = 0;
  for (const root of roots) {
    const res = layoutUnit(root, 0);
    const shift = xOffset + res.width / 2;
    res.root.x = shift;
    shiftSubtree(res.root, shift);
    laid.push(res.root);
    xOffset += res.width + 80;
  }

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const n of allNodes) {
    // Single card centered on n.x
    minX = Math.min(minX, n.x - NODE_W / 2);
    maxX = Math.max(maxX, n.x + NODE_W / 2);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y + NODE_H);
  }
  const width = maxX - minX + 120;
  const height = maxY - minY + 120;

  const dx = 60 - minX;
  const dy = 60 - minY;
  for (const n of allNodes) {
    n.x += dx;
    n.y += dy;
  }

  return { width, height, allNodes };
}

function shiftSubtree(node: LayoutNode, delta: number) {
  node.x += delta;
  for (const c of node.children) shiftSubtree(c, delta);
}

export function D3Tree({ data, selectedId, onSelect, onReady }: D3TreeProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const internalSvgRef = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  const setSvgRef = useCallback((el: SVGSVGElement | null) => {
    internalSvgRef.current = el;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!data || !data.roots.length) return;
    const svgEl = internalSvgRef.current;
    if (!svgEl) return;

    const { width, height, allNodes } = buildLayout(data.roots);

    // Set the SVG to the container dimensions (not the tree dimensions)
    // so that D3 zoom handles ALL scaling — no viewBox double-scaling.
    const cw = size.width;
    const ch = size.height;
    svgEl.setAttribute("width", String(cw));
    svgEl.setAttribute("height", String(ch));
    svgEl.setAttribute("viewBox", `0 0 ${cw} ${ch}`);

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    svg
      .append("rect")
      .attr("class", "tree-bg")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", cw)
      .attr("height", ch)
      .attr("fill", "transparent");

    const root = svg.append("g").attr("class", "tree-content");
    const defs = svg.append("defs");

    // Links (parent -> child)
    const linkGroup = root.append("g").attr("class", "links");
    for (const node of allNodes) {
      // node.x is the CENTER of the unit (primary + spouse cards)
      for (const child of node.children) {
        const parentBottomX = node.x; // center of the unit
        const parentBottomY = node.y + NODE_H;
        const childTopX = child.x; // center of child's unit
        const childTopY = child.y;
        const midY = (parentBottomY + childTopY) / 2;
        linkGroup
          .append("path")
          .attr(
            "d",
            `M${parentBottomX},${parentBottomY} C${parentBottomX},${midY} ${childTopX},${midY} ${childTopX},${childTopY}`
          )
          .attr("fill", "none")
          .attr("stroke", "oklch(0.7 0.03 60)")
          .attr("stroke-width", 1.4);
      }
    }

    // Nodes — one card per person (no separate spouse card)
    const nodeGroup = root.append("g").attr("class", "nodes");
    for (const node of allNodes) {
      // Center the single card on node.x
      const g = nodeGroup
        .append("g")
        .attr("class", "node-group")
        .attr("transform", `translate(${node.x - NODE_W / 2}, ${node.y})`)
        .style("cursor", "pointer");

      // Build spouse info: name + deceased status
      const spouseInfo = node.spouse
        ? { name: node.spouse.name, isDeceased: !!node.spouse.date_of_death }
        : null;
      drawPersonCard(
        g,
        node.person,
        0,
        false,
        selectedId === node.person.id,
        () => onSelect?.(node.person.id),
        spouseInfo
      );
    }

    function drawPersonCard(
      parent: d3.Selection<SVGGElement, unknown, null, undefined>,
      person: TreeNode,
      offsetX: number,
      isSpouse: boolean,
      selected: boolean,
      onClick: () => void,
      spouseInfo: { name: string; isDeceased: boolean } | null
    ) {
      const card = parent
        .append("g")
        .attr("transform", `translate(${offsetX}, 0)`)
        .attr("class", "person-card")
        .on("click", (e: MouseEvent) => {
          e.stopPropagation();
          onClick();
        });

      const isDeceased = !!person.date_of_death;
      const isMale = person.gender === "male";
      const fillColor = isDeceased ? "oklch(0.96 0.008 70)" : "oklch(1 0.004 75)";
      const strokeColor = selected
        ? "oklch(0.48 0.11 38)"
        : isMale
        ? "oklch(0.72 0.05 50)"
        : "oklch(0.75 0.06 25)";

      card
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", NODE_W)
        .attr("height", NODE_H)
        .attr("rx", 10)
        .attr("ry", 10)
        .attr("fill", fillColor)
        .attr("stroke", strokeColor)
        .attr("stroke-width", selected ? 2.2 : 1.2)
        .style("filter", "drop-shadow(0 1px 2px oklch(0.3 0.02 50 / 0.06))");

      // gender stripe
      card
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 5)
        .attr("height", NODE_H)
        .attr("rx", 2)
        .attr("fill", isMale ? "oklch(0.6 0.08 200)" : "oklch(0.65 0.12 25)")
        .attr("opacity", isDeceased ? 0.5 : 0.85);

      // avatar circle
      card
        .append("circle")
        .attr("cx", 26)
        .attr("cy", NODE_H / 2)
        .attr("r", 16)
        .attr("fill", "oklch(0.9 0.02 60)")
        .attr("stroke", "oklch(0.75 0.03 60)")
        .attr("stroke-width", 1);

      if (person.photo) {
        const clipId = `clip-${person.id}-${isSpouse ? "s" : "p"}`;
        defs
          .append("clipPath")
          .attr("id", clipId)
          .append("circle")
          .attr("cx", 26)
          .attr("cy", NODE_H / 2)
          .attr("r", 16);
        card
          .append("image")
          .attr("href", person.photo)
          .attr("x", 10)
          .attr("y", NODE_H / 2 - 16)
          .attr("width", 32)
          .attr("height", 32)
          .attr("clip-path", `url(#${clipId})`)
          .attr("preserveAspectRatio", "xMidYMid slice");
      } else {
        const initials = person.name
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase();
        card
          .append("text")
          .attr("x", 26)
          .attr("y", NODE_H / 2 + 4)
          .attr("text-anchor", "middle")
          .attr("font-size", 10)
          .attr("font-weight", 600)
          .attr("fill", "oklch(0.5 0.03 50)")
          .text(initials);
      }

      // ---- Name with deceased indicator (✝) next to it ----
      const deceasedMark = t("tree.deceasedMark");
      const displayName = isDeceased
        ? `${truncate(person.name, 20)} ${deceasedMark}`
        : truncate(person.name, 22);
      card
        .append("text")
        .attr("x", 50)
        .attr("y", 22)
        .attr("font-size", 12)
        .attr("font-weight", 600)
        .attr("fill", "oklch(0.25 0.02 50)")
        .text(displayName);

      // ---- Nickname ----
      if (person.nickname) {
        card
          .append("text")
          .attr("x", 50)
          .attr("y", 36)
          .attr("font-size", 9.5)
          .attr("fill", "oklch(0.5 0.03 50)")
          .text(`"${truncate(person.nickname, 20)}"`);
      }

      // ---- Spouse label (replaces birth/death years) ----
      // Includes ✝ death indicator if the spouse is deceased
      if (spouseInfo) {
        const deceasedMark = t("tree.deceasedMark");
        const spouseNameWithMark = spouseInfo.isDeceased
          ? `${truncate(spouseInfo.name, 16)} ${deceasedMark}`
          : truncate(spouseInfo.name, 18);
        const spouseText = t("tree.spouseLabel", { name: spouseNameWithMark });
        card
          .append("text")
          .attr("x", 50)
          .attr("y", person.nickname ? 52 : 48)
          .attr("font-size", 9)
          .attr("fill", "oklch(0.55 0.02 55)")
          .text(spouseText);
      }

      // ---- Generation number in top-right corner (replaces old ✝ marker) ----
      const genText = t("tree.genLabel", { n: person.generation });
      card
        .append("text")
        .attr("x", NODE_W - 8)
        .attr("y", 14)
        .attr("text-anchor", "end")
        .attr("font-size", 9)
        .attr("font-weight", 500)
        .attr("fill", "oklch(0.55 0.02 55)")
        .text(genText);
    }

    // Zoom & pan
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3])
      .on("zoom", (event) => {
        root.attr("transform", event.transform.toString());
      });

    svg.call(zoom as any);

    // ---- Center and scale to fit the screen ----
    // Remove the scale cap of 1 so even small trees fill the viewport.
    // Cap at 2.5 to avoid over-zooming on tiny trees.
    const padding = 40;
    const availW = Math.max(size.width - padding * 2, 100);
    const availH = Math.max(size.height - padding * 2, 100);
    const scale = Math.min(availW / width, availH / height, 2.5);
    const tx = (size.width - width * scale) / 2;
    const ty = (size.height - height * scale) / 2;
    if (scale > 0 && isFinite(scale)) {
      svg.call(
        zoom.transform as any,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      );
    }

    onReady?.(svgEl, width, height);
     
  }, [data, selectedId, size.width, size.height, t]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <svg
        ref={setSvgRef}
        className="block h-full w-full"
        style={{ background: "transparent" }}
      />
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
