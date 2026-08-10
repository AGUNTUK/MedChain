const { Jimp } = require('jimp');

async function convert() {
  try {
    const icon = await Jimp.read('public/logo.png');

    // Pass direct numbers for width and height
    icon.resize(192, 192);

    // Use writeAsync instead of write
    await icon.writeAsync('public/icon-192.png');

    console.log('Resized icon successfully');
  } catch (err) {
    console.error('Error:', err);
  }
}

convert();