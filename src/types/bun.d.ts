/**
 * Mengaktifkan tipe global Bun (audit R-03).
 *
 * bun-types ada di devDependencies sejak lama tetapi tidak pernah
 * direferensikan tsconfig — API Bun.* tidak terketik. Triple-slash reference
 * di bawah mengaktifkannya secara global tanpa mengganggu auto-include
 * @types/* (react, react-dom, dll.) yang dikontrol tsconfig.
 */
/// <reference types="bun-types" />
