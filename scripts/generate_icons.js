import { Jimp } from 'jimp';

async function createIcons() {
  const image = await Jimp.read('public/logo.png');
  // Crop to square if it's not square (2240x1792 -> center crop 1792x1792)
  const size = Math.min(image.bitmap.width, image.bitmap.height);
  const x = (image.bitmap.width - size) / 2;
  const y = (image.bitmap.height - size) / 2;
  
  image.crop({ x, y, w: size, h: size });
  
  // Save 192x192
  const img192 = image.clone();
  img192.resize({ w: 192, h: 192 });
  await img192.write('public/icon-192.png');
  
  // Save 512x512
  const img512 = image.clone();
  img512.resize({ w: 512, h: 512 });
  await img512.write('public/icon-512.png');
  
  // Save favicon (64x64)
  const img64 = image.clone();
  img64.resize({ w: 64, h: 64 });
  await img64.write('public/favicon.png');
  
  // Save apple touch icon (180x180)
  const img180 = image.clone();
  img180.resize({ w: 180, h: 180 });
  await img180.write('public/apple-touch-icon.png');
  
  console.log('Icons generated successfully.');
}

createIcons().catch(console.error);
