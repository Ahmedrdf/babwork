const { mkdirSync, copyFileSync } = require('node:fs');
const { dirname, join } = require('node:path');
const output = join(__dirname, '..', 'public', 'ai-runtime');
mkdirSync(output, { recursive: true });
const ort = dirname(require.resolve('onnxruntime-web'));
for (const name of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) {
  copyFileSync(join(ort, name), join(output, name));
}
const pdf = dirname(require.resolve('pdfjs-dist'));
copyFileSync(join(pdf, 'pdf.worker.min.mjs'), join(output, 'pdf.worker.min.mjs'));
console.log('Prepared browser AI and PDF runtime assets.');
