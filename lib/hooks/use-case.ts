"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type {
  CaseResults,
  CaseSummary,
  DocumentType,
  EvidenceBundle,
  Finding,
  InsuranceAssessment,
  StatusResponse,
} from "@/lib/types/domain";

export function useCaseList() {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setCases(await api.listCases());
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "The case list could not be loaded."));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .listCases()
      .then((items) => {
        if (!cancelled) setCases(items);
      })
      .catch((err) => {
        if (!cancelled) {
          setCases([]);
          setError(errorMessage(err, "The case list could not be loaded."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { cases, error, refresh, loading: cases === null && !error };
}

export function useCase(caseId: string) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [results, setResults] = useState<CaseResults | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [insurance, setInsurance] = useState<InsuranceAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState(0);
  const [busy, setBusy] = useState<"analyze" | "documents" | "ask" | "evidence" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceBundle | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  const closeEvidence = useCallback(() => {
    setActiveFindingId(null);
    setEvidence(null);
    setEvidenceError(null);
    setEvidenceLoading(false);
  }, []);

  const openEvidence = useCallback((findingId: string) => {
    setActiveFindingId(findingId);
    setEvidence(null);
    setEvidenceError(null);
    setEvidenceLoading(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    async function tick() {
      try {
        const next = await api.getStatus(caseId);
        if (cancelled) return;
        setStatus(next);
        if (next.pipeline.phase === "ready") {
          const [nextResults, nextFindings, nextInsurance] = await Promise.all([
            api.getResults(caseId),
            api.getFindings(caseId),
            api.getInsurance(caseId),
          ]);
          if (cancelled) return;
          setResults(nextResults);
          setFindings(nextFindings);
          setInsurance(nextInsurance);
        } else if (next.pipeline.phase === "processing") {
          setResults(null);
          setFindings([]);
          setInsurance(null);
          timer = window.setTimeout(() => {
            void tick();
          }, 450);
        } else {
          setResults(null);
          setFindings([]);
          setInsurance(null);
        }
        setError(null);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, "This case could not be loaded."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [caseId, run]);

  useEffect(() => {
    if (!activeFindingId) return;
    let cancelled = false;
    api
      .getEvidence(activeFindingId)
      .then((bundle) => {
        if (!cancelled) setEvidence(bundle);
      })
      .catch((err) => {
        if (!cancelled) {
          setEvidence(null);
          setEvidenceError(errorMessage(err, "Evidence could not be loaded."));
        }
      })
      .finally(() => {
        if (!cancelled) setEvidenceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeFindingId]);

  const refresh = useCallback(() => setRun((value) => value + 1), []);

  const reanalyze = useCallback(async () => {
    setBusy("analyze");
    setActionError(null);
    closeEvidence();
    try {
      const next = await api.analyze(caseId);
      setStatus(next);
      setResults(null);
      setFindings([]);
      setInsurance(null);
      setRun((value) => value + 1);
    } catch (err) {
      setActionError(errorMessage(err, "The audit could not be started."));
    } finally {
      setBusy(null);
    }
  }, [caseId, closeEvidence]);

  const addDocuments = useCallback(
    async (files: File[], types: Array<DocumentType | undefined>) => {
      setBusy("documents");
      setActionError(null);
      try {
        await api.addDocuments(caseId, files, types);
        const next = await api.getStatus(caseId);
        setStatus(next);
      } catch (err) {
        setActionError(errorMessage(err, "Those documents could not be added."));
        throw err;
      } finally {
        setBusy(null);
      }
    },
    [caseId],
  );

  const updateDocument = useCallback(
    async (documentId: string, type: DocumentType) => {
      setActionError(null);
      try {
        await api.updateDocument(caseId, documentId, { type });
        const next = await api.getStatus(caseId);
        setStatus(next);
      } catch (err) {
        setActionError(errorMessage(err, "The document type could not be changed."));
      }
    },
    [caseId],
  );

  const removeDocument = useCallback(
    async (documentId: string) => {
      setActionError(null);
      try {
        await api.removeDocument(caseId, documentId);
        const next = await api.getStatus(caseId);
        setStatus(next);
      } catch (err) {
        setActionError(errorMessage(err, "The document could not be removed."));
      }
    },
    [caseId],
  );

  const ask = useCallback(
    async (question: string) => {
      setBusy("ask");
      setActionError(null);
      try {
        const response = await api.ask(caseId, question);
        setStatus((current) => (current ? { ...current, messages: response.messages } : current));
      } catch (err) {
        setActionError(errorMessage(err, "DocuMend could not answer that."));
        throw err;
      } finally {
        setBusy(null);
      }
    },
    [caseId],
  );

  return {
    loading,
    error,
    status,
    results,
    findings,
    insurance,
    busy,
    actionError,
    dismissActionError: () => setActionError(null),
    refresh,
    reanalyze,
    addDocuments,
    updateDocument,
    removeDocument,
    ask,
    activeFindingId,
    evidence,
    evidenceLoading,
    evidenceError,
    openEvidence,
    closeEvidence,
  };
}
