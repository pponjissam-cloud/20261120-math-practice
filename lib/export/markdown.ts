import type { Block } from "./blocks";

/**
 * 블록 → pandoc Markdown. $...$ 수식은 pandoc이 Word 네이티브 수식(OMML)으로 바꾼다.
 * 쪽 나눔·빈 줄(풀이 공간)은 raw openxml로 넣는다.
 */

const PAGE_BREAK = '```{=openxml}\n<w:p><w:r><w:br w:type="page"/></w:r></w:p>\n```';
const EMPTY_PARA = "<w:p/>";

/** 수식 밖의 Markdown 특수문자를 이스케이프하고, 수식은 pandoc 규칙(앞뒤 공백 없음)에 맞춘다. */
export function escapeInline(text: string): string {
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) {
        const block = part.startsWith("$$");
        const inner = part.slice(block ? 2 : 1, block ? -2 : -1).trim();
        return block ? `$$${inner}$$` : `$${inner}$`;
      }
      return part.replace(/([\\`*_{}[\]<>#|~^])/g, "\\$1");
    })
    .join("")
    .replace(/^(\s*)(\d+)\.(\s)/, "$1$2\\.$3") // 줄 앞 "1. " 을 번호 목록으로 오해하지 않게
    .replace(/^(\s*)([-+])(\s)/, "$1\\$2$3")
    .replace(/\n/g, "\\\n"); // 줄바꿈 유지
}

export function toMarkdown(blocks: Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "heading":
        out.push(`${"#".repeat(b.level)} ${escapeInline(b.text)}`);
        break;
      case "para": {
        const t = escapeInline(b.text);
        out.push(b.bold ? `**${t}**` : b.small ? `[${t}]{custom-style="Small"}` : t);
        break;
      }
      case "bullets":
        out.push(b.items.map((it) => `- ${escapeInline(it)}`).join("\n"));
        break;
      case "space":
        out.push("```{=openxml}\n" + EMPTY_PARA.repeat(b.lines) + "\n```");
        break;
      case "pagebreak":
        out.push(PAGE_BREAK);
        break;
      case "table": {
        const cell = (s: string) => escapeInline(s).replace(/\n/g, " ") || " ";
        out.push(
          [
            `| ${b.header.map(cell).join(" | ")} |`,
            `|${b.header.map(() => "---").join("|")}|`,
            ...b.rows.map((r) => `| ${r.map(cell).join(" | ")} |`),
          ].join("\n"),
        );
        break;
      }
    }
  }
  return out.join("\n\n") + "\n";
}
