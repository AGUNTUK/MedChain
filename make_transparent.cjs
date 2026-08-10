const { Jimp } = require('jimp');

async function makeTransparent(input, output) {
  try {
    const image = await Jimp.read(input);
    
    const targetColor = { r: 255, g: 255, b: 255 };
    const tolerance = 15;
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      if (
        r >= targetColor.r - tolerance && 
        g >= targetColor.g - tolerance && 
        b >= targetColor.b - tolerance
      ) {
        this.bitmap.data[idx + 3] = 0;
      }
    });

    await image.write(output);
    console.log('Successfully created transparent image:', output);
  } catch (err) {
    console.error('Error processing image:', err);
  }
}

makeTransparent(process.argv[2], process.argv[3]);
