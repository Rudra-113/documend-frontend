import type { PipelineStage, StageId } from "@/lib/types/domain";

export const STAGE_ORDER: Array<{
  id: StageId;
  label: string;
  description: string;
}> = [
  {
    id: "upload",
    label: "Upload",
    description: "Accept every file into the case.",
  },
  {
    id: "extract",
    label: "Extract",
    description: "Read pages and classify each document.",
  },
  {
    id: "understand",
    label: "Understand",
    description: "Build the face sheet and the charge ledger.",
  },
  {
    id: "cross_check",
    label: "Cross-check",
    description: "Compare the bill with the clinical record.",
  },
  {
    id: "audit",
    label: "Audit",
    description: "Score integrity, consistency, and completeness.",
  },
  {
    id: "insurance",
    label: "Insurance",
    description: "Apply the schedule, or say where it is missing.",
  },
  {
    id: "evidence",
    label: "Evidence",
    description: "Pin every finding to a page.",
  },
];

export function emptyStages(state: PipelineStage["state"] = "pending"): PipelineStage[] {
  return STAGE_ORDER.map((stage) => ({ ...stage, state }));
}

export const TICK_MS = 420;

export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/tiff",
  "text/plain",
];

export const FILE_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.txt,application/pdf,image/png,image/jpeg,image/webp,image/tiff,text/plain";
