const Jimp = require('jimp');

async function createIcons() {
  const image = await Jimp.read('public/logo.png');
  
  // Make sure image is square (optional, but good for icons)
  // Save 192x192
  await image.clone().resize(192, 192).writeAsync('public/icon-192.png');
  // Save 512x512
  await image.clone().resize(512, 512).writeAsync('public/icon-512.png');
  // Save favicon (64x64)
  await image.clone().resize(64, 64).writeAsync('public/favicon.png');
  // Save apple touch icon (180x180)
  await image.clone().resize(180, 180).writeAsync('public/apple-touch-icon.png');
  
  console.log('Icons generated successfully.');
}

createIcons().catch(console.error);
