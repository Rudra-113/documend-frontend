"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, apiMode } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { LandingExperience } from "@/components/landing/LandingExperience";
import { filesToQueue, type QueuedFile } from "@/components/upload/UploadDropzone";
import { useCaseList } from "@/lib/hooks/use-case";
import { meridianSampleFiles } from "@/lib/sample/meridian";

export function IntakeScreen() {
  const router = useRouter();
  const { cases, error: listError, loading, refresh } = useCaseList();
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mode = apiMode();

  async function openCase(files: QueuedFile[]) {
    setSubmitting(true);
    setError(null);
    let caseId = "";
    try {
      const created = await api.createCase();
      caseId = created.id;
      await api.addDocuments(
        caseId,
        files.map((item) => item.file),
        files.map((item) => item.type),
      );
      await api.analyze(caseId);
      router.push(`/cases/${caseId}`);
    } catch (err) {
      setError(errorMessage(err, "The case could not be opened."));
      setSubmitting(false);
      void refresh();
      if (caseId) router.push(`/cases/${caseId}`);
    }
  }

  return (
    <LandingExperience
      mode={mode}
      queue={queue}
      onChange={setQueue}
      submitting={submitting}
      error={error}
      onBegin={() => void openCase(queue)}
      onSample={() => void openCase(filesToQueue(meridianSampleFiles()))}
      cases={cases}
      listLoading={loading}
      listError={listError}
    />
  );
}
