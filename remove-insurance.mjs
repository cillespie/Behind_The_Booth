import fs from 'fs';

let txt = fs.readFileSync('public/index.html', 'utf8');

txt = txt.replace('<span class="stat-label">& Fully Insured</span>', '<span class="stat-label">Highly Rated</span>');
txt = txt.replace('100% Insured & Built-in Redundancy', 'Built-in Redundancy');
txt = txt.replace('We carry standard $1,000,000 commercial general liability insurance policies (verifiable certificates sent directly to your venue). Furthermore, every single gig features a full set of redundant backup gear to ensure the music never stops.', 'Every single gig features a full set of redundant backup gear to ensure the music never stops.');
txt = txt.replace('<p>&copy; 2026 Behind The Booth Entertainment LLC. All Rights Reserved. Fully Licensed &amp; Insured in Virginia.</p>', '<p>&copy; 2026 Behind The Booth Entertainment LLC. All Rights Reserved.</p>');

// Remove the FAQ item about insurance
const faqStart = txt.indexOf('<div class="faq-item glass-panel">\r\n                        <button class="faq-question">\r\n                            <span>Are you insured and licensed?</span>');
if (faqStart === -1) {
    const fallbackStart = txt.indexOf('<div class="faq-item glass-panel">\n                        <button class="faq-question">\n                            <span>Are you insured and licensed?</span>');
    if (fallbackStart !== -1) {
        const fallbackEnd = txt.indexOf('</div>\n                    </div>', fallbackStart) + 33;
        txt = txt.slice(0, fallbackStart) + txt.slice(fallbackEnd);
    }
} else {
    const faqEnd = txt.indexOf('</div>\r\n                    </div>', faqStart) + 34;
    txt = txt.slice(0, faqStart) + txt.slice(faqEnd);
}

fs.writeFileSync('public/index.html', txt);
console.log('Removed all insurance claims');
