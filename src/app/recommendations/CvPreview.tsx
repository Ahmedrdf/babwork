'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist';
import { useLocale } from '@/i18n/client';
import { cvPreviewMessages } from '@/i18n/cv-preview';

function PdfPreview({ file }: { file: File }) {
  const t = cvPreviewMessages[useLocale()];
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const paper = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(500);
  const [page, setPage] = useState(1);
  const [rendered, setRendered] = useState<{ file: File; page: number; width: number; pages: number; failed: boolean } | null>(null);
  const current = rendered?.file === file && rendered.page === page && rendered.width === width;
  const pages = rendered?.file === file ? rendered.pages : 0;

  useEffect(() => {
    const container = paper.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      const nextWidth = Math.floor(entries[0].contentRect.width);
      if (nextWidth > 0) setWidth(previous => Math.abs(previous - nextWidth) > 1 ? nextWidth : previous);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | undefined;
    let render: RenderTask | undefined;
    let pageCount = 0;
    void (async () => {
      const pdf = await import('pdfjs-dist');
      if (cancelled) return;
      pdf.GlobalWorkerOptions.workerSrc = '/ai-runtime/pdf.worker.min.mjs';
      const data = new Uint8Array(await file.arrayBuffer());
      if (cancelled) return;
      task = pdf.getDocument({ data, useSystemFonts: true });
      const doc = await task.promise;
      if (cancelled) return;
      if (doc.numPages > 30) throw new Error('Too many pages');
      pageCount = doc.numPages;
      const pdfPage = await doc.getPage(page);
      if (cancelled || !canvas.current) return;
      const viewport = pdfPage.getViewport({ scale: width / pdfPage.getViewport({ scale: 1 }).width });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.current.width = Math.round(viewport.width * ratio);
      canvas.current.height = Math.round(viewport.height * ratio);
      render = pdfPage.render({ canvas: canvas.current, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
      await render.promise;
      if (!cancelled) setRendered({ file, page, width, pages: pageCount, failed: false });
    })().catch(() => {
      if (!cancelled) setRendered({ file, page, width, pages: pageCount, failed: true });
    });
    return () => { cancelled = true; render?.cancel(); if (task) void task.destroy().catch(() => {}); };
  }, [file, page, width]);

  return <>
    <p className="hint">{t.original}</p>
    <p className={`cv-preview-status${current && rendered.failed ? ' err' : ''}`} role="status">
      {!current ? t.loading : rendered.failed ? t.failed : '\u00a0'}
    </p>
    <div className="cv-preview-paper" ref={paper} aria-busy={!current}>
      <canvas ref={canvas} className={!current || rendered.failed ? 'cv-preview-hidden' : undefined}
        role="img" aria-label={`${t.page} ${page}`} />
    </div>
    <div className="cv-preview-pages">
      <button type="button" className="btn ghost" disabled={!current || page <= 1} onClick={() => { paper.current?.scrollTo(0, 0); setPage(page - 1); }}>{t.previous}</button>
      <span aria-live="polite">{t.page} {page}{pages > 0 && ` ${t.of} ${pages}`}</span>
      <button type="button" className="btn ghost" disabled={!current || page >= pages} onClick={() => { paper.current?.scrollTo(0, 0); setPage(page + 1); }}>{t.next}</button>
    </div>
  </>;
}

export function CvPreview({ file, text }: { file: File | null; text: string }) {
  const t = cvPreviewMessages[useLocale()];
  const titleId = useId();
  const pdf = file && /\.pdf$/i.test(file.name);
  return <aside className="cv-preview plan-card" aria-labelledby={titleId}>
    <h2 id={titleId}>{t.title}</h2>
    {(file || text.trim()) && <p className="cv-preview-name"><bdi>{file?.name || t.pasted}</bdi></p>}
    {pdf ? <PdfPreview key={`${file.name}:${file.size}:${file.lastModified}`} file={file} />
      : text.trim() ? <><p className="hint">{t.text} {file && /\.docx$/i.test(file.name) && t.docx}</p><div className="cv-preview-text" dir="auto">{text}</div></>
        : <div className="cv-preview-empty"><p>{t.empty}</p></div>}
  </aside>;
}
