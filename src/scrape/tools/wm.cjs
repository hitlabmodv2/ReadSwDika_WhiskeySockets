'use strict';

function escapeXml(str) {
        return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
}

async function addWatermarkToImage(imageBuffer, { packName = '', authorName = '' } = {}) {
        const sharp = require('sharp');

        const resized = await sharp(imageBuffer)
                .resize(512, 512, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png()
                .toBuffer();

        const hasAuthor = authorName && authorName.trim().length > 0;
        const hasPack   = packName   && packName.trim().length   > 0;

        if (!hasPack && !hasAuthor) return resized;

        const W    = 512;
        const H    = 512;
        const barH = hasAuthor && hasPack ? 76 : 46;
        const barY = H - barH;

        let textLines = '';
        if (hasPack && hasAuthor) {
                textLines = `
  <text x="${W / 2}" y="${barY + 28}" font-family="Arial,Noto Sans,DejaVu Sans,sans-serif" font-size="26" font-weight="bold" fill="white" text-anchor="middle">${escapeXml(packName)}</text>
  <text x="${W / 2}" y="${barY + 60}" font-family="Arial,Noto Sans,DejaVu Sans,sans-serif" font-size="20" fill="#cccccc" text-anchor="middle">~ ${escapeXml(authorName)} ~</text>`;
        } else {
                const label = hasPack ? packName : authorName;
                textLines = `
  <text x="${W / 2}" y="${barY + 30}" font-family="Arial,Noto Sans,DejaVu Sans,sans-serif" font-size="26" font-weight="bold" fill="white" text-anchor="middle">${escapeXml(label)}</text>`;
        }

        const svgOverlay = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="${barY}" width="${W}" height="${barH}" fill="rgba(0,0,0,0.58)"/>
  ${textLines.trim()}
</svg>`;

        return await sharp(resized)
                .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
                .png()
                .toBuffer();
}

module.exports = { addWatermarkToImage };
