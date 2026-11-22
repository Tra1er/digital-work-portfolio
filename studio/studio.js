
(function(){
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const app = {token:sessionStorage.getItem('dw_polli_token')||'',imageUrl:'',imageBlob:null,editorImg:null,compImg:null,shapeSvg:'',paletteLoaded:false};
const toolIds = ['image','prompt','editor','compress','palette','gradient','banner','shape','shadow'];
function status(id,msg,type){let el=$('#'+id);if(!el)return;el.textContent=msg;el.className='status '+(type||'');}
function toast(msg){const e=$('#toast');e.textContent=msg;e.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.add('hidden'),3000);}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Copied to clipboard');}catch(e){const a=document.createElement('textarea');a.value=text;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();toast('Copied');}}
function saveBlob(blob,name){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);}
function showTool(id,scroll){if(!toolIds.includes(id))id='image';$$('.tool-view').forEach(el=>el.hidden=el.id!=='view-'+id);$$('[data-tool]').forEach(el=>{let on=el.dataset.tool===id;el.classList.toggle('active',on);el.setAttribute('aria-current',on?'page':'false');});history.replaceState(null,'','#'+id);if(scroll)$('#workspace').scrollIntoView({behavior:'smooth',block:'start'});}
$$('[data-tool]').forEach(b=>b.addEventListener('click',()=>showTool(b.dataset.tool,true)));
$$('[data-open]').forEach(b=>b.addEventListener('click',()=>showTool(b.dataset.open,true)));
showTool(location.hash.slice(1)||'image',false);
window.addEventListener('hashchange',()=>showTool(location.hash.slice(1),false));

