/**
 * Batak Culture Constants & Helpers
 *
 * Module ini berisi konstanta, terminologi, dan helper functions
 * terkait budaya Batak yang digunakan di seluruh aplikasi Tarombo.
 *
 * Panduan Adat yang diterapkan dalam aplikasi (lihat docs/PANDUAN_ADAT.md):
 * 1. Eksogami marga — pernikahan semarga dilarang adat Batak.
 * 2. Marga diwariskan secara patrilineal (mengikuti marga ayah).
 * 3. Larangan menikah dengan saudara kandung dan sepupu sejajar (anak dari
 *    saudara sejenis) — mereka adalah "dongan sabutuha".
 * 4. Pernikahan pariban (sepupu silang) adalah pola adat yang dianjurkan.
 * 5. Dalihan Na Tolu (Tulang/Hula-hula, Boru, Dongan Sabutuha) dihitung dari
 *    data silsilah yang nyata.
 */

// ============================================================================
// KONFIGURASI
// ============================================================================

/**
 * Marga utama keluarga (marga keturunan garis darah aplikasi ini).
 * Dapat dikonfigurasi lewat env NEXT_PUBLIC_MARGA_UTAMA agar aplikasi dapat
 * dipakai keluarga bermarga lain tanpa mengubah kode.
 */
export const MARGA_UTAMA: string = process.env.NEXT_PUBLIC_MARGA_UTAMA || 'Hariandja';

// ============================================================================
// DALIHAN NA TOLU - Sistem Sosial Batak
// ============================================================================

/**
 * Tiga pilar utama sistem sosial Batak (Dalihan Na Tolu)
 * Dalihan Na Tolu secara harfiah berarti "tungku yang tiga batu"
 */
export const DALIHAN_NA_TOLU = {
  /**
   * TULANG / HULA-HULA - Pihak pemberi istri (wife-giver clan)
   * Hubungan sakral, pihak yang memberikan boru
   */
  tulang: {
    term: 'Tulang (Hula-hula)',
    description: 'Pihak pemberi istri (wife-giver), termasuk saudara ibu dan keluarga istri',
    role: 'Disegani dan dihormati (sumangat)',
  },
  /**
   * BORU - Pihak penerima istri (wife-taker clan)
   * Pihak yang menerima boru dari tulang
   */
  boru: {
    term: 'Boru',
    description: 'Pihak penerima istri (wife-taker), termasuk suami anak perempuan dan suami saudara perempuan',
    role: 'Dihormati dan melaksanakan kewajiban adat',
  },
  /**
   * DONGAN SABUTUHA - Sesama marga (one clan)
   * Hubungan kekerabatan satu marga
   */
  donganSabutuha: {
    term: 'Dongan Sabutuha',
    description: 'Sesama marga (saudara klan, satu tulang punggung)',
    role: 'Sederajat, saling mendukung dan tolong-menolong',
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
    description: 'Mencapai kebahagiaan, kesejahteraan, dan keturunan yang baik',
  },
  hamoraon: {
    term: 'Hamoraon',
    meaning: 'Kekayaan',
    description: 'Mencapai kemakmuran dan kekayaan materi',
  },
} as const;

// ============================================================================
// MARGA-MARGA BATAK (per sub-etnis, tanpa duplikat)
// ============================================================================

/**
 * Marga Batak yang dikenal luas, dikelompokkan per sub-etnis.
 * Daftar ini bersifat representatif (tidak lengkap) — pengguna tetap dapat
 * mengisi marga lain di luar daftar melalui isian bebas.
 */
