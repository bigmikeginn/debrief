const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const images = [
  'Debrief Logo transparent.png',
  'Debrief Logo.png',
  'boxing picture.png',
  'waves.png',
  'striking-vs-grappling.png'
];

async function optimizeImages() {
  try {
    if (!fs.existsSync('optimized-images')) {
      fs.mkdirSync('optimized-images');
    }

    for (const img of images) {
      if (fs.existsSync(img)) {
        const outputPath = path.join('optimized-images', img.replace(/\.png$/, '.webp'));
        await sharp(img)
          .webp({ quality: 85 })
          .toFile(outputPath);
        console.log(`Optimized ${img} → ${outputPath}`);
      }
    }

    console.log('✅ All images optimized!');
  } catch (err) {
    console.error('Image optimization failed:', err);
  }
}

optimizeImages();