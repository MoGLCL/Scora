"use client";

import React, { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = "";
  let listItems: React.ReactNode[] = [];
  let isNumberedList = false;

  const flushList = () => {
    if (listItems.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1.5 my-3 text-sm leading-relaxed text-[#05291A]">
            {listItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1.5 my-3 text-sm leading-relaxed text-[#05291A]">
            {listItems}
          </ul>
        );
      }
      listItems = [];
    }
  };

  const renderInline = (text: string): React.ReactNode[] => {
    // Basic regex-based inline parser
    const parts: React.ReactNode[] = [];
    // Regex for bold, italic, inline code, links
    const inlineRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = inlineRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(<strong key={parts.length} className="font-extrabold text-[#05291A]">{token.slice(2, -2)}</strong>);
      } else if (token.startsWith("*") && token.endsWith("*")) {
        parts.push(<em key={parts.length} className="italic text-[#05291A]">{token.slice(1, -1)}</em>);
      } else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code key={parts.length} className="px-1.5 py-0.5 rounded-md bg-[#E8FAF0] text-[#056B38] font-mono text-[13px] border border-[#C5E8D1]">
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith("[") && token.includes("](")) {
        const linkText = token.slice(1, token.indexOf("]("));
        const linkUrl = token.slice(token.indexOf("](") + 2, -1);
        parts.push(
          <a
            key={parts.length}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#056B38] underline font-bold inline-flex items-center gap-1 hover:text-[#005B27]"
          >
            <span>{linkText}</span>
            <ExternalLink className="w-3 h-3 inline" />
          </a>
        );
      }
      lastIndex = inlineRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block check
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // Flush code block
        const codeText = codeBlockContent.join("\n");
        elements.push(
          <CodeBlockItem key={`code-${elements.length}`} code={codeText} lang={codeBlockLang} />
        );
        codeBlockContent = [];
        codeBlockLang = "";
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(line.trim())) {
      flushList();
      elements.push(<hr key={`hr-${elements.length}`} className="my-6 border-[#D1E3D6]" />);
      continue;
    }

    // Headings (support #, ##, ### with or without spaces)
    const trimmed = line.trim();
    const h3Match = trimmed.match(/^###\s*(.+)$/);
    if (h3Match) {
      flushList();
      elements.push(
        <h3 key={`h3-${elements.length}`} className="text-base font-extrabold text-[#05291A] mt-5 mb-2">
          {renderInline(h3Match[1])}
        </h3>
      );
      continue;
    }

    const h2Match = trimmed.match(/^##\s*(.+)$/);
    if (h2Match) {
      flushList();
      elements.push(
        <h2 key={`h2-${elements.length}`} className="text-lg font-black text-[#05291A] mt-6 mb-2.5 pb-1.5 border-b border-[#D1E3D6]">
          {renderInline(h2Match[1])}
        </h2>
      );
      continue;
    }

    const h1Match = trimmed.match(/^#\s*(.+)$/);
    if (h1Match) {
      flushList();
      elements.push(
        <h1 key={`h1-${elements.length}`} className="text-xl font-black text-[#05291A] mt-7 mb-3 pb-2 border-b-2 border-[#056B38]">
          {renderInline(h1Match[1])}
        </h1>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      flushList();
      const quoteText = trimmed.replace(/^>\s*/, "");
      elements.push(
        <blockquote key={`bq-${elements.length}`} className="border-r-4 border-[#056B38] pr-4 py-2 my-3 bg-[#E8FAF0]/50 rounded-l-xl text-sm italic text-[#526B5E]">
          {renderInline(quoteText)}
        </blockquote>
      );
      continue;
    }

    // Unordered List
    if (/^[-*+]\s+/.test(line.trim())) {
      if (isNumberedList && listItems.length > 0) flushList();
      isNumberedList = false;
      const itemText = line.trim().replace(/^[-*+]\s+/, "");
      listItems.push(<li key={`li-${listItems.length}`}>{renderInline(itemText)}</li>);
      continue;
    }

    // Numbered List
    if (/^\d+\.\s+/.test(line.trim())) {
      if (!isNumberedList && listItems.length > 0) flushList();
      isNumberedList = true;
      const itemText = line.trim().replace(/^\d+\.\s+/, "");
      listItems.push(<li key={`li-${listItems.length}`}>{renderInline(itemText)}</li>);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      flushList();
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${elements.length}`} className="text-sm leading-relaxed text-[#05291A] my-2">
        {renderInline(line)}
      </p>
    );
  }

  flushList();
  if (inCodeBlock && codeBlockContent.length > 0) {
    elements.push(
      <CodeBlockItem key={`code-${elements.length}`} code={codeBlockContent.join("\n")} lang={codeBlockLang} />
    );
  }

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}

function CodeBlockItem({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 rounded-2xl overflow-hidden border border-[#D1E3D6] bg-[#05291A] text-white shadow-xs font-mono text-xs dir-ltr">
      <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-white/10 text-white/70">
        <span className="text-[11px] font-bold uppercase tracking-wider">{lang || "CODE"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] hover:text-white transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "تم النسخ" : "نسخ الكود"}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed text-emerald-200 font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}
