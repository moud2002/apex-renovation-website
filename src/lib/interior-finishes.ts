/** Illustrative palettes, not manufacturer color matches or a popularity ranking. */
export const INTERIOR_FINISHES = {
 'warm-oak':{name:'Warm Oak',wall:'#F8F7F2',floor:'#E8DCC6',cabinet:'#FAF8F1',metal:'#817D70',tile:'#E9E9E3',pattern:'planks',note:'Warm oak · pale stone · soft ivory'},
 'light-stone':{name:'Light Stone',wall:'#F8F7F2',floor:'#E9E9E3',cabinet:'#FAF8F1',metal:'#817D70',tile:'#E9E9E3',pattern:'tile',note:'Pale stone · ivory · soft grey'},
 'minimal':{name:'Minimal',wall:'#F9F8F4',floor:'#F0EEE8',cabinet:'#FAF8F1',metal:'#817D70',tile:'#F0EEE8',pattern:'solid',note:'Quiet ivory · seamless floor · pale furniture'},
 'sage-brass':{name:'Sage & Brass',wall:'#ECEDE5',floor:'#B79B75',cabinet:'#87927B',metal:'#B39457',tile:'#DDD9CB',pattern:'planks',note:'Natural oak · sage · brushed brass'},
 'coastal-blue':{name:'Coastal Blue',wall:'#F3F2EC',floor:'#C9B99A',cabinet:'#637E8A',metal:'#A8ADAE',tile:'#DDE4E3',pattern:'planks',note:'Pale oak · dusty blue · nickel'},
 'classic-white':{name:'Classic White',wall:'#EBE8E1',floor:'#947252',cabinet:'#F7F6F0',metal:'#343535',tile:'#E8E7E1',pattern:'planks',note:'Medium oak · crisp white · matte black'},
 'cream-classic':{name:'Cream Classic',wall:'#E9E0CD',floor:'#806449',cabinet:'#DED3BB',metal:'#A98C58',tile:'#D8CDB5',pattern:'herringbone',note:'Herringbone oak · cream · aged brass'},
 'walnut-modern':{name:'Walnut Modern',wall:'#EAE5DA',floor:'#C1B7A7',cabinet:'#825A3D',metal:'#3B3833',tile:'#C1B7A7',pattern:'tile',note:'Limestone tones · walnut · dark bronze'},
 'mushroom-taupe':{name:'Mushroom Taupe',wall:'#DCD3C5',floor:'#B4A48A',cabinet:'#A89B89',metal:'#85755E',tile:'#CEC6B8',pattern:'planks',note:'Warm oak · mushroom taupe · bronze'},
 'terracotta':{name:'Terracotta',wall:'#E8D8C5',floor:'#B66F4D',cabinet:'#C0AA83',metal:'#75604A',tile:'#B66F4D',pattern:'tile',note:'Terracotta tile · natural timber · aged bronze'},
 'chocolate-luxe':{name:'Chocolate Luxe',wall:'#C3B2A0',floor:'#8B725C',cabinet:'#4F392F',metal:'#AF925E',tile:'#A0917E',pattern:'planks',note:'Smoked oak · chocolate · satin brass'},
} as const;
export type InteriorFinish = keyof typeof INTERIOR_FINISHES;
export type InteriorPalette = typeof INTERIOR_FINISHES[InteriorFinish];
export function isInteriorFinish(value:unknown):value is InteriorFinish {return typeof value==='string'&&Object.hasOwn(INTERIOR_FINISHES,value);}
export function isWetRoom(id:string){return /(?:kitchen|bathroom|wc-[ab])$/.test(id);}

/** The same seams and base color feed SVG plans, comparison swatches and 3D textures. */
export function floorSurface(finish:InteriorFinish,wet=false){
 const p=INTERIOR_FINISHES[finish];return {color:wet?p.tile:p.floor,pattern:wet&&p.pattern!=='solid'?'tile':p.pattern};
}
export function floorPattern(id:string,finish:InteriorFinish,wet=false){
 const {color,pattern}=floorSurface(finish,wet);
 const lines=pattern==='solid'?'':pattern==='tile'?'<path d="M0 0H4V4M0 4V0"/>':pattern==='herringbone'?'<path d="M0 0L2 2L4 0M0 2L2 4L4 2M1 1L2 0M3 1L4 2M1 3L2 2M3 3L4 4"/>':'<path d="M0 1H4M0 2H4M0 3H4M0 4H4M0 0V1M2 1V2M0 2V3M2 3V4"/><path d="M.3 .35H1.7M2.2 1.6H3.7M.4 2.5H1.6" opacity=".4"/>';
 return `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="${color}"/><g fill="none" stroke="#392D22" stroke-width=".035" opacity=".28">${lines}</g></pattern>`;
}
export function finishSwatch(finish:InteriorFinish,prefix:string){
 const p=INTERIOR_FINISHES[finish],id=prefix+'-'+finish;
 return `<svg viewBox="0 0 80 32" aria-hidden="true" focusable="false"><defs>${floorPattern(id,finish)}</defs><rect width="22" height="32" fill="${p.wall}"/><rect x="22" width="30" height="32" fill="url(#${id})"/><rect x="52" width="20" height="32" fill="${p.cabinet}"/><rect x="72" width="8" height="32" fill="${p.metal}"/></svg>`;
}

/** Clone reviewed furnished artwork without changing its geometry or original three looks. */
export function furnishedFinishSVG(source:string,finish:InteriorFinish){
 const p=INTERIOR_FINISHES[finish],prefix='public-furnished-'+finish;
 let svg=source.replaceAll('public-furnished-warm-oak',prefix);
 svg=svg.replace('</defs>',floorPattern(prefix+'-floor',finish)+floorPattern(prefix+'-wet',finish,true)+'</defs>');
 svg=svg.replaceAll(`url(#${prefix}-warm-oak)`,`url(#${prefix}-floor)`).replaceAll(`url(#${prefix}-light-stone)`,`url(#${prefix}-wet)`);
 svg=svg.replace(/(<g data-furniture-id="([^"]+)"[\s\S]*?<svg[^>]+)style="[^"]+"/g,(_match,tag,id)=>{
  const ceramic=['bath','toilet'].includes(id),plant=id.startsWith('plant');
  return tag+`style="color:${ceramic||plant?'#817d70':p.metal};--furniture-fill:${ceramic||plant?'#faf8f1':p.cabinet}"`;
 });
 // Preserve dark wall edges and labels for drawing legibility; wall color is shown on the sheet and swatch.
 return svg.replace('background:#f8f7f2','background:'+p.wall).replace('aria-label="Courtyard concept — furnished','aria-label="'+p.name+' — Courtyard concept — furnished');
}

/** Small deterministic texture; requires no downloaded assets or browser canvas. */
export function floorPixels(finish:InteriorFinish,wet=false,size=64){
 const {color,pattern}=floorSurface(finish,wet),rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x*64/size,v=y*64/size,row=Math.floor(v/16);
  const seam=pattern==='tile'?(u<1||v<1):pattern==='planks'?(v%16<1||(u+(row%2)*32)%64<1):pattern==='herringbone'?((v-Math.abs(u-32)+128)%32<1.5||((u<32?u+v:u-v)+128)%32<1.5):false;
  const grain=pattern==='planks'?Math.sin(u*.9+row*4)*.012:0;
  const shade=seam?.78:1+grain;
  const i=(y*size+x)*4;rgb.forEach((c,n)=>data[i+n]=Math.max(0,Math.min(255,Math.round(c*shade))));data[i+3]=255;
 }
 return data;
}
