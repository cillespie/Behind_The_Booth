import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, 'public', 'assets');
const files = fs.readdirSync(dir);

(async () => {
  for (const file of files) {
    if (file.match(/\.(png|jpg|jpeg|jfif)$/i)) {
      const input = path.join(dir, file);
      const name = path.parse(file).name;
      const output = path.join(dir, name + '.webp');
      console.log(`Converting ${file} to ${name}.webp...`);
      await sharp(input).webp({ quality: 80 }).toFile(output);
      console.log(`✓ Saved ${name}.webp`);
    }
  }
})();
