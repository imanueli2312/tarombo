import { NextRequest, NextResponse } from "next/server";
import { buildExportDocument } from "@/lib/tarombo/export-html";
import { renderImage, renderPdf } from "@/lib/tarombo/playwright-service";
import {
  PermissionDeniedError,
  requirePermission,
  getActiveUserWithPermissions,
} from "@/lib/tarombo/auth";
import { logActivity } from "@/lib/tarombo/security";

export const runtime = "nodejs";
export const maxDuration = 180; // 3 menit (export bisa lambat untuk pohon besar)

/** GET /api/export?format=pdf&scope=current|all&size=A4|A3|A2|A1|large&rootId=<id>
 *       &aliveOnly=true&maxGeneration=3&subtreeFrom=<id>
 *
 *  Butuh permission export:view.
 *  - format: pdf | png | jpg
 *  - scope: current (rootId) | all (semua leluhur)
 *  - size: A4 | A3 | A2 | A1 | large  (khusus PDF)
 *  - aliveOnly: "true" = hanya orang yang masih hidup
 *  - maxGeneration: batasi kedalaman generasi (mis. 3 = Gen 1-3 saja)
 *  - subtreeFrom: ID orang — export hanya subtree dari orang ini ke bawah
 */
export async function GET(req: NextRequest) {
  try {
    const me = await requirePermission("export:view");
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") ?? "pdf").toLowerCase();
    const scope = (searchParams.get("scope") ?? "all").toLowerCase();
    const size = (searchParams.get("size") ?? "A3").toUpperCase();
    const rootId = searchParams.get("rootId");
    const aliveOnly = searchParams.get("aliveOnly") === "true";
    const maxGeneration = searchParams.get("maxGeneration");
    const subtreeFrom = searchParams.get("subtreeFrom");

    if (!["pdf", "png", "jpg"].includes(format)) {
      return NextResponse.json(
        { error: "format tidak valid (pdf|png|jpg)" },
        { status: 400 },
      );
    }

    // Tentukan root
    const effectiveRootId =
      scope === "current" ? rootId ?? null : null;

    // Ambil user aktif untuk nama "exported by"
    const exportedBy: string | null = me.name;

    const { html, meta } = await buildExportDocument({
      rootId: subtreeFrom ?? effectiveRootId,
      exportedBy,
      filters: {
        aliveOnly,
        maxGeneration: maxGeneration ? parseInt(maxGeneration) : undefined,
      },
    });

    logActivity({
      userId: me.id,
      userName: me.name,
      action: "export",
      entityType: "data",
      entityName: `Export ${format.toUpperCase()}`,
      details: { format, scope, size, aliveOnly, maxGeneration, subtreeFrom, persons: meta.totalPersons },
    });

    // Nama file
    const safeName = meta.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "pdf") {
      const isLarge = size === "LARGE";
      const pdfFormat = isLarge
        ? undefined
        : (["A4", "A3", "A2", "A1", "A0"].includes(size) ? (size as "A4" | "A3" | "A2" | "A1" | "A0") : "A3");

      const buf = await renderPdf({
        html,
        format: pdfFormat,
        landscape: !isLarge,
        singlePage: isLarge,
      });

      const sizeLabel = isLarge ? "large" : (pdfFormat ?? "A3").toLowerCase();
      const filename = `tarombo-${safeName}-${sizeLabel}-${stamp}.pdf`;
      return new NextResponse(buf as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(buf.length),
        },
      });
    }

    // image
    const buf = await renderImage({
      html,
      imageType: format === "jpg" ? "jpeg" : "png",
      scale: 2,
    });

    const ext = format === "jpg" ? "jpg" : "png";
    const mime = format === "jpg" ? "image/jpeg" : "image/png";
    const filename = `tarombo-${safeName}-${stamp}.${ext}`;

    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buf.length),
      },
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("[export] error:", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
