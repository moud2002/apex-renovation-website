import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

// Preview-only: the Computer host serves the bundle below a nested URL.
// Production builds keep their clean, root-relative routes.
const dist = path.resolve(import.meta.dirname, '../dist');
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});
let changed = 0;
for (const file of walk(dist).filter(file => file.endsWith('.html'))) {
  const relative = value => {
    if (!value.startsWith('/') || value.startsWith('//')) return value;
    const separator = value.search(/[?#]/);
    const pathname = separator < 0 ? value : value.slice(0, separator);
    const suffix = separator < 0 ? '' : value.slice(separator);
    let target = path.join(dist, pathname);
    if (pathname.endsWith('/')) target = path.join(target, 'index.html');
    if (!existsSync(target)) throw new Error(`Preview asset missing: ${pathname}`);
    return (path.relative(path.dirname(file), target).split(path.sep).join('/') || 'index.html') + suffix;
  };
  let html = readFileSync(file, 'utf8');
  html = html.replace(/\b(href|src|poster)="([^"]*)"/g, (_all, attribute, value) => `${attribute}="${relative(value)}"`);
  html = html.replace(/\bsrcset="([^"]*)"/g, (_all, value) => `srcset="${value.split(',').map(candidate => {
    const [url, ...descriptor] = candidate.trim().split(/\s+/);
    return [relative(url), ...descriptor].join(' ');
  }).join(', ')}"`);
  writeFileSync(file, html);
  changed++;
}
for (const file of walk(dist).filter(file => file.endsWith('.css'))) {
  let css = readFileSync(file, 'utf8');
  css = css.replace(/url\((["']?)(\/(?!\/)[^)"']+)\1\)/g, (_all, quote, value) => {
    const target = path.join(dist, value);
    if (!existsSync(target)) throw new Error(`Preview CSS asset missing: ${value}`);
    return `url(${quote}${path.relative(path.dirname(file), target).split(path.sep).join('/')}${quote})`;
  });
  writeFileSync(file, css);
}
console.log(`Prepared ${changed} HTML pages and local CSS assets for the nested preview host.`);
