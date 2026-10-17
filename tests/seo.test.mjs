import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const origin = process.env.SITE_URL || '';
const enabled = Boolean(origin && process.env.PUBLIC_INDEXABLE === 'true');
const routes = ['', 'renovations', 'renovations/whole-home', 'renovations/kitchens-bathrooms',
  'renovations/investment-properties', 'renovations/commercial', 'broker-referrals',
  'client-experience', 'experience', 'about', 'start-your-project', 'privacy', 'legal'];
const html = (route = '') => fs.readFileSync(path.join(dist, route, 'index.html'), 'utf8');

test('public canonical URLs and sitemap contain the intended thirteen public routes', () => {
  const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(locations.sort(), enabled ? routes.map(route => origin + '/' + (route ? route + '/' : '')).sort() : []);
  assert.doesNotMatch(sitemap, /inbox|settings|\/api|404/);
  for (const route of routes) {
    const page = html(route);
    assert.equal(page.match(/rel="canonical" href="([^"]+)"/)?.[1], origin ? origin + '/' + (route ? route + '/' : '') : undefined);
    assert.equal(page.includes('index, follow, max-image-preview:large'), enabled);
  }
  for (const route of ['inbox', 'settings']) {
    assert.match(html(route), /noindex, nofollow/);
    assert.doesNotMatch(html(route), /rel="canonical"/);
  }
});

test('approved slogan and investor and broker copy render without a new intake requirement', () => {
  assert.match(html(), /Renovation, connected\./);
  assert.match(html(), /RENOVATE TO SELL/);
  assert.match(html(), /RENOVATE TO RENT/);
  const broker = html('broker-referrals');
  assert.match(broker, /MAKE AN INTRODUCTION/);
  assert.match(broker, /permission/);
  assert.match(broker, /optional brokerage, acquisition stage and listing-link fields/);
  assert.match(broker, /href="\/start-your-project\/\?context=broker"/);
  assert.doesNotMatch(broker, /optional “Broker or agent” role/);
  assert.match(html('renovations/investment-properties'), /Investment Property Rehab for Flips &amp; Rentals/);
  for (const route of routes) assert.equal((html(route).match(/<h1(?:\s|>)/g) || []).length, 1);
});

test('structured data is valid and does not add invented business claims', () => {
  for (const route of routes) {
    for (const match of html(route).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const data = JSON.parse(match[1]);
      assert.ok(data['@type']);
      assert.doesNotMatch(JSON.stringify(data), /aggregateRating|reviewCount|licenseNumber|streetAddress|priceRange/);
    }
  }
});

test('content batch retains the existing production inquiry and property viewer', () => {
  const intake = html('start-your-project');
  assert.doesNotMatch(intake, /__preview__|NOTHING SENT|PREVIEW COMPLETE/);
  for(const field of ['contactRole','brokerage','acquisitionStage','listingUrl'])assert.match(intake,new RegExp('name="'+field+'"'));
  assert.doesNotMatch(intake, /(?:name="(?:contactRole|brokerage|acquisitionStage|listingUrl)"[^>]*required)/);
  assert.match(intake, /name="details"/);
  assert.match(html(), /data-model-study/);
  assert.doesNotMatch(html(), /data-blueprint-example|data-blueprint-viewer/);
  const api = fs.readFileSync(path.join(root, 'src/scripts/api.ts'), 'utf8');
  assert.match(api, /await fetch\(/);
  assert.doesNotMatch(api, /LOCAL-PREVIEW-NOT-SENT/);
});

test('broad investor enquiry does not force a multifamily property and sample data is explicit',()=>{
 const investor=html('renovations/investment-properties');
 assert.match(investor,/href="\/start-your-project\/\?context=investor"/);
 assert.doesNotMatch(investor,/href="\/start-your-project\/\?type=Duplex/);
 const intake=html('start-your-project');assert.match(intake,/WHAT HAPPENS NEXT/);assert.match(intake,/tel:\+12563931280/);
 const experience=html('client-experience');assert.match(experience,/ILLUSTRATIVE EXAMPLE · FICTIONAL PROJECT/);
 for(const label of ['COMPLETED WORK','UPCOMING STEPS','DECISIONS NEEDED','BUDGET &amp; CHANGE STATUS'])assert.ok(experience.includes(label));
 assert.match(experience,/All project details and figures below are fictional/);
 assert.match(experience,/includes no site photographs/);
});
