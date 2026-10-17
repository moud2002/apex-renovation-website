export const CONTACT_ROLES=['Investor / owner','Broker / agent','Other representative'] as const;
export const ACQUISITION_STAGES=['Considering a property','Under contract','Already owned','Several properties at different stages'] as const;
export class InquiryContextError extends Error {constructor(message:string,public field:string){super(message);}}

// Retain optional context as labelled text using the existing details contract.
// The inbox already renders it as plain text; no new storage columns are needed.
export function inquiryDetails(input:Record<string,string>){
 const value=(key:string)=>String(input[key]||'').trim().normalize('NFC');
 const role=value('contactRole'),stage=value('acquisitionStage'),url=value('listingUrl');
 if(role&&!CONTACT_ROLES.includes(role as typeof CONTACT_ROLES[number]))throw new InquiryContextError('Choose a listed role or leave it blank.','contactRole');
 if(stage&&!ACQUISITION_STAGES.includes(stage as typeof ACQUISITION_STAGES[number]))throw new InquiryContextError('Choose a listed acquisition stage or leave it blank.','acquisitionStage');
 if(url){
  let parsed:URL;try{parsed=new URL(url);}catch{throw new InquiryContextError('Use a complete public listing link beginning with https:// or http://.','listingUrl');}
  if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||url.length>600)throw new InquiryContextError('Use a public http:// or https:// listing link, without login details, up to 600 characters.','listingUrl');
 }
 const context=[['Your role',role],['Company / ownership entity',value('company')],['Brokerage',role==='Broker / agent'?value('brokerage'):''],['Acquisition stage',stage],['Property / listing link',url],['Project goal',value('goal')]].filter(([,v])=>v).map(([label,v])=>`${label}: ${v.replace(/[\r\n]+/g,' ')}`);
 const details=[context.join('\n'),value('details')].filter(Boolean).join('\n\n');
 if(details.length>5000)throw new InquiryContextError(`Shorten the scope or optional context by ${details.length-5000} characters so the complete brief can be saved.`,'details');
 return details;
}

export function inquiryRoleFromSearch(search:string){
 const context=new URLSearchParams(search).get('context');
 return context==='investor'?'Investor / owner':context==='broker'?'Broker / agent':'';
}
