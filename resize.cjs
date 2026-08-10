const { Jimp } = require('jimp');

async function convert() {
  try {
    const icon = await Jimp.read('public/logo.png');
    icon.resize({ w: 192, h: 192 });
    await icon.write('public/icon-192.png');
  } catch (err) {
    console.error('Error:', err);
  }
}
convert();
