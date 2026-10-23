"use client";

import { useState } from "react";
import type { ChatMessage as ChatMessageModel } from "@/lib/types/domain";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  "Which charges may not be covered by insurance?",
  "Why isn't insurance paying the full bill?",
  "What looks duplicated?",
  "Does the room charge match the discharge?",
  "Which documents are still missing?",
  "What is the bill intelligence score?",
];

export function AskView({
  messages,
  asking,
  onAsk,
  onOpenFinding,
}: {
  messages: ChatMessageModel[];
  asking: boolean;
  onAsk: (question: string) => Promise<void>;
  onOpenFinding: (findingId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(question: string) {
    const text = question.trim();
    if (!text || asking) return;
    setError(null);
    try {
      await onAsk(text);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "DocuMend could not answer.");
    }
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <p className="kicker">Ask DocuMend</p>
        <h2 className="mt-1 font-serif text-3xl">Ask the file, not a general model</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Answers stay inside this audit. Citations open the page they came from.
        </p>
      </div>
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No questions yet. Start with one of the lines below, or write your own.</p>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} onOpenFinding={onOpenFinding} />
          ))}
        </div>
      )}
      {asking ? <p className="text-sm text-muted-foreground">Investigating...</p> : null}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={asking}
            onClick={() => void submit(suggestion)}
            className="rounded-full border border-border px-3 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
          >
            {suggestion}
          </button>
        ))}
      </div>
      <form
        className="panel p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(draft);
        }}
      >
        <label htmlFor="ask-documend" className="sr-only">
          Question for DocuMend
        </label>
        <textarea
          id="ask-documend"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit(draft);
            }
          }}
          rows={3}
          maxLength={2000}
          placeholder="Ask why a line is unpaid, or what is missing."
          className="w-full resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between gap-3 px-2 pb-1">
          <p className="text-[11px] text-muted-foreground">Enter to send · Shift+Enter for a new line</p>
          <Button type="submit" disabled={asking || draft.trim().length === 0}>
            {asking ? "Investigating..." : "Ask"}
          </Button>
        </div>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-clay">
          {error}
        </p>
      ) : null}
    </div>
  );
}
