"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  UserPlus,
  TreePine,
} from "lucide-react";

interface TreeNode {
  id: string;
  fullName: string;
  nickname: string | null;
  gender: "MALE" | "FEMALE";
  birthDate: string | null;
  deathDate: string | null;
  isDeceased: boolean;
  photoPath: string | null;
  birthPlace: string | null;
  maritalStatus: string;
  spouse: {
    id: string;
    fullName: string;
    nickname: string | null;
    gender: "MALE" | "FEMALE";
    birthDate: string | null;
    deathDate: string | null;
    isDeceased: boolean;
    photoPath: string | null;
    maritalStatus: string;
  } | null;
  children: TreeNode[];
  birthOrder: number | null;
}

interface D3Node extends d3.HierarchyPointNode<TreeNode> {
  data: TreeNode;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 70;
const SPOUSE_GAP = 10;
const COUPLE_WIDTH = NODE_WIDTH * 2 + SPOUSE_GAP;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { year: "numeric", month: "short" });
}

function getAge(birthDate: string | null, deathDate: string | null): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const end = deathDate ? new Date(deathDate) : new Date();
  const age = end.getFullYear() - birth.getFullYear();
  return `${age} tahun`;
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.substring(0, maxLen) + "..." : str;
}

export function TreeVisualization() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const setSelectedPersonId = useAppStore((s) => s.setSelectedPersonId);
  const canCreate = useAppStore((s) => s.canCreate);

  const { data: treeData, isLoading, error, refetch } = useQuery<TreeNode>({
    queryKey: ["tree"],
    queryFn: () => fetch("/api/tree").then((r) => {
      if (!r.ok) throw new Error("Gagal memuat data pohon");
      return r.json();
    }),
  });

  const drawTree = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !treeData) return;

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      svg.attr("width", width).attr("height", height);

      const g = svg.append("g");

      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });

      svg.call(zoom);
      zoomRef.current = zoom;

      const root = d3.hierarchy(treeData, (d) => d.children);

      const treeLayout = d3.tree<TreeNode>().nodeSize([COUPLE_WIDTH + 30, 120]);
      treeLayout(root);

      // Draw links
      g.selectAll<SVGPathElement, d3.HierarchyPointLink<TreeNode>>(".link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("fill", "none")
        .attr("stroke", "#d4a373")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.6)
        .attr("d", (d) => {
          const sx = d.source.x;
          const sy = d.source.y + NODE_HEIGHT / 2;
          const tx = d.target.x;
          const ty = d.target.y - NODE_HEIGHT / 2;
          const midY = (sy + ty) / 2;
          return `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
        });

      // Draw nodes
      const nodes = g
        .selectAll<SVGGElement, D3Node>(".node")
        .data(root.descendants() as D3Node[])
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x - COUPLE_WIDTH / 2}, ${d.y - NODE_HEIGHT / 2})`)
        .style("cursor", "pointer")
        .on("click", (_event, d) => {
          if (d.data.id !== "virtual-root") {
            setSelectedNode(d.data);
          }
        });

      // Person card background
      nodes
        .append("rect")
        .attr("width", NODE_WIDTH)
        .attr("height", NODE_HEIGHT)
        .attr("rx", 10)
        .attr("ry", 10)
        .attr("fill", (d) => (d.data.gender === "MALE" ? "#fffbeb" : "#fdf2f8"))
        .attr("stroke", (d) => (d.data.gender === "MALE" ? "#d97706" : "#db2777"))
        .attr("stroke-width", 2)
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

      // Gender icon
      nodes
        .append("text")
        .attr("x", 12)
        .attr("y", 20)
        .attr("font-size", "12px")
        .text((d) => (d.data.gender === "MALE" ? "♂" : "♀"))
        .attr("fill", (d) => (d.data.gender === "MALE" ? "#d97706" : "#db2777"));

      // Name
      nodes
        .append("text")
        .attr("x", 26)
        .attr("y", 20)
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .attr("fill", (d) => (d.data.isDeceased ? "#9ca3af" : "#1f2937"))
        .text((d) => truncate(d.data.fullName, 18))
        .append("title")
        .text((d) => d.data.fullName);

      // Nickname (only for nodes that have one)
      nodes
        .filter((d) => d.data.nickname)
        .append("text")
        .attr("x", 12)
        .attr("y", 36)
        .attr("font-size", "9px")
        .attr("fill", "#9ca3af")
        .text((d) => `"${d.data.nickname}"`);

      // Birth/Death dates
      nodes
        .filter((d) => d.data.birthDate || d.data.deathDate)
        .append("text")
        .attr("x", 12)
        .attr("y", 50)
        .attr("font-size", "8px")
        .attr("fill", "#9ca3af")
        .text((d) => {
          const birth = formatDate(d.data.birthDate);
          const death = d.data.deathDate ? ` ✝ ${formatDate(d.data.deathDate)}` : "";
          return `${birth}${death}`;
        });

      // Birth place
      nodes
        .filter((d) => d.data.birthPlace)
        .append("text")
        .attr("x", 12)
        .attr("y", 62)
        .attr("font-size", "8px")
        .attr("fill", "#b45309")
        .text((d) => `📍 ${d.data.birthPlace}`);

      // Deceased indicator
      nodes
        .filter((d) => d.data.isDeceased)
        .append("rect")
        .attr("x", NODE_WIDTH - 24)
        .attr("y", 4)
        .attr("width", 20)
        .attr("height", 14)
        .attr("rx", 3)
        .attr("fill", "#ef4444")
        .attr("opacity", 0.8);

      nodes
        .filter((d) => d.data.isDeceased)
        .append("text")
        .attr("x", NODE_WIDTH - 19)
        .attr("y", 14)
        .attr("font-size", "7px")
        .attr("fill", "white")
        .attr("font-weight", "600")
        .text("✝");

      // Draw spouse
      nodes
        .filter((d) => d.data.spouse)
        .each(function (d) {
          const node = d3.select(this);
          const spouse = d.data.spouse!;
          const spouseX = NODE_WIDTH + SPOUSE_GAP;

          // Connection line
          node
            .append("line")
            .attr("x1", NODE_WIDTH)
            .attr("y1", NODE_HEIGHT / 2)
            .attr("x2", spouseX)
            .attr("y2", NODE_HEIGHT / 2)
            .attr("stroke", "#e11d48")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,2");

          // Heart
          node
            .append("text")
            .attr("x", NODE_WIDTH + SPOUSE_GAP / 2)
            .attr("y", NODE_HEIGHT / 2 + 4)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .text("♥")
            .attr("fill", "#e11d48");

          // Spouse card
          node
            .append("rect")
            .attr("x", spouseX)
            .attr("width", NODE_WIDTH)
            .attr("height", NODE_HEIGHT)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", spouse.gender === "FEMALE" ? "#fdf2f8" : "#fffbeb")
            .attr("stroke", spouse.gender === "FEMALE" ? "#db2777" : "#d97706")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "6,3")
            .style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.08))");

          // Spouse gender icon
          node
            .append("text")
            .attr("x", spouseX + 12)
            .attr("y", 20)
            .attr("font-size", "12px")
            .text(spouse.gender === "FEMALE" ? "♀" : "♂")
            .attr("fill", spouse.gender === "FEMALE" ? "#db2777" : "#d97706");

          // Spouse name
          node
            .append("text")
            .attr("x", spouseX + 26)
            .attr("y", 20)
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .attr("fill", spouse.isDeceased ? "#9ca3af" : "#6b7280")
            .text(truncate(spouse.fullName, 18));

          // Spouse nickname
          if (spouse.nickname) {
            node
              .append("text")
              .attr("x", spouseX + 12)
              .attr("y", 36)
              .attr("font-size", "9px")
              .attr("fill", "#9ca3af")
              .text(`"${spouse.nickname}"`);
          }

          // Spouse dates
          node
            .append("text")
            .attr("x", spouseX + 12)
            .attr("y", 50)
            .attr("font-size", "8px")
            .attr("fill", "#9ca3af")
            .text(() => {
              const birth = formatDate(spouse.birthDate);
              const death = spouse.deathDate ? ` ✝ ${formatDate(spouse.deathDate)}` : "";
              return `${birth}${death}`;
            });
        });

      // Initial zoom to fit
      const svgEl = svgRef.current;
      const bounds = (g.node() as SVGGElement)?.getBBox();
      if (bounds && bounds.width > 0 && bounds.height > 0) {
        const fullWidth = bounds.width;
        const fullHeight = bounds.height;
        const midX = bounds.x + fullWidth / 2;
        const midY = bounds.y + fullHeight / 2;
        const scale = 0.8 / Math.max(fullWidth / width, fullHeight / height);
        const translate = [width / 2 - scale * midX, 40 - scale * midY];

        d3.select(svgEl)
          .transition()
          .duration(500)
          .call(
            zoom.transform,
            d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
          );
      }
    } catch (err) {
      console.error("Error drawing tree:", err);
    }
  }, [treeData]);

  useEffect(() => {
    drawTree();
    const handleResize = () => drawTree();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawTree]);

  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, 0.7);
    }
  };

  const handleFit = () => {
    drawTree();
  };

  const handleNodeClick = (personId: string) => {
    setSelectedPersonId(personId);
    setActiveView("person-detail");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-3" />
          <p className="text-amber-700">Memuat pohon keluarga...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-2">Gagal memuat data pohon keluarga</p>
          <p className="text-sm text-muted-foreground mb-4">
            Pastikan data sudah di-seed. Klik &quot;Seed Data Awal&quot; di sidebar.
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  if (!treeData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <TreePine className="w-16 h-16 text-amber-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-amber-900 mb-2">
            Belum Ada Data Pohon Keluarga
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Mulai dengan menambahkan anggota keluarga atau klik &quot;Seed Data Awal&quot; di sidebar
            untuk memuat data contoh.
          </p>
          {canCreate() && (
            <Button
              onClick={() => setActiveView("person-form")}
              className="bg-amber-700 hover:bg-amber-800"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Tambah Anggota Pertama
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          className="bg-white/90 shadow-md hover:bg-amber-50"
          onClick={handleZoomIn}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="bg-white/90 shadow-md hover:bg-amber-50"
          onClick={handleZoomOut}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="bg-white/90 shadow-md hover:bg-amber-50"
          onClick={handleFit}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 bg-white/90 rounded-lg shadow-md p-3 text-xs">
        <p className="font-semibold text-amber-900 mb-1.5">Keterangan:</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm border-2 border-amber-600 bg-amber-50" />
            <span className="text-muted-foreground">Laki-laki</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm border-2 border-pink-600 bg-pink-50" />
            <span className="text-muted-foreground">Perempuan</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm border-2 border-dashed border-pink-600 bg-pink-50" />
            <span className="text-muted-foreground">Pasangan (Boru)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm bg-red-500 text-white text-[7px] flex items-center justify-center font-bold">✝</div>
            <span className="text-muted-foreground">Telah Meninggal</span>
          </div>
        </div>
      </div>

      {/* SVG */}
      <svg ref={svgRef} className="w-full h-full" />

      {/* Node Detail Popup */}
      {selectedNode && selectedNode.id !== "virtual-root" && (
        <div className="absolute bottom-4 right-4 z-10 w-80 bg-white rounded-xl shadow-xl border border-amber-200/50 p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold text-amber-900">{selectedNode.fullName}</h3>
              {selectedNode.nickname && (
                <p className="text-sm text-amber-600">&quot;{selectedNode.nickname}&quot;</p>
              )}
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Jenis Kelamin: </span>
              {selectedNode.gender === "MALE" ? "Laki-laki" : "Perempuan"}
            </p>
            {selectedNode.birthDate && (
              <p>
                <span className="text-muted-foreground">Lahir: </span>
                {formatDate(selectedNode.birthDate)}
                {selectedNode.birthPlace && ` di ${selectedNode.birthPlace}`}
                {` (${getAge(selectedNode.birthDate, selectedNode.deathDate)})`}
              </p>
            )}
            {selectedNode.isDeceased && selectedNode.deathDate && (
              <p>
                <span className="text-muted-foreground">Wafat: </span>
                {formatDate(selectedNode.deathDate)}
              </p>
            )}
            {selectedNode.spouse && (
              <p>
                <span className="text-muted-foreground">Pasangan: </span>
                {selectedNode.spouse.fullName}
              </p>
            )}
          </div>
          <Button
            className="w-full mt-3 bg-amber-700 hover:bg-amber-800"
            size="sm"
            onClick={() => handleNodeClick(selectedNode.id)}
          >
            Lihat Detail Lengkap
          </Button>
        </div>
      )}
    </div>
  );
}