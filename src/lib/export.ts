"use client";

import { jsPDF } from "jspdf";

const WATERMARK_URL = "/tarombo-ikon02.png";
const BG_URL = "/tarombo-bg01.png";

let watermarkImg: HTMLImageElement | null = null;
let bgImg: HTMLImageElement | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function getWatermark(): Promise<HTMLImageElement> {
  if (watermarkImg) return watermarkImg;
  watermarkImg = await loadImage(WATERMARK_URL);
  return watermarkImg;
}

async function getBackground(): Promise<HTMLImageElement | null> {
  if (bgImg) return bgImg;
  try {
    bgImg = await loadImage(BG_URL);
    return bgImg;
  } catch {
    return null;
  }
}

// Serialize an SVG element to a data URL.
// Accepts optional treeWidth/treeHeight to override the SVG's display dimensions
// (needed when the on-screen SVG is sized to the container but the export should
// use the tree's natural dimensions). Also removes the D3 zoom transform from
// the .tree-content group so the full tree is rendered without pan/zoom offset.
export function svgToDataUrl(
  svg: SVGSVGElement,
  treeWidth?: number,
  treeHeight?: number
): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;

  // Override dimensions if tree dimensions are provided
  if (treeWidth && treeHeight) {
    clone.setAttribute("width", String(treeWidth));
    clone.setAttribute("height", String(treeHeight));
    clone.setAttribute("viewBox", `0 0 ${treeWidth} ${treeHeight}`);
  } else {
    const bbox = svg.getBoundingClientRect();
    if (!clone.getAttribute("width")) clone.setAttribute("width", String(bbox.width));
    if (!clone.getAttribute("height")) clone.setAttribute("height", String(bbox.height));
  }

  // Remove the D3 zoom transform from the tree-content group so the
  // export shows the full tree at its natural position.
  const content = clone.querySelector(".tree-content");
  if (content) {
    content.removeAttribute("transform");
  }

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const xml = new XMLSerializer().serializeToString(clone);
  // Use encodeURIComponent to handle unicode
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
}

export interface RenderOptions {
  includeBackground?: boolean;
  includeWatermark?: boolean;
  background?: string; // hex color fallback
  scale?: number; // device pixel ratio
}

// Render an SVG to a canvas, optionally with background + watermark
export async function renderSvgToCanvas(
  svg: SVGSVGElement,
  width: number,
  height: number,
  opts: RenderOptions = {}
): Promise<HTMLCanvasElement> {
  const scale = opts.scale ?? 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // 1. Fill background color
  ctx.fillStyle = opts.background ?? "#fdfaf4";
  ctx.fillRect(0, 0, width, height);

  // 2. Optional background image (subtle)
  if (opts.includeBackground) {
    try {
      const bg = await getBackground();
      if (bg) {
        ctx.globalAlpha = 0.12;
        // cover
        const bgRatio = bg.width / bg.height;
        const canvasRatio = width / height;
        let dw = width;
        let dh = height;
        let dx = 0;
        let dy = 0;
        if (bgRatio > canvasRatio) {
          dh = height;
          dw = height * bgRatio;
          dx = (width - dw) / 2;
        } else {
          dw = width;
          dh = width / bgRatio;
          dy = (height - dh) / 2;
        }
        ctx.drawImage(bg, dx, dy, dw, dh);
        ctx.globalAlpha = 1;
      }
    } catch {
      // ignore
    }
  }

  // 3. Draw the SVG content
  // Pass the tree dimensions so the SVG clone uses the full tree size
  // (not the on-screen container size) and removes the D3 zoom transform.
  const dataUrl = svgToDataUrl(svg, width, height);
  const svgImg = await loadImage(dataUrl);
  ctx.drawImage(svgImg, 0, 0, width, height);

  // 4. Centered watermark, sized to ~35% of the smaller dimension
  if (opts.includeWatermark) {
    try {
      const wm = await getWatermark();
      const wmSize = Math.min(width, height) * 0.35;
      const wmRatio = wm.width / wm.height;
      let dw = wmSize;
      let dh = wmSize / wmRatio;
      if (wmRatio < 1) {
        dh = wmSize;
        dw = wmSize * wmRatio;
      }
      const dx = (width - dw) / 2;
      const dy = (height - dh) / 2;
      ctx.globalAlpha = 0.18;
      ctx.drawImage(wm, dx, dy, dw, dh);
      ctx.globalAlpha = 1;
    } catch {
      // ignore
    }
  }

  return canvas;
}

// Trigger a download for a blob
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      type,
      quality
    );
  });
}

export type ExportFormat = "pdf" | "pdf-multi" | "pdf-large" | "jpg" | "png";

export interface ExportParams {
  format: ExportFormat;
  includeWatermark: boolean;
  includeBackground: boolean;
  title?: string;
}

