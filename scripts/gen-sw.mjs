#!/usr/bin/env node
/**
 * Generate public/sw.js dari scripts/sw-template.js dengan CACHE_NAME terikat
 * versi aplikasi + git SHA pendek (audit T-06).
 *
 * Alasan: nama cache manual ('tarombo-v2') harus dinaikkan tangan setiap rilis;
 * lupa sekali saja dan pengunjung lama terkunci di HTML versi lama. Dengan
 * menautkan nama cache ke versi + SHA build, setiap build baru otomatis
 * menghasilkan bucket cache baru — SW lama membersihkan bucket lama saat
 * activate.
 *
 * Dijalankan otomatis oleh `bun run dev` dan `bun run build`.
 * Override SHA via env BUILD_SHA (CI / Docker tanpa .git).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

let sha = '';
if (process.env.BUILD_SHA) {
  sha = String(process.env.BUILD_SHA).trim();
} else {
  try {
    sha = execSync('git rev-parse --short HEAD', {
      cwd: root,
      // stdout HARUS 'pipe' agar execSync mengembalikan output;
      // 'ignore' membuatnya mengembalikan null.
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    // Tanpa .git (mis. Docker build context) — cukup versi paket.
  }
}

const cacheName = `tarombo-${pkg.version}${sha ? `-${sha}` : ''}`;

const template = readFileSync(join(root, 'scripts', 'sw-template.js'), 'utf8');
if (!template.includes('__CACHE_NAME__')) {
  console.error('[gen-sw] template tidak memuat penanda __CACHE_NAME__');
  process.exit(1);
}

const target = join(root, 'public', 'sw.js');
writeFileSync(target, template.replaceAll('__CACHE_NAME__', cacheName));
console.log(`[gen-sw] public/sw.js ditulis — CACHE_NAME=${cacheName}`);