export const MARGA_BY_SUBGROUP: Record<string, string[]> = {
  toba: [
    'Hariandja', 'Simatupang', 'Sitompul', 'Hutapea', 'Hutajulu', 'Hutagalung',
    'Hutahaean', 'Panggabean', 'Simarmata', 'Sianipar', 'Simbolon', 'Tampubolon',
    'Tambunan', 'Panjaitan', 'Simanjuntak', 'Sipahutar', 'Sihombing', 'Sitorus',
    'Sirait', 'Silitonga', 'Sigiro', 'Siagian', 'Nababan', 'Nainggolan',
    'Lumbantobing', 'Lumban Gaol', 'Lumban Raja', 'Lumban Toruan', 'Marbun',
    'Rajagukguk', 'Sarumpaet',
  ],
  karo: [
    'Ginting', 'Tarigan', 'Sembiring', 'Peranginangin', 'Karo-Karo', 'Barus',
    'Sebayang', 'Kembaren', 'Sinuhaji',
  ],
  mandailing_angkola: [
    'Lubis', 'Nasution', 'Harahap', 'Siregar', 'Pulungan', 'Rangkuti',
    'Batubara', 'Daulay', 'Hasibuan', 'Dalimunthe', 'Tanjung', 'Matondang',
    'Malau', 'Mande', 'Parinduri', 'Aritonang',
  ],
  simalungun: [
    'Purba', 'Sinaga', 'Saragih', 'Manurung', 'Brahmana',
  ],
  pakpak: [
    'Berutu', 'Boangmanalu', 'Dabar', 'Lingga', 'Tumanggor',
  ],
};

/** Label sub-etnis Batak untuk UI */
export const MARGA_SUBGROUP_LABELS: Record<string, string> = {
  toba: 'Batak Toba',
  karo: 'Batak Karo',
  mandailing_angkola: 'Batak Mandailing & Angkola',
  simalungun: 'Batak Simalungun',
  pakpak: 'Batak Pakpak (Dairi)',
};

/** Daftar marga gabungan (unique, sorted) untuk saran isian di UI */
export const MARGA_BATAK: string[] = Array.from(
  new Set(Object.values(MARGA_BY_SUBGROUP).flat())
).sort((a, b) => a.localeCompare(b));

/**
 * Normalisasi nama marga untuk perbandingan adat:
 * lowercase, spasi berlebih/tanda hubung dihilangkan.
 * Contoh: "Lumban Tobing", "Lumbantobing", "lumban-tobing" dianggap sama.
 */
export function normalizeMarga(marga: string | null | undefined): string {
  if (!marga) return '';
  return marga.trim().toLowerCase().replace(/[\s\-_]+/g, '');
}

/**
 * Cek apakah dua marga adalah marga yang sama (setelah normalisasi).
 * Dipakai untuk validasi eksogami marga (larangan menikah semarga).
 */
export function isSameMarga(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeMarga(a);
  const nb = normalizeMarga(b);
  if (!na || !nb) return false;
  return na === nb;
}

// ============================================================================
// TERMINOLOGI KEKERABATAN BATAK (Toba)
// ============================================================================

/**
 * Istilah-istilah kekerabatan Batak yang umum (diperbaiki & diperluas).
 * - Parumaen = menantu perempuan (istri anak laki-laki), BUKAN suami.
 * - Tunggane = suami saudara perempuan / menantu laki-laki.
 * - Hula-hula = pihak pemberi istri (senada dengan tulang).
 */
export const ISTILAH_KEKERABATAN = {
  // Orang tua
  amang: { term: 'Amang', meaning: 'Ayah' },
  inang: { term: 'Inang', meaning: 'Ibu' },
  amangTua: { term: 'Amang Tua', meaning: 'Paman tertua (kakak ayah)' },
  amangUda: { term: 'Amang Uda', meaning: 'Paman bungsu (adik ayah)' },
  tulang: { term: 'Tulang', meaning: 'Paman dari pihak ibu (pihak pemberi istri)' },
  nantulang: { term: 'Nantulang', meaning: 'Istri dari tulang (bibi dari pihak ibu)' },

  // Saudara
  bapa: { term: 'Bapa', meaning: 'Kakak laki-laki (sapaan adik)' },
  anggi: { term: 'Anggi', meaning: 'Adik (laki-laki maupun perempuan)' },
  nanting: { term: 'Nanting', meaning: 'Kakak perempuan (sapaan adik)' },
  sauri: { term: 'Sauri', meaning: 'Adik perempuan' },
  donganSabutuha: { term: 'Dongan Sabutuha', meaning: 'Saudara semarga / sepupu sejajar' },

  // Pernikahan & pariban
  pariban: { term: 'Pariban', meaning: 'Sepupu silang (pasangan adat yang dianjurkan)' },
  boru: { term: 'Boru', meaning: 'Istri / perempuan yang diterima (untuk ego laki-laki)' },
  doli: { term: 'Doli', meaning: 'Suami / laki-laki yang diterima (untuk ego perempuan)' },
  parumaen: { term: 'Parumaen', meaning: 'Menantu perempuan (istri anak laki-laki)' },
  tunggane: { term: 'Tunggane', meaning: 'Menantu laki-laki (suami anak perempuan / suami saudara perempuan)' },
  hulahula: { term: 'Hula-hula', meaning: 'Pihak pemberi istri (keluarga istri dan ibu)' },
  ipar: { term: 'Ipar', meaning: 'Saudara sepasangan (suami/istri dari saudara)' },

  // Anak
  boruNiAmang: { term: 'Boru ni Amang', meaning: 'Anak perempuan' },
  doliNiInang: { term: 'Doli', meaning: 'Anak laki-laki' },
} as const;

// ============================================================================
// ATURAN ADAT PERNIKAHAN (Panduan Adat inti)
// ============================================================================

/**
 * Aturan adat pernikahan yang divalidasi aplikasi.
 * Dipakai API /api/partnerships dan ditampilkan di Panduan Adat in-app.
 */
