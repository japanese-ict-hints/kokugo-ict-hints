// PDFから本文テキストを取り出す。
// 教育センターの事例は PDF で置かれていることが多い（CLAUDE.md §11）。

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export type PdfPage = { page: number; text: string };

export async function pdfPages(data: Uint8Array): Promise<PdfPage[]> {
  // 保護のかかったPDFや壊れたPDFで例外が飛ぶ。呼び出し側が扱えるよう言葉にして投げ直す
  let doc;
  try {
    doc = await getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
  } catch (e) {
    const err = e as { name?: string; message?: string };
    if (err.name === 'PasswordException') throw new Error('PDFに保護がかかっていて読めない');
    if (err.name === 'InvalidPDFException') throw new Error('PDFとして読めない（空か壊れている）');
    throw new Error(`PDFを開けない: ${err.message ?? String(e)}`);
  }
  const out: PdfPage[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // 縦組み・表組みが多いので、行の推定はせず、項目を空白でつなぐだけにする
    const text = content.items
      .map((it) => ('str' in it ? it.str : ''))
      .join(' ')
      .replace(/[ \t\u3000]+/g, ' ')
      .trim();
    out.push({ page: i, text });
    page.cleanup();
  }
  await doc.cleanup?.();
  return out;
}

export const pdfText = async (data: Uint8Array) =>
  (await pdfPages(data)).map((p) => p.text).join('\n');
