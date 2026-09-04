/**
 * optimize-images.mjs
 * 
 * Converts source images (PNG, JPG, JFIF) from src-images/ into optimized
 * WebP files in public/assets/. Compares output size against the source —
 * if the WebP version is larger, copies the original instead.
 * 
 * Usage:
 *   npm run optimize
 *   node optimize-images.mjs [--input <dir>] [--output <dir>]
 */

import { readdir, stat, copyFile, mkdir } from 'node:fs/promises';
import { join, extname, basename, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Parse CLI args or use defaults
function parseArgs() {
    const args = process.argv.slice(2);
    let input = join(__dirname, 'src-images');
    let output = join(__dirname, 'public', 'assets');

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--input' && args[i + 1]) input = args[++i];
        if (args[i] === '--output' && args[i + 1]) output = args[++i];
    }
    return { input, output };
}

const SUPPORTED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.jfif', '.webp']);

async function optimizeImages() {
    const { input, output } = parseArgs();

    // Ensure output dir exists
    await mkdir(output, { recursive: true });

    let files;
    try {
        files = await readdir(input);
    } catch (err) {
        console.error(`❌ Cannot read input directory: ${input}`);
        console.error(`   Create it and place source images there, or use --input <dir>`);
        process.exit(1);
    }

    const imageFiles = files.filter(f => SUPPORTED_EXTENSIONS.has(extname(f).toLowerCase()));

    if (imageFiles.length === 0) {
        console.log(`No images found in ${input}`);
        return;
    }

    console.log(`\n🖼️  Optimizing ${imageFiles.length} image(s): ${input} → ${output}\n`);

    let totalSaved = 0;

    for (const file of imageFiles) {
        const srcPath = join(input, file);
        const { name } = parse(file);
        const webpPath = join(output, `${name}.webp`);

        const srcStat = await stat(srcPath);
        const srcSize = srcStat.size;

        try {
            // Convert to WebP at quality 80
            await sharp(srcPath)
                .webp({ quality: 80 })
                .toFile(webpPath);

            const webpStat = await stat(webpPath);
            const webpSize = webpStat.size;

            const delta = srcSize - webpSize;
            const pct = ((delta / srcSize) * 100).toFixed(1);

            if (webpSize < srcSize) {
                // WebP is smaller — keep it
                console.log(`  ✅ ${file} → ${name}.webp  (${formatKB(srcSize)} → ${formatKB(webpSize)}, saved ${pct}%)`);
                totalSaved += delta;
            } else {
                // Source is smaller — copy source directly, discard bloated WebP
                const destPath = join(output, file);
                await copyFile(srcPath, destPath);
                // Remove the oversized WebP (we just wrote it)
                const { unlink } = await import('node:fs/promises');
                await unlink(webpPath);
                console.log(`  ⚠️  ${file} → kept original (WebP was ${Math.abs(pct)}% larger)`);
            }
        } catch (err) {
            console.error(`  ❌ ${file}: ${err.message}`);
        }
    }

    console.log(`\n✨ Done. Total saved: ${formatKB(totalSaved)}\n`);
}

function formatKB(bytes) {
    return `${(bytes / 1024).toFixed(1)} KB`;
}

optimizeImages();
