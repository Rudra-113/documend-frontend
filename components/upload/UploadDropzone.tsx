"use client";

import { useId, useState } from "react";
import { Upload, X } from "lucide-react";
import { FILE_ACCEPT } from "@/lib/mock/stages";
import type { DocumentType } from "@/lib/types/domain";
import { formatBytes } from "@/lib/utils/format";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABEL, inferDocumentType } from "@/lib/utils/labels";

export interface QueuedFile {
  id: string;
  file: File;
  type: DocumentType;
}

let queueSeed = 0;

export function filesToQueue(files: File[]): QueuedFile[] {
  return files.map((file) => {
    queueSeed += 1;
    return {
      id: `queue-${queueSeed}`,
      file,
      type: inferDocumentType(file.name).type,
    };
  });
}

export function UploadDropzone({
  files,
  onChange,
  disabled = false,
  compact = false,
}: {
  files: QueuedFile[];
  onChange: (files: QueuedFile[]) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [reject, setReject] = useState<string | null>(null);

  function add(list: FileList | File[]) {
    const incoming = [...list];
    const allowed = incoming.filter((file) => /\.(pdf|png|jpe?g|webp|tiff?|txt)$/i.test(file.name) || file.type.startsWith("image/") || file.type === "application/pdf" || file.type === "text/plain");
    const skipped = incoming.length - allowed.length;
    setReject(skipped > 0 ? "Only PDF, image, and text files can be added." : null);
    if (allowed.length === 0) return;
    onChange([...files, ...filesToQueue(allowed)]);
  }

  return (
    <div className="space-y-3">
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (disabled) return;
          add(event.dataTransfer.files);
        }}
        className={`rounded-2xl border border-dashed transition-colors ${
          dragging ? "border-brass bg-brass/5" : "border-border bg-black/15"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <input
          id={inputId}
          className="sr-only"
          type="file"
          multiple
          accept={FILE_ACCEPT}
          disabled={disabled}
          onChange={(event) => {
            if (event.target.files) add(event.target.files);
            event.target.value = "";
          }}
        />
        <label
          htmlFor={inputId}
          className={`flex cursor-pointer flex-col items-start gap-2 px-5 ${compact ? "py-5" : "py-8"} focus-within:outline-none`}
        >
          <span className="flex size-9 items-center justify-center rounded-full border border-border">
            <Upload className="size-4" aria-hidden />
          </span>
          <span className="text-base text-foreground">Drop documents, or browse</span>
          <span className="max-w-sm text-sm leading-6 text-muted-foreground">
            Bills, policies, discharge summaries, prescriptions, reports, and receipts. PDF or image, several at once.
          </span>
        </label>
      </div>
      {reject ? (
        <p role="status" className="text-sm text-clay">
          {reject}
        </p>
      ) : null}
      {files.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {files.map((item) => (
            <li key={item.id} className="grid gap-3 bg-black/20 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm">{item.file.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{formatBytes(item.file.size)}</p>
              </div>
              <label className="block text-xs text-muted-foreground">
                <span className="sr-only">Document type for {item.file.name}</span>
                <select
                  value={item.type}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange(
                      files.map((file) =>
                        file.id === item.id ? { ...file, type: event.target.value as DocumentType } : file,
                      ),
                    )
                  }
                  className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {DOCUMENT_TYPE_LABEL[type]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => onChange(files.filter((file) => file.id !== item.id))}
                disabled={disabled}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
              >
                <X className="size-4" aria-hidden />
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
