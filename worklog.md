---
Task ID: 1
Agent: Main
Task: Add selectable themes and tree layout types (vertical, horizontal, custom), then push to GitHub

Work Log:
- Read and analyzed current codebase: TreeVisualization.tsx, AppSidebar.tsx, page.tsx, app-store.ts
- Created `/src/store/theme-store.ts` with:
  - 5 themes: Batak Toba, Modern Minimal, Hutan Tropis, Samudra, Malam Batak (dark)
  - Each theme defines colors for: tree cards/links, sidebar, page layout, popup
  - 3 tree layout types: horizontal (left-to-right), vertical (top-to-bottom), custom (user-adjustable)
  - Custom layout config: horizontal gap, vertical gap, card width, card height
  - Zustand store with persist middleware for user preferences
- Rewrote `/src/components/tarombo/TreeVisualization.tsx`:
  - Simplified cards: name + ✝, nickname, "Pasangan: name ✝" below
  - Single card layout (no side-by-side couple cards)
  - Horizontal layout: d3.tree with swapped x/y coords (depth→right, siblings→down)
  - Vertical layout: d3.tree with standard orientation (depth→down, siblings→right)
  - Custom layout: user-adjustable sliders for spacing and card dimensions
  - Theme selector dropdown in tree toolbar
  - Layout selector dropdown in tree toolbar
  - Export PNG button
  - All tree colors (cards, links, text, badges) driven by theme store
- Updated `/src/components/layout/AppSidebar.tsx`:
  - All sidebar colors driven by theme store (inline styles)
  - Added "Tema & Tampilan" section with all 5 themes listed
  - Active theme indicator (●)
- Updated `/src/app/page.tsx`:
  - TreeView, MainLayout, and loading state all use theme colors
  - Background gradient, footer border, loading spinner colors from theme
- Verified with Agent Browser:
  - Login page renders correctly
  - Tree renders with all data nodes and simplified cards
  - Theme switching works (tested Batak Toba, Samudra, Malam Batak)
  - Layout switching works (tested Horizontal, Vertical, Custom)
  - Custom layout shows 4 adjustment sliders
  - All 5 themes visible in sidebar panel

Stage Summary:
- Created: `src/store/theme-store.ts` (theme definitions + layout config store)
- Modified: `src/components/tarombo/TreeVisualization.tsx` (complete rewrite with themes + layouts)
- Modified: `src/components/layout/AppSidebar.tsx` (theme-aware styling + theme selector)
- Modified: `src/app/page.tsx` (theme-aware layout backgrounds)
- All features verified working via Agent Browser
- Lint passes cleanly
