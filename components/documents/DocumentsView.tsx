"use client";

import { useState } from "react";
import type { DocumentRecord, DocumentType } from "@/lib/types/domain";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { UploadDropzone, type QueuedFile } from "@/components/upload/UploadDropzone";
import { Button } from "@/components/ui/button";

export function DocumentsView({
  documents,
  analysisVersion,
  disabled,
  busy,
  onAdd,
  onTypeChange,
  onRemove,
}: {
  documents: DocumentRecord[];
  analysisVersion: number;
  disabled: boolean;
  busy: boolean;
  onAdd: (files: File[], types: Array<DocumentType | undefined>) => Promise<void>;
  onTypeChange: (documentId: string, type: DocumentType) => void;
  onRemove: (documentId: string) => void;
}) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Documents</p>
        <h2 className="mt-1 font-serif text-3xl">The case file</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Add records after the first audit. They stay out of the score until you re-analyze. Changing a type does the same.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents on this case yet.</p>
        ) : null}
        {documents.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            pending={document.analysisVersion !== analysisVersion}
            disabled={disabled}
            onTypeChange={onTypeChange}
            onRemove={onRemove}
          />
        ))}
      </div>
      <div className="panel p-5">
        <p className="text-sm">Add to this case</p>
        <div className="mt-3">
          <UploadDropzone files={queue} onChange={setQueue} disabled={disabled || busy} compact />
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-clay">
            {error}
          </p>
        ) : null}
        <Button
          className="mt-4"
          disabled={disabled || busy || queue.length === 0}
          onClick={() => {
            setError(null);
            void onAdd(
              queue.map((item) => item.file),
              queue.map((item) => item.type),
            )
              .then(() => setQueue([]))
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Could not add those documents.");
              });
          }}
        >
          {busy ? "Uploading..." : `Add ${queue.length || ""}`.trim()}
        </Button>
      </div>
    </div>
  );
}
