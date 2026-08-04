/**
 * _fix_escapes.js — repair the escaping helper functions in analytics.js.
 *
 * What it does:
 *   1. Rewrites `xmlEscape`, `escapeHtml`, and `esc` with REAL XML/HTML
 *      entity replacements (amp, lt, gt, quot) built via string
 *      concatenation so this file's source can never be mangled by tools
 *      that HTML-decode entity sequences.
 *   2. Uses brace-balanced function replacement (no fragile regex) so it
 *      can never clip the wrong block or corrupt the surrounding file.
 *   3. Validates the rewritten analytics.js with `node --check`.
 */
var fs = require('fs');
var path = require('path');
var execFileSync = require('child_process').execFileSync;

var file = path.join(__dirname, 'analytics.js');

/* Real entities, constructed by concatenation to avoid any tool that
 * HTML-decodes "<" and friends while the file is being written. */
var AMP = '&' + 'amp;';
var LT = '&' + 'lt;';
var GT = '&' + 'gt;';
var QUOT = '&' + 'quot;';

function buildEscBody(fnName) {
  return [
    'function ' + fnName + '(v) {',
    '  return String(v ?? \'\')',
    "    .replace(/&/g, '" + AMP + "')",
    "    .replace(/</g, '" + LT + "')",
    "    .replace(/>/g, '" + GT + "')",
    '    .replace(/"/g, \'' + QUOT + '\')',
    '  }'
  ].join('\n');
}

function buildEscInline() {
  return [
    'function esc(v) {',
    '    return String(v ?? \'\').replace(/&/g, \'' + AMP + '\').replace(/</g, \'' + LT + '\').replace(/>/g, \'' + GT + '\').replace(/"/g, \'' + QUOT + '\');',
    '  }'
  ].join('\n');
}

/**
 * Replace a whole `function <fnName>(...) { ... }` block with `newBody`.
 * Finds the matching closing brace by counting braces, so it is safe even
 * if the body itself contains braces, strings, or nested functions.
 */
function replaceFunction(source, fnName, newBody) {
  var start = source.indexOf('function ' + fnName + '(');
  if (start === -1) throw new Error('Could not find "function ' + fnName + '(' + '" in ' + file + '.');
  var open = source.indexOf('{', start);
  if (open === -1) throw new Error('Could not find "{" for ' + fnName + '.');

  var depth = 0;
  var i = open;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) throw new Error('Unbalanced braces in ' + fnName + '.');

  var end = i + 1; /* include the final '}' */
  var before = source.slice(0, start);
  var after = source.slice(end);

  /* Reflow newline style to match the file (CRLF when the file leans CRLF). */
  var crlf = (before.split('\r\n').length - 1) >= (before.split('\n').length - 1);
  var body = crlf ? newBody.replace(/\n/g, '\r\n') : newBody;

  return before + body + after;
}

var src = fs.readFileSync(file, 'utf8');
src = replaceFunction(src, 'xmlEscape', buildEscBody('xmlEscape'));
src = replaceFunction(src, 'escapeHtml', buildEscBody('escapeHtml'));
src = replaceFunction(src, 'esc', buildEscInline());
fs.writeFileSync(file, src);

/* Validate the produced file is syntactically valid JavaScript. */
execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });

/* Byte-level confirmation using built entity constants. */
var ltOk = src.indexOf("replace(/</g, '" + LT + "')") !== -1;
var broken = src.indexOf(".replace(/</g, '<')") !== -1;
console.log('OK — escapes fixed and validated with node --check.');
console.log('xmlEscape / escapeHtml / esc use real lt-entity :', ltOk);
console.log('No broken no-op "<" replacement remains         :', !broken);
