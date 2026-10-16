import {siteOrigin} from '../lib/seo';
const origin=siteOrigin(import.meta.env.SITE_URL);
export function GET(){
  const indexable=origin&&import.meta.env.PUBLIC_INDEXABLE==='true';
  const privatePaths='Disallow: /inbox\nDisallow: /settings\nDisallow: /api\n';
  // Let link-preview services read public branding before search indexing is enabled.
  const previews=['facebookexternalhit','Facebot','Twitterbot','LinkedInBot','Applebot','WhatsApp','TelegramBot','Slackbot','Discordbot'].map(agent=>`User-agent: ${agent}\nAllow: /\n${privatePaths}`).join('\n');
  const general=indexable?`User-agent: *\nAllow: /\n${privatePaths}Sitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n';
  return new Response(`${previews}\n${general}`,{headers:{'Content-Type':'text/plain'}});
}
