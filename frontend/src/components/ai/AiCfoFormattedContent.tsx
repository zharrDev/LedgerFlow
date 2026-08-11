import { Fragment } from "react";

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered: boolean }
  | { type: "metric"; label: string; value: string };

const SECTION_LABELS = new Set([
  "ringkasan",
  "detail",
  "rekomendasi",
  "kesimpulan",
  "analisis",
  "temuan",
  "proyeksi",
  "catatan",
]);

const METRIC_RE = /^(.{2,40}?)\s*[:—–-]\s*(Rp\s[\d.,]+.*)$/i;
const RP_RE = /Rp\s[\d.,]+/g;

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .trim();
}

function parseBlocks(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];
  let listItems: string[] = [];
  let listOrdered = false;

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push({ type: "list", items: [...listItems], ordered: listOrdered });
    listItems = [];
  };

  for (const raw of lines) {
    const line = stripMarkdown(raw.trim());
    if (!line) {
      flushList();
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.+)/);
    if (bullet) {
      if (listOrdered && listItems.length) flushList();
      listOrdered = false;
      listItems.push(bullet[1]);
      continue;
    }

    const numbered = line.match(/^\d+[.)]\s+(.+)/);
    if (numbered) {
      if (!listOrdered && listItems.length) flushList();
      listOrdered = true;
      listItems.push(numbered[1]);
      continue;
    }

    flushList();

    const metric = line.match(METRIC_RE);
    if (metric) {
      blocks.push({ type: "metric", label: metric[1].trim(), value: metric[2].trim() });
      continue;
    }

    const sectionMatch = line.match(/^([A-Za-zÀ-ÿ\s]+):\s*$/);
    if (sectionMatch && SECTION_LABELS.has(sectionMatch[1].trim().toLowerCase())) {
      blocks.push({ type: "heading", text: sectionMatch[1].trim() });
      continue;
    }

    if (line.endsWith(":") && line.length < 40 && !line.includes("Rp")) {
      blocks.push({ type: "heading", text: line.slice(0, -1) });
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
  }

  flushList();
  return blocks;
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*.+?\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-gray-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <span
          key={i}
          className="font-mono text-xs bg-gray-200/60 dark:bg-gray-700/60 px-1 rounded"
        >
          {part.slice(1, -1)}
        </span>
      );
    }

    const withRp = part.split(RP_RE);
    const rpMatches = part.match(RP_RE) || [];
    if (rpMatches.length === 0) return <Fragment key={i}>{part}</Fragment>;

    return (
      <Fragment key={i}>
        {withRp.map((seg, j) => (
          <Fragment key={`${i}-${j}`}>
            {seg}
            {rpMatches[j] && (
              <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {rpMatches[j]}
              </span>
            )}
          </Fragment>
        ))}
      </Fragment>
    );
  });
}

interface AiCfoFormattedContentProps {
  content: string;
}

export function AiCfoFormattedContent({ content }: AiCfoFormattedContentProps) {
  const blocks = parseBlocks(content);

  if (blocks.length === 0) {
    return <p className="text-sm text-gray-600 dark:text-gray-300">{content}</p>;
  }

  return (
    <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "heading":
            return (
              <p
                key={idx}
                className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400 pt-1 first:pt-0"
              >
                {block.text}
              </p>
            );
          case "metric":
            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 rounded-lg bg-white/70 dark:bg-gray-900/50 border border-gray-200/80 dark:border-gray-600/50 px-3 py-2"
              >
                <span className="text-gray-600 dark:text-gray-400">{block.label}</span>
                <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {block.value}
                </span>
              </div>
            );
          case "list":
            return block.ordered ? (
              <ol
                key={idx}
                className="list-decimal list-inside space-y-1.5 pl-1 marker:text-primary-500"
              >
                {block.items.map((item, j) => (
                  <li key={j} className="leading-relaxed">
                    {renderInline(item)}
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={idx} className="space-y-1.5">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-2 leading-relaxed">
                    <span className="text-primary-500 mt-1.5 shrink-0">•</span>
                    <span className="flex-1">{renderInline(item)}</span>
                  </li>
                ))}
              </ul>
            );
          default:
            return (
              <p key={idx} className="leading-relaxed">
                {renderInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}
