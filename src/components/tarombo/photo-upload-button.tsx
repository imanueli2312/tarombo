"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onUploaded: (url: string) => void;
  disabled?: boolean;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/avif"];

export function PhotoUploadButton({ onUploaded, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // reset input value supaya bisa upload file yang sama lagi
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar.");
      return;
    }
    if (!ACCEPTED.includes(file.type)) {
      toast.error(`Tipe ${file.type} tidak didukung. Gunakan JPG, PNG, atau WebP.`);
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Ukuran file melebihi 10MB.");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/photo-upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body && typeof body === "object" && "error" in body && (body.error as string)) ||
            `Gagal upload (${res.status})`,
        );
      }
      const data = (await res.json()) as { url: string };
      onUploaded(data.url);
      toast.success("Foto berhasil diunggah.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 px-2.5 text-[11px] gap-1"
        onClick={handleClick}
        disabled={disabled || uploading}
        title="Unggah foto"
      >
        {uploading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Upload className="size-3.5" />
        )}
        {uploading ? "Mengunggah…" : "Upload"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        onChange={handleChange}
        className="hidden"
      />
    </>
  );
}
