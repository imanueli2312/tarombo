/**
 * Batak Culture Constants & Helpers
 * 
 * Module ini berisi konstanta, terminologi, dan helper functions
 * terkait budaya Batak yang digunakan di seluruh aplikasi Tarombo.
 */

// ============================================================================
// DALIHAN NA TOLU - Sistem Sosial Batak
// ============================================================================

/** 
 * Tiga pilar utama sistem sosial Batak (Dalihan Na Tolu)
 * Dalihan Na Tolu secara harfiah berarti "tungku yang tiga batu"
 */
export const DALIHAN_NA_TOLU = {
  /** 
   * TULANG - Pihak pemberi istri (wife-giver clan)
   * Hubungan sakral, pihak yang memberikan boru
   */
  tulang: {
    term: 'Tulang',
    description: 'Pihak pemberi istri (wife-giver)',
    role: 'Disegani dan dihormati',
  },
  /** 
   * BORU - Pihak penerima istri (wife-taker clan)
   * Pihak yang menerima boru dari tulang
   */
  boru: {
    term: 'Boru',
    description: 'Pihak penerima istri (wife-taker)',
    role: 'Dihormati dan dilayani',
  },
  /**
   * DONGAN SABUTUHA - Sesama marga (one clan)
   * Hubungan kekerabatan satu marga
   */
  donganSabutuha: {
    term: 'Dongan Sabutuha',
    description: 'Sesama marga (saudara klan)',
    role: 'Sederajat, saling mendukung',
  },
} as const;

// ============================================================================
// TIGA TUJUAN BUDAYA BATAK
// ============================================================================

/**
 * Hasangapon, Hagabeon, Hamoraon
 * Tiga tujuan utama dalam kehidupan orang Batak
 */
export const TIGA_TUJUAN_BATAK = {
  hasangapon: {
    term: 'Hasangapon',
    meaning: 'Kehormatan',
    description: 'Menjaga nama baik dan kehormatan keluarga',
  },
  hagabeon: {
    term: 'Hagabeon',
    meaning: 'Kebahagiaan/Kesejahteraan',
    description: 'Mencapai kebahagiaan dan kesejahteraan hidup',
  },
  hamoraon: {
    term: 'Hamoraon',
    meaning: 'Kekayaan',
    description: 'Mencapai kemakmuran dan kekayaan materi',
  },
} as const;

// ============================================================================
// MARGA-MARGA BATAK
// ============================================================================

/** Marga utama yang dikenal luas dalam adat Batak */
export const MARGA_BATAK = [
  'Hariandja',
  'Simatupang',
  'Sitompul',
  'Siregar',
  'Harahap',
  'Ginting',
  'Tarigan',
  'Sembiring',
  'Peranginangin',
  'Guru',
  'Manurung',
  'Purba',
  'Pardosi',
  'Simbolon',
  'Manurung',
  'Nababan',
  'Hutapea',
  'Panggabean',
  'Simarmata',
  'Sianipar',
  'Tambunan',
  'Lumbantobing',
  'Panjaitan',
  'Simanjuntak',
  'Sipahutar',
  'Hutajulu',
  'Simatupang',
  'Pandjaitan',
  'Boru',
  'Lubis',
  'Daulay',
  'Nasution',
  'Harahap',
  'Matondang',
  'Rangkuti',
  'Pulungan',
  'Malau',
  'Enda',
  'Karo-karo',
  'Sinaga',
  'Silitonga',
  'Aritonang',
  'Rajagukguk',
  'Nainggolan',
  'Simanjuntak',
  'Siregar',
  'Tampubolon',
  'Hutagalung',
  'Marbun',
  'Lumban Gaol',
  'Lumban Raja',
  'Lumban Tobing',
  'Lumban Toruan',
  'Nahas',
  'Saragi',
  'Wicaksono',
  'Bakara',
  'Simanjuntak',
] as const;

/** Marga default untuk keturunan langsung (marga ayah dalam patrilineal Batak) */
export const MARGA_UTAMA = 'Hariandja';

// ============================================================================
// TERMINOLOGI KEBKERABATAN BATAK
// ============================================================================

