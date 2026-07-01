"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  UserPlus,
  TreePine,
  Search,
  Camera,
  FileDown,
  ChevronDown,
  ArrowDownUp,
  ArrowRightLeft,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";
import { getCSSVar } from "@/lib/theme-config";
import type { TreeLayoutType } from "@/lib/theme-config";

interface SpouseData {
  id: string;
  fullName: string;
  nickname: string | null;
  gender: "MALE" | "FEMALE";
  birthDate: string | null;
  deathDate: string | null;
  isDeceased: boolean;
  photoPath: string | null;
  maritalStatus: string;
  marriageStatus?: "AKTIF" | "DUDA/JANDA";
}

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
  spouse: SpouseData | null;
  children: TreeNode[];
  birthOrder: number | null;
}

interface D3Node extends d3.HierarchyPointNode<TreeNode> {
  data: TreeNode;
}

interface SearchMatch {
  id: string;
  fullName: string;
  nickname: string | null;
  gender: "MALE" | "FEMALE";
}

// Card dimensions
const CARD_WIDTH = 180;
const CARD_HEIGHT = 52;
const CARD_GAP = 30;

const ROMAN_NUMERALS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

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

function getGenerationLabel(depth: number, isVirtualRoot: boolean): string {
  const gen = isVirtualRoot ? depth : depth + 1;
  return gen <= 10 ? `Gen ${ROMAN_NUMERALS[gen]}` : `Gen ${gen}`;
}

function collectAllNodes(node: TreeNode): TreeNode[] {
  const result: TreeNode[] = [node];
  if (node.children) {
    for (const child of node.children) {
      result.push(...collectAllNodes(child));
    }
  }
  return result;
}

// Helper to get themed colors at runtime for D3.js SVG
function tc(varName: string, fallback: string = ""): string {
  return getCSSVar(varName) || fallback;
}

type PdfSize = "normal" | "besar" | "multiple";

const layoutOptions: { key: TreeLayoutType; label: string; icon: React.ReactNode }[] = [
  { key: "vertical", label: "Vertikal", icon: <ArrowDownUp className="w-3.5 h-3.5" /> },
  { key: "horizontal", label: "Horizontal", icon: <ArrowRightLeft className="w-3.5 h-3.5" /> },
  { key: "radial", label: "Radial", icon: <CircleDot className="w-3.5 h-3.5" /> },
];

