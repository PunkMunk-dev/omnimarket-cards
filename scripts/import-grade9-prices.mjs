#!/usr/bin/env node
/**
 * import-grade9-prices.mjs
 *
 * Reads PriceCharting raw CSVs (pokemon.csv, onepiece.csv), extracts the
 * `condition-17-price` field (PSA 9 equivalent), and emits a single SQL UPDATE
 * statement that can be piped to `npx supabase db query --linked -f`.
 *
 * Prices in the raw CSV are dollar-formatted strings ("$34.99").
 * The DB stores plain numeric values (34.99).
 *
 * Usage:
 *   node scripts/import-grade9-prices.mjs > /tmp/grade9_update.sql
 *   npx supabase db query --linked -f /tmp/grade9_update.sql
 *
 * Dry-run (print stats only, no SQL):
 *   node scripts/import-grade9-prices.mjs --dry-run
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

// CSV files relative to repo root
const CSV_FILES = [
  { path: join(__dir, '../../pokemon.csv'),  label: 'pokemon' },
  { path: join(__dir, '../../onepiece.csv'), label: 'one_piece' },
];

/**
 * Parse a PriceCharting dollar-format price string to a float.
 * Returns null for empty, "N/A", or zero values.
 */
function parseDollarPrice(raw) {
  if (!raw || raw.trim() === '' || raw.trim() === 'N/A') return null;
  const n = parseFloat(raw.replace(/[$,]/g, '').trim());
  if (isNaN(n) || n <= 0) return null;
  return n;
}

/**
 * Parse a CSV line respecting quoted fields.
 * PriceCharting CSVs sometimes quote fields that contain commas.
 */
function parseCsvLine(line) {
  const fields = [];
  let inQuote = false;
  let cur = '';
  for (const ch of line) {
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

const rows = []; // { id: number, grade9_price: number }
const skipped = { noPrice: 0, badId: 0 };

for (const { path, label } of CSV_FILES) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    process.stderr.write(`WARN: could not read ${path} — skipping\n`);
    continue;
  }

  const lines = raw.split('\n');
  const header = parseCsvLine(lines[0]);

  const idIdx         = header.indexOf('id');
  const grade9Idx     = header.indexOf('condition-17-price');

  if (idIdx === -1 || grade9Idx === -1) {
    process.stderr.write(`ERROR: ${path} missing required columns (id=${idIdx}, condition-17-price=${grade9Idx})\n`);
    process.exit(1);
  }

  let fileRows = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCsvLine(line);
    const id = parseInt(fields[idIdx], 10);
    if (isNaN(id) || id <= 0) { skipped.badId++; continue; }

    const grade9 = parseDollarPrice(fields[grade9Idx]);
    if (grade9 === null) { skipped.noPrice++; continue; }

    rows.push({ id, grade9_price: grade9 });
    fileRows++;
  }

  process.stderr.write(`${label}: ${fileRows} rows with PSA-9 price\n`);
}

process.stderr.write(`Total rows to update: ${rows.length}\n`);
process.stderr.write(`Skipped (no price): ${skipped.noPrice}  Skipped (bad id): ${skipped.badId}\n`);

if (DRY_RUN) {
  process.stderr.write('Dry run — no SQL emitted.\n');
  process.exit(0);
}

if (rows.length === 0) {
  process.stderr.write('No rows to update.\n');
  process.exit(0);
}

// Emit SQL: single UPDATE … FROM (VALUES …) AS v(id, grade9_price)
// Uses ::bigint and ::numeric casts so Postgres doesn't infer text.
// Only updates rows where grade9_price changed or was NULL (safe re-run).
const CHUNK_SIZE = 5000; // keep individual statements reasonably sized

process.stdout.write('BEGIN;\n\n');

for (let offset = 0; offset < rows.length; offset += CHUNK_SIZE) {
  const chunk = rows.slice(offset, offset + CHUNK_SIZE);
  const values = chunk
    .map(r => `(${r.id}::bigint, ${r.grade9_price.toFixed(2)}::numeric)`)
    .join(',\n  ');

  process.stdout.write(
    `UPDATE public.pricecharting_tcg_cards AS t\n` +
    `SET grade9_price = v.grade9_price\n` +
    `FROM (\n  VALUES\n  ${values}\n) AS v(id, grade9_price)\n` +
    `WHERE t.id = v.id\n` +
    `  AND (t.grade9_price IS DISTINCT FROM v.grade9_price);\n\n`
  );
}

process.stdout.write('COMMIT;\n');
process.stderr.write('SQL written. Pipe to: npx supabase db query --linked -f <file>\n');
