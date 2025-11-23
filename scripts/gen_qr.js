#!/usr/bin/env node
const qrcode = require('qrcode');
const fs = require('fs');

const s = process.argv[2] || process.env.QR;
if (!s) {
  console.error('No QR string provided. Usage: node scripts/gen_qr.js "<QR_STRING>"');
  process.exit(1);
}

(async () => {
  try {
    await qrcode.toFile('tmp_qr.png', s, { width: 400 });
    const svg = await qrcode.toString(s, { type: 'svg', margin: 1 });
    await fs.promises.writeFile('tmp_qr.svg', svg);
    console.log('Saved tmp_qr.png and tmp_qr.svg');
  } catch (e) {
    console.error('Failed to generate QR:', e);
    process.exit(1);
  }
})();
