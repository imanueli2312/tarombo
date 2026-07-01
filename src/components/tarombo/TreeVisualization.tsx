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
} from "lucide-react";
import { toast } from "sonner";
import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";

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
const SINGLE_WIDTH = 180;
const SINGLE_HEIGHT = 50;
const COUPLE_WIDTH = 320;
const COUPLE_HEIGHT = 50;
const SPOUSE_LINE_X = 155; // x position of divider line within couple card
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

type PdfSize = "normal" | "besar" | "multiple";

function getCardWidth(d: D3Node): number {
  return d.data.spouse ? COUPLE_WIDTH : SINGLE_WIDTH;
}

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

      const treeLayout = d3.tree<TreeNode>().nodeSize([COUPLE_WIDTH + CARD_GAP, 130]);
      treeLayout(root);

      // Store node positions
      const positions = new Map<string, { x: number; y: number }>();
      root.descendants().forEach((d) => {
        positions.set(d.data.id, { x: d.x, y: d.y });
      });
      nodePositionsRef.current = positions;

      // Draw links
      g.selectAll<SVGPathElement, d3.HierarchyPointLink<TreeNode>>(".link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("fill", "none")
        .attr("stroke", "#D4A574")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.6)
        .attr("d", (d) => {
          const sx = d.source.x;
          const sy = d.source.y + (d.source.data.spouse ? COUPLE_HEIGHT / 2 : SINGLE_HEIGHT / 2);
          const tx = d.target.x;
          const ty = d.target.y - (d.target.data.spouse ? COUPLE_HEIGHT / 2 : SINGLE_HEIGHT / 2);
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
        .attr("transform", (d) => {
          const cw = getCardWidth(d);
          const ch = d.data.spouse ? COUPLE_HEIGHT : SINGLE_HEIGHT;
          return `translate(${d.x - cw / 2}, ${d.y - ch / 2})`;
        })
        .style("cursor", "pointer")
        .on("click", (_event, d) => {
          if (d.data.id !== "virtual-root") {
            setSelectedNode(d.data);
          }
        });

      // For each node, draw combined couple card or single card
      nodes.each(function (d) {
        const node = d3.select(this);
        const hasSpouse = !!d.data.spouse;
        const cw = hasSpouse ? COUPLE_WIDTH : SINGLE_WIDTH;
        const ch = hasSpouse ? COUPLE_HEIGHT : SINGLE_HEIGHT;
        const isVirtual = d.data.id === "virtual-root";

        if (isVirtual) return;

        // === Card background ===
        node
          .append("rect")
          .attr("width", cw)
          .attr("height", ch)
          .attr("rx", 12)
          .attr("ry", 12)
          .attr("fill", "#FFF8F0")
          .attr("stroke", d.data.gender === "MALE" ? "#7F1D1D" : "#991B1B")
          .attr("stroke-width", 2)
          .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

        if (hasSpouse) {
          // === COUPLE CARD ===
          const spouse = d.data.spouse!;

          // Left person background (subtle)
          node
            .append("rect")
            .attr("x", 1)
            .attr("y", 1)
            .attr("width", SPOUSE_LINE_X - 1)
            .attr("height", ch - 2)
            .attr("rx", 11)
            .attr("fill", "rgba(127, 29, 29, 0.03)");

          // Divider line
          node
            .append("line")
            .attr("x1", SPOUSE_LINE_X)
            .attr("y1", 6)
            .attr("x2", SPOUSE_LINE_X)
            .attr("y2", ch - 6)
            .attr("stroke", "#D4A574")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "3,3");

          // Heart at center divider
          node
            .append("text")
            .attr("x", SPOUSE_LINE_X)
            .attr("y", ch / 2 + 4)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .text("♥")
            .attr("fill", "#991B1B");

          // Left: Main person - Gender icon
          node
            .append("text")
            .attr("x", 10)
            .attr("y", 20)
            .attr("font-size", "12px")
            .text(d.data.gender === "MALE" ? "♂" : "♀")
            .attr("fill", d.data.gender === "MALE" ? "#7F1D1D" : "#991B1B");

          // Name + deceased mark
          const mainNameText = d.data.isDeceased
            ? `${truncate(d.data.fullName, 15)} ✝`
            : truncate(d.data.fullName, 17);
          node
            .append("text")
            .attr("x", 24)
            .attr("y", 20)
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .attr("fill", d.data.isDeceased ? "#9ca3af" : "#3E2723")
            .text(mainNameText)
            .append("title")
            .text(d.data.fullName + (d.data.isDeceased ? " (Meninggal)" : ""));

          // Nickname
          if (d.data.nickname) {
            node
              .append("text")
              .attr("x", 10)
              .attr("y", 36)
              .attr("font-size", "9px")
              .attr("fill", "#9ca3af")
              .text(`"${d.data.nickname}"`);
          }

          // Right: Spouse - Gender icon
          const spX = SPOUSE_LINE_X + 10;
          node
            .append("text")
            .attr("x", spX)
            .attr("y", 20)
            .attr("font-size", "12px")
            .text(spouse.gender === "FEMALE" ? "♀" : "♂")
            .attr("fill", spouse.gender === "FEMALE" ? "#991B1B" : "#7F1D1D");

          // Spouse name + deceased mark
          const spNameText = spouse.isDeceased
            ? `${truncate(spouse.fullName, 13)} ✝`
            : truncate(spouse.fullName, 15);
          node
            .append("text")
            .attr("x", spX + 14)
            .attr("y", 20)
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .attr("fill", spouse.isDeceased ? "#9ca3af" : "#6b7280")
            .text(spNameText)
            .append("title")
            .text(spouse.fullName + (spouse.isDeceased ? " (Meninggal)" : ""));

          // Spouse nickname
          if (spouse.nickname) {
            node
              .append("text")
              .attr("x", spX)
              .attr("y", 36)
              .attr("font-size", "9px")
              .attr("fill", "#9ca3af")
              .text(`"${spouse.nickname}"`);
          }
        } else {
          // === SINGLE CARD ===
          // Gender icon
          node
            .append("text")
            .attr("x", 10)
            .attr("y", 18)
            .attr("font-size", "12px")
            .text(d.data.gender === "MALE" ? "♂" : "♀")
            .attr("fill", d.data.gender === "MALE" ? "#7F1D1D" : "#991B1B");

          // Name + deceased mark
          const nameText = d.data.isDeceased
            ? `${truncate(d.data.fullName, 20)} ✝`
            : truncate(d.data.fullName, 22);
          node
            .append("text")
            .attr("x", 24)
            .attr("y", 18)
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .attr("fill", d.data.isDeceased ? "#9ca3af" : "#3E2723")
            .text(nameText)
            .append("title")
            .text(d.data.fullName + (d.data.isDeceased ? " (Meninggal)" : ""));

          // Nickname
          if (d.data.nickname) {
            node
              .append("text")
              .attr("x", 10)
              .attr("y", 33)
              .attr("font-size", "9px")
              .attr("fill", "#9ca3af")
              .text(`"${d.data.nickname}"`);
          }

          // Spouse line (replaces dates/birthplace)
          if (d.data.spouse) {
            const spName = d.data.spouse.isDeceased
              ? `${d.data.spouse.fullName} ✝`
              : d.data.spouse.fullName;
            node
              .append("text")
              .attr("x", 10)
              .attr("y", 46)
              .attr("font-size", "8px")
              .attr("fill", "#6b7280")
              .text(`♥ ${truncate(spName, 25)}`);
          }
        }

        // Generation badge
        node
          .append("text")
          .attr("x", cw - 8)
          .attr("y", ch - 6)
          .attr("text-anchor", "end")
          .attr("font-size", "7px")
          .attr("fill", "#B8860B")
          .attr("font-weight", "600")
          .text(getGenerationLabel(d.depth, !!isVirtualRoot));
      });

      // Highlight for searched node
      nodes
        .filter((d) => highlightedNodeId && d.data.id === highlightedNodeId)
        .each(function (d) {
          const node = d3.select(this);
          const cw = getCardWidth(d);
          const ch = d.data.spouse ? COUPLE_HEIGHT : SINGLE_HEIGHT;
          node
            .append("rect")
            .attr("x", -4)
            .attr("y", -4)
            .attr("width", cw + 8)
            .attr("height", ch + 8)
            .attr("rx", 14)
            .attr("fill", "none")
            .attr("stroke", "#DAA520")
            .attr("stroke-width", 3)
            .style("filter", "drop-shadow(0 0 6px rgba(218, 165, 32, 0.5))");
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
  }, [treeData, highlightedNodeId, isVirtualRoot]);

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

  // Add watermark to a canvas context
  const addWatermark = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "rgba(127, 29, 29, 0.08)";
    ctx.textAlign = "center";
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 6);
    const gap = 200;
    for (let y = -h; y < h * 2; y += gap) {
      for (let x = -w; x < w * 2; x += gap * 2.5) {
        ctx.fillText("TAROMBO MARGA HARIANDJA", x, y);
      }
    }
    ctx.restore();
  };

  // Export SVG (unchanged)
  const handleExportSvg = async () => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const bounds = svg.getBBox();
    const width = bounds.width + bounds.x * 2 + 40;
    const height = bounds.height + bounds.y * 2 + 40;
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    clone.setAttribute("viewBox", `${bounds.x - 20} ${bounds.y - 20} ${width} ${height}`);
    clone.style.backgroundColor = "#FDF6E3";
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
      // First, capture the SVG as a high-res PNG using html-to-image
      const svg = svgRef.current;
      const bounds = svg.getBBox();

      // Create a temporary container for the export
      const exportDiv = document.createElement("div");
      exportDiv.style.position = "fixed";
      exportDiv.style.left = "-9999px";
      exportDiv.style.top = "0";
      exportDiv.style.backgroundColor = "#FDF6E3";

      const clone = svg.cloneNode(true) as SVGSVGElement;
      const padding = 40;
      const svgWidth = bounds.width + Math.abs(bounds.x) * 2 + padding * 2;
      const svgHeight = bounds.height + Math.abs(bounds.y) * 2 + padding * 2;

      clone.setAttribute("width", String(svgWidth));
      clone.setAttribute("height", String(svgHeight));
      clone.setAttribute("viewBox", `${bounds.x - padding} ${bounds.y - padding} ${svgWidth} ${svgHeight}`);
      clone.style.backgroundColor = "#FDF6E3";
      // Remove any zoom transforms for full export
      clone.querySelector("g")?.setAttribute("transform", "");

      exportDiv.appendChild(clone);
      document.body.appendChild(exportDiv);

      // Render at higher resolution for quality
      const scale = size === "besar" ? 3 : 2;
      const dataUrl = await toPng(exportDiv, {
        width: svgWidth * scale,
        height: svgHeight * scale,
        pixelRatio: scale,
        backgroundColor: "#FDF6E3",
      });

      document.body.removeChild(exportDiv);

      // Create image from data URL
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      // Determine PDF dimensions
      let pdfWidth: number;
      let pdfHeight: number;
      let orientation: "portrait" | "landscape" = "landscape";

      if (size === "besar") {
        pdfWidth = 420; // mm (A3 landscape)
        pdfHeight = 297;
        orientation = "landscape";
      } else {
        pdfWidth = 297; // mm (A4 landscape)
        pdfHeight = 210;
        orientation = "landscape";
      }

      const pdf = new jsPDF({
        orientation,
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      });

      // Calculate image dimensions to fit
      const margin = 10;
      const availW = pdfWidth - margin * 2;
      const availH = pdfHeight - margin * 2;

      const imgAspect = img.width / img.height;
      const pageAspect = availW / availH;

      let drawW: number, drawH: number;
      if (imgAspect > pageAspect) {
        drawW = availW;
        drawH = availW / imgAspect;
      } else {
        drawH = availH;
        drawW = availH * imgAspect;
      }

      if (size === "multiple") {
        // Multiple pages: split the tree vertically
        const totalImgHeightMM = (img.width / img.height) * availW;
        const pageHeightMM = pdfHeight - margin * 2;
        const numPages = Math.max(1, Math.ceil(totalImgHeightMM / pageHeightMM));

        if (numPages <= 1) {
          // Fits in one page
          const offsetX = margin + (availW - drawW) / 2;
          const offsetY = margin + (availH - drawH) / 2;
          pdf.addImage(dataUrl, "PNG", offsetX, offsetY, drawW, drawH);
          addWatermarkToPdf(pdf, pdfWidth, pdfHeight, margin);
        } else {
          // Split across pages
          const sliceHeight = img.height / numPages;
          for (let i = 0; i < numPages; i++) {
            if (i > 0) pdf.addPage([pdfWidth, pdfHeight], orientation);

            // Create a canvas slice
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = Math.ceil(sliceHeight) + 20; // overlap for continuity
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#FDF6E3";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(
              img,
              0,
              Math.max(0, i * sliceHeight - 10),
              img.width,
              Math.ceil(sliceHeight) + 20,
              0,
              0,
              canvas.width,
              canvas.height
            );

            const sliceDataUrl = canvas.toDataURL("image/png");
            const sliceImgAspect = canvas.width / canvas.height;
            let sDrawW: number, sDrawH: number;
            if (sliceImgAspect > pageAspect) {
              sDrawW = availW;
              sDrawH = availW / sliceImgAspect;
            } else {
              sDrawH = availH;
              sDrawW = availH * sliceImgAspect;
            }

            const offsetX = margin + (availW - sDrawW) / 2;
            const offsetY = margin + (availH - sDrawH) / 2;
            pdf.addImage(sliceDataUrl, "PNG", offsetX, offsetY, sDrawW, sDrawH);

            // Add watermark
            addWatermarkToPdf(pdf, pdfWidth, pdfHeight, margin);

            // Page number
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Halaman ${i + 1} / ${numPages}`, pdfWidth / 2, pdfHeight - 5, { align: "center" });
          }
        }
      } else {
        // Single page (normal or besar)
        const offsetX = margin + (availW - drawW) / 2;
        const offsetY = margin + (availH - drawH) / 2;
        pdf.addImage(dataUrl, "PNG", offsetX, offsetY, drawW, drawH);
        addWatermarkToPdf(pdf, pdfWidth, pdfHeight, margin);
      }

      // Add footer
      pdf.setFontSize(7);
      pdf.setTextColor(180, 180, 180);
      const dateStr = new Date().toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      pdf.text(
        `Tarombo Marga Hariandja — Diekspor pada ${dateStr}`,
        pdfWidth / 2,
        pdfHeight - 3,
        { align: "center" }
      );

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
    pdf.setFontSize(10);
    pdf.setTextColor(127, 29, 29);
    pdf.setGState(new (pdf as unknown as Record<string, unknown>).GState({ opacity: 0.04 }));
    // Unfortunately jsPDF GState opacity is limited, use text approach
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(28);

    const text = "TAROMBO MARGA HARIANDJA";
    const textWidth = pdf.getTextWidth(text);

    // Use built-in opacity via drawing many times at light color
    pdf.setTextColor(230, 220, 210);
    pdf.setFontSize(32);

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
          <Loader2 className="w-8 h-8 animate-spin text-[#7F1D1D] mx-auto mb-3" />
          <p className="text-[#7F1D1D]">Memuat pohon keluarga...</p>
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
          <TreePine className="w-16 h-16 text-[#D4A574] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#3E2723] mb-2">
            Belum Ada Data Pohon Keluarga
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Mulai dengan menambahkan anggota keluarga atau klik &quot;Seed Data Awal&quot; di sidebar
            untuk memuat data contoh.
          </p>
          {canCreate() && (
            <Button
              onClick={() => setActiveView("person-form")}
              className="bg-[#7F1D1D] hover:bg-[#991B1B]"
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
        {/* PDF Export Dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/90 shadow-md hover:bg-[#F5E6D3] gap-1.5"
            onClick={() => setShowPdfMenu(!showPdfMenu)}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            PDF
            <ChevronDown className="w-3 h-3" />
          </Button>
          {showPdfMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-[#D4A574]/50 py-1 min-w-[180px] z-20">
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-[#F5E6D3] transition-colors"
                onClick={() => handleExportPdf("normal")}
              >
                📄 PDF Standar (A4)
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-[#F5E6D3] transition-colors"
                onClick={() => handleExportPdf("besar")}
              >
                📐 PDF Besar (A3)
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-[#F5E6D3] transition-colors"
                onClick={() => handleExportPdf("multiple")}
              >
                📑 PDF Multi-Halaman
              </button>
            </div>
          )}
        </div>

        {/* SVG Export */}
        <Button
          variant="outline"
          size="icon"
          className="bg-white/90 shadow-md hover:bg-[#F5E6D3]"
          onClick={handleExportSvg}
          title="Ekspor SVG"
        >
          <Camera className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="bg-white/90 shadow-md hover:bg-[#F5E6D3]"
          onClick={handleZoomIn}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="bg-white/90 shadow-md hover:bg-[#F5E6D3]"
          onClick={handleZoomOut}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="bg-white/90 shadow-md hover:bg-[#F5E6D3]"
          onClick={handleFit}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 bg-white/90 rounded-lg shadow-md p-3 text-xs">
        <p className="font-semibold text-[#3E2723] mb-1.5">Keterangan:</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 rounded-sm border-2 border-[#7F1D1D] bg-[#F5E6D3]" />
            <span className="text-muted-foreground">Laki-laki</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 rounded-sm border-2 border-[#991B1B] bg-[#F5E6D3]" />
            <span className="text-muted-foreground">Perempuan</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 rounded-sm border-2 border-[#7F1D1D] bg-[rgba(127,29,29,0.03)]" />
            <span className="text-muted-foreground">Pasangan (dalam 1 card)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm bg-red-500 text-white text-[7px] flex items-center justify-center font-bold">✝</div>
            <span className="text-muted-foreground">Telah Meninggal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#B8860B] text-xs">Gen I, II...</span>
            <span className="text-muted-foreground">Generasi</span>
          </div>
        </div>
      </div>

      {/* Search in Tree */}
      <div className="absolute top-[200px] left-3 z-10 w-56">
        <div className="bg-white/90 rounded-lg shadow-md p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari anggota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs border-[#D4A574]"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-1 max-h-40 overflow-y-auto bg-white rounded-md border border-[#D4A574] shadow-sm">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#F5E6D3] transition-colors flex items-center gap-2"
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
        <div className="absolute bottom-4 right-4 z-10 w-80 bg-white rounded-xl shadow-xl border border-[#D4A574]/50 p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold text-[#3E2723]">{selectedNode.fullName}</h3>
              {selectedNode.nickname && (
                <p className="text-sm text-[#795548]">&quot;{selectedNode.nickname}&quot;</p>
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
            className="w-full mt-3 bg-[#7F1D1D] hover:bg-[#991B1B]"
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