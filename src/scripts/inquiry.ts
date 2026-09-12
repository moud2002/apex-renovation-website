import {apiRequest} from './api';
function newSubmissionId(){if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');}
const form=document.querySelector<HTMLFormElement>('#project-inquiry');
if(form){
 const button=form.querySelector<HTMLButtonElement>('[data-form-submit]')!;
 const error=form.querySelector<HTMLElement>('[data-form-error]')!;
 const contents=Array.from(button.childNodes).map(n=>n.cloneNode(true));
 let submissionId=newSubmissionId(),pending=false;
 const value=(n:string)=>String(new FormData(form).get(n)||'').trim();
 const fail=(message:string,name?:string)=>{error.textContent=message;error.hidden=false;if(name){const field=form.querySelector<HTMLElement>(`[name="${name}"]`);field?.setAttribute('aria-invalid','true');field?.setAttribute('aria-describedby','brief-error');field?.focus();}else error.scrollIntoView({block:'center',behavior:'smooth'});};error.id='brief-error';
 form.addEventListener('input',e=>{if(e.target instanceof HTMLElement){e.target.removeAttribute('aria-invalid');e.target.removeAttribute('aria-describedby');}});
 form.addEventListener('submit',async e=>{e.preventDefault();if(pending)return;error.hidden=true;
  if(!value('projectType'))return fail('Select the property or renovation type.','projectType');
  if(!value('city'))return fail('Enter the city or town where the property is located.','city');
  if(!value('details'))return fail('Tell us what needs to happen at the property.','details');
  if(!value('name'))return fail('Enter your name.','name');
  if(!value('email')&&!value('phone'))return fail('Add an email address or phone number so we can respond.','email');
  if(value('email')&&!(form.elements.namedItem('email') as HTMLInputElement).validity.valid)return fail('Check your email address.','email');
  if(value('phone')&&(!/^[+\d()\s.\-xet#]+$/i.test(value('phone'))||value('phone').replace(/\D/g,'').length<7||value('phone').replace(/\D/g,'').length>20))return fail('Check your phone number.','phone');
  if(!(form.elements.namedItem('consent') as HTMLInputElement).checked)return fail('Agree to being contacted about your project.','consent');
  pending=true;button.disabled=true;form.setAttribute('aria-busy','true');button.textContent='SENDING YOUR BRIEF…';
  try{const payload=Object.fromEntries(['name','email','phone','city','projectType','budget','timeline','details','website'].map(k=>[k,value(k)]));if(value('goal'))payload.details=`Project goal: ${value('goal')}\n\n${payload.details}`;
   const result=await apiRequest('/api/inquiries',{method:'POST',body:JSON.stringify({...payload,consent:true,submissionId})});
   if(!result.ok||!result.reference)throw Error('Your brief could not be confirmed. Please try again.');
   const success=document.querySelector<HTMLElement>('[data-form-success]')!;success.querySelector<HTMLElement>('[data-reference]')!.textContent=`REFERENCE / ${result.reference}`;form.hidden=true;success.hidden=false;success.focus();submissionId=newSubmissionId();
  }catch(e){fail(e instanceof Error?e.message:'Unable to send your brief. Your details are still here—please try again.');}
  finally{pending=false;button.disabled=false;button.replaceChildren(...contents.map(n=>n.cloneNode(true)));form.removeAttribute('aria-busy');}
 });
 const type=new URLSearchParams(location.search).get('type');if(type)form.querySelectorAll<HTMLInputElement>('[name="projectType"]').forEach(r=>r.checked=r.value===type);
}
