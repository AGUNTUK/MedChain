const { Jimp } = require('jimp');

async function resizeIcons() {
  try {
    const image = await Jimp.read('src/assets/images/logo-transparent.png');
    
    // favicon (32x32)
    const favicon = image.clone().resize({ w: 32, h: 32 });
    await favicon.write('public/favicon.png');
    
    // apple-touch-icon (180x180)
    const appleTouchIcon = image.clone().resize({ w: 180, h: 180 });
    await appleTouchIcon.write('public/apple-touch-icon.png');
    
    // icon-192
    const icon192 = image.clone().resize({ w: 192, h: 192 });
    await icon192.write('public/icon-192.png');
    
    // icon-512
    const icon512 = image.clone().resize({ w: 512, h: 512 });
    await icon512.write('public/icon-512.png');
    
    console.log('Successfully resized icons');
  } catch (err) {
    console.error('Error resizing icons:', err);
  }
}

resizeIcons();
