'use client';

import { useState, useEffect } from 'react';
import { t, type Locale } from '@/lib/i18n';

interface FamilyTreeVerticalViewProps {
  userId: string;
  locale: Locale;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

interface TreeNode {
  user: any;
  children: TreeNode[];
}

function renderVerticalTree(node: TreeNode, onNavigate: (view: string, params?: Record<string, string>) => void, depth: number): React.ReactNode {
  if (depth > 4) return null;
  return (
    <li key={node.user.id}>
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); onNavigate('user', { userId: node.user.id }); }}
        title={`${node.user.name || node.user.nickname} (${node.user.genderId === 1 ? 'M' : 'F'})`}
      >
        {node.user.name || node.user.nickname}
      </a>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => renderVerticalTree(child, onNavigate, depth + 1))}
        </ul>
      )}
    </li>
  );
}

export default function FamilyTreeVerticalView({ userId, locale, onNavigate }: FamilyTreeVerticalViewProps) {
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

  return (
    <div>
      <div className="page-header flex items-center justify-between flex-wrap gap-2">
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>{t('family_tree', locale)} - {tree.user.name || tree.user.nickname}</h1>
        <div className="flex gap-1">
          <button onClick={() => onNavigate('tree', { userId })} className="btn-silsilah btn-silsilah-default btn-silsilah-sm">
            Horizontal →
          </button>
          <button onClick={() => onNavigate('user', { userId })} className="btn-silsilah btn-silsilah-default btn-silsilah-sm">
            ← {t('show_profile', locale)}
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: 30 }}>
        <div className="family-tree-vertical" style={{ textAlign: 'center' }}>
          <ul>
            {renderVerticalTree(tree, onNavigate, 0)}
          </ul>
        </div>
      </div>
    </div>
  );
}