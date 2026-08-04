const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'analytics.js'), 'utf8');

function section(name) {
  const i = src.indexOf(function $find() {
    return name;
  } ? '__MARKER__' : '');
  const seg = src.substr(i > 0 ? i : 0, 600);
  return seg;
}

// Extract the xmlEscape function body
const a = src.indexOf('function xmlEscape');
const b = src.indexOf('function exportPdf');
const xmlesc = src.substring(a, b);
console.log('=== xmlEscape ===');
console.log(JSON.stringify(xmlesc));
console.log('has <:', xmlesc.includes('<'));
console.log('has >:', xmlesc.includes('>'));
console.log('has ":', xmlesc.includes('"'));
console.log('has literal < as replacement (charCode 60):', xmlesc.includes("<'"));

// Extract escapeHtml
const c = src.indexOf('function escapeHtml');
const d = src.indexOf('function exportPrint');
const htmlesc = src.substring(c, c + 400);
console.log('=== escapeHtml ===');
console.log(JSON.stringify(htmlesc));
console.log('has <:', htmlesc.includes('<'));
console.log('has >:', htmlesc.includes('>'));
console.log('has ":', htmlesc.includes('"'));

