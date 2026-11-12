// Salin server/schema.sql menjadi modul JS agar ikut dibundel ke Netlify Functions.
import fs from 'node:fs';
const sql = fs.readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8');
fs.writeFileSync(new URL('../server/lib/schema.js', import.meta.url),
  `// Dibuat otomatis dari server/schema.sql — jalankan \`npm run schema\` setelah mengubahnya.\nexport default ${JSON.stringify(sql)};\n`);
console.log('✓ server/lib/schema.js diperbarui');
