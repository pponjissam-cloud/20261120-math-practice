import "server-only";
import {
  AlignmentType, BorderStyle, Document, HeadingLevel, Packer, PageBreak, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import type { Block } from "./blocks";
import { latexTextToPlain } from "./latex-plain";

/** pandoc이 없을 때의 대체 Word 생성. 수식은 일반 글자(×, ², √ 등)로 들어간다. */
export async function blocksToBasicDocx(blocks: Block[]): Promise<Buffer> {
  const plain = (t: string) => latexTextToPlain(t);
  const lines = (t: string, opts: { bold?: boolean; size?: number } = {}) =>
    plain(t).split("\n").map((line, i) => new TextRun({ text: line, bold: opts.bold, size: opts.size, break: i > 0 ? 1 : undefined }));

  const children: (Paragraph | Table)[] = [];
  for (const b of blocks) {
    if (b.type === "heading") {
      const heading = b.level === 1 ? HeadingLevel.HEADING_1 : b.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
      children.push(new Paragraph({ heading, children: lines(b.text) }));
    } else if (b.type === "para") {
      children.push(new Paragraph({ spacing: { after: 120 }, children: lines(b.text, { bold: b.bold, size: b.small ? 18 : undefined }) }));
    } else if (b.type === "bullets") {
      for (const it of b.items) children.push(new Paragraph({ bullet: { level: 0 }, children: lines(it) }));
    } else if (b.type === "space") {
      for (let i = 0; i < b.lines; i++) children.push(new Paragraph({ text: "" }));
    } else if (b.type === "pagebreak") {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    } else if (b.type === "table") {
      // 교육과정 맵 색: ★ 이번 단원(파랑) ◆ 먼저 알아야 할 단원(주황) ▷ 이어서 배울 단원(초록)
      const fillOf = (t: string) => (t.startsWith("★") ? "BFDBFE" : t.startsWith("◆") ? "FFEDD5" : t.startsWith("▷") ? "D1FAE5" : undefined);
      const cell = (t: string, bold = false) => {
        const fill = fillOf(t);
        return new TableCell({
          shading: fill ? { fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: lines(t, { bold, size: 18 }) })],
        });
      };
      const border = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
          rows: [
            new TableRow({ tableHeader: true, children: b.header.map((h) => cell(h, true)) }),
            ...b.rows.map((r) => new TableRow({ children: r.map((c) => cell(c, !!fillOf(c))) })),
          ],
        }),
      );
    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Malgun Gothic", size: 22 } } } },
    sections: [{ properties: { page: { margin: { top: 850, bottom: 850, left: 900, right: 900 } } }, children }],
  });
  return Packer.toBuffer(doc);
}