/* FLUX.2 Klein 4B through our private Cloudflare Worker. */
const FLUX_API_URL = 'PASTE_CLOUDFLARE_WORKER_URL_HERE/api/generate';
function resetHumanCheck(){
 app.turnstileToken='';
 window.__dwTurnstileToken='';
 if(window.turnstile&&window.__dwTurnstileWidget!==undefined&&window.__dwTurnstileWidget!==null){
  try{window.turnstile.reset(window.__dwTurnstileWidget);}catch(e){}
 }
}
$('#guestBtn').addEventListener('click',generateFluxImage);
$$('[data-example]').forEach(b=>b.addEventListener('click',()=>{$('#imagePrompt').value=b.dataset.example;}));
$('#imageGuidance').addEventListener('input',()=>{$('#imageGuidanceOut').textContent=$('#imageGuidance').value;});
$('#imageGuidanceOut').textContent=$('#imageGuidance').value;
async function generateFluxImage(){
 const prompt=$('#imagePrompt').value.trim();
 if(!prompt){status('imageStatus','Write a prompt first.','error');return;}
 if(prompt.length>1500){status('imageStatus','Please keep your prompt under 1,500 characters.','error');return;}
 if(FLUX_API_URL.includes('PASTE_')){status('imageStatus','Backend setup is not finished yet. We still need to deploy the Cloudflare Worker and connect its URL.','error');return;}
 if(!window.turnstile||window.__dwTurnstileWidget===undefined||window.__dwTurnstileWidget===null){status('imageStatus','Human verification is not configured yet. Add the public Turnstile site key first.','error');return;}
 const token=window.__dwTurnstileToken||(window.turnstile.getResponse(window.__dwTurnstileWidget)||'');
 if(!token){status('imageStatus','Complete the Cloudflare human check before generating.','error');return;}
 const [width,height]=$('#imageAspect').value.split('x').map(Number);
 const style=$('#imageStyle').value;
 const finalPrompt=prompt+(style==='none'?'':', '+style);
 const seedText=$('#imageSeed').value.trim();
 const seed=seedText===''?undefined:Number(seedText);
 const guidance=Number($('#imageGuidance').value);
 const model=$('#imageModel').value;
 $('#guestBtn').disabled=true;
 $('#imageOutput').innerHTML='<div class="empty-state"><div class="empty-art spin">✦</div><h3>Creating with FLUX.2</h3><p>The image is being generated on Cloudflare GPUs. This can take a little while.</p></div>';
 status('imageStatus','Sending a protected request to FLUX.2 Klein 4B...','');
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),120000);
 try{
  if(app.imageUrl&&app.imageUrl.startsWith('blob:'))URL.revokeObjectURL(app.imageUrl);
  const response=await fetch(FLUX_API_URL,{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({prompt:finalPrompt,width,height,seed,guidance,model,turnstileToken:token}),
   signal:controller.signal
  });
  if(!response.ok){
   let message='Image generation failed. Please try again.';
   try{const data=await response.json();if(data&&data.error)message=data.error;}catch(e){}
   throw new Error(message);
  }
  const type=response.headers.get('content-type')||'';
  if(!type.includes('image/'))throw new Error('The image service returned an unexpected response.');
  const modelLabel=response.headers.get('X-Image-Model')||'FLUX.2';
  const blob=await response.blob();
  if(!blob.size)throw new Error('The model returned an empty image.');
  app.imageBlob=blob;
  app.imageUrl=URL.createObjectURL(blob);
  displayImage(app.imageUrl,'Image generated with FLUX.2 Klein 4B');
  status('imageStatus','Generated with '+modelLabel+' · '+width+' × '+height+' · Ready to save.','ok');
 }catch(e){
  $('#imageOutput').innerHTML='<div class="empty-state"><div class="empty-art">☁</div><h3>Could not generate</h3><p>Try again in a moment, or check the Cloudflare service configuration.</p></div>';
  status('imageStatus',e.name==='AbortError'?'The request timed out. Please try again.':e.message,'error');
 }finally{
  clearTimeout(timer);
  resetHumanCheck();
  $('#guestBtn').disabled=false;
 }
}
$('#imageOpen').addEventListener('click',()=>{if(app.imageUrl)window.open(app.imageUrl,'_blank','noopener,noreferrer');});
$('#imageDownload').addEventListener('click',()=>{if(app.imageBlob)saveBlob(app.imageBlob,'digital-works-flux-image.png');});
/* Prompt composer */
const promptData={
 photo:'realistic candid photograph, natural skin textures, authentic details',
 product:'high-end commercial product photography, clean art direction, detailed materials',
 illustration:'polished digital illustration, expressive shapes, professional composition',
 cinematic:'cinematic still, atmospheric depth, careful color grading',
 anime:'detailed anime illustration, expressive character art, cohesive palette',
 architecture:'architectural photograph, precise perspective, sophisticated materials'
};
const lightingData={soft:'soft window light',golden:'warm golden hour light',studio:'diffused professional studio lighting',night:'moody nighttime lighting',overcast:'soft overcast daylight',neon:'ambient neon reflections'};
const compositionData={candid:'natural unstaged composition',close:'intimate close-up',wide:'wide environmental framing',center:'balanced centered composition',low:'low-angle perspective',editorial:'editorial magazine composition'};
function buildPrompt(){
 const subject=$('#promptSubject').value.trim()||'A quiet little record store on a rainy afternoon';
 const style=$('#promptStyle').value,lighting=$('#promptLight').value,composition=$('#promptComposition').value;
 const details=$('#promptDetails').value.trim();
 const parts=[subject,promptData[style],lightingData[lighting],compositionData[composition]];
 if(details)parts.push(details);
 parts.push('coherent visual details, intentional colors, no text or watermarks');
 $('#promptOutput').textContent=parts.join(', ')+'.';
}
$$('[data-prompt-input]').forEach(e=>e.addEventListener('input',buildPrompt));
buildPrompt();
$('#copyPrompt').addEventListener('click',()=>copy($('#promptOutput').textContent));
$('#sendPrompt').addEventListener('click',()=>{$('#imagePrompt').value=$('#promptOutput').textContent;showTool('image',true);});

