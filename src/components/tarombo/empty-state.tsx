"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Sparkles, UserPlus } from "lucide-react";

interface Props {
  onSeed: () => void;
  onAddPerson: () => void;
}

export function EmptyState({ onSeed, onAddPerson }: Props) {
  return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <Card className="max-w-md w-full p-8 text-center relative overflow-hidden">
        <div className="uis-pattern absolute inset-0 opacity-40 pointer-events-none" />
        <div className="relative">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Users className="size-8" />
          </div>
          <h2 className="mt-4 text-xl font-bold">Silsilah masih kosong</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Belum ada orang terdaftar di pohon tarombo. Mulai dengan menambahkan
            leluhur pertama, atau muat data keluarga contoh untuk menjelajahi
            aplikasi.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={onSeed}>
              <Sparkles className="size-4 mr-1.5" />
              Muat Data Contoh
            </Button>
            <Button variant="outline" onClick={onAddPerson}>
              <UserPlus className="size-4 mr-1.5" />
              Tambah Leluhur
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
