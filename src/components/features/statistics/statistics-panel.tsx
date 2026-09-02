'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  Users,
  User,
  UserRound,
  Heart,
  HeartCrack,
  Cross,
  TrendingUp,
  CalendarDays,
  BookOpen,
  Gem,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface Stats {
  summary: {
    totalPersons: number;
    totalMale: number;
    totalFemale: number;
    totalDeceased: number;
    totalLiving: number;
    totalPartnerships: number;
    activePartnerships: number;
    deepestGeneration: number;
    totalUniqueMarga: number;
    spouseMargaCount: number;
  };
  oldestLiving: { nama: string; tanggal_lahir: string } | null;
  youngest: { nama: string; tanggal_lahir: string } | null;
  generationDistribution: {
    generasi: string;
    jumlah: number;
    lakiLaki: number;
    perempuan: number;
  }[];
  maritalDistribution: { status: string; jumlah: number }[];
  ageDistribution: { range: string; jumlah: number }[];
  margaDistribution: { marga: string; jumlah: number }[];
  tempatAsalDistribution: { asal: string; jumlah: number }[];
  heritage: {
    totalOralHistories: number;
    totalPusakaItems: number;
    sacredPusakaCount: number;
    verifiedOralCount: number;
    oralByCategory: { category: string; jumlah: number }[];
    pusakaByType: { type: string; jumlah: number }[];
  };
}

const genChartConfig = {
  lakiLaki: { label: 'Laki-laki', color: 'oklch(0.6 0.2 250)' },
  perempuan: { label: 'Perempuan', color: 'oklch(0.65 0.2 350)' },
};

const MARITAL_COLORS: Record<string, string> = {
  Belum_Menikah: 'oklch(0.7 0 0)',
  Menikah: 'oklch(0.65 0.2 145)',
  Cerai: 'oklch(0.65 0.2 25)',
  Duda: 'oklch(0.6 0.15 250)',
  Janda: 'oklch(0.6 0.15 350)',
};

const HERITAGE_COLORS = [
  'oklch(0.65 0.18 60)',
  'oklch(0.65 0.18 145)',
  'oklch(0.65 0.18 250)',
  'oklch(0.65 0.18 35)',
  'oklch(0.65 0.18 310)',
  'oklch(0.65 0.18 85)',
  'oklch(0.65 0.18 170)',
  'oklch(0.65 0.18 0)',
];

const AGE_COLORS = [
  'oklch(0.65 0.18 145)',
  'oklch(0.65 0.18 85)',
  'oklch(0.65 0.18 55)',
  'oklch(0.65 0.18 35)',
  'oklch(0.65 0.18 25)',
  'oklch(0.55 0.15 250)',
  'oklch(0.5 0.1 250)',
  'oklch(0.45 0.08 250)',
];

function formatDate(date: string | null): string {
  if (!date) return '-';
  try {
    return format(new Date(date), 'd MMM yyyy', { locale: idLocale });
  } catch {
    return date;
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div
            className={`rounded-lg p-2 ${color}`}
          >
            <Icon className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatisticsPanel() {
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ['statistics'],
    queryFn: () => fetch('/api/statistics').then((r) => r.json()),
    staleTime: 60000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  const { summary, oldestLiving, youngest, generationDistribution, maritalDistribution, ageDistribution, margaDistribution, tempatAsalDistribution, heritage } = data;

  const oralPieData = heritage.oralByCategory.map((d, i) => ({
    ...d,
    fill: HERITAGE_COLORS[i % HERITAGE_COLORS.length],
  }));

  const pusakaPieData = heritage.pusakaByType.map((d, i) => ({
    ...d,
    fill: HERITAGE_COLORS[i % HERITAGE_COLORS.length],
  }));

  const maritalPieData = maritalDistribution.map((d) => ({
    ...d,
    fill: MARITAL_COLORS[d.status.replace(/\s+/g, '_')] || 'oklch(0.7 0 0)',
  }));

  return (
    <div className="space-y-6">
      {/* Summary Title */}
      <div>
        <h2 className="text-lg font-semibold">Statistik Keluarga</h2>
        <p className="text-sm text-muted-foreground">
          Ringkasan data keluarga Marga Hariandja &mdash; Dalihan Na Tolu
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Total Anggota"
          value={summary.totalPersons}
          sub={`${summary.deepestGeneration} generasi`}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
        />
        <StatCard
          icon={User}
          label="Laki-laki"
          value={summary.totalMale}
          sub={`${Math.round((summary.totalMale / summary.totalPersons) * 100)}%`}
          color="bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400"
        />
        <StatCard
          icon={UserRound}
          label="Perempuan"
          value={summary.totalFemale}
          sub={`${Math.round((summary.totalFemale / summary.totalPersons) * 100)}%`}
          color="bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
        />
        <StatCard
          icon={Cross}
          label="Meninggal"
          value={summary.totalDeceased}
          sub={`${summary.totalLiving} masih hidup`}
          color="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Marga Berbeda"
          value={summary.totalUniqueMarga}
          sub={`${summary.spouseMargaCount} marga dari pernikahan`}
          color="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
        />
        <StatCard
          icon={Heart}
          label="Pernikahan Aktif"
          value={summary.activePartnerships}
          sub={`${summary.totalPartnerships} total`}
          color="bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Generasi Terdalam"
          value={`Gen ${summary.deepestGeneration}`}
          sub={`${generationDistribution[generationDistribution.length - 1]?.jumlah || 0} anggota`}
          color="bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400"
        />
        <StatCard
          icon={CalendarDays}
          label="Tertua (Hidup)"
          value={oldestLiving ? oldestLiving.nama : '-'}
          sub={oldestLiving ? `Lahir ${formatDate(oldestLiving.tanggal_lahir)}` : undefined}
          color="bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400"
        />
        <StatCard
          icon={Users}
          label="Termuda"
          value={youngest ? youngest.nama : '-'}
          sub={youngest ? `Lahir ${formatDate(youngest.tanggal_lahir)}` : undefined}
          color="bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
        />
      </div>

      {/* Heritage Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={BookOpen}
          label="Cerita Lisan"
          value={heritage.totalOralHistories}
          sub={`${heritage.verifiedOralCount} terverifikasi`}
          color="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
        />
        <StatCard
          icon={Gem}
          label="Pusaka"
          value={heritage.totalPusakaItems}
          sub={`${heritage.sacredPusakaCount} sakral`}
          color="bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Generation Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Distribusi per Generasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={genChartConfig} className="h-64 w-full">
              <BarChart
                data={generationDistribution}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <XAxis
                  dataKey="generasi"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="lakiLaki"
                  stackId="a"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="perempuan"
                  stackId="a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Marital Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Status Pernikahan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={
                Object.fromEntries(
                  maritalDistribution.map((d) => [
                    d.status.replace(/\s+/g, '_'),
                    { label: d.status, color: MARITAL_COLORS[d.status.replace(/\s+/g, '_')] || 'oklch(0.7 0 0)' },
                  ])
                )
              }
              className="h-64 w-full"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={maritalPieData}
                  dataKey="jumlah"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                >
                  {maritalPieData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="status" />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Age Distribution */}
        {ageDistribution.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Distribusi Usia (Anggota Hidup)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  jumlah: { label: 'Jumlah', color: 'oklch(0.65 0.18 145)' },
                }}
                className="h-56 w-full"
              >
                <BarChart
                  data={ageDistribution}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <XAxis
                    dataKey="range"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="jumlah" radius={[4, 4, 0, 0]}>
                    {ageDistribution.map((_, index) => (
                      <Cell
                        key={index}
                        fill={AGE_COLORS[index % AGE_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Marga Distribution (Dalihan Na Tolu) */}
        {margaDistribution && margaDistribution.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Distribusi Marga (Dalihan Na Tolu)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  marga: { label: 'Marga' },
                  jumlah: { label: 'Jumlah Anggota' },
                }}
                className="h-48 w-full"
              >
                <BarChart
                  data={margaDistribution}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="marga"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={100}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="jumlah" fill="oklch(0.65 0.18 60)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Oral History by Category */}
        {oralPieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Cerita Lisan per Kategori
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={
                  Object.fromEntries(
                    heritage.oralByCategory.map((d, i) => [
                      d.category,
                      { label: d.category, color: HERITAGE_COLORS[i % HERITAGE_COLORS.length] },
                    ])
                  )
                }
                className="h-48 w-full"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={oralPieData}
                    dataKey="jumlah"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={35}
                    paddingAngle={2}
                  >
                    {oralPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="category" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Pusaka by Type */}
        {pusakaPieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Pusaka per Jenis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={
                  Object.fromEntries(
                    heritage.pusakaByType.map((d, i) => [
                      d.type,
                      { label: d.type, color: HERITAGE_COLORS[i % HERITAGE_COLORS.length] },
                    ])
                  )
                }
                className="h-48 w-full"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={pusakaPieData}
                    dataKey="jumlah"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={35}
                    paddingAngle={2}
                  >
                    {pusakaPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="type" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Tempat Asal Distribution (Huta) */}
        {tempatAsalDistribution && tempatAsalDistribution.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Asal Daerah (Huta)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  asal: { label: 'Asal' },
                  jumlah: { label: 'Jumlah Anggota' },
                }}
                className="h-48 w-full"
              >
                <BarChart
                  data={tempatAsalDistribution}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="asal"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={100}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="jumlah" fill="oklch(0.6 0.15 160)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