// Main export function: takes the SVG element + dimensions and produces a file
export async function exportTree(
  svg: SVGSVGElement,
  width: number,
  height: number,
  params: ExportParams
): Promise<void> {
  const title = params.title || "Tarombo Hariandja";

  if (params.format === "png" || params.format === "jpg") {
    const canvas = await renderSvgToCanvas(svg, width, height, {
      includeWatermark: params.includeWatermark,
      includeBackground: params.includeBackground,
      scale: 2,
    });
    const mime = params.format === "png" ? "image/png" : "image/jpeg";
    const blob = await canvasToBlob(canvas, mime, 0.95);
    const ext = params.format === "png" ? "png" : "jpg";
    downloadBlob(blob, `${title}.${ext}`);
    return;
  }

  // PDF variants
  if (params.format === "pdf") {
    // Single A4 (landscape) PDF, fit-to-page
    const canvas = await renderSvgToCanvas(svg, width, height, {
      includeWatermark: params.includeWatermark,
      includeBackground: params.includeBackground,
      scale: 2,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2 - 12; // leave room for title
    const ratio = Math.min(availW / width, availH / height);
    const drawW = width * ratio;
    const drawH = height * ratio;
    const offsetX = (pageW - drawW) / 2;
    const offsetY = margin + 12;
    pdf.setFontSize(13);
    pdf.setTextColor(80, 60, 50);
    pdf.text(title, pageW / 2, margin + 6, { align: "center" });
    pdf.addImage(imgData, "PNG", offsetX, offsetY, drawW, drawH);
    pdf.save(`${title}.pdf`);
    return;
  }

  if (params.format === "pdf-large") {
    // Single large-format PDF page that fits the whole tree at high resolution
    const scale = 2;
    const canvas = await renderSvgToCanvas(svg, width, height, {
      includeWatermark: params.includeWatermark,
      includeBackground: params.includeBackground,
      scale,
    });
    const imgData = canvas.toDataURL("image/png");
    // Use the canvas dimensions as the PDF page size (in mm, ~3.78 px/mm at 96dpi)
    const pxPerMm = 96 / 25.4;
    const pageW = (canvas.width / scale) / pxPerMm;
    const pageH = (canvas.height / scale) / pxPerMm + 14; // title space
    const pdf = new jsPDF({
      orientation: pageW > pageH ? "landscape" : "portrait",
      unit: "mm",
      format: [pageW, pageH],
    });
    pdf.setFontSize(12);
    pdf.setTextColor(80, 60, 50);
    pdf.text(title, pageW / 2, 6, { align: "center" });
    pdf.addImage(imgData, "PNG", 0, 10, pageW, pageH - 14);
    pdf.save(`${title}-large.pdf`);
    return;
  }

  if (params.format === "pdf-multi") {
    // Multiple A4 pages tiled across the tree
    const scale = 2;
    const canvas = await renderSvgToCanvas(svg, width, height, {
      includeWatermark: params.includeWatermark,
      includeBackground: params.includeBackground,
      scale,
    });
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 6;
    const titleH = 10;
    // How many A4 pages needed (in layout units)
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2 - titleH;
    const cols = Math.ceil(width / availW);
    const rows = Math.ceil(height / availH);
    const total = cols * rows;
    if (total > 60) {
      // Safety guard
      throw new Error(
        `Tree too large for multi-page export (${cols}x${rows} = ${total} pages). Use large-format PDF instead.`
      );
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r > 0 || c > 0) pdf.addPage();
        const srcX = c * availW;
        const srcY = r * availH;
        // Crop a tile from the big canvas
        const tileCanvas = document.createElement("canvas");
        tileCanvas.width = Math.ceil(availW * scale);
        tileCanvas.height = Math.ceil(availH * scale);
        const tctx = tileCanvas.getContext("2d")!;
        tctx.fillStyle = "#fdfaf4";
        tctx.fillRect(0, 0, tileCanvas.width, tileCanvas.height);
        tctx.drawImage(
          canvas,
          srcX * scale,
          srcY * scale,
          availW * scale,
          availH * scale,
          0,
          0,
          tileCanvas.width,
          tileCanvas.height
        );
        const tileData = tileCanvas.toDataURL("image/png");
        pdf.setFontSize(10);
        pdf.setTextColor(120, 100, 90);
        pdf.text(
          `${title} — page ${r * cols + c + 1} of ${total} (col ${c + 1}/${cols}, row ${r + 1}/${rows})`,
          pageW / 2,
          margin + 4,
          { align: "center" }
        );
        pdf.addImage(tileData, "PNG", margin, margin + titleH, availW, availH);
      }
    }
    pdf.save(`${title}-pages.pdf`);
    return;
  }
}
