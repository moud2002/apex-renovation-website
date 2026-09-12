import { apiRequest } from './api';
// Keep inquiry initialization working in browsers without crypto.randomUUID.
// The random submission ID only identifies retries; it is not an auth token.
function newSubmissionId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
const form = document.querySelector<HTMLFormElement>('#project-inquiry');
if (form) {
  let step = 0;
  let submissionId = newSubmissionId();
  const next = form.querySelector<HTMLButtonElement>('[data-form-next]')!;
  const back = form.querySelector<HTMLButtonElement>('[data-form-back]')!;
  const submit = form.querySelector<HTMLButtonElement>('[data-form-submit]')!;
  const error = form.querySelector<HTMLElement>('[data-form-error]')!;
  const steps = Array.from(form.querySelectorAll<HTMLFieldSetElement>('[data-form-step]'));
  const setError = (message: string, field?: HTMLElement) => {
    error.textContent=message; error.hidden=false;field?.focus();
  };
  const get = (name: string) => String(new FormData(form).get(name) || '').trim();
  const show = (target: number) => {
    step=target;
    steps.forEach((el,i) => el.hidden=i!==step);
    form.querySelectorAll<HTMLElement>('[data-step-label]').forEach((el,i) => {el.classList.toggle('current',i<=step);el.setAttribute('aria-current',i===step?'step':'false');});
    back.hidden=step===0;next.hidden=step===2;submit.hidden=step!==2;error.hidden=true;
    if(step===2){
      const summary=form.querySelector<HTMLElement>('[data-form-summary]')!;
      summary.replaceChildren();
      [get('projectType'),get('city')].forEach(v=>{const span=document.createElement('span');span.textContent=v;summary.append(span);});
    }
    const legend=steps[step].querySelector('legend')!;
    legend.setAttribute('tabindex','-1');legend.focus({preventScroll:true});
    if(window.innerWidth<800)form.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  };
  const validate = () => {
    error.hidden=true;
    if(step===0){
      if(!get('projectType')){setError('Choose the type of project you have in mind.',form.querySelector<HTMLInputElement>('input[name=projectType]')!);return false;}
      if(!get('city')){setError('Tell us the city or town where the property is located.',form.elements.namedItem('city') as HTMLElement);return false;}
    }
    if(step===1&&!get('details')){setError('Share a little about what you would like to change.',form.elements.namedItem('details') as HTMLElement);return false;}
    if(step===2){
      if(!get('name')){setError('Please enter your name.',form.elements.namedItem('name') as HTMLElement);return false;}
      if(!get('email')&&!get('phone')){setError('Please provide an email address or phone number.',form.elements.namedItem('email') as HTMLElement);return false;}
      const email=form.elements.namedItem('email') as HTMLInputElement;
      if(get('email')&&!email.validity.valid){setError('Check the email address and try again.',email);return false;}
      if(get('phone')&&(get('phone').replace(/\D/g,'').length<7||get('phone').replace(/\D/g,'').length>20)){setError('Please enter a valid phone number.',form.elements.namedItem('phone') as HTMLElement);return false;}
      if(!(form.elements.namedItem('consent') as HTMLInputElement).checked){setError('Please agree to being contacted about your inquiry.',form.elements.namedItem('consent') as HTMLElement);return false;}
    }
    return true;
  };
  next.addEventListener('click',()=>{if(validate())show(step+1);});
  back.addEventListener('click',()=>show(step-1));
  form.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&step<2&&e.target instanceof HTMLInputElement){e.preventDefault();if(validate())show(step+1);}
  });
  const submitContents = Array.from(submit.childNodes).map(node=>node.cloneNode(true));
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(step<2){if(validate())show(step+1);return;}
    if(!validate())return;
    submit.disabled=true;submit.textContent='Saving your inquiry…';back.disabled=true;
    try{
      const payload=Object.fromEntries(['name','email','phone','city','projectType','budget','timeline','details','website'].map(k=>[k,get(k)]));
      const result=await apiRequest('/api/inquiries',{method:'POST',body:JSON.stringify({...payload,consent:true,submissionId})});
      const success=document.querySelector<HTMLElement>('[data-form-success]')!;
      success.querySelector<HTMLElement>('[data-reference]')!.textContent=`Your reference: ${result.reference}`;
      form.hidden=true;success.hidden=false;
      success.focus({preventScroll:true});
      success.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
      submissionId=newSubmissionId();
    }catch(e){setError(e instanceof Error?e.message:'Your inquiry could not be saved. Please try again.');}
    finally{submit.disabled=false;submit.replaceChildren(...submitContents.map(node=>node.cloneNode(true)));back.disabled=false;}
  });
  const chosen=new URLSearchParams(location.search).get('type');
  if(chosen)Array.from(form.querySelectorAll<HTMLInputElement>('input[name=projectType]')).find(r=>r.value===chosen)?.click();
}