/* Shared image loading */
function openLocal(input,cb){
 const file=input.files&&input.files[0];if(!file)return;
 if(!file.type.startsWith('image/')){toast('Choose an image file.');return;}
 if(file.size>25*1024*1024){toast('Please use an image under 25 MB.');return;}
 const u=URL.createObjectURL(file),im=new Image();
 im.onload=()=>{URL.revokeObjectURL(u);cb(im,file);};
 im.onerror=()=>{URL.revokeObjectURL(u);toast('This image could not be opened.');};
 im.src=u;
}
function fitDimensions(img,max){const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));return [Math.max(1,Math.round(img.naturalWidth*scale)),Math.max(1,Math.round(img.naturalHeight*scale))];}
function toBlob(canvas,type,quality){return new Promise(resolve=>canvas.toBlob(resolve,type,quality));}
function friendlyBytes(n){return n>=1048576?(n/1048576).toFixed(2)+' MB':(n/1024).toFixed(0)+' KB';}
function drawEditor(){
 const im=app.editorImg,c=$('#editorCanvas');if(!im)return;
 const [w,h]=fitDimensions(im,1800);c.width=w;c.height=h;
 const ctx=c.getContext('2d');ctx.clearRect(0,0);
 ctx.filter='brightness('+$('#bright').value+'%) contrast('+$('#contrast').value+'%) saturate('+$('#saturate').value+'%) grayscale('+$('#grayscale').value+'%)';
 ctx.drawImage(im,0,0,w,h);ctx.filter='none';
 $$('[data-range]').forEach(input=>{$('#out-'+input.id).textContent=input.value+'%';});
}
$('#editorUpload').addEventListener('change',e=>openLocal(e.target,(img,file)=>{app.editorImg=img;drawEditor();status('editorStatus',file.name+' loaded. Export uses a maximum 1800 px edge.','ok');}));
$$('[data-range]').forEach(e=>e.addEventListener('input',drawEditor));
$('#editorReset').addEventListener('click',()=>{[['bright',100],['contrast',100],['saturate',100],['grayscale',0]].forEach(p=>$('#'+p[0]).value=p[1]);drawEditor();});
$('#editorDownload').addEventListener('click',async()=>{if(!app.editorImg){toast('Choose an image first.');return;}const b=await toBlob($('#editorCanvas'),'image/png',1);if(b)saveBlob(b,'digital-works-edited.png');});

/* Compressor */
$('#compressUpload').addEventListener('change',e=>openLocal(e.target,(img,file)=>{app.compImg=img;app.compFile=file;const c=$('#compressCanvas');const [w,h]=fitDimensions(img,1000);c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);status('compressStatus','Original: '+friendlyBytes(file.size)+' · '+img.naturalWidth+' × '+img.naturalHeight,'ok');}));
function renderQuality(){$('#qualityVal').textContent=$('#quality').value+'%';}
$('#quality').addEventListener('input',renderQuality);renderQuality();
$('#compressGo').addEventListener('click',async()=>{
 if(!app.compImg){toast('Select an image first.');return;}
 const target=Math.max(100,Math.min(3000,parseInt($('#maxDimension').value,10)||1200));
 const [w,h]=fitDimensions(app.compImg,target);
 const c=$('#compressCanvas');c.width=w;c.height=h;
 const ctx=c.getContext('2d');const mime=$('#compressFormat').value;
 if(mime==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}
 ctx.drawImage(app.compImg,0,0,w,h);
 const b=await toBlob(c,mime,Number($('#quality').value)/100);
 if(!b){status('compressStatus','Your browser cannot encode that format. Try JPEG or PNG.','error');return;}
 const format=b.type==='image/webp'?'webp':b.type==='image/png'?'png':'jpg';
 status('compressStatus','Original '+friendlyBytes(app.compFile.size)+' → Export '+friendlyBytes(b.size)+' · '+w+' × '+h,'ok');
 saveBlob(b,'digital-works-optimized.'+format);
});

