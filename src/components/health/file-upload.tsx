"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateAttachment } from "@/hooks/use-health";
import { toast } from "sonner";

type Kind = "RECEIPT" | "ANALYSIS" | "OTHER";

export function FileUpload({ appointmentId }: { appointmentId?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<Kind>("OTHER");
  const [uploading, setUploading] = useState(false);
  const createAttachment = useCreateAttachment();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
        });
        await createAttachment.mutateAsync({
          appointmentId: appointmentId ?? null,
          url: blob.url,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          kind,
        });
      }
      toast.success("Uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="RECEIPT">Receipt</SelectItem>
          <SelectItem value="ANALYSIS">Analysis</SelectItem>
          <SelectItem value="OTHER">Other</SelectItem>
        </SelectContent>
      </Select>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        {uploading ? "Uploading..." : "Upload file"}
      </Button>
    </div>
  );
}
