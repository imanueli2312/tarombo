'use client';

import { useState, useEffect } from 'react';
import { t, type Locale } from '@/lib/i18n';

interface FamilyTreeViewProps {
  userId: string;
  locale: Locale;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

interface TreeNode {
  user: any;
  children: TreeNode[];
}

function countByLevel(node: TreeNode, depth: number, counts: number[]) {
  if (depth > 0 && depth <= 6) counts[depth - 1] = (counts[depth - 1] || 0) + 1;
  for (const child of node.children) {
    countByLevel(child, depth + 1, counts);
  }
}

function renderTree(node: TreeNode, onNavigate: (view: string, params?: Record<string, string>) => void, level: number): React.ReactNode {
  if (level > 6) return null;
  return (
    <div key={node.user.id} className={`branch lv${level + 1}`} style={level === 0 ? { marginLeft: 0 } : {}}>
      {level > 0 ? (
        <div className="entry sole">
          <span
            className="label"
            onClick={() => onNavigate('user', { userId: node.user.id })}
            role="button"
            tabIndex={0}
          >
            {node.user.name || node.user.nickname}
          </span>
        </div>
      ) : null}
      {node.children.map((child) => renderTree(child, onNavigate, level + 1))}
    </div>
  );
}

export default function FamilyTreeView({ userId, locale, onNavigate }: FamilyTreeViewProps) {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/users/${userId}/tree`);
        if (!res.ok) { setError('Not found'); return; }
        setTree(await res.json());
      } catch { setError('Failed to load'); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, textAlign: 'center', color: '#bf5329' }}>{error}</div>;
  if (!tree) return null;

  const counts = new Array(6).fill(0) as number[];
  countByLevel(tree, 0, counts);
  const totalChildren = counts[0];
  const totalGrandchildren = counts[1];
  const totalGreatGrandchildren = counts[2];

  return (
    <div>
      <div className="page-header flex items-center justify-between flex-wrap gap-2">
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>{t('family_tree', locale)} - {tree.user.name || tree.user.nickname}</h1>
        <div className="flex gap-1">
          <button onClick={() => onNavigate('tree2', { userId })} className="btn-silsilah btn-silsilah-default btn-silsilah-sm">
            Vertical ↓
          </button>
          <button onClick={() => onNavigate('user', { userId })} className="btn-silsilah btn-silsilah-default btn-silsilah-sm">
            ← {t('show_profile', locale)}
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: 30 }}>
        <div id="wrapper">
          {/* Root node */}
          <span
            className="label"
            style={{ display: 'inline-block', width: 170, textAlign: 'center', fontSize: 12, border: '2px solid #3097D1', borderRadius: 6, padding: '4px 8px', lineHeight: '14px', background: '#d0ecf8', textDecoration: 'none', color: '#333', fontWeight: 'bold', cursor: 'pointer' }}
            onClick={() => onNavigate('user', { userId: tree.user.id })}
            role="button"
            tabIndex={0}
          >
            {tree.user.name || tree.user.nickname}
          </span>
          {/* Children branches */}
          {tree.children.map((child) => renderTree(child, onNavigate, 1))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="silsilah-panel mt-4">
        <div className="silsilah-panel-body text-center">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ fontSize: 28, fontWeight: 'bold', color: '#3097D1' }}>
            <div>
              <div>{totalChildren}</div>
              <div style={{ fontSize: 12, fontWeight: 'normal', color: '#999' }}>{t('childs', locale)}</div>
            </div>
            <div>
              <div>{totalGrandchildren}</div>
              <div style={{ fontSize: 12, fontWeight: 'normal', color: '#999' }}>{t('grand_child_count', locale)}</div>
            </div>
            <div>
              <div>{totalGreatGrandchildren}</div>
              <div style={{ fontSize: 12, fontWeight: 'normal', color: '#999' }}>{t('jumlah_cicit', locale)}</div>
            </div>
            <div>
              <div>{counts[3] + counts[4] + counts[5]}</div>
              <div style={{ fontSize: 12, fontWeight: 'normal', color: '#999' }}>4-6 {t('family_tree', locale)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}