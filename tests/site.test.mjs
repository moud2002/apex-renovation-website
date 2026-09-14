import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const dist=path.join(root,'dist');
const routes=['','about','experience','client-experience','renovations','renovations/commercial','renovations/whole-home','renovations/kitchens-bathrooms','renovations/investment-properties','start-your-project','privacy','inbox','settings','legal'];
const htmls=routes.map(route=>readFileSync(path.join(dist,route,'index.html'),'utf8'));
test('all pages are crawlable HTML with one H1 and distinct metadata',()=>{
  const titles=new Set(),descriptions=new Set();
  for(const html of htmls){
    assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1);
    assert.ok(html.includes('<html lang="en">'));
    titles.add(html.match(/<title>(.*?)<\/title>/)?.[1]);
    descriptions.add(html.match(/name="description" content="([^"]+)"/)?.[1]);
    assert.ok(html.includes('name="robots" content="noindex, nofollow"'));
    assert.ok(!html.includes('rel="canonical"'),'Preview must not invent a production origin');
  }
  assert.equal(titles.size,routes.length);assert.equal(descriptions.size,routes.length);
});
test('all internal links, imagery, fonts, and scripts resolve to built files',()=>{
  for(const html of htmls){
    for(const match of html.matchAll(/(?:href|src)="([^"#?]*)/g)){
      if(!match[1]||/^(?:https?:|tel:|mailto:|data:)/.test(match[1]))continue;
      const target=decodeURI(match[1]);const file=target.startsWith('/')?path.join(dist,target):path.join(dist,routes[htmls.indexOf(html)],target);
      assert.ok(existsSync(file)||existsSync(path.join(file,'index.html')),`Missing ${target}`);
    }
  }
});
test('contact selectors contain all real selectable options',()=>{
  const html=htmls[routes.indexOf('start-your-project')];
  const budget=html.match(/<select name="budget">([\s\S]*?)<\/select>/)[1];
  const timeline=html.match(/<select name="timeline">([\s\S]*?)<\/select>/)[1];
  assert.equal((budget.match(/<option /g)||[]).length,8);
  assert.equal((timeline.match(/<option /g)||[]).length,6);
  assert.equal((html.match(/name="projectType"/g)||[]).length,6);
  assert.ok(html.includes('name="consent" required'));
});
test('stylesheet font files resolve in normal and nested preview builds',()=>{
  for(const name of readdirSync(path.join(dist,'_astro')).filter(n=>n.endsWith('.css'))){
    const cssFile=path.join(dist,'_astro',name);
    for(const match of readFileSync(cssFile,'utf8').matchAll(/url\((["']?)([^)"']+)\1\)/g)){
      if(/^(data:|https?:)/.test(match[2]))continue;
      const target=match[2].startsWith('/')?path.join(dist,match[2]):path.resolve(path.dirname(cssFile),match[2]);
      assert.ok(existsSync(target),`Font asset missing: ${match[2]}`);
    }
  }
});
test('public files contain no client details or private credentials',()=>{
  for(const html of htmls){
    assert.doesNotMatch(html, /Ferguson|1229 8th|moud2002|ferguson|67,800|1925|apex-demo/);
  }
  const walk=dir=>readdirSync(dir).flatMap(name=>{const f=path.join(dir,name);return statSync(f).isDirectory()?walk(f):[f]});
  assert.ok(walk(dist).every(f=>!/\.(sqlite3?|db|env|map)$/.test(f)));
});
test('portal is external, homepage imagery is scoped, and production indexing is configurable',()=>{
  assert.ok(htmls[0].includes('href="https://apexpropertyportal.com/"'));
  const main=htmls[0].match(/<main[\s\S]*?<\/main>/)[0];
  assert.deepEqual([...main.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m=>m[1]),['/assets/home-editorial.webp','/assets/apex-wine-room.jpeg']);
  assert.ok(readFileSync(path.join(dist,'robots.txt'),'utf8').includes('User-agent: *\nDisallow: /\n'));
  assert.ok(readFileSync(path.join(dist,'sitemap.xml'),'utf8').includes('<urlset'));
  assert.ok(htmls[routes.indexOf('renovations/whole-home')].includes('"@type":"Service"'));
});

test('every page supplies the brand preview and correctly sized Safari icons',()=>{
  for(const html of htmls){
    assert.match(html,/property="og:image" content="https:\/\/[^" ]+\/assets\/apex-social-logo.png"/);
    assert.ok(html.includes('property="og:image:width" content="1672"'));
    assert.ok(html.includes('property="og:image:height" content="941"'));
    assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
    assert.ok(html.includes('rel="apple-touch-icon"'));
    assert.ok(html.includes('/favicon.ico?v=apex-gold-2'));
  }
  const robots=readFileSync(path.join(dist,'robots.txt'),'utf8');
  for(const agent of ['facebookexternalhit','LinkedInBot','Applebot','Twitterbot'])assert.ok(robots.includes(`User-agent: ${agent}\nAllow: /\nDisallow: /inbox\nDisallow: /settings\nDisallow: /api`));
  const image=readFileSync(path.join(dist,'assets/apex-social-logo.png'));
  assert.equal(image.readUInt32BE(16),1672);assert.equal(image.readUInt32BE(20),941);
});
