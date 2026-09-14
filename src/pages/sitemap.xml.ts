const origin=(import.meta.env.SITE_URL||'').replace(/\/$/,'');
const routes=['/','/renovations/','/renovations/whole-home/','/renovations/kitchens-bathrooms/','/renovations/investment-properties/','/renovations/commercial/','/client-experience/','/experience/','/about/','/start-your-project/','/privacy/','/legal/'];
export function GET(){
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${origin?routes.map(path=>`<url><loc>${origin}${path}</loc></url>`).join(''):''}</urlset>`,{headers:{'Content-Type':'application/xml'}});
}