export const ATURAN_ADAT_PERNIKAHAN = [
  {
    code: 'eksogami_marga',
    title: 'Eksogami Marga',
    batak: 'Ndang boi marboru sari marga',
    rule: 'Larangan menikah dengan semarga. Marga Batak bersifat patrilineal; pasangan wajib bermarga berbeda.',
    enforcement: 'blocked',
  },
  {
    code: 'saudara_kandung',
    title: 'Larangan Menikah dengan Saudara Kandung',
    batak: 'Dongan sabutuha',
    rule: 'Saudara kandung (satu ayah dan/atau satu ibu) tidak boleh menikah — hubungan darah langsung.',
    enforcement: 'blocked',
  },
  {
    code: 'sepupu_sejajar',
    title: 'Larangan Menikah dengan Sepupu Sejajar',
    batak: 'Anak ni dongan sabutuha',
    rule: 'Anak dari saudara sejenis (kakak/adik ayah, atau kakak/adik ibu) dianggap saudara sendiri (dongan sabutuha) dan tidak boleh menikah.',
    enforcement: 'blocked',
  },
  {
    code: 'garis_leluhur',
    title: 'Larangan Menikah dalam Garis Leluhur',
    batak: 'Ompu nang pahompu',
    rule: 'Pernikahan antara seseorang dengan keturunan atau leluhurnya langsung dilarang.',
    enforcement: 'blocked',
  },
  {
    code: 'pariban',
    title: 'Pernikahan Pariban (Dianjurkan)',
    batak: 'Pariban',
    rule: 'Menikah dengan sepupu silang (anak saudara ibu laki-laki / anak saudara ayah perempuan) adalah pola adat yang dianjurkan — memperkokoh Dalihan Na Tolu.',
    enforcement: 'preferred',
  },
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Menentukan peran Dalihan Na Tolu seseorang terhadap orang lain
 * (versi ringan berbasis marga — untuk relasi berbasis data silsilah nyata,
 * lihat getDalihanRelations() di lib/db.ts).
 */
export type DalihanRole = 'tulang' | 'boru' | 'dongan' | null;

export function getDalihanRole(
  personMarga: string | null,
  otherMarga: string | null,
): DalihanRole {
  if (!personMarga || !otherMarga) return null;
  if (isSameMarga(personMarga, otherMarga)) return 'dongan';
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
 * Mendapatkan istilah Batak untuk hubungan keluarga.
 * Gender-aware: istilah pasangan & anak bergantung pada jenis kelamin ego.
 */
export function getKinshipTerm(
  relation:
    | 'father'
    | 'mother'
    | 'brother_older'
    | 'brother_younger'
    | 'sister_older'
    | 'sister_younger'
    | 'spouse'
    | 'daughter'
    | 'son'
    | 'mother_brother'
    | 'father_elder_brother'
    | 'father_younger_brother'
    | 'son_wife'
    | 'daughter_husband'
    | 'sister_husband'
    | 'cross_cousin',
  egoGender?: 'L' | 'P',
): string {
  const terms: Record<string, string> = {
    father: 'Amang',
    mother: 'Inang',
    brother_older: 'Bapa',
    brother_younger: 'Anggi',
    sister_older: 'Nanting',
    sister_younger: 'Sauri',
    // istilah pasangan bergantung jenis kelamin ego
    spouse: egoGender === 'P' ? 'Doli' : 'Boru',
    daughter: 'Boru ni Amang',
    son: 'Doli',
    mother_brother: 'Tulang',
    father_elder_brother: 'Amang Tua',
    father_younger_brother: 'Amang Uda',
    son_wife: 'Parumaen',
    daughter_husband: 'Tunggane',
    sister_husband: 'Tunggane',
    cross_cousin: 'Pariban',
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
 * Label status pernikahan dalam bahasa Batak (bilingual).
 * Marbagas = telah berumah tangga; Saur = bercerai; Balo = janda (perempuan).
 */
export const MARITAL_STATUS_BATAK: Record<string, { id: string; batak: string }> = {
  belum_menikah: { id: 'Belum Menikah', batak: 'Dope marbagas' },
  menikah: { id: 'Menikah', batak: 'Marbagas' },
  cerai: { id: 'Cerai', batak: 'Saur' },
  duda: { id: 'Duda', batak: 'Duda' },
  janda: { id: 'Janda', batak: 'Balo' },
};

// ============================================================================
// KATEGORI ORAL HISTORY (TURIAN)
// ============================================================================

/**
 * Kategori-kategori Turian (oral history/tradisi lisan) dalam budaya Batak
 * Turian adalah cerita lisan yang diturunkan dari generasi ke generasi
 */
export const ORAL_HISTORY_CATEGORIES: Record<string, { label: string; batak: string; description: string; icon: string }> = {
  turian_asal_usul: {
    label: 'Asal Usul',
    batak: 'Turian Asal Na Gogo',
    description: 'Cerita asal-usul marga dan leluhur (tontan hasangapon)',
    icon: 'BookOpen',
  },
  turian_migrasi: {
    label: 'Migrasi',
    batak: 'Turian Pangalpohan',
    description: 'Cerita perpindahan dan migrasi leluhur ke daerah baru',
    icon: 'Map',
  },
  turian_peristiwa: {
    label: 'Peristiwa Bersejarah',
    batak: 'Turian Panggoaran',
    description: 'Peristiwa penting dalam sejarah keluarga/marga',
    icon: 'ScrollText',
  },
  gondang: {
    label: 'Gondang',
    batak: 'Gondang Sabangunan',
    description: 'Tradisi gondang (musik dan tarian adat), gondang boru, gondang hasangapon',
    icon: 'Music',
  },
  mangalahat: {
    label: 'Mangalahat',
    batak: 'Mangalahat Habonaran',
    description: 'Upacara pemberian berkat dan restu adat',
    icon: 'Sparkles',
  },
  saur_matua: {
    label: 'Saur Matua',
    batak: 'Saur Matua / Adat Pemakaman',
    description: 'Upacara kematian adat Batak yang lengkap',
    icon: 'Candle',
  },
  pesta_pernikahan: {
    label: 'Pesta Pernikahan Adat',
    batak: 'Pesta Pernikahan Adat (Manjalo)',
    description: 'Upacara dan adat pernikahan Batak (manjalo)',
    icon: 'Heart',
  },
  turian_umum: {
    label: 'Turian Umum',
    batak: 'Turian Umum',
    description: 'Cerita lisan dan tradisi umum lainnya',
    icon: 'MessageCircle',
  },
};

// ============================================================================
// JENIS PUSAKA (Warisan Pusaka Batak)
// ============================================================================

/**
 * Jenis-jenis Pusaka dalam budaya Batak
 * Pusaka adalah benda warisan turun-temurun yang sakral dan dihormati
 */
export const PUSAKA_TYPES: Record<string, { label: string; batak: string; description: string; icon: string }> = {
  tombak: {
    label: 'Tombak',
    batak: 'Piso / Tombak',
    description: 'Tombak pusaka (piso gaja dompak, piso sanalangiralangi)',
    icon: 'Sword',
  },
  ulos: {
    label: 'Ulos',
    batak: 'Ulos',
    description: 'Kain tenun tradisional Batak (ulos ragi hotang, ulos sadum, ulos bintang maratur)',
    icon: 'Shirt',
  },
  tunggal_panaluan: {
    label: 'Tunggal Panaluan',
    batak: 'Tunggal Panaluan',
    description: 'Tongkat sakral penanda otoritas spiritual (datu/pangulu)',
    icon: 'Wand2',
  },
  gorga: {
    label: 'Gorga',
    batak: 'Gorga Batak',
    description: 'Ukiran tradisional pada rumah adat (ruma bolon)',
    icon: 'Frame',
  },
  gabe: {
    label: 'Gabe',
    batak: 'Gabe',
    description: 'Topeng atau patung ritual adat Batak',
    icon: 'Drama',
  },
  hasangapon: {
    label: 'Hasangapon',
    batak: 'Hasangapon',
    description: 'Simbol kehormatan dan kebesaran keluarga',
    icon: 'Crown',
  },
  rattan_box: {
    label: 'Tempayan Rotan',
    batak: 'Tapanuli / Raga Rotan',
    description: 'Wadah rotan tradisional untuk upacara adat',
    icon: 'Box',
  },
  kalung_bulan: {
    label: 'Kalung Bulan',
    batak: 'Rote / Bulang',
    description: 'Perhiasan tradisional Batak (kalung, gelang, tali)',
    icon: 'Gem',
  },
  gutar_guar: {
    label: 'Gutar Guar',
    batak: 'Gutar Guar',
    description: 'Alat musik tradisional Batak (gutar, guar, taganing)',
    icon: 'Guitar',
  },
  tali_tiga: {
    label: 'Tali Tiga',
    batak: 'Tali Tiga',
    description: 'Simbol tali pengikat persaudaraan dalam Dalihan Na Tolu',
    icon: 'Link',
  },
  porhala: {
    label: 'Porhala',
    batak: 'Porhala',
    description: 'Batu atau benda bertuah dari leluhur',
    icon: 'Diamond',
  },
  jamita: {
    label: 'Jamita',
    batak: 'Jamita',
    description: 'Benda kebesaran yang menandakan status sosial',
    icon: 'Award',
  },
  sial_solam_sial_sao: {
    label: 'Sial Solam / Sial Sao',
    batak: 'Sial Solam / Sial Sao',
    description: 'Perhiasan dan hiasan adat Batak',
    icon: 'Gem',
  },
  lainnya: {
    label: 'Lainnya',
    batak: 'Lain-lain',
    description: 'Pusaka lainnya yang tidak termasuk dalam kategori di atas',
    icon: 'Package',
  },
};

// ============================================================================
// PERAN PARHATA (Pembicara Adat)
// ============================================================================

/**
 * Peran-peran dalam upacara adat Batak
 * Parhata adalah pembicara adat yang menguasai tata cara upacara
 */
export const PERAN_ADAT = {
  parhata: {
    term: 'Parhata',
    description: 'Pembicara adat utama yang menguasai seluruh tata cara upacara',
  },
  habonaronDoBona: {
    term: 'Habonaron do Bona',
    description: 'Pihak yang memberikan berkat (biasanya pihak tulang)',
  },
  namoraPungka: {
    term: 'Namora Pungka',
    description: 'Kakek/nenek yang dihormati dalam upacara',
  },
  rajaPanas: {
    term: 'Raja Panas',
    description: 'Ketua pelaksana upacara adat',
  },
  donganTubu: {
    term: 'Dongan Tubu',
    description: 'Saudara satu marga yang turut membantu dalam upacara',
  },
  boru: {
    term: 'Boru',
    description: 'Pihak penerima istri yang memiliki kewajiban adat',
  },
} as const;

// ============================================================================
// PANDUAN ADAT (sumber konten untuk dialog in-app & dokumen)
// ============================================================================

/**
 * Ringkasan Panduan Adat untuk ditampilkan di aplikasi (dialog Panduan Adat).
 * Versi lengkap tersedia di docs/PANDUAN_ADAT.md.
 */
export const PANDUAN_ADAT = {
  dalihanNaTolu: {
    title: 'Dalihan Na Tolu',
    description:
      '"Tungku tiga batu" — tiga pilar sosial Batak yang menjaga keseimbangan adat: Hula-hula (Tulang) sebagai pemberi istri yang dihormati, Boru sebagai penerima istri yang melaksanakan kewajiban, dan Dongan Sabutuha sebagai saudara semarga yang sederajat.',
    pillars: [
      { term: 'Hula-hula / Tulang', role: 'Pemberi istri — dihormati dan dimintai restu' },
      { term: 'Boru', role: 'Penerima istri — melaksanakan kewajiban adat' },
      { term: 'Dongan Sabutuha', role: 'Sesama marga — sederajat, tolong-menolong' },
    ],
  },
  pernikahan: {
    title: 'Adat Pernikahan',
    rules: ATURAN_ADAT_PERNIKAHAN,
  },
  marga: {
    title: 'Marga Batak',
    description:
      'Marga diwariskan secara patrilineal — anak mengikuti marga ayah. Marga menentukan identitas klan dan dilarang menikah sesama marga (eksogami). Daftar marga pada aplikasi dikelompokkan per sub-etnis Batak: Toba, Karo, Mandailing & Angkola, Simalungun, dan Pakpak.',
    subgroups: Object.keys(MARGA_BY_SUBGROUP).map((k) => ({
      key: k,
      label: MARGA_SUBGROUP_LABELS[k],
      count: MARGA_BY_SUBGROUP[k].length,
    })),
  },
  glosarium: {
    title: 'Glosarium Istilah Kekerabatan',
    entries: ISTILAH_KEKERABATAN,
  },
  tigaTujuan: {
    title: 'Tiga Tujuan Hidup Orang Batak',
    entries: TIGA_TUJUAN_BATAK,
  },
} as const;

/**
 * Mendapatkan label kategori oral history
 */
export function getOralHistoryCategoryLabel(category: string): { label: string; batak: string } {
  const cat = ORAL_HISTORY_CATEGORIES[category];
  return cat ? { label: cat.label, batak: cat.batak } : { label: category, batak: category };
}

/**
 * Mendapatkan label jenis pusaka
 */
export function getPusakaTypeLabel(type: string): { label: string; batak: string } {
  const t = PUSAKA_TYPES[type];
  return t ? { label: t.label, batak: t.batak } : { label: type, batak: type };
}

/**
 * Mendapatkan penjelasan peran adat
 */
export function getPeranAdatDescription(role: string): string | null {
  const p = (PERAN_ADAT as Record<string, { term: string; description: string }>)[role];
  return p ? `${p.term} — ${p.description}` : null;
}
