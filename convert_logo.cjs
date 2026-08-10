const { Jimp } = require('jimp');

async function convert() {
  try {
    const icon = await Jimp.read('src/assets/images/medichain_icon_only_1786351129341.jpg');
    // Make transparent? Let's just save it as png
    icon.resize({ w: 512, h: 512 });
    await icon.write('src/assets/images/logo.png');
    await icon.write('public/logo.png');
    console.log('Converted icon successfully');
  } catch (err) {
    console.error('Error:', err);
  }
}
convert();
