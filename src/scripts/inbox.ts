import { apiRequest } from './api';
let token='';
let inquiries:any[]=[];
const login=document.querySelector<HTMLFormElement>('[data-inbox-login]')!;
const workspace=document.querySelector<HTMLElement>('[data-inbox-workspace]')!;
const error=document.querySelector<HTMLElement>('[data-inbox-error]')!;
const filter=document.querySelector<HTMLSelectElement>('[data-inbox-filter]')!;
const list=document.querySelector<HTMLElement>('[data-inbox-list]')!;
const el=(tag:string,text?:string,className?:string)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;};
const headers=()=>({'Authorization':`Bearer ${token}`});
const showError=(e:unknown)=>{error.hidden=false;error.textContent=e instanceof Error?e.message:'Unable to complete the request.';};
const display=()=>{
  list.replaceChildren();
  const filtered=inquiries.filter(i=>filter.value==='all'||i.status===filter.value);
  if(!filtered.length){list.append(el('p','No inquiries in this view. New project inquiries will appear here.','form-note'));return;}
  for(const lead of filtered){
    const card=el('article',undefined,'lead-card');const head=el('header');const identity=el('div');identity.append(el('h3',lead.name),el('p',`${lead.reference} · ${new Date(lead.createdAt).toLocaleString()}`,'lead-reference'));
    const status=document.createElement('select');status.setAttribute('aria-label',`Status for ${lead.name}`);
    for(const value of ['new','contacted','closed']){const option=document.createElement('option');option.value=value;option.textContent=value[0].toUpperCase()+value.slice(1);option.selected=value===lead.status;status.append(option);}
    status.addEventListener('change',async()=>{status.disabled=true;error.hidden=true;try{await apiRequest(`/api/admin/inquiries/${lead.id}`,{method:'PATCH',headers:headers(),body:JSON.stringify({status:status.value})});await load();}catch(e){status.value=lead.status;showError(e);}finally{status.disabled=false;}});
    head.append(identity,status);card.append(head);
    const dl=el('dl');
    for(const [label,value] of [['Project',lead.projectType],['City',lead.city],['Budget',lead.budget||'Not specified'],['Timing',lead.timeline||'Not specified'],['Email',lead.email||'Not provided'],['Phone',lead.phone||'Not provided']]){const group=el('div');group.append(el('dt',label),el('dd',value));dl.append(group);}
    card.append(dl,el('p',lead.details,'lead-details'));list.append(card);
  }
};
async function load(){
  const result=await apiRequest('/api/admin/inquiries',{headers:headers()});inquiries=result.inquiries;
  const counts=document.querySelector<HTMLElement>('[data-inbox-counts]')!;counts.replaceChildren();
  for(const [key,label] of [['new','New inquiries'],['contacted','Contacted'],['closed','Closed'],['total','All inquiries']]){const block=el('div');block.append(el('strong',String(result.counts[key])),el('span',label));counts.append(block);}
  display();
}
login.addEventListener('submit',async e=>{
  e.preventDefault();error.hidden=true;const button=login.querySelector('button')!;button.disabled=true;
  try{const fd=new FormData(login);const result=await apiRequest('/api/admin/login',{method:'POST',body:JSON.stringify({username:fd.get('username'),password:fd.get('password')})});token=result.token;login.reset();await load();login.hidden=true;workspace.hidden=false;}
  catch(e){token='';showError(e);}finally{button.disabled=false;}
});
filter.addEventListener('change',display);
document.querySelector('[data-inbox-refresh]')?.addEventListener('click',async()=>{error.hidden=true;try{await load();}catch(e){showError(e);}});
document.querySelector('[data-inbox-logout]')?.addEventListener('click',async()=>{
  try{await apiRequest('/api/admin/logout',{method:'POST',headers:headers()});}catch{}
  token='';inquiries=[];list.replaceChildren();workspace.hidden=true;login.hidden=false;error.hidden=true;
});