/* Palette sampler */
$('#paletteUpload').addEventListener('change',e=>openLocal(e.target,(im)=>{
 const c=document.createElement('canvas'),[w,h]=fitDimensions(im,140);c.width=w;c.height=h;
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0,w,h);
 let data;try{data=ctx.getImageData(0,0,w,h).data;}catch(err){status('paletteStatus','Could not read pixels from this image.','error');return;}
 const hist=new Map();
 for(let i=0;i<data.length;i+=4){if(data[i+3]<120)continue;const r=Math.round(data[i]/32)*32,g=Math.round(data[i+1]/32)*32,b=Math.round(data[i+2]/32)*32;const key=[Math.min(255,r),Math.min(255,g),Math.min(255,b)].join(',');hist.set(key,(hist.get(key)||0)+1);}
 const shades=[...hist.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
 if(!shades.length){status('paletteStatus','This image has no visible colors.','error');return;}
 const box=$('#swatches');box.replaceChildren();app.paletteLoaded=true;
 shades.forEach(([rgb])=>{const nums=rgb.split(',').map(Number),hex='#'+nums.map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();const b=document.createElement('button');b.type='button';b.className='swatch';b.style.background=hex;b.style.color=(nums[0]*.299+nums[1]*.587+nums[2]*.114)>155?'#111':'#fff';b.textContent=hex;b.title='Copy '+hex;b.addEventListener('click',()=>copy(hex));box.appendChild(b);});
 status('paletteStatus','Palette extracted. Tap a swatch to copy its hex color.','ok');
}));
$('#paletteCopy').addEventListener('click',()=>{if(!app.paletteLoaded)return toast('Upload an image first.');const all=$('#swatches .swatch').map(x=>x.textContent);copy(all.join(', '));});

/* CSS gradient */
function drawGradient(){const a=$('#gradA').value,b=$('#gradB').value,angle=$('#gradAngle').value,css='linear-gradient('+angle+'deg, '+a+', '+b+')';$('#gradientBox').style.background=css;$('#gradientCode').textContent='background: '+css+';';$('#gradAngleOut').textContent=angle+'°';}
['gradA','gradB','gradAngle'].forEach(id=>$('#'+id).addEventListener('input',drawGradient));drawGradient();
$('#gradientCopy').addEventListener('click',()=>copy($('#gradientCode').textContent));
$('#gradientRandom').addEventListener('click',()=>{const palettes=[['#b68df0','#ed9dc5'],['#7f83ff','#83c8e8'],['#fc91a9','#fdce7b'],['#73ae9f','#d6e8ad'],['#bd95df','#6259aa']];const p=palettes[Math.floor(Math.random()*palettes.length)];$('#gradA').value=p[0];$('#gradB').value=p[1];$('#gradAngle').value=Math.floor(Math.random()*361);drawGradient();});

