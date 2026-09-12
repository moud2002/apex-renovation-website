export function initBackNavigation(){
  document.querySelectorAll<HTMLAnchorElement>('[data-back-link]').forEach(link=>{
    link.addEventListener('click',event=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      let previous:URL;
      try{previous=new URL(document.referrer);}catch{return;}
      if(previous.origin!==location.origin||history.length<2)return;
      event.preventDefault();
      history.back();
    });
  });
}
