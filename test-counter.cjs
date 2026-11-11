const fs=require('fs'),vm=require('vm'),assert=require('assert');const html=fs.readFileSync(__dirname+'/index.html','utf8'),src=fs.readFileSync(__dirname+'/src/app.js','utf8');
class El{constructor(){this.value='';this.checked=false;this.style={};this.dataset={};this.attrs={};this.classList={toggle(){},add(){},remove(){}};this.children=[];this.open=false;this.textContent='';this.innerHTML='';}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}focus(){doc.activeElement=this}addEventListener(name,callback){(this.listeners ||= {})[name]=callback}appendChild(v){this.children.push(v)}append(...v){this.children.push(...v)}replaceChildren(...v){this.children=v}querySelector(){return new El}querySelectorAll(){return []}getPointAtLength(){return {x:0,y:0}}getTotalLength(){return 100}}
const els={};for(const m of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)){let e=els[m[1]]=new El;const val=m[0].match(/\bvalue="([^"]*)"/);if(val)e.value=val[1];e.checked=/\bchecked\b/.test(m[0]);}
Object.assign(els.drug,{value:'paracetamol'});Object.assign(els.libModel,{value:'first'});Object.assign(els.speed,{value:'1'});Object.assign(els.route,{value:'oral'});
const stageEls=Array.from({length:5},()=>new El),nodeEls=Array.from({length:7},()=>new El);
const doc={getElementById:id=>els[id]||(els[id]=new El),querySelectorAll:s=>s==='.stage'?stageEls:s==='.node'?nodeEls:[],querySelector:()=>new El,createElement:()=>new El,createElementNS:()=>new El,addEventListener(name,callback){(this.listeners ||= {})[name]=callback},body:new El};

// Minimal tree/observer adapter: tests DOM logic only, never claims rendered layout.
El.prototype.hasAttribute=function(k){return k in this.attrs};
El.prototype.closest=function(selector){
 for(let n=this;n;n=n.parentElement){
  if(selector.split(',').some(v=>v==='[data-no-translate]'?n.hasAttribute?.('data-no-translate'):v===n.tagName?.toLowerCase()))return n;
 }return null;
};
function textNode(value,parent){return {nodeType:3,nodeValue:value,parentElement:parent,isConnected:true}}
function element(tag,children=[],attrs={}){
 const e=new El;e.nodeType=1;e.tagName=tag.toUpperCase();e.attrs={...attrs};e.childNodes=[];e.isConnected=true;
 for(const child of children){const n=typeof child==='string'?textNode(child,e):child;n.parentElement=e;e.childNodes.push(n)}return e;
}
const title=element('title',['LADME Route Explorer · v3.1.2']);
const label=element('h2',['How does a medicine travel through the body?']);
const dynamic=element('p',['Response: 20.0% of the full system maximum.']);
const input=element('textarea',['My English answer'],{placeholder:'Use your own words; this answer is not scored.'});input.value='My English answer';
const option=element('option',['Morning and evening'],{value:'twice'});option.value='twice';
const chart=element('svg',[],{'aria-label':'Concentration-response graph. Response: 20.0% of the full system maximum. Partial agonist ceiling: 40%.'});
const excluded=element('pre',['release: 3, absorption: 1.5']);
const toolbar=element('div',['English / ไทย'],{'data-no-translate':''});
doc.body=element('body',[label,dynamic,input,option,chart,excluded,toolbar]);doc.documentElement={lang:'en'};
doc.querySelector=selector=>selector==='title'?title:new El;
class Observer{constructor(callback){this.callback=callback;Observer.instance=this}observe(){this.observing=true}disconnect(){this.observing=false}}
const ctx={AbortController,clearTimeout(){},MutationObserver:Observer,document:doc,window:{addEventListener(name,callback){(this.listeners ||= {})[name]=callback}},matchMedia:()=>({matches:false}),requestAnimationFrame(){},setInterval(){},setTimeout(){},console,Date,Math};vm.createContext(ctx);vm.runInContext(src,ctx);const run=s=>vm.runInContext(s,ctx);



(async()=>{
 ctx.window.location={protocol:'file:'};let calls=0;
 ctx.fetch=async()=>{calls++;return {ok:true,json:async()=>({enabled:true,page_views:1234})}};
 const original=run('JSON.stringify({time,playing,currentRoute,params:params(),data})');
 await run('recordPageView()');assert.equal(calls,0);assert(els.visitCount.textContent.startsWith('Offline'));
 ctx.window.location.protocol='https:';await run('recordPageView()');assert.equal(calls,1);assert.equal(els.visitCount.textContent,'Page views: 1,234');
 ctx.fetch=async(url,options)=>{assert.equal(url,'analytics.php');assert.equal(options.method,'POST');assert.equal(options.body,'{}');assert.equal(options.credentials,'same-origin');return {ok:true,json:async()=>({enabled:false})}};
 await run('recordPageView()');assert.equal(els.visitCount.textContent,'Visit tracking is disabled.');
 for(const payload of [{enabled:true,page_views:'bad'},{enabled:true,page_views:-1},{}]){ctx.fetch=async()=>({ok:true,json:async()=>payload});await run('recordPageView()');assert(els.visitCount.textContent.startsWith('Counter unavailable'));}
 ctx.fetch=async()=>{throw new Error('offline')};await run('recordPageView()');assert(els.visitCount.textContent.startsWith('Counter unavailable'));
 ctx.fetch=async()=>({ok:true,json:async()=>({enabled:true,page_views:7,retention_days:30,logs_ip:false})});await run('recordPageView()');assert.equal(els.visitCount.textContent,'Page views: 7');assert(els.visitNotice.textContent.startsWith('This page counts page views only. It does not record IP addresses.'));assert(run("translateThai('"+els.visitNotice.textContent+"')").startsWith('หน้านี้นับจำนวนการเปิดหน้าเท่านั้น'));
 const cases=[[{ok:false,status:503,json:async()=>({error:'private_storage_required'})},'private log folder'],[{ok:false,status:503,json:async()=>({error:'storage_unavailable'})},'private log folder'],[{ok:false,status:403,json:async()=>({error:'cross_origin'})},'rejected the request origin'],[{ok:false,status:404,json:async()=>{throw new Error('html')}},'does not run the PHP counter'],[{ok:false,status:501,json:async()=>{throw new Error('html')}},'does not run the PHP counter'],[{ok:true,status:200,json:async()=>{throw new Error('php source or index.html')}},'does not run the PHP counter']];
 for(const [res,expected] of cases){ctx.fetch=async()=>res;await run('recordPageView()');assert(els.visitCount.textContent.startsWith('Counter unavailable'),els.visitCount.textContent);assert(els.visitCount.textContent.includes(expected),els.visitCount.textContent);assert(els.visitCount.textContent.endsWith('The lesson still works.'));assert(run('translateThai('+JSON.stringify(els.visitCount.textContent)+')').startsWith('ตัวนับไม่พร้อมใช้งาน'));}

 assert.equal(run('JSON.stringify({time,playing,currentRoute,params:params(),data})'),original);
 assert(run("translateThai('Page views: 1,234')").startsWith('จำนวนเปิดหน้า:'));
 console.log('PASS: counter offline/hosted/disabled/error states, payload validation, same-origin POST, Thai label and unchanged model state. specific failure reasons (no PHP, private-folder, origin) with Thai text.');
})().catch(error=>{console.error(error);process.exitCode=1});