/** Istilah-istilah kekerabatan Batak yang umum */
export const ISTILAH_KEKERABATAN = {
  // Orang tua
  amang: { term: 'Amang', meaning: 'Ayah' },
  inang: { term: 'Inang', meaning: 'Ibu' },
  
  // Saudara
  bapa: { term: 'Bapa', meaning: 'Saudara laki-laki (kakak)' },
  anggi: { term: 'Anggi', meaning: 'Saudara laki-laki (adik)' },
  nanting: { term: 'Nanting', meaning: 'Saudara perempuan (kakak)' },
  sauri: { term: 'Sauri', meaning: 'Saudara perempuan (adik)' },
  
  // Pernikahan
  boru: { term: 'Boru', meaning: 'Istri / Perempuan yang diterima' },
  parumaen: { term: 'Parumaen', meaning: 'Suami' },
  
  // Spesial
  pariban: { term: 'Pariban', meaning: 'Sepupu dari pihak ibu (anak saudara ibu)' },
  tulang: { term: 'Tulang', meaning: 'Pihak pemberi istri / ibu dari istri' },
  
  // Anak
  boruNiAmang: { term: 'Boru ni Amang', meaning: 'Anak perempuan ayah' },
  doli: { term: 'Doli', meaning: 'Anak laki-laki' },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Menentukan peran Dalihan Na Tolu seseorang terhadap orang lain
 * @param personMarga - Marga orang yang dilihat
 * @param otherMarga - Marga orang pembanding
 * @param isBloodLineage - Apakah orang ini keturunan langsung marga utama
 * @returns Peran Dalihan Na Tolu
 */
export type DalihanRole = 'tulang' | 'boru' | 'dongan' | null;

export function getDalihanRole(
  personMarga: string | null,
  otherMarga: string | null,
): DalihanRole {
  if (!personMarga || !otherMarga) return null;
  if (personMarga === otherMarga) return 'dongan';
  // Dalam konteks sederhana: jika marga berbeda, hubungannya bisa tulang atau boru
  // bergantung pada arah pernikahan. Return null untuk non-dongan yang ambigu.
  return null;
}

/**
 * Mendapatkan label marga untuk ditampilkan di UI
 * Jika marga kosong, return marga utama (untuk keturunan langsung)
 */
export function getMargaLabel(margaAsal: string | null | undefined, isBloodLineage = true): string {
  if (margaAsal) return margaAsal;
  return isBloodLineage ? MARGA_UTAMA : '-';
}

/**
 * Format nama lengkap dengan marga (sesuai adat Batak)
 * Contoh: "Raja Hariandja" atau "Johari Siregar"
 */
export function formatNamaBatak(
  nama: string,
  namaPanggilan: string | null,
  margaAsal: string | null,
): { display: string; full: string } {
  const display = namaPanggilan || nama;
  if (margaAsal && !nama.toLowerCase().endsWith(margaAsal.toLowerCase())) {
    return { display, full: `${nama} ${margaAsal}` };
  }
  return { display, full: nama };
}

/**
 * Mendapatkan istilah Batak untuk hubungan keluarga
 */
export function getKinshipTerm(
  relation: 'father' | 'mother' | 'brother_older' | 'brother_younger' | 'sister_older' | 'sister_younger' | 'spouse' | 'daughter' | 'son',
): string {
  const terms: Record<string, string> = {
    father: 'Amang',
    mother: 'Inang',
    brother_older: 'Bapa',
    brother_younger: 'Anggi',
    sister_older: 'Nanting',
    sister_younger: 'Sauri',
    spouse: 'Boru',
    daughter: 'Boru ni Amang',
    son: 'Doli',
  };
  return terms[relation] || '';
}

/**
 * Mendapatkan penjelasan Dalihan Na Tolu untuk ditampilkan
 */
export function getDalihanExplanation(role: DalihanRole): string | null {
  if (!role) return null;
  switch (role) {
    case 'tulang':
      return `${DALIHAN_NA_TOLU.tulang.term} — ${DALIHAN_NA_TOLU.tulang.description}. ${DALIHAN_NA_TOLU.tulang.role}.`;
    case 'boru':
      return `${DALIHAN_NA_TOLU.boru.term} — ${DALIHAN_NA_TOLU.boru.description}. ${DALIHAN_NA_TOLU.boru.role}.`;
    case 'dongan':
      return `${DALIHAN_NA_TOLU.donganSabutuha.term} — ${DALIHAN_NA_TOLU.donganSabutuha.description}. ${DALIHAN_NA_TOLU.donganSabutuha.role}.`;
    default:
      return null;
  }
}

/**
 * Label status pernikahan dalam bahasa Batak (bilingual)
 */
export const MARITAL_STATUS_BATAK: Record<string, { id: string; batak: string }> = {
  belum_menikah: { id: 'Belum Menikah', batak: 'Belum manjalo' },
  menikah: { id: 'Menikah', batak: 'Manjalo' },
  cerai: { id: 'Cerai', batak: 'Pisah' },
  duda: { id: 'Duda', batak: 'Duda' },
  janda: { id: 'Janda', batak: 'Janda' },
};
