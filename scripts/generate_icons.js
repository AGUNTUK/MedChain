import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function createIcons() {
  const inputImage = 'public/logo.png';
  const outDir = 'public/icons';
  
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Get image metadata
  const metadata = await sharp(inputImage).metadata();
  const size = Math.min(metadata.width, metadata.height);

  // 1. Center crop the image to a square first
  const squareBuffer = await sharp(inputImage)
    .extract({
      left: Math.floor((metadata.width - size) / 2),
      top: Math.floor((metadata.height - size) / 2),
      width: size,
      height: size
    })
    .toBuffer();

  // 2. Generate 192x192
  await sharp(squareBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, 'icon-192.png'));

  // 3. Generate 512x512 (Any)
  await sharp(squareBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'icon-512.png'));

  // 4. Generate 512x512 (Maskable)
  // Maskable icons need a safe zone. The icon content should be within the inner 80%.
  // 512 * 0.8 = 409.6 (Let's use 410 for the content, and pad the rest with #14161B).
  await sharp(squareBuffer)
    .resize(410, 410, { fit: 'contain', background: { r: 20, g: 22, b: 27, alpha: 1 } }) // #14161B is roughly rgb(20, 22, 27)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: { r: 20, g: 22, b: 27, alpha: 1 }
    })
    .png()
    .toFile(path.join(outDir, 'icon-512-maskable.png'));

  // 5. Favicon and Apple Touch Icon
  await sharp(squareBuffer).resize(64, 64).png().toFile('public/favicon.png');
  await sharp(squareBuffer).resize(180, 180).png().toFile('public/apple-touch-icon.png');

  console.log('Icons generated successfully.');
}

createIcons().catch(console.error);
