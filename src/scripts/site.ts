import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initBackNavigation } from './back-navigation';
initBackNavigation();
gsap.registerPlugin(ScrollTrigger);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const header = document.querySelector<HTMLElement>('[data-header]');
let scrollTick = false;
const onScroll = () => {
  if (!scrollTick) requestAnimationFrame(() => {
    header?.classList.toggle('is-scrolled', window.scrollY > 32);
    scrollTick = false;
  });
  scrollTick = true;
};
window.addEventListener('scroll', onScroll, {passive: true});
onScroll();
const menu = document.querySelector<HTMLDialogElement>('.mobile-menu');
const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
function closeMenu() { menu?.close(); }
toggle?.addEventListener('click', () => {
  menu?.showModal();
  toggle.setAttribute('aria-expanded','true');
  document.body.classList.add('menu-open');
});
document.querySelector('[data-menu-close]')?.addEventListener('click', closeMenu);
menu?.addEventListener('close', () => {
  toggle?.setAttribute('aria-expanded','false');
  document.body.classList.remove('menu-open');
  toggle?.focus();
});
menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
if (!reduced.matches) {
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.from(el, {y:28, opacity:.3, duration:.9, ease:'power2.out', scrollTrigger:{trigger:el,start:'top 94%',once:true}});
  });
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach(el => {
    gsap.fromTo(el, {yPercent:-3}, {yPercent:5,ease:'none',scrollTrigger:{trigger:el.parentElement,start:'top bottom',end:'bottom top',scrub:1}});
  });
  if(document.querySelector('.hero-line'))gsap.from('.hero-line', {y:38,opacity:0,duration:1.1,stagger:.14,ease:'power3.out',delay:.1});
}
const architecture = document.querySelector<HTMLElement>('[data-architecture]');
if (architecture) {
  import('./architecture').then(({initArchitecture}) => {
    const dispose = initArchitecture(architecture);
    window.addEventListener('pagehide', dispose, {once:true});
  }).catch(() => architecture.classList.add('architecture-unavailable'));
}
document.querySelectorAll<HTMLElement>('[data-service-row]').forEach(row => {
  row.addEventListener('mouseenter', () => {
    document.querySelectorAll('[data-service-row]').forEach(r => r.classList.remove('service-active'));
    row.classList.add('service-active');
    const key = row.dataset.serviceRow;
    document.querySelectorAll<HTMLElement>('[data-service-image]').forEach(i => i.classList.toggle('active',i.dataset.serviceImage === key));
  });
  row.addEventListener('focusin', () => row.dispatchEvent(new Event('mouseenter')));
});
const demoTabs = document.querySelectorAll<HTMLButtonElement>('[data-demo-tab]');
demoTabs.forEach(tab => tab.addEventListener('click', () => {
  demoTabs.forEach(t => {t.setAttribute('aria-selected',String(t===tab));t.tabIndex=t===tab?0:-1;});
  document.querySelectorAll<HTMLElement>('[data-demo-panel]').forEach(p => p.hidden=p.dataset.demoPanel!==tab.dataset.demoTab);
}));
demoTabs.forEach((tab,index)=>{
  tab.tabIndex=index===0?0:-1;
  tab.addEventListener('keydown',e=>{
    let next=index;
    if(e.key==='ArrowRight')next=(index+1)%demoTabs.length;
    else if(e.key==='ArrowLeft')next=(index-1+demoTabs.length)%demoTabs.length;
    else if(e.key==='Home')next=0;
    else if(e.key==='End')next=demoTabs.length-1;
    else return;
    e.preventDefault();demoTabs[next].click();demoTabs[next].focus();
  });
});
