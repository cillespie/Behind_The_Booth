/**
 * scripts/cloudflare-check.mjs
 *
 * Diagnostic script to verify Cloudflare email routing is healthy.
 * Reads credentials from .env.local, checks token validity, zone lookup,
 * email routing rules, destination verification, and MX records.
 *
 * Usage:
 *   node scripts/cloudflare-check.mjs
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed
 */

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------- Load .env.local ----------
async function loadEnv() {
    const envPath = join(ROOT, '.env.local');
    const content = await readFile(envPath, 'utf-8');
    const env = {};
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
    return env;
}

// ---------- Helpers ----------
const CF_BASE = 'https://api.cloudflare.com/client/v4';

async function cfGet(path, token) {
    const res = await fetch(`${CF_BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
}

function pass(label) { console.log(`  ✅ ${label}`); }
function fail(label, detail) {
    console.log(`  ❌ ${label}`);
    if (detail) console.log(`     → ${detail}`);
}

// ---------- Checks ----------
async function run() {
    console.log('\n🔍 Cloudflare Email Routing Health Check\n');

    let env;
    try {
        env = await loadEnv();
    } catch {
        fail('.env.local', 'File not found or unreadable');
        process.exit(1);
    }

    const token = env.CLOUDFLARE_API_TOKEN;
    const zoneId = env.CLOUDFLARE_ZONE_ID;
    const zoneName = env.CLOUDFLARE_ZONE_NAME;

    if (!token || !zoneId || !zoneName) {
        fail('Environment variables', 'Missing CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, or CLOUDFLARE_ZONE_NAME');
        process.exit(1);
    }

    let failures = 0;

    // 1. Token verify
    console.log('1. Token verification');
    try {
        const tokenCheck = await cfGet('/user/tokens/verify', token);
        if (tokenCheck.success && tokenCheck.result?.status === 'active') {
            pass('API token is valid and active');
        } else {
            fail('API token', tokenCheck.errors?.[0]?.message || 'Token inactive');
            failures++;
        }
    } catch (err) {
        fail('API token', err.message);
        failures++;
    }

    // 2. Zone lookup
    console.log('2. Zone lookup');
    try {
        const zone = await cfGet(`/zones/${zoneId}`, token);
        if (zone.success && zone.result?.name === zoneName) {
            pass(`Zone "${zoneName}" found (status: ${zone.result.status})`);
        } else {
            fail('Zone lookup', zone.errors?.[0]?.message || 'Zone not found or name mismatch');
            failures++;
        }
    } catch (err) {
        fail('Zone lookup', err.message);
        failures++;
    }

    // 3. Email routing rules
    console.log('3. Email routing rules');
    const targetAddress = 'djjondoe@behindtheboothent.com';
    try {
        const rules = await cfGet(`/zones/${zoneId}/email/routing/rules`, token);
        if (rules.success) {
            const matchingRule = rules.result?.find(r =>
                r.matchers?.some(m => m.value === targetAddress)
            );
            if (matchingRule) {
                const enabled = matchingRule.enabled !== false;
                if (enabled) {
                    pass(`Rule for "${targetAddress}" exists and is enabled`);
                } else {
                    fail(`Rule for "${targetAddress}"`, 'Rule exists but is DISABLED');
                    failures++;
                }
            } else {
                fail('Routing rules', `No rule found for "${targetAddress}"`);
                failures++;
            }
        } else {
            fail('Routing rules', rules.errors?.[0]?.message || 'Could not fetch rules');
            failures++;
        }
    } catch (err) {
        fail('Routing rules', err.message);
        failures++;
    }

    // 4. Destination address verified
    console.log('4. Destination address verification');
    try {
        const addrs = await cfGet(`/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/email/routing/addresses`, token);
        if (addrs.success) {
            const verified = addrs.result?.filter(a => a.verified);
            if (verified && verified.length > 0) {
                pass(`${verified.length} verified destination(s): ${verified.map(a => a.email).join(', ')}`);
            } else {
                fail('Destination addresses', 'No verified destination addresses found');
                failures++;
            }
        } else {
            fail('Destination addresses', addrs.errors?.[0]?.message || 'Could not fetch addresses');
            failures++;
        }
    } catch (err) {
        fail('Destination addresses', err.message);
        failures++;
    }

    // 5. MX records
    console.log('5. MX records');
    try {
        const dns = await cfGet(`/zones/${zoneId}/dns_records?type=MX`, token);
        if (dns.success) {
            const mxRecords = dns.result || [];
            const cfMx = mxRecords.filter(r => r.content?.includes('mx.cloudflare.net'));
            if (cfMx.length >= 3) {
                pass(`${cfMx.length} Cloudflare MX records present`);
            } else if (cfMx.length > 0) {
                fail('MX records', `Only ${cfMx.length} Cloudflare MX record(s) found (expected 3)`);
                failures++;
            } else {
                fail('MX records', 'No Cloudflare MX records found');
                failures++;
            }
        } else {
            fail('MX records', dns.errors?.[0]?.message || 'Could not fetch DNS records');
            failures++;
        }
    } catch (err) {
        fail('MX records', err.message);
        failures++;
    }

    // Summary
    console.log('\n' + '─'.repeat(50));
    if (failures === 0) {
        console.log('✨ All checks passed — email routing is healthy.\n');
        process.exit(0);
    } else {
        console.log(`⚠️  ${failures} check(s) failed. Review above.\n`);
        process.exit(1);
    }
}

run();
