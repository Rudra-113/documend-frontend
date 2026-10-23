import type { ChatMessage as ChatMessageModel } from "@/lib/types/domain";
import { formatConfidence, formatStamp } from "@/lib/utils/format";
import { SourceCitation } from "@/components/evidence/SourceCitation";

export function ChatMessage({
  message,
  onOpenFinding,
}: {
  message: ChatMessageModel;
  onOpenFinding?: (findingId: string) => void;
}) {
  const assistant = message.role === "assistant";
  return (
    <article className={`flex ${assistant ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[42rem] ${assistant ? "w-full" : "max-w-xl"}`}>
        <p className={`mb-1 font-mono text-[10px] tracking-wide text-muted-foreground ${assistant ? "" : "text-right"}`}>
          {assistant ? "DocuMend" : "You"} · {formatStamp(message.createdAt)} IST
          {assistant && message.confidence != null ? ` · ${formatConfidence(message.confidence)}` : ""}
        </p>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
            assistant ? "border border-border bg-black/25 text-foreground" : "bg-primary text-primary-foreground"
          }`}
        >
          {message.text.split("\n").map((paragraph, index) => (
            <p key={`${message.id}-${index}`} className={`break-words ${index > 0 ? "mt-3" : ""}`}>
              {paragraph}
            </p>
          ))}
        </div>
        {assistant && message.citations && message.citations.length > 0 ? (
          <div className="mt-2 space-y-2">
            {message.citations.map((citation, index) => (
              <SourceCitation
                key={`${message.id}-c-${index}`}
                documentName={citation.documentName}
                page={citation.page}
                excerpt={citation.excerpt}
                onOpen={citation.findingId && onOpenFinding ? () => onOpenFinding(citation.findingId!) : undefined}
              />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