/* Banner designer */
function drawBanner(){
 const c=$('#bannerCanvas'),ctx=c.getContext('2d');c.width=1200;c.height=630;
 const theme=$('#bannerTheme').value;
 const colors={violet:['#1a102b','#6249a2','#dfb6ff'],sunset:['#28142b','#ca648c','#ffdbb4'],ocean:['#081c35','#257caa','#c3f3f7'],forest:['#102822','#42806a','#d6f6c1']};
 const t=colors[theme]||colors.violet;
 const g=ctx.createLinearGradient(0,0,1200,630);g.addColorStop(0,t[0]);g.addColorStop(1,t[1]);ctx.fillStyle=g;ctx.fillRect(0,0,1200,630);
 ctx.fillStyle=t[2]+'22';ctx.beginPath();ctx.arc(1030,110,330,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(1050,580,210,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle=t[2]+'66';ctx.lineWidth=2;for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(1040,320,190+i*35,-2,2);ctx.stroke();}
 ctx.fillStyle=t[2];ctx.font='700 23px sans-serif';ctx.fillText('THE DIGITAL WORKS  /  CREATOR LAB',78,94);
 ctx.fillStyle='#fff';ctx.font='700 78px sans-serif';
 let text=$('#bannerTitle').value.trim()||'Ideas made useful.';const words=text.split(/\s+/);let lines=[],line='';
 words.forEach(word=>{if(ctx.measureText((line+' '+word).trim()).width>940&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();});if(line)lines.push(line);
 lines=lines.slice(0,3);lines.forEach((l,i)=>ctx.fillText(l,78,260+i*91,1020));
 ctx.fillStyle='#e3d9ed';ctx.font='400 31px sans-serif';ctx.fillText(($('#bannerSubtitle').value||'Made with care.').slice(0,80),78,550,980);
}
['bannerTitle','bannerSubtitle','bannerTheme'].forEach(id=>$('#'+id).addEventListener('input',drawBanner));drawBanner();
$('#bannerDownload').addEventListener('click',async()=>{const b=await toBlob($('#bannerCanvas'),'image/png',1);if(b)saveBlob(b,'digital-works-social-banner.png');});

/* SVG shape */
function shapePath(seed,points,wobble){
 let state=seed;function rand(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
 const anchors=[];for(let i=0;i<points;i++){const a=(i/points)*Math.PI*2,r=75+(rand()-.5)*wobble*1.4;anchors.push({x:120+Math.cos(a)*r,y:120+Math.sin(a)*r});}
 const p=anchors;let d='M '+((p[0].x+p[1].x)/2).toFixed(2)+' '+((p[0].y+p[1].y)/2).toFixed(2);
 for(let i=1;i<=points;i++){const a=p[i%points],b=p[(i+1)%points];d+=' Q '+a.x.toFixed(2)+' '+a.y.toFixed(2)+' '+((a.x+b.x)/2).toFixed(2)+' '+((a.y+b.y)/2).toFixed(2);}
 return d+' Z';
}
function updateShape(){const seed=Number($('#shapeSeed').value)||1,n=Number($('#shapePoints').value),w=Number($('#shapeWobble').value),fill=$('#shapeFill').value;
 const d=shapePath(seed,n,w);app.shapeSvg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><path fill="'+fill+'" d="'+d+'"/></svg>';
 $('#shapePreview').innerHTML=app.shapeSvg;$('#shapePointsOut').textContent=n;$('#shapeWobbleOut').textContent=w;
}
['shapePoints','shapeWobble','shapeFill'].forEach(id=>$('#'+id).addEventListener('input',updateShape));
$('#shapeRandom').addEventListener('click',()=>{$('#shapeSeed').value=Math.floor(Math.random()*100000)+1;updateShape();});
$('#shapeCopy').addEventListener('click',()=>copy(app.shapeSvg));
$('#shapeDownload').addEventListener('click',()=>saveBlob(new Blob([app.shapeSvg],{type:'image/svg+xml'}),'digital-works-shape.svg'));updateShape();

/* Shadow builder */
function drawShadow(){const x=$('#shadowX').value,y=$('#shadowY').value,blur=$('#shadowBlur').value,spread=$('#shadowSpread').value,color=$('#shadowColor').value;
 const value=x+'px '+y+'px '+blur+'px '+spread+'px '+color;$('#shadowDemo').style.boxShadow=value;$('#shadowCode').textContent='box-shadow: '+value+';';
 ['X','Y','Blur','Spread'].forEach(k=>$('#shadow'+k+'Out').textContent=$('#shadow'+k).value+'px');
}
['shadowX','shadowY','shadowBlur','shadowSpread','shadowColor'].forEach(id=>$('#'+id).addEventListener('input',drawShadow));drawShadow();
$('#shadowCopy').addEventListener('click',()=>copy($('#shadowCode').textContent));
function paintPlaceholder(id,label){
 const c=$('#'+id),ctx=c.getContext('2d'),w=c.width,h=c.height;
 const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#36254d');grad.addColorStop(1,'#10101d');
 ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
 ctx.globalAlpha=.28;ctx.fillStyle='#e4b8fb';ctx.beginPath();ctx.arc(w*.70,h*.42,h*.38,0,7);ctx.fill();
 ctx.fillStyle='#a790fe';ctx.beginPath();ctx.arc(w*.33,h*.78,h*.29,0,7);ctx.fill();ctx.globalAlpha=1;
 ctx.fillStyle='#f0e0ff';ctx.font='600 23px sans-serif';ctx.textAlign='center';ctx.fillText(label,w/2,h/2+8);
}
paintPlaceholder('editorCanvas','Your photo here');
paintPlaceholder('compressCanvas','Add an image to optimize');
})();
