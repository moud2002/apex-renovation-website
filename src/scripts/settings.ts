const form=document.querySelector<HTMLFormElement>('[data-settings-gate]')!;
const error=document.querySelector<HTMLElement>('[data-settings-error]')!;
form.addEventListener('submit',async(event)=>{
  event.preventDefault();error.hidden=true;
  const button=form.querySelector<HTMLButtonElement>('button')!;button.disabled=true;
  try{
    const response=await fetch('/api/settings/unlock',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({passcode:new FormData(form).get('passcode')})});
    const result=await response.json();
    if(!response.ok)throw new Error(result.message||'Unable to unlock settings. Please try again.');
    form.reset();window.location.assign('/inbox/');
  }catch(e){error.textContent=e instanceof Error?e.message:'Unable to connect. Please try again.';error.hidden=false;}
  finally{button.disabled=false;}
});
