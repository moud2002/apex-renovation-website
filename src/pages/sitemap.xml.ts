import {siteOrigin, publicRoutes} from '../lib/seo';
const origin=siteOrigin(import.meta.env.SITE_URL);
const enabled=Boolean(origin && import.meta.env.PUBLIC_INDEXABLE==='true');
export function GET(){
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${enabled?publicRoutes.map(path=>`<url><loc>${origin}${path}</loc></url>`).join(''):''}</urlset>`,{headers:{'Content-Type':'application/xml'}});
}
