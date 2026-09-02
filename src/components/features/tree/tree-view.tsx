'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import type { TreeNode } from '@/types';
import { getMargaLabel, MARGA_UTAMA } from '@/lib/batak-culture';
import { TreePine, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

type HierarchyPointNode = d3.HierarchyPointNode<TreeNode>;

interface TreeViewProps {
  data: TreeNode[];
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

const NODE_W = 140;
const NODE_H = 70;
const SPOUSE_W = 120;
const SPOUSE_H = 50;
const SPOUSE_GAP = 16;
const H_SPACE = 120;
const V_SPACE = 200;
const MAX_NAME_LEN = 18;

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}

function getDisplayName(node: TreeNode): string {
  const name = node.nama_panggilan || node.nama;
  return truncate(name, MAX_NAME_LEN);
}

export default function TreeView({ data, onNodeClick, className }: TreeViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const renderTree = useCallback(
    (containerW: number, containerH: number) => {
      const svg = d3.select(svgRef.current);
      const g = d3.select(gRef.current);
      if (!svg.node() || !g.node()) return;

      // Clear previous
      g.selectAll('*').remove();

      if (!data || data.length === 0) return;

      // 1. Virtual root for multiple roots
      const virtualRoot: TreeNode = {
        id: '__virtual_root__',
        nama: '',
        nama_panggilan: '',
        jenis_kelamin: 'L',
        tanggal_lahir: null,
        tanggal_kematian: null,
        status_pernikahan: 'belum_menikah',
        nomor_generasi: 0,
        photo: null,
        marga_asal: '',
        children: data,
      };

      const root = d3.hierarchy<TreeNode>(virtualRoot, (d) => d.children);

      // 2. Tree layout
      const treeLayout = d3.tree<TreeNode>()
        .nodeSize([H_SPACE, V_SPACE])
        .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

      treeLayout(root);

      // 3. Link generator
      const linkGen = d3.linkVertical<any, any>()
        .x((d: any) => d.x ?? 0)
        .y((d: any) => d.y ?? 0);

      // 4. Real nodes (exclude virtual root)
      const realNodes = root.descendants().filter((d) => d.data.id !== '__virtual_root__');
      if (realNodes.length === 0) return;

      // 5. Compute bounding box
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (const n of realNodes) {
        const nx = n.x ?? 0;
        const ny = n.y ?? 0;
        minX = Math.min(minX, nx - NODE_W / 2);
        maxX = Math.max(maxX, nx + NODE_W / 2);
        minY = Math.min(minY, ny - NODE_H / 2);
        maxY = Math.max(maxY, ny + NODE_H / 2);
        if (n.data.spouse) {
          maxX = Math.max(maxX, nx + NODE_W / 2 + SPOUSE_GAP + SPOUSE_W);
        }
      }

      // Expand bounding box for generation labels on the left
      minX -= 80;

      // 6. Draw links (only from real nodes to their children)
      const links = (root.links() as unknown as d3.HierarchyPointLink<TreeNode>[]).filter(
        (l) => l.source.data.id !== '__virtual_root__'
      );

      g.append('g')
        .attr('class', 'tree-links')
        .selectAll('path')
        .data(links)
        .join('path')
        .attr('d', (d) => linkGen(d) || '')
        .attr('fill', 'none')
        .attr('stroke', 'var(--muted-foreground)')
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.35);

      // 7. Draw node groups
      const nodeGroups = g
        .append('g')
        .attr('class', 'tree-nodes')
        .selectAll('g')
        .data(realNodes)
        .join('g')
        .attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
        .style('cursor', onNodeClick ? 'pointer' : 'default');

      // 8. Main node card
      const cardGroup = nodeGroups
        .append('g')
        .attr('class', 'node-card')
        .attr('transform', `translate(${-NODE_W / 2},${-NODE_H / 2})`);

      // Card background
      cardGroup
        .append('rect')
        .attr('width', NODE_W)
        .attr('height', NODE_H)
        .attr('rx', 10)
        .attr('ry', 10)
        .attr('fill', 'var(--card)')
        .attr('stroke', 'var(--border)')
        .attr('stroke-width', 1)
        .attr('filter', 'url(#node-shadow)');

      // Deceased overlay
      cardGroup
        .filter((d) => !!d.data.tanggal_kematian)
        .append('rect')
        .attr('width', NODE_W)
        .attr('height', NODE_H)
        .attr('rx', 10)
        .attr('ry', 10)
        .attr('fill', 'var(--muted)')
        .attr('opacity', 0.35);

      // Photo circle or placeholder
      // Placeholder circle (always drawn, image on top if exists)
      cardGroup
        .append('circle')
        .attr('cx', 22)
        .attr('cy', NODE_H / 2)
        .attr('r', 12)
        .attr('fill', 'var(--muted)')
        .attr('opacity', 0.4);

      // Clip + image for nodes with photo
      const photoNodes = cardGroup.filter(function (d) {
        return !!d.data.photo;
      });

      photoNodes
        .append('defs')
        .append('clipPath')
        .attr('id', function (d) {
          return `photo-clip-${d.data.id}`;
        })
        .append('circle')
        .attr('cx', 22)
        .attr('cy', NODE_H / 2)
        .attr('r', 12);

      photoNodes
        .append('image')
        .attr('href', function (d) {
          return d.data.photo!;
        })
        .attr('x', 10)
        .attr('y', NODE_H / 2 - 12)
        .attr('width', 24)
        .attr('height', 24)
        .attr('clip-path', function (d) {
          return `url(#photo-clip-${d.data.id})`;
        })
        .attr('preserveAspectRatio', 'xMidYMid slice');

      // Text X offset: shifted right if photo
      const textX = 40;

      // Gender indicator dot
      cardGroup
        .append('circle')
        .attr('cx', textX)
        .attr('cy', 24)
        .attr('r', 4)
        .attr('fill', (d) =>
          d.data.jenis_kelamin === 'L'
            ? 'oklch(0.6 0.2 250)'
            : 'oklch(0.65 0.2 350)'
        );

      // Name text
      cardGroup
        .append('text')
        .attr('x', textX + 8)
        .attr('y', 28)
        .attr('font-size', '13px')
        .attr('font-weight', 700)
        .attr('fill', 'var(--foreground)')
        .text((d) => getDisplayName(d.data));

      // Subtitle
      cardGroup
        .append('text')
        .attr('x', textX)
        .attr('y', 48)
        .attr('font-size', '11px')
        .attr('fill', 'var(--muted-foreground)')
        .text((d) => `${d.data.marga_asal || MARGA_UTAMA}, Gen ${d.data.nomor_generasi}`);

      // Deceased cross
      cardGroup
        .filter((d) => !!d.data.tanggal_kematian)
        .append('text')
        .attr('x', NODE_W - 16)
        .attr('y', 18)
        .attr('font-size', '14px')
        .attr('fill', 'var(--muted-foreground)')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .text('\u271D');

      // 9. Spouse nodes
      nodeGroups
        .filter((d) => !!d.data.spouse)
        .each(function (d) {
          const spouse = d.data.spouse!;
          const sel = d3.select(this);
          const isDivorced = spouse.status_pernikahan === 'cerai';

          // Connection line
          sel.append('line')
            .attr('x1', NODE_W / 2)
            .attr('y1', 0)
            .attr('x2', NODE_W / 2 + SPOUSE_GAP)
            .attr('y2', 0)
            .attr('stroke', isDivorced ? 'var(--destructive)' : 'var(--muted-foreground)')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', isDivorced ? '4 3' : 'none')
            .attr('stroke-opacity', 0.6);

          // Spouse group
          const sg = sel
            .append('g')
            .attr('class', 'spouse-card')
            .attr('transform', `translate(${NODE_W / 2 + SPOUSE_GAP},${-SPOUSE_H / 2})`);

          const spouseMargaDiffers = spouse.marga_asal && spouse.marga_asal !== '' && spouse.marga_asal !== MARGA_UTAMA;
          sg.append('rect')
            .attr('width', SPOUSE_W)
            .attr('height', SPOUSE_H)
            .attr('rx', 8)
            .attr('ry', 8)
            .attr('fill', 'var(--card)')
            .attr('stroke', spouseMargaDiffers ? 'oklch(0.65 0.15 60)' : 'var(--border)')
            .attr('stroke-width', spouseMargaDiffers ? 1.5 : 1)
            .attr('stroke-dasharray', isDivorced ? '4 3' : 'none')
            .attr('filter', 'url(#node-shadow)');

          // Spouse deceased overlay
          if (spouse.tanggal_kematian) {
            sg.append('rect')
              .attr('width', SPOUSE_W)
              .attr('height', SPOUSE_H)
              .attr('rx', 8)
              .attr('ry', 8)
              .attr('fill', 'var(--muted)')
              .attr('opacity', 0.35);
          }

          // Spouse gender dot
          const spouseName = spouse.nama_panggilan || spouse.nama;

          sg.append('circle')
            .attr('cx', 14)
            .attr('cy', SPOUSE_H / 2 - 6)
            .attr('r', 4)
            .attr('fill', spouse.jenis_kelamin === 'L' ? 'oklch(0.6 0.2 250)' : 'oklch(0.65 0.2 350)');

          // Spouse name
          sg.append('text')
            .attr('x', 22)
            .attr('y', SPOUSE_H / 2 - 2)
            .attr('font-size', '12px')
            .attr('font-weight', 600)
            .attr('fill', 'var(--foreground)')
            .text(truncate(spouseName, 16));

          // Spouse deceased cross
          if (spouse.tanggal_kematian) {
            sg.append('text')
              .attr('x', SPOUSE_W - 12)
              .attr('y', 14)
              .attr('font-size', '12px')
              .attr('fill', 'var(--muted-foreground)')
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'central')
              .text('\u271D');
          }

          // Spouse label
          const isBoru = spouse.marga_asal && spouse.marga_asal !== '' && spouse.marga_asal !== MARGA_UTAMA;
          sg.append('text')
            .attr('x', 14)
            .attr('y', SPOUSE_H / 2 + 14)
            .attr('font-size', '10px')
            .attr('fill', 'var(--muted-foreground)')
            .text(() => {
              if (isBoru) {
                return isDivorced ? `(Cerai · ${spouse.marga_asal})` : `(Boru · ${spouse.marga_asal})`;
              }
              return isDivorced ? '(Cerai)' : '(Pasangan)';
            });
        });

      // 10. Generation level labels
      const genNodes = root.descendants().filter(
        (d) => d.data.id !== '__virtual_root__'
      );
      const genYs = new Map<number, number>();
      for (const n of genNodes) {
        const gen = n.data.nomor_generasi;
        const y = n.y ?? 0;
        if (!genYs.has(gen) || y < genYs.get(gen)!) {
          genYs.set(gen, y);
        }
      }

      const sortedGens = Array.from(genYs.entries()).sort((a, b) => a[1] - b[1]);
      g.append('g').attr('class', 'gen-labels').selectAll('text')
        .data(sortedGens)
        .join('text')
        .attr('x', minX - NODE_W / 2 - 8)
        .attr('y', (d) => d[1] + NODE_H / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('font-size', '11px')
        .attr('font-weight', 600)
        .attr('fill', 'var(--muted-foreground)')
        .attr('opacity', 0.6)
        .text((d) => `Gen ${d[0]}`);

      // 10b. Hover + click on node cards
      cardGroup
        .on('mouseenter', function () {
          d3.select(this)
            .select('rect')
            .transition()
            .duration(150)
            .attr('stroke', 'var(--primary)')
            .attr('stroke-width', 2);
          d3.select(this)
            .transition()
            .duration(150)
            .style('transform-origin', `${NODE_W / 2}px ${NODE_H / 2}px`)
            .style('transform', 'scale(1.04)');
        })
        .on('mouseleave', function () {
          d3.select(this)
            .select('rect')
            .transition()
            .duration(150)
            .attr('stroke', 'var(--border)')
            .attr('stroke-width', 1);
          d3.select(this)
            .transition()
            .duration(150)
            .style('transform', 'scale(1)');
        });

      if (onNodeClick) {
        cardGroup.on('click', function (_event, d) {
          onNodeClick(d.data.id);
        });
      }

      // 11. Zoom + fit
      const padding = 80;
      const treeW = maxX - minX + padding * 2;
      const treeH = maxY - minY + padding * 2;
      const scale = Math.min(containerW / treeW, containerH / treeH, 1.2);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform.toString());
        });

      const svgEl = svgRef.current;
      if (!svgEl) return;

      const svgSel = d3.select(svgEl);
      svgSel.call(zoom);
      zoomRef.current = zoom;

      svgSel.call(
        zoom.transform,
        d3.zoomIdentity
          .translate(containerW / 2, containerH / 2)
          .scale(scale)
          .translate(-centerX, -centerY)
      );
    },
    [data, onNodeClick]
  );

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    const el = svgRef.current;
    const z = zoomRef.current;
    if (el && z) {
      d3.select<SVGSVGElement, unknown>(el).transition().duration(300).call(z.scaleBy, 1.3);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    const el = svgRef.current;
    const z = zoomRef.current;
    if (el && z) {
      d3.select<SVGSVGElement, unknown>(el).transition().duration(300).call(z.scaleBy, 0.7);
    }
  }, []);

  const handleReset = useCallback(() => {
    if (containerRef.current) {
      renderTree(containerRef.current.clientWidth, containerRef.current.clientHeight);
    }
  }, [renderTree]);

  // Render on data/dimensions change
  useEffect(() => {
    if (containerRef.current && dimensions.width > 0) {
      renderTree(dimensions.width, dimensions.height);
    }
  }, [renderTree, dimensions]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setDimensions({ width: container.clientWidth, height: container.clientHeight });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-4 text-muted-foreground ${className || ''}`}
        style={{ height: 'calc(100vh - 180px)' }}
      >
        <TreePine className="h-16 w-16 opacity-30" strokeWidth={1.5} />
        <p className="text-sm font-medium">Belum ada data pohon keluarga</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`tree-container relative w-full overflow-hidden ${className || ''}`}
      style={{ height: 'calc(100vh - 180px)' }}
    >
      <svg ref={svgRef} className="h-full w-full" style={{ display: 'block' }}>
        <defs>
          <filter id="node-shadow" x="-10%" y="-10%" width="130%" height="140%">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="4"
              floodColor="var(--foreground)"
              floodOpacity="0.08"
            />
          </filter>
        </defs>
        <g ref={gRef} />
      </svg>

      {/* Zoom controls */}
      <div className="absolute z-10 flex flex-col gap-1 rounded-lg border border-border bg-card/90 p-1 shadow-lg backdrop-blur-sm bottom-2 right-2 sm:bottom-4 sm:right-4">
        <button
          onClick={handleZoomIn}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:h-8 sm:w-8"
          title="Perbesar"
          type="button"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:h-8 sm:w-8"
          title="Perkecil"
          type="button"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleReset}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:h-8 sm:w-8"
          title="Reset tampilan"
          type="button"
        >
          <Maximize className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
