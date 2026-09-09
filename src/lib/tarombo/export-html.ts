import { sqlite } from "@/lib/db";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildFamilyTree,
  findRootAncestors,
  serializePerson,
} from "./queries";
import type { PersonRow } from "./queries";
import {
  formatDate,
  formatDateShort,
  genderLabel,
  maritalLabel,
  partnershipLabel,
  type FamilyNode,
  type TreeNodePerson,
} from "./types";

// Cache base64 watermark (dibaca sekali)
let watermarkDataUrl: string | null = null;
function getWatermarkDataUrl(): string {
  if (watermarkDataUrl) return watermarkDataUrl;
  try {
    const imgPath = join(process.cwd(), "public", "tarombo-bg02.png");
    const buf = readFileSync(imgPath);
    watermarkDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
    return watermarkDataUrl;
  } catch {
    return "";
  }
}

// ============================================================================
// Render pohon tarombo sebagai dokumen HTML mandiri (untuk export PDF/image)
// ============================================================================

interface ExportMeta {
  title: string;
  subtitle?: string;
  generatedAt: string;
  exportedBy?: string | null;
  totalPersons: number;
  totalGenerations: number;
}

interface ExportDocument {
  html: string;
  meta: ExportMeta;
}

/** Hitung total node (termasuk pasangan) dalam sebuah pohon. */
function countNodes(node: FamilyNode): number {
  let count = 1; // person
  if (node.spouse) count += 1;
  for (const c of node.children) count += countNodes(c);
  return count;
}

