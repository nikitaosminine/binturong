import { ThesisBodyBlock } from "@/lib/thesis";

/**
 * Convert structured body blocks to a single HTML string for the rich text editor.
 * Preserves headings, paragraphs, and bullet lists from the existing data model.
 */
export function bodyToHtml(body: ThesisBodyBlock[]): string {
  return body
    .map((block) => {
      if (block.type === "h") return `<h3>${escapeHtml(block.content as string)}</h3>`;
      if (block.type === "ul") {
        const items = (block.content as string[])
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      // Default to paragraph; do not escape if content already looks like HTML
      const content = block.content as string;
      if (content.startsWith("<")) return content;
      return `<p>${escapeHtml(content)}</p>`;
    })
    .join("");
}

/**
 * Store incoming HTML as a single paragraph-type block carrying raw HTML.
 * Lossy compared to structured blocks, but lets the rich text editor round-trip cleanly.
 */
export function htmlToBody(html: string): ThesisBodyBlock[] {
  if (!html.trim()) return [];
  return [{ type: "p", content: html }];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
