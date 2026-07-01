"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, RotateCcw, User, Eye, TreePine, Users } from "lucide-react";

interface SearchPerson {
  id: string;
  fullName: string;
  nickname: string | null;
  gender: "MALE" | "FEMALE";
  birthDate: string | null;
  birthPlace: string | null;
  isDeceased: boolean;
  father: { id: string; fullName: string; nickname: string | null; gender: string } | null;
  mother: { id: string; fullName: string; nickname: string | null; gender: string } | null;
}

export function FamilySearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const setSelectedPersonId = useAppStore((s) => s.setSelectedPersonId);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const { data: response, isLoading, isFetching } = useQuery<{
    data: SearchPerson[];
    total: number;
  }>({
    queryKey: ["family-search", activeSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (activeSearch) params.set("search", activeSearch);
      params.set("includeRelations", "true");
      params.set("limit", "50");
      return fetch(`/api/persons?${params.toString()}`).then((r) => r.json());
    },
    enabled: hasSearched,
  });

  const persons = response?.data ?? [];
  const total = response?.total ?? 0;

  const handleSearch = () => {
    setActiveSearch(searchTerm.trim());
    setHasSearched(true);
  };

  const handleReset = () => {
    setSearchTerm("");
    setActiveSearch("");
    setHasSearched(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleViewProfile = (personId: string) => {
    setSelectedPersonId(personId);
    setActiveView("person-detail");
  };

  const handleViewTree = () => {
    setActiveView("tree");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-[#3E2723]">Cari Keluarga Anda</h2>
          <p className="text-sm text-[#795548] mt-1">
            Temukan anggota keluarga Marga Hariandja berdasarkan nama
          </p>
        </div>
        {hasSearched && (
          <p className="text-sm text-[#795548] bg-[#F5E6D3] px-3 py-1.5 rounded-full whitespace-nowrap">
            <Users className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            <span className="font-semibold text-[#3E2723]">{total}</span> orang ditemukan
            {activeSearch && (
              <span> untuk kata kunci: <span className="font-semibold text-[#7F1D1D]">&quot;{activeSearch}&quot;</span></span>
            )}
          </p>
        )}
      </div>

      {/* Gorga Divider */}
      <div className="gorga-divider" />

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#795548]" />
          <Input
            placeholder="Ketik nama anggota keluarga..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 h-11 border-[#D4A574] bg-white focus:border-[#B8860B] text-[#3E2723] placeholder:text-[#795548]/50"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSearch}
            className="h-11 bg-[#7F1D1D] hover:bg-[#991B1B] text-white px-6"
          >
            <Search className="w-4 h-4 mr-2" />
            Cari
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="h-11 border-[#D4A574] text-[#795548] hover:bg-[#F5E6D3] hover:text-[#3E2723] px-6"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Results */}
      {isLoading || isFetching ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#7F1D1D] mx-auto mb-3" />
            <p className="text-[#795548]">Mencari data keluarga...</p>
          </div>
        </div>
      ) : hasSearched && persons.length === 0 ? (
        <div className="text-center py-20">
          <User className="w-16 h-16 mx-auto mb-4 text-[#D4A574]" />
          <h3 className="text-lg font-semibold text-[#3E2723] mb-2">
            Tidak Ada Hasil
          </h3>
          <p className="text-sm text-[#795548] max-w-md mx-auto">
            Anggota keluarga dengan nama &quot;{activeSearch}&quot; tidak ditemukan.
            Coba gunakan kata kunci lain atau tambahkan data anggota baru.
          </p>
        </div>
      ) : hasSearched && persons.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {persons.map((person) => (
            <div
              key={person.id}
              className="bg-white border border-[#D4A574] rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
            >
              {/* Card Top Accent */}
              <div className="h-1.5 bg-gradient-to-r from-[#7F1D1D] via-[#DAA520] to-[#7F1D1D]" />

              <div className="p-4 space-y-3">
                {/* Name + Gender */}
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                      person.gender === "MALE"
                        ? "bg-[#7F1D1D]/10 text-[#7F1D1D]"
                        : "bg-[#991B1B]/10 text-[#991B1B]"
                    }`}
                  >
                    {person.gender === "MALE" ? "♂" : "♀"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[#3E2723] text-sm leading-tight truncate group-hover:text-[#7F1D1D] transition-colors">
                      {person.fullName}
                      {person.isDeceased && (
                        <span className="text-[#991B1B] ml-1 text-xs">✝</span>
                      )}
                    </h3>
                    <p className="text-xs text-[#795548] mt-0.5">
                      ({person.gender === "MALE" ? "Laki-laki" : "Perempuan"})
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs border-t border-[#F5E6D3] pt-2.5">
                  <div className="flex justify-between">
                    <span className="text-[#795548]">Panggilan</span>
                    <span className="text-[#3E2723] font-medium truncate ml-3 text-right">
                      {person.nickname || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#795548]">Ayah</span>
                    <button
                      onClick={() => person.father && handleViewProfile(person.father.id)}
                      className={`text-right truncate ml-3 max-w-[60%] ${
                        person.father
                          ? "text-[#3E2723] font-medium hover:text-[#7F1D1D] hover:underline"
                          : "text-[#795548]"
                      }`}
                    >
                      {person.father
                        ? person.father.fullName
                        : "—"}
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#795548]">Ibu</span>
                    <button
                      onClick={() => person.mother && handleViewProfile(person.mother.id)}
                      className={`text-right truncate ml-3 max-w-[60%] ${
                        person.mother
                          ? "text-[#3E2723] font-medium hover:text-[#7F1D1D] hover:underline"
                          : "text-[#795548]"
                      }`}
                    >
                      {person.mother
                        ? person.mother.fullName
                        : "—"}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs border-[#D4A574] text-[#795548] hover:bg-[#F5E6D3] hover:text-[#3E2723]"
                    onClick={() => handleViewProfile(person.id)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Lihat Profil
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs border-[#D4A574] text-[#795548] hover:bg-[#F5E6D3] hover:text-[#3E2723]"
                    onClick={handleViewTree}
                  >
                    <TreePine className="w-3 h-3 mr-1" />
                    Bagan Keluarga
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !hasSearched ? (
        /* Initial empty state - before any search */
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#7F1D1D]/10 flex items-center justify-center">
            <Search className="w-10 h-10 text-[#7F1D1D]" />
          </div>
          <h3 className="text-lg font-semibold text-[#3E2723] mb-2">
            Cari Anggota Keluarga
          </h3>
          <p className="text-sm text-[#795548] max-w-md mx-auto mb-6">
            Masukkan nama lengkap atau nama panggilan untuk menemukan
            anggota keluarga Marga Hariandja dalam database tarombo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-[#795548]">
            <div className="flex items-center gap-2 bg-[#F5E6D3] px-4 py-2 rounded-full">
              <Users className="w-4 h-4 text-[#B8860B]" />
              <span>Jelajahi seluruh anggota keluarga</span>
            </div>
            <div className="flex items-center gap-2 bg-[#F5E6D3] px-4 py-2 rounded-full">
              <TreePine className="w-4 h-4 text-[#B8860B]" />
              <span>Lihat pohon silsilah lengkap</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}