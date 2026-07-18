const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'Eventdowntown.jfif');
const dest = path.join(__dirname, 'public', 'assets', 'Eventdowntown.png');

try {
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log('✔ Instantly replaced public/assets/Eventdowntown.png with optimized Eventdowntown.jfif (93 KB)!');
    } else {
        console.log('⚠ Eventdowntown.jfif not found in root directory.');
    }
} catch (err) {
    console.error('✗ Failed to copy optimized image:', err);
}
