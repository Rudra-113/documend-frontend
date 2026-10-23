import { FileText } from "lucide-react";

export function SourceCitation({
  documentName,
  page,
  excerpt,
  onOpen,
}: {
  documentName: string;
  page: number;
  excerpt?: string;
  onOpen?: () => void;
}) {
  const body = (
    <>
      <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0">
        <span className="block truncate font-mono text-[11px] text-foreground">
          {documentName}
          <span className="text-muted-foreground"> · p.{page}</span>
        </span>
        {excerpt ? <span className="mt-1 block text-xs leading-5 text-muted-foreground">{excerpt}</span> : null}
      </span>
    </>
  );

  if (!onOpen) {
    return <div className="flex gap-2 rounded-lg border border-border bg-black/20 px-3 py-2">{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full gap-2 rounded-lg border border-border bg-black/20 px-3 py-2 text-left hover:border-foreground/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {body}
    </button>
  );
}