export function TreeVisualization() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const setSelectedPersonId = useAppStore((s) => s.setSelectedPersonId);
  const canCreate = useAppStore((s) => s.canCreate);
  const treeLayout = useAppStore((s) => s.treeLayout);
  const setTreeLayout = useAppStore((s) => s.setTreeLayout);

  const { data: treeData, isLoading, error, refetch } = useQuery<TreeNode>({
    queryKey: ["tree"],
    queryFn: () => fetch("/api/tree").then((r) => {
      if (!r.ok) throw new Error("Gagal memuat data pohon");
      return r.json();
    }),
  });

  const isVirtualRoot = treeData?.id === "virtual-root";

  const allNodes = useMemo(() => {
    if (!treeData) return [];
    return collectAllNodes(treeData).filter((n) => n.id !== "virtual-root");
  }, [treeData]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const term = searchTerm.toLowerCase().trim();
    const matches = allNodes
      .filter(
        (n) =>
          n.fullName.toLowerCase().includes(term) ||
          (n.nickname && n.nickname.toLowerCase().includes(term))
      )
      .slice(0, 5)
      .map((n) => ({
        id: n.id,
        fullName: n.fullName,
        nickname: n.nickname,
        gender: n.gender,
      }));
    setSearchResults(matches);
  }, [searchTerm, allNodes]);

  const zoomToNode = useCallback((personId: string) => {
    if (!svgRef.current || !zoomRef.current || !treeData) return;
    const pos = nodePositionsRef.current.get(personId);
    if (!pos) return;

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    d3.select(svgRef.current)
      .transition()
      .duration(750)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity
          .translate(width / 2 - pos.x * 1.5, height / 2 - pos.y * 1.5)
          .scale(1.5)
      );

    setHighlightedNodeId(personId);
    setSearchResults([]);
    setSearchTerm("");
  }, [treeData]);

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

      // Read themed colors
      const cLink = tc("--t-link", "#D4A574");
      const cLinkOpacity = parseFloat(tc("--t-link-opacity", "0.6"));
      const cPrimary = tc("--t-primary", "#7F1D1D");
      const cFemale = tc("--t-female", "#991B1B");
      const cText = tc("--t-text", "#3E2723");
      const cCard = tc("--t-bg-card", "#FFF8F0");
      const cAccent = tc("--t-accent", "#B8860B");
      const cHighlight = tc("--t-highlight", "#DAA520");

      if (treeLayout === "radial") {
        // === RADIAL LAYOUT ===
        const radius = 300;
        const treeLayoutR = d3.tree<TreeNode>().size([2 * Math.PI, radius]);
        treeLayoutR(root);

        // Store positions
        const positions = new Map<string, { x: number; y: number }>();
        root.descendants().forEach((d) => {
          const angle = d.x - Math.PI / 2;
          positions.set(d.data.id, {
            x: Math.cos(angle) * d.y,
            y: Math.sin(angle) * d.y,
          });
        });
        nodePositionsRef.current = positions;

        // Links
        g.selectAll<SVGPathElement, d3.HierarchyPointLink<TreeNode>>(".link")
          .data(root.links())
          .enter()
          .append("path")
          .attr("class", "link")
          .attr("fill", "none")
          .attr("stroke", cLink)
          .attr("stroke-width", 1.5)
          .attr("stroke-opacity", cLinkOpacity)
          .attr("d", (d) => {
            const sx = Math.cos(d.source.x - Math.PI / 2) * d.source.y;
            const sy = Math.sin(d.source.x - Math.PI / 2) * d.source.y;
            const tx = Math.cos(d.target.x - Math.PI / 2) * d.target.y;
            const ty = Math.sin(d.target.x - Math.PI / 2) * d.target.y;
            const midR = (d.source.y + d.target.y) / 2;
            const mx = Math.cos(d.source.x - Math.PI / 2) * midR;
            const my = Math.sin(d.source.x - Math.PI / 2) * midR;
            return `M ${sx} ${sy} Q ${mx} ${my}, ${tx} ${ty}`;
          });

        // Nodes
        const nodes = g
          .selectAll<SVGGElement, D3Node>(".node")
          .data(root.descendants() as D3Node[])
          .enter()
          .append("g")
          .attr("class", "node")
          .attr("transform", (d) => {
            const pos = positions.get(d.data.id)!;
            return `translate(${pos.x - CARD_WIDTH / 2}, ${pos.y - CARD_HEIGHT / 2})`;
          })
          .style("cursor", "pointer")
          .on("click", (_event, d) => {
            if (d.data.id !== "virtual-root") setSelectedNode(d.data);
          });

        drawCards(nodes, cPrimary, cFemale, cText, cCard, cAccent, isVirtualRoot);

        // Highlight
        drawHighlight(nodes, cHighlight);

      } else if (treeLayout === "horizontal") {
        // === HORIZONTAL LAYOUT ===
        const treeLayoutH = d3.tree<TreeNode>().nodeSize([CARD_HEIGHT + 60, CARD_WIDTH + CARD_GAP]);
        treeLayoutH(root);

        const positions = new Map<string, { x: number; y: number }>();
        root.descendants().forEach((d) => {
          positions.set(d.data.id, { x: d.y, y: d.x });
        });
        nodePositionsRef.current = positions;

        // Links (left to right)
        g.selectAll<SVGPathElement, d3.HierarchyPointLink<TreeNode>>(".link")
          .data(root.links())
          .enter()
          .append("path")
          .attr("class", "link")
          .attr("fill", "none")
          .attr("stroke", cLink)
          .attr("stroke-width", 2)
          .attr("stroke-opacity", cLinkOpacity)
          .attr("d", (d) => {
            const sy = d.source.y;
            const sx = d.source.x + (CARD_WIDTH + CARD_GAP) / 2;
            const ty = d.target.y;
            const tx = d.target.x - (CARD_WIDTH + CARD_GAP) / 2;
            const midX = (sx + tx) / 2;
            return `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`;
          });

        const nodes = g
          .selectAll<SVGGElement, D3Node>(".node")
          .data(root.descendants() as D3Node[])
          .enter()
          .append("g")
          .attr("class", "node")
          .attr("transform", (d) => {
            const pos = positions.get(d.data.id)!;
            return `translate(${pos.x - CARD_WIDTH / 2}, ${pos.y - CARD_HEIGHT / 2})`;
          })
          .style("cursor", "pointer")
          .on("click", (_event, d) => {
            if (d.data.id !== "virtual-root") setSelectedNode(d.data);
          });

        drawCards(nodes, cPrimary, cFemale, cText, cCard, cAccent, isVirtualRoot);
        drawHighlight(nodes, cHighlight);

      } else {
        // === VERTICAL LAYOUT (default) ===
        const treeLayoutV = d3.tree<TreeNode>().nodeSize([CARD_WIDTH + CARD_GAP, 130]);
        treeLayoutV(root);

        const positions = new Map<string, { x: number; y: number }>();
        root.descendants().forEach((d) => {
          positions.set(d.data.id, { x: d.x, y: d.y });
        });
        nodePositionsRef.current = positions;

        // Links
        g.selectAll<SVGPathElement, d3.HierarchyPointLink<TreeNode>>(".link")
          .data(root.links())
          .enter()
          .append("path")
          .attr("class", "link")
          .attr("fill", "none")
          .attr("stroke", cLink)
          .attr("stroke-width", 2)
          .attr("stroke-opacity", cLinkOpacity)
          .attr("d", (d) => {
            const sx = d.source.x;
            const sy = d.source.y + CARD_HEIGHT / 2;
            const tx = d.target.x;
            const ty = d.target.y - CARD_HEIGHT / 2;
            const midY = (sy + ty) / 2;
            return `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
          });

        const nodes = g
          .selectAll<SVGGElement, D3Node>(".node")
          .data(root.descendants() as D3Node[])
          .enter()
          .append("g")
          .attr("class", "node")
          .attr("transform", (d) => {
            return `translate(${d.x - CARD_WIDTH / 2}, ${d.y - CARD_HEIGHT / 2})`;
          })
          .style("cursor", "pointer")
          .on("click", (_event, d) => {
            if (d.data.id !== "virtual-root") setSelectedNode(d.data);
          });

        drawCards(nodes, cPrimary, cFemale, cText, cCard, cAccent, isVirtualRoot);
        drawHighlight(nodes, cHighlight);
      }

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
  }, [treeData, highlightedNodeId, isVirtualRoot, treeLayout]);

  // Draw card content for each node (shared across all layouts)
  function drawCards(
    nodes: d3.Selection<SVGGElement, D3Node, SVGGElement, unknown>,
    cPrimary: string,
    cFemale: string,
    cText: string,
    cCard: string,
    cAccent: string,
    isVRoot: boolean | undefined
  ) {
    nodes.each(function (d) {
      const node = d3.select(this);
      if (d.data.id === "virtual-root") return;

      // Card background
      node
        .append("rect")
        .attr("width", CARD_WIDTH)
        .attr("height", CARD_HEIGHT)
        .attr("rx", 12)
        .attr("ry", 12)
        .attr("fill", cCard)
        .attr("stroke", d.data.gender === "MALE" ? cPrimary : cFemale)
        .attr("stroke-width", 2)
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

      // Gender icon
      node
        .append("text")
        .attr("x", 10)
        .attr("y", 20)
        .attr("font-size", "12px")
        .text(d.data.gender === "MALE" ? "♂" : "♀")
        .attr("fill", d.data.gender === "MALE" ? cPrimary : cFemale);

      // Name + deceased mark
      const nameText = d.data.isDeceased
        ? `${truncate(d.data.fullName, 20)} ✝`
        : truncate(d.data.fullName, 22);
      node
        .append("text")
        .attr("x", 24)
        .attr("y", 20)
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .attr("fill", d.data.isDeceased ? "#9ca3af" : cText)
        .text(nameText)
        .append("title")
        .text(d.data.fullName + (d.data.isDeceased ? " (Meninggal)" : ""));

      // Nickname
      if (d.data.nickname) {
        node
          .append("text")
          .attr("x", 10)
          .attr("y", 35)
          .attr("font-size", "9px")
          .attr("fill", "#9ca3af")
          .text(`"${d.data.nickname}"`);
      }

      // Spouse line
      if (d.data.spouse) {
        const spLabel = d.data.spouse.isDeceased
          ? `Pasangan: ${truncate(d.data.spouse.fullName, 22)} ✝`
          : `Pasangan: ${truncate(d.data.spouse.fullName, 22)}`;
        node
          .append("text")
          .attr("x", 10)
          .attr("y", 47)
          .attr("font-size", "8px")
          .attr("fill", "#6b7280")
          .text(spLabel);
      }

      // Generation badge
      node
        .append("text")
        .attr("x", CARD_WIDTH - 8)
        .attr("y", CARD_HEIGHT - 6)
        .attr("text-anchor", "end")
        .attr("font-size", "7px")
        .attr("fill", cAccent)
        .attr("font-weight", "600")
        .text(getGenerationLabel(d.depth, !!isVRoot));
    });
  }

  function drawHighlight(
    nodes: d3.Selection<SVGGElement, D3Node, SVGGElement, unknown>,
    cHighlight: string
  ) {
    nodes
      .filter((d) => highlightedNodeId && d.data.id === highlightedNodeId)
      .each(function () {
        const node = d3.select(this);
        node
          .append("rect")
          .attr("x", -4)
          .attr("y", -4)
          .attr("width", CARD_WIDTH + 8)
          .attr("height", CARD_HEIGHT + 8)
          .attr("rx", 14)
          .attr("fill", "none")
          .attr("stroke", cHighlight)
          .attr("stroke-width", 3)
          .style("filter", "drop-shadow(0 0 6px rgba(218, 165, 32, 0.5))");
      });
  }

  useEffect(() => {
    drawTree();
    const handleResize = () => drawTree();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawTree]);

  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
    }
  };

  const handleFit = () => {
    drawTree();
  };

  const handleNodeClick = (personId: string) => {
    setSelectedPersonId(personId);
    setActiveView("person-detail");
  };

  const exportBg = () => tc("--t-export-bg", "#FDF6E3");

  // Export SVG
  const handleExportSvg = async () => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const bounds = svg.getBBox();
    const w = bounds.width + bounds.x * 2 + 40;
    const h = bounds.height + bounds.y * 2 + 40;
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));
    clone.setAttribute("viewBox", `${bounds.x - 20} ${bounds.y - 20} ${w} ${h}`);
    clone.style.backgroundColor = exportBg();
    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tarombo-hariandja.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Pohon keluarga berhasil diekspor sebagai SVG");
  };

  // Export PDF
  const handleExportPdf = async (size: PdfSize) => {
    if (!svgRef.current || !containerRef.current) return;
    setIsExporting(true);
    setShowPdfMenu(false);

    try {
      const svg = svgRef.current;
      const bounds = svg.getBBox();
      const bg = exportBg();

      const exportDiv = document.createElement("div");
      exportDiv.style.position = "fixed";
      exportDiv.style.left = "-9999px";
      exportDiv.style.top = "0";
      exportDiv.style.backgroundColor = bg;

      const clone = svg.cloneNode(true) as SVGSVGElement;
      const padding = 40;
      const svgWidth = bounds.width + Math.abs(bounds.x) * 2 + padding * 2;
      const svgHeight = bounds.height + Math.abs(bounds.y) * 2 + padding * 2;

      clone.setAttribute("width", String(svgWidth));
      clone.setAttribute("height", String(svgHeight));
      clone.setAttribute("viewBox", `${bounds.x - padding} ${bounds.y - padding} ${svgWidth} ${svgHeight}`);
      clone.style.backgroundColor = bg;
      clone.querySelector("g")?.setAttribute("transform", "");

      exportDiv.appendChild(clone);
      document.body.appendChild(exportDiv);

      const scale = size === "besar" ? 3 : 2;
      const dataUrl = await toPng(exportDiv, {
        width: svgWidth * scale,
        height: svgHeight * scale,
        pixelRatio: scale,
        backgroundColor: bg,
      });

      document.body.removeChild(exportDiv);

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      let pdfWidth: number;
      let pdfHeight: number;
      let orientation: "portrait" | "landscape" = "landscape";

      if (size === "besar") {
        pdfWidth = 420;
        pdfHeight = 297;
      } else {
        pdfWidth = 297;
        pdfHeight = 210;
      }

      const pdf = new jsPDF({ orientation, unit: "mm", format: [pdfWidth, pdfHeight] });
      const margin = 10;
      const availW = pdfWidth - margin * 2;
      const availH = pdfHeight - margin * 2;
      const imgAspect = img.width / img.height;
      const pageAspect = availW / availH;

      let drawW: number, drawH: number;
      if (imgAspect > pageAspect) { drawW = availW; drawH = availW / imgAspect; }
      else { drawH = availH; drawW = availH * imgAspect; }

      if (size === "multiple") {
        const totalImgHeightMM = (img.width / img.height) * availW;
        const pageHeightMM = pdfHeight - margin * 2;
        const numPages = Math.max(1, Math.ceil(totalImgHeightMM / pageHeightMM));

        if (numPages <= 1) {
          pdf.addImage(dataUrl, "PNG", margin + (availW - drawW) / 2, margin + (availH - drawH) / 2, drawW, drawH);
          addWatermarkToPdf(pdf, pdfWidth, pdfHeight, margin);
        } else {
          const sliceHeight = img.height / numPages;
          for (let i = 0; i < numPages; i++) {
            if (i > 0) pdf.addPage([pdfWidth, pdfHeight], orientation);
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = Math.ceil(sliceHeight) + 20;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, Math.max(0, i * sliceHeight - 10), img.width, Math.ceil(sliceHeight) + 20, 0, 0, canvas.width, canvas.height);
            const sliceDataUrl = canvas.toDataURL("image/png");
            const sliceAspect = canvas.width / canvas.height;
            let sW: number, sH: number;
            if (sliceAspect > pageAspect) { sW = availW; sH = availW / sliceAspect; }
            else { sH = availH; sW = availH * sliceAspect; }
            pdf.addImage(sliceDataUrl, "PNG", margin + (availW - sW) / 2, margin + (availH - sH) / 2, sW, sH);
            addWatermarkToPdf(pdf, pdfWidth, pdfHeight, margin);
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Halaman ${i + 1} / ${numPages}`, pdfWidth / 2, pdfHeight - 5, { align: "center" });
          }
        }
      } else {
        pdf.addImage(dataUrl, "PNG", margin + (availW - drawW) / 2, margin + (availH - drawH) / 2, drawW, drawH);
        addWatermarkToPdf(pdf, pdfWidth, pdfHeight, margin);
      }

      pdf.setFontSize(7);
      pdf.setTextColor(180, 180, 180);
      const dateStr = new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
      pdf.text(`Tarombo Marga Hariandja — Diekspor pada ${dateStr}`, pdfWidth / 2, pdfHeight - 3, { align: "center" });

      const sizeLabel = size === "besar" ? "besar" : size === "multiple" ? "multi-halaman" : "standar";
      pdf.save(`tarombo-hariandja-${sizeLabel}.pdf`);
      toast.success(`PDF (${sizeLabel}) berhasil diekspor`);
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Gagal mengekspor PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const addWatermarkToPdf = (pdf: jsPDF, w: number, h: number, margin: number) => {
    pdf.saveGraphicsState();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(32);
    pdf.setTextColor(230, 220, 210);
    const text = "TAROMBO MARGA HARIANDJA";
    const textWidth = pdf.getTextWidth(text);
    for (let y = margin; y < h - margin; y += 50) {
      for (let x = margin; x < w - margin; x += textWidth + 40) {
        pdf.text(text, x, y, { angle: -30 });
      }
    }
    pdf.restoreGraphicsState();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--t-primary)] mx-auto mb-3" />
          <p className="text-[var(--t-primary)]">Memuat pohon keluarga...</p>
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
          <Button onClick={() => refetch()} variant="outline">Coba Lagi</Button>
        </div>
      </div>
    );
  }

  if (!treeData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <TreePine className="w-16 h-16 text-[var(--t-border)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--t-text)] mb-2">Belum Ada Data Pohon Keluarga</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Mulai dengan menambahkan anggota keluarga atau klik &quot;Seed Data Awal&quot; di sidebar
          </p>
          {canCreate() && (
            <Button onClick={() => setActiveView("person-form")} className="bg-[var(--t-primary)] hover:bg-[var(--t-primary-light)]">
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
        {/* Layout Type Selector */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/90 shadow-md hover:bg-[var(--t-bg-warm)] gap-1.5"
            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
          >
            {treeLayout === "vertical" && <ArrowDownUp className="w-4 h-4" />}
            {treeLayout === "horizontal" && <ArrowRightLeft className="w-4 h-4" />}
            {treeLayout === "radial" && <CircleDot className="w-4 h-4" />}
            <span className="hidden sm:inline text-xs capitalize">{treeLayout}</span>
            <ChevronDown className="w-3 h-3" />
          </Button>
          {showLayoutMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-[var(--t-border)]/50 py-1 min-w-[150px] z-20">
              {layoutOptions.map((l) => (
                <button
                  key={l.key}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                    treeLayout === l.key ? "bg-[var(--t-bg-warm)] font-medium" : "hover:bg-[var(--t-bg-warm)]/50"
                  }`}
                  onClick={() => { setTreeLayout(l.key); setShowLayoutMenu(false); }}
                >
                  {l.icon}
                  {l.label}
                  {treeLayout === l.key && <span className="ml-auto text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PDF Export */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/90 shadow-md hover:bg-[var(--t-bg-warm)] gap-1.5"
            onClick={() => setShowPdfMenu(!showPdfMenu)}
            disabled={isExporting}
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            PDF
            <ChevronDown className="w-3 h-3" />
          </Button>
          {showPdfMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-[var(--t-border)]/50 py-1 min-w-[180px] z-20">
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--t-bg-warm)] transition-colors" onClick={() => handleExportPdf("normal")}>
                📄 PDF Standar (A4)
              </button>
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--t-bg-warm)] transition-colors" onClick={() => handleExportPdf("besar")}>
                📐 PDF Besar (A3)
              </button>
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--t-bg-warm)] transition-colors" onClick={() => handleExportPdf("multiple")}>
                📑 PDF Multi-Halaman
              </button>
            </div>
          )}
        </div>

        <Button variant="outline" size="icon" className="bg-white/90 shadow-md hover:bg-[var(--t-bg-warm)]" onClick={handleExportSvg} title="Ekspor SVG">
          <Camera className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" className="bg-white/90 shadow-md hover:bg-[var(--t-bg-warm)]" onClick={handleZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" className="bg-white/90 shadow-md hover:bg-[var(--t-bg-warm)]" onClick={handleZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" className="bg-white/90 shadow-md hover:bg-[var(--t-bg-warm)]" onClick={handleFit}>
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 bg-white/90 rounded-lg shadow-md p-3 text-xs">
        <p className="font-semibold text-[var(--t-text)] mb-1.5">Keterangan:</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 rounded-sm border-2 border-[var(--t-primary)] bg-[var(--t-bg-warm)]" />
            <span className="text-muted-foreground">Laki-laki</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 rounded-sm border-2 border-[var(--t-female)] bg-[var(--t-bg-warm)]" />
            <span className="text-muted-foreground">Perempuan</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm bg-red-500 text-white text-[7px] flex items-center justify-center font-bold">✝</div>
            <span className="text-muted-foreground">Telah Meninggal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--t-accent)] text-xs">Gen I, II...</span>
            <span className="text-muted-foreground">Generasi</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="absolute top-[200px] left-3 z-10 w-56">
        <div className="bg-white/90 rounded-lg shadow-md p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari anggota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs border-[var(--t-border)]"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-1 max-h-40 overflow-y-auto bg-white rounded-md border border-[var(--t-border)] shadow-sm">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--t-bg-warm)] transition-colors flex items-center gap-2"
                  onClick={() => zoomToNode(r.id)}
                >
                  <span>{r.gender === "MALE" ? "♂" : "♀"}</span>
                  <span className="truncate">{r.fullName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SVG */}
      <svg ref={svgRef} className="w-full h-full" />

      {/* Node Detail Popup */}
      {selectedNode && selectedNode.id !== "virtual-root" && (
        <div className="absolute bottom-4 right-4 z-10 w-80 bg-white rounded-xl shadow-xl border border-[var(--t-border)]/50 p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold text-[var(--t-text)]">{selectedNode.fullName}</h3>
              {selectedNode.nickname && (
                <p className="text-sm text-[var(--t-text-sec)]">&quot;{selectedNode.nickname}&quot;</p>
              )}
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground p-1">✕</button>
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Jenis Kelamin: </span>{selectedNode.gender === "MALE" ? "Laki-laki" : "Perempuan"}</p>
            {selectedNode.birthDate && (
              <p>
                <span className="text-muted-foreground">Lahir: </span>
                {formatDate(selectedNode.birthDate)}
                {selectedNode.birthPlace && ` di ${selectedNode.birthPlace}`}
                {` (${getAge(selectedNode.birthDate, selectedNode.deathDate)})`}
              </p>
            )}
            {selectedNode.isDeceased && selectedNode.deathDate && (
              <p><span className="text-muted-foreground">Wafat: </span>{formatDate(selectedNode.deathDate)}</p>
            )}
            {selectedNode.spouse && (
              <p><span className="text-muted-foreground">Pasangan: </span>{selectedNode.spouse.fullName}</p>
            )}
          </div>
          <Button className="w-full mt-3 bg-[var(--t-primary)] hover:bg-[var(--t-primary-light)]" size="sm" onClick={() => handleNodeClick(selectedNode.id)}>
            Lihat Detail Lengkap
          </Button>
        </div>
      )}
    </div>
  );
}