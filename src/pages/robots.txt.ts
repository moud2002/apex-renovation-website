const origin=(import.meta.env.SITE_URL||'').replace(/\/$/,'');
export function GET(){
  const indexable=origin&&import.meta.env.PUBLIC_INDEXABLE==='true';
  return new Response(indexable?`User-agent: *\nAllow: /\nDisallow: /inbox/\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain'}});
}
