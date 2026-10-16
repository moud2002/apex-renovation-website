export function siteOrigin(value: string | undefined): string {
  if (!value) return '';
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('SITE_URL must be an origin without credentials, path, query or fragment.');
  return url.origin;
}
export const pageMetadata: Record<string, {title: string; description: string}> = {
  '/': {title: 'Investor Renovation for Flips & Rentals', description: 'Full-property rehab for investors preparing to sell or rent. Apex coordinates the agreed scope, trades, decisions and handover. Brokers can introduce a property.'},
  '/renovations/': {title: 'Property Rehab & Renovation Services', description: 'Explore full-home, multifamily, kitchen, bathroom and commercial renovation scopes. Plan the work around the property and its intended resale or rental use.'},
  '/renovations/whole-home/': {title: 'Whole-Home Renovation for Resale & Rental', description: 'Define a coordinated whole-home rehab scope, from existing condition and required trades to finish choices, project decisions and handover.'},
  '/renovations/investment-properties/': {title: 'Investment Property Rehab for Flips & Rentals', description: 'Plan renovation work for a flip, rental, duplex or multifamily property. Discuss existing condition, intended use, finish level and the agreed rehab scope.'},
  '/renovations/kitchens-bathrooms/': {title: 'Kitchen & Bathroom Renovation', description: 'Discuss kitchen and bathroom renovation as part of a defined property rehab scope, with finish choices and trade coordination aligned to the intended use.'},
  '/renovations/commercial/': {title: 'Commercial Property Renovation Scopes', description: 'Discuss existing condition, intended use and the requirements of a commercial property renovation. Define the scope and project-specific approvals before work.'},
  '/broker-referrals/': {title: 'Renovation Referrals for Brokers & Agents', description: 'Help an investment buyer understand a property rehab. Introduce Apex to discuss renovation scope for resale or rental, with the buyer’s permission.'},
  '/client-experience/': {title: 'The Apex Renovation Client Experience', description: 'See how project information, documents, decisions and updates fit into the Apex renovation process. Actual access depends on your project and assigned account.'},
  '/experience/': {title: 'Our Property Renovation Process', description: 'From property review and an agreed scope to trade coordination, project decisions and handover. Learn the steps in planning an investor renovation with Apex.'},
  '/about/': {title: 'About Apex Property Renovation', description: 'Renovation, connected. Apex Property Renovation coordinates the agreed property rehab scope for investors preparing for resale or rental.'},
  '/start-your-project/': {title: 'Discuss an Investor Rehab or Broker Referral', description: 'Tell Apex about the property, resale or rental goal, renovation scope, budget and timeline. Investors and referring brokers can start a project discussion here.'},
  '/privacy/': {title: 'Privacy & Project Inquiry Information', description: 'How Apex Property Renovation handles project inquiries, contact information and the private website inbox. Read the website privacy information.'},
  '/legal/': {title: 'Website Terms & Project Scope Information', description: 'Read Apex Property Renovation website terms, concept-image notices and the distinction between an inquiry, a scope discussion and a construction agreement.'}
};
export const publicRoutes = Object.keys(pageMetadata);