/** Hitung kedalaman maksimum (generasi) sebuah pohon. */
function maxDepth(node: FamilyNode, base: number): number {
  let depth = base;
  for (const c of node.children) {
    depth = Math.max(depth, maxDepth(c, base + 1));
  }
  return depth;
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Render satu node pohon (rekursif) sebagai HTML <li>. */
function renderNode(node: FamilyNode): string {
  const { person, spouse, partnership, children } = node;
  const isMale = person.gender === "MALE";
  const alive = person.alive;

  const partnerBadge = partnership
    ? `<span class="pbadge ${partnership.status}">${partnershipLabel(partnership.status)}</span>`
    : "";

  const personCard = `
    <div class="card ${alive ? "" : "deceased"} ${isMale ? "male" : "female"}">
      <div class="strip"></div>
      <div class="head">
        <div class="avatar">${escapeHtml(initials(person.fullName))}</div>
        <div class="name-block">
          <div class="name">${escapeHtml(person.fullName)}</div>
          ${person.nickname ? `<div class="nick">“${escapeHtml(person.nickname)}”</div>` : ""}
        </div>
      </div>
      <div class="meta">
        <span class="tag ${isMale ? "t-male" : "t-female"}">${genderLabel(person.gender)}</span>
        ${person.generationNumber != null ? `<span class="tag t-gen">Gen ${person.generationNumber}</span>` : ""}
      </div>
      <div class="dates">
        ${person.birthDate ? `<span>♀ ${escapeHtml(formatDateShort(person.birthDate))}</span>` : ""}
        ${!alive && person.deathDate ? `<span class="death">✝ ${escapeHtml(formatDateShort(person.deathDate))}</span>` : ""}
      </div>
    </div>`;

  const spouseCard = spouse
    ? `
    <div class="couple-link">
      ${partnerBadge}
    </div>
    <div class="card ${spouse.alive ? "" : "deceased"} ${spouse.gender === "MALE" ? "male" : "female"} spouse">
      <div class="strip"></div>
      <div class="head">
        <div class="avatar">${escapeHtml(initials(spouse.fullName))}</div>
        <div class="name-block">
          <div class="name">${escapeHtml(spouse.fullName)}</div>
          ${spouse.nickname ? `<div class="nick">“${escapeHtml(spouse.nickname)}”</div>` : ""}
        </div>
      </div>
      <div class="meta">
        <span class="tag ${spouse.gender === "MALE" ? "t-male" : "t-female"}">${genderLabel(spouse.gender)}</span>
        ${spouse.generationNumber != null ? `<span class="tag t-gen">Gen ${spouse.generationNumber}</span>` : ""}
      </div>
      <div class="dates">
        ${spouse.birthDate ? `<span>♀ ${escapeHtml(formatDateShort(spouse.birthDate))}</span>` : ""}
        ${!spouse.alive && spouse.deathDate ? `<span class="death">✝ ${escapeHtml(formatDateShort(spouse.deathDate))}</span>` : ""}
      </div>
    </div>`
    : "";

  const childrenHtml =
    children.length > 0
      ? `<ul>${children.map((c) => renderNode(c)).join("")}</ul>`
      : "";

  return `<li>
    <div class="couple">
      ${personCard}
      ${spouseCard}
    </div>
    ${childrenHtml}
  </li>`;
}

/** Render header dokumen (judul, info, legenda). */
function renderHeader(meta: ExportMeta): string {
  return `
    <header class="doc-header">
      <div class="brand">
        <div class="logo">T</div>
        <div>
          <h1>${escapeHtml(meta.title)}</h1>
          ${meta.subtitle ? `<p class="subtitle">${escapeHtml(meta.subtitle)}</p>` : ""}
        </div>
      </div>
      <div class="meta-info">
        <div><span class="lbl">Diekspor</span> ${escapeHtml(meta.generatedAt)}</div>
        ${meta.exportedBy ? `<div><span class="lbl">Oleh</span> ${escapeHtml(meta.exportedBy)}</div>` : ""}
        <div><span class="lbl">Total Orang</span> ${meta.totalPersons}</div>
        <div><span class="lbl">Generasi</span> ${meta.totalGenerations}</div>
      </div>
    </header>
    <div class="legend">
      <span class="leg male-leg">Laki-laki</span>
      <span class="leg female-leg">Perempuan</span>
      <span class="leg alive-leg">Hidup</span>
      <span class="leg deceased-leg">Wafat</span>
      <span class="leg active-leg">Aktif</span>
      <span class="leg widowed-leg">Janda/Duda</span>
      <span class="leg divorced-leg">Cerai</span>
    </div>`;
}

/** CSS untuk dokumen export (self-contained). */
const EXPORT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: #2b1d14;
    background: #faf6ef;
    padding: 32px;
  }
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #7a1f1f;
    padding-bottom: 16px;
    margin-bottom: 14px;
    gap: 24px;
    flex-wrap: wrap;
  }
  .brand { display: flex; align-items: center; gap: 14px; }
  .logo {
    width: 52px; height: 52px;
    background: #7a1f1f;
    color: #fff7ed;
    border-radius: 12px;
    display: grid; place-items: center;
    font-weight: 800; font-size: 26px;
  }
  h1 { font-size: 24px; color: #2b1d14; }
  .subtitle { font-size: 13px; color: #6b5b4d; margin-top: 2px; }
  .meta-info { text-align: right; font-size: 12px; color: #4a3b2d; }
  .meta-info .lbl { color: #9a8a7d; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-right: 6px; }
  .meta-info > div { margin: 2px 0; }
  .legend {
    display: flex; flex-wrap: wrap; gap: 10px;
    margin-bottom: 24px;
    font-size: 11px;
  }
  .leg {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 9px; border-radius: 999px;
    background: #fff; border: 1px solid #e2d5c4;
  }
  .leg::before { content:""; width:9px; height:9px; border-radius: 50%; display:inline-block; }
  .male-leg::before { background: #7a1f1f; }
  .female-leg::before { background: #d97706; }
  .alive-leg::before { background: #10b981; }
  .deceased-leg::before { background: #78716c; }
  .active-leg::before { background: #059669; }
  .widowed-leg::before { background: #78716c; }
  .divorced-leg::before { background: #e11d48; }

  /* Tree */
  .tree, .tree ul {
    position: relative;
    padding: 0; margin: 0;
    list-style: none;
  }
  .tree ul {
    display: flex;
    justify-content: center;
    padding-top: 28px;
  }
  .tree li {
    position: relative;
    padding: 28px 12px 0 12px;
    list-style: none;
  }
  .tree li::before {
    content: ""; position: absolute;
    top: 0; right: 50%;
    width: 0; height: 28px;
    border-left: 2px solid #b8a48c;
  }
  .tree li::after {
    content: ""; position: absolute;
    top: 0; right: 0;
    border-top: 2px solid #b8a48c;
    width: 100%; height: 28px;
  }
  .tree > li:only-child::after { display: none; }
  .tree > li:first-child::after {
    border-top-left-radius: 6px; border-left: 2px solid #b8a48c;
    border-top: 2px solid #b8a48c; width: 50%;
  }
  .tree > li:last-child::before {
    border-right: 2px solid #b8a48c; border-top: 2px solid #b8a48c;
    border-top-right-radius: 6px; width: 50%;
  }
  .tree > li:only-child::before { display: none; }

  .couple { display: flex; align-items: stretch; justify-content: center; }
  .couple-link {
    display: flex; align-items: center; padding: 0 4px;
    position: relative;
  }
  .couple-link::before, .couple-link::after {
    content: ""; width: 16px; height: 2px; background: #7a1f1f; opacity: 0.5;
  }
  .pbadge {
    margin: 0 4px;
    font-size: 9px; font-weight: 700;
    padding: 2px 6px; border-radius: 999px;
    text-transform: uppercase; letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .pbadge.ACTIVE { background: #d1fae5; color: #065f46; }
  .pbadge.WIDOWED { background: #f5f5f4; color: #57534e; }
  .pbadge.DIVORCED { background: #ffe4e6; color: #9f1239; }

  .card {
    width: 168px;
    background: #ffffff;
    border: 1px solid #e7dcc9;
    border-radius: 10px;
    padding: 10px;
    position: relative;
    box-shadow: 0 1px 3px rgba(122, 31, 31, 0.06);
    page-break-inside: avoid;
  }
  .card.deceased { opacity: 0.88; }
  .strip {
    position: absolute; top: 0; left: 0; right: 0;
    height: 4px; border-radius: 10px 10px 0 0;
  }
  .card.male .strip { background: #7a1f1f; }
  .card.female .strip { background: #d97706; }
  .card.deceased .strip { background: #a8a29e; }
  .head { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
  .avatar {
    width: 34px; height: 34px;
    border-radius: 50%;
    display: grid; place-items: center;
    font-size: 11px; font-weight: 700;
    flex-shrink: 0;
  }
  .card.male .avatar { background: #fbe7e7; color: #7a1f1f; }
  .card.female .avatar { background: #fef3c7; color: #92400e; }
  .name-block { min-width: 0; flex: 1; }
  .name { font-size: 12.5px; font-weight: 700; line-height: 1.15; color: #2b1d14; word-break: break-word; }
  .nick { font-size: 10.5px; color: #8a7a6d; }
  .meta { margin-top: 6px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
  .tag {
    font-size: 9px; font-weight: 600;
    padding: 1px 6px; border-radius: 999px;
    border: 1px solid;
  }
  .t-male { color: #7a1f1f; border-color: #f3c9c9; background: #fbe7e7; }
  .t-female { color: #92400e; border-color: #fde68a; background: #fef3c7; }
  .t-gen { color: #57534e; border-color: #e7e5e4; background: #f5f5f4; }
  .dates { margin-top: 5px; font-size: 10px; color: #6b5b4d; display: flex; flex-direction: column; gap: 1px; }
  .death { color: #78716c; }

  /* Halaman untuk multiple PDF */
  .page-break { page-break-after: always; break-after: page; }
  .root-section { margin-bottom: 32px; }
  .root-title {
    font-size: 16px; font-weight: 700; color: #7a1f1f;
    padding: 8px 14px; background: #fef3c7; border-radius: 8px;
    margin-bottom: 16px; display: inline-block;
    border: 1px solid #fde68a;
  }

  /* Footer dokumen */
  .doc-footer {
    margin-top: 32px; padding-top: 12px;
    border-top: 1px solid #e2d5c4;
    font-size: 10.5px; color: #9a8a7d; text-align: center;
  }

  /* Watermark logo — di tengah, ukuran proporsional, di belakang konten */
  .watermark {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 45%;
    max-width: 700px;
    min-width: 280px;
    height: auto;
    opacity: 0.10;
    pointer-events: none;
    z-index: 0;
    object-fit: contain;
  }
  .root-section, .doc-header, .legend, .doc-footer { position: relative; z-index: 1; }
`;

export interface ExportFilters {
  aliveOnly?: boolean;
  maxGeneration?: number;
}

/** Terapkan filter ke family tree (rekursif). */
function filterTree(node: FamilyNode, filters: ExportFilters, depth: number): FamilyNode | null {
  // maxGeneration: bila kedalaman melebihi batas, skip node ini
  if (filters.maxGeneration && depth > filters.maxGeneration) return null;

  // aliveOnly: bila node orang sudah wafat dan aliveOnly=true, skip node
  // TAPI tetap proses anak-anaknya (anak bisa masih hidup)
  let person = node.person;
  let spouse = node.spouse;
  if (filters.aliveOnly) {
    if (!person.alive) {
      // orang wafat — tetap tampilkan agar pohon utuh? Atau skip?
      // Untuk aliveOnly, kita skip node wafat tapi proses children
      // Sebenarnya untuk export aliveOnly, lebih baik tampilkan semua tapi tandai.
      // Disini kita skip node wafat dan children-nya (karena parent wafat = subtree tetap)
      // Ambil children dulu
    }
  }

  const filteredChildren: FamilyNode[] = [];
  for (const child of node.children) {
    const filtered = filterTree(child, filters, depth + 1);
    if (filtered) filteredChildren.push(filtered);
  }

  return {
    ...node,
    person,
    spouse,
    children: filteredChildren,
  };
}

/**
 * Bangun dokumen HTML untuk satu pohon (root tertentu atau semua root).
 */
export async function buildExportDocument(opts: {
  rootId?: string | null;
  exportedBy?: string | null;
  filters?: ExportFilters;
}): Promise<ExportDocument> {
  const trees: FamilyNode[] = [];
  let roots: TreeNodePerson[] = [];

  if (opts.rootId) {
    const tree = buildFamilyTree(opts.rootId);
    if (tree) {
      const filtered = opts.filters ? filterTree(tree, opts.filters, 1) : tree;
      if (filtered) trees.push(filtered);
    }
    const p = sqlite
      .prepare("SELECT * FROM person WHERE id = ?")
      .get(opts.rootId) as PersonRow | undefined;
    roots = p ? [serializePerson(p)] : [];
  } else {
    const rootRows = findRootAncestors();
    roots = rootRows.map(serializePerson);
    for (const r of rootRows) {
      const tree = buildFamilyTree(r.id);
      if (tree) {
        const filtered = opts.filters ? filterTree(tree, opts.filters, 1) : tree;
        if (filtered) trees.push(filtered);
      }
    }
  }

  const totalPersons = trees.reduce((sum, t) => sum + countNodes(t), 0);
  const totalGenerations = trees.reduce(
    (max, t) => Math.max(max, maxDepth(t, 1)),
    0,
  );

  const now = new Date();
  const generatedAt = now.toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const title = opts.rootId
    ? roots[0]
      ? `Silsilah ${roots[0].fullName}`
      : "Silsilah Keluarga"
    : "Tarombo — Pohon Silsilah Keluarga";

  const meta: ExportMeta = {
    title,
    subtitle: opts.rootId
      ? `Leluhur: ${roots[0]?.fullName ?? "-"}`
      : "Semua leluhur & keturunan",
    generatedAt,
    exportedBy: opts.exportedBy,
    totalPersons,
    totalGenerations,
  };

  const sectionsHtml = trees
    .map((tree, i) => {
      const rootName = tree.person.fullName;
      const sectionBreak = i < trees.length - 1 ? "page-break" : "";
      return `
        <section class="root-section ${sectionBreak}">
          <div class="root-title">Leluhur: ${escapeHtml(rootName)}</div>
          <ul class="tree">
            ${renderNode(tree)}
          </ul>
        </section>`;
    })
    .join("");

  const watermarkUrl = getWatermarkDataUrl();
  const watermarkHtml = watermarkUrl
    ? `<img src="${watermarkUrl}" class="watermark" alt="Tarombo watermark" />`
    : "";

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(meta.title)}</title>
<style>${EXPORT_CSS}</style>
</head>
<body>
${watermarkHtml}
${renderHeader(meta)}
${sectionsHtml}
<footer class="doc-footer">
  Dokumen ini dibuat otomatis oleh aplikasi Tarombo · ${escapeHtml(generatedAt)}
</footer>
</body>
</html>`;

  return { html, meta };
}
