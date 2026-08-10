const { Jimp } = require('jimp');

async function convert() {
  try {
    const icon = await Jimp.read('src/assets/images/medichain_icon_only_1786351129341.jpg');
    
    // Pass direct numbers for width and height (Do NOT pass an object)
    icon.resize(512, 512);

    // Use writeAsync for Promise-based async handling
    await icon.writeAsync('src/assets/images/logo.png');
    await icon.writeAsync('public/logo.png');

    console.log('Converted icon successfully');
  } catch (err) {
    console.error('Error:', err);
  }
}

convert();
