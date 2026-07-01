"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  Users,
  User,
  UserCheck,
  Layers,
  Calendar,
  Heart,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const CHART_COLORS = ["#d97706", "#db2777", "#059669", "#6b7280", "#dc2626"];

interface StatsData {
  totalPersons: number;
  males: number;
  females: number;
  generations: number;
  avgAge: number;
  activeMarriages: number;
  latestPerson: {
    id: string;
    fullName: string;
    nickname: string | null;
    gender: string;
    createdAt: string;
  } | null;
  maritalStatus: { status: string; count: number }[];
}

const MARITAL_STATUS_LABELS: Record<string, string> = {
  SINGLE: "Belum Menikah",
  MARRIED: "Menikah",
  DIVORCED: "Cerai",
  WIDOWED: "Duda/Janda",
};

export function DashboardStats() {
  const canCreate = useAppStore((s) => s.canCreate);
  const setSelectedPersonId = useAppStore((s) => s.setSelectedPersonId);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const { data: stats, isLoading, error } = useQuery<StatsData>({
    queryKey: ["stats"],
    queryFn: () => fetch("/api/stats").then((r) => {
      if (!r.ok) throw new Error("Gagal memuat statistik");
      return r.json();
    }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-3" />
          <p className="text-amber-700">Memuat statistik keluarga...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Gagal memuat statistik</p>
      </div>
    );
  }

  const genderData = [
    { name: "Laki-laki", value: stats.males },
    { name: "Perempuan", value: stats.females },
  ];

  const maritalData = (stats.maritalStatus || []).map((m) => ({
    name: MARITAL_STATUS_LABELS[m.status] || m.status,
    count: m.count,
  }));

  const statCards = [
    {
      label: "Total Anggota",
      value: stats.totalPersons,
      icon: <Users className="w-5 h-5 text-amber-600" />,
    },
    {
      label: "Laki-laki",
      value: stats.males,
      icon: <User className="w-5 h-5 text-amber-600" />,
    },
    {
      label: "Perempuan",
      value: stats.females,
      icon: <UserCheck className="w-5 h-5 text-pink-600" />,
    },
    {
      label: "Generasi",
      value: stats.generations,
      icon: <Layers className="w-5 h-5 text-amber-600" />,
    },
    {
      label: "Rata-rata Umur",
      value: `${stats.avgAge} tahun`,
      icon: <Calendar className="w-5 h-5 text-amber-600" />,
    },
    {
      label: "Pernikahan Aktif",
      value: stats.activeMarriages,
      icon: <Heart className="w-5 h-5 text-pink-600" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-amber-900">Dashboard Statistik</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ringkasan data keluarga Marga Hariandja
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="border-amber-200/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {card.icon}
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-amber-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Gender Pie Chart */}
        <Card className="border-amber-200/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-900">
              Distribusi Jenis Kelamin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={true}
                  >
                    {genderData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Marital Status Bar Chart */}
        <Card className="border-amber-200/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-900">
              Status Pernikahan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maritalData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#92400e" }}
                    axisLine={{ stroke: "#d97706" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#92400e" }}
                    axisLine={{ stroke: "#d97706" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fffbeb",
                      borderColor: "#d97706",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" name="Jumlah" radius={[4, 4, 0, 0]}>
                    {maritalData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Member */}
      {stats.latestPerson && (
        <Card className="border-amber-200/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-900">
              Anggota Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-lg">
                {stats.latestPerson.gender === "MALE" ? "♂" : "♀"}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900">{stats.latestPerson.fullName}</p>
                {stats.latestPerson.nickname && (
                  <p className="text-sm text-amber-600">
                    &quot;{stats.latestPerson.nickname}&quot;
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Ditambahkan{" "}
                  {new Date(stats.latestPerson.createdAt).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              {canCreate() && (
                <button
                  onClick={() => {
                    setSelectedPersonId(stats.latestPerson!.id);
                    setActiveView("person-detail");
                  }}
                  className="text-xs text-amber-700 hover:text-amber-900 hover:underline"
                >
                  Lihat Detail →
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}