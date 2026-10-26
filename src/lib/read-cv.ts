/** Browser-only text extraction. Never render document HTML or send the file elsewhere. */
export async function readCv(file: File): Promise<string> {
  if (file.size === 0 || file.size > 4 * 1024 * 1024 || !/\.(pdf|docx|txt)$/i.test(file.name)) throw new Error('invalidFile');
  let text = '';
  if (/\.txt$/i.test(file.name)) text = await file.text();
  else if (/\.docx$/i.test(file.name)) {
    const imported = await import('mammoth/mammoth.browser');
    const mammoth = imported.default || imported;
    text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  } else {
    const pdf = await import('pdfjs-dist');
    pdf.GlobalWorkerOptions.workerSrc = '/ai-runtime/pdf.worker.min.mjs';
    const task = pdf.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: true });
    try {
      const doc = await task.promise;
      // Bound CPU/memory for unexpectedly large documents; CVs should be much shorter.
      if (doc.numPages > 30) throw new Error('invalidFile');
      const pages: string[] = [];
      for (let page = 1; page <= doc.numPages; page++) {
        const content = await (await doc.getPage(page)).getTextContent();
        pages.push(content.items.map(item => 'str' in item ? item.str : '').join(' '));
      }
      text = pages.join('\n');
    } finally { await task.destroy(); }
  }
  text = text.replace(/\u0000/g, '').trim().slice(0, 20000);
  if (text.length < 40) throw new Error('noText');
  return text;
}
