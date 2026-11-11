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
const ctx={MutationObserver:Observer,document:doc,window:{addEventListener(name,callback){(this.listeners ||= {})[name]=callback}},matchMedia:()=>({matches:false}),requestAnimationFrame(){},setInterval(){},setTimeout(){},console,Date,Math};vm.createContext(ctx);vm.runInContext(src,ctx);const run=s=>vm.runInContext(s,ctx);


run('setSimulationTime(6);setPlaying(true)');els.pdAgonist.value='123';els.meaningReflection.value='My answer';
const state=()=>run('JSON.stringify({time,playing,currentRoute,par:params(),plan:doseTimes(),mode:$("advancedMode").checked,lesson:meaningStep,route:journeySelection,pd:$("pdAgonist").value,answer:$("meaningReflection").value,data})');
const before=state();
els.languageThai.listeners.click();
assert.equal(doc.documentElement.lang,'th');assert.equal(els.languageThai.attrs['aria-pressed'],'true');
assert.equal(label.childNodes[0].nodeValue,'ยาเดินทางผ่านร่างกายอย่างไร?');
assert.equal(dynamic.childNodes[0].nodeValue,'การตอบสนอง: 20.0% ของผลสูงสุดของระบบ');
assert.equal(option.value,'twice');assert.equal(option.childNodes[0].nodeValue,'เช้าและเย็น');
assert.equal(input.value,'My English answer');assert.equal(input.childNodes[0].nodeValue,'My English answer');assert(input.attrs.placeholder.includes('ไม่มีคะแนน'));
assert(chart.attrs['aria-label'].includes('เพดาน'));assert.equal(excluded.childNodes[0].nodeValue,'release: 3, absorption: 1.5');
assert.equal(toolbar.childNodes[0].nodeValue,'English / ไทย');assert.equal(state(),before);
// New runtime text, newly added subtrees and ARIA changes are localized.
dynamic.childNodes[0].nodeValue='Response: 25.0% of the full system maximum.';
Observer.instance.callback([{type:'characterData',target:dynamic.childNodes[0]}]);
assert.equal(dynamic.childNodes[0].nodeValue,'การตอบสนอง: 25.0% ของผลสูงสุดของระบบ');
const added=element('p',['Your prediction fits. More agonist raises the response toward a limit because this system cannot respond without limit.']);
added.parentElement=doc.body;doc.body.childNodes.push(added);
Observer.instance.callback([{type:'childList',addedNodes:[added]}]);assert(added.childNodes[0].nodeValue.startsWith('คำคาดการณ์สอดคล้อง'));
chart.attrs['aria-label']='Simulation playback';Observer.instance.callback([{type:'attributes',target:chart}]);assert.equal(chart.attrs['aria-label'],'การเล่นแบบจำลอง');
for(let i=0;i<3;i++){els.languageEnglish.listeners.click();els.languageThai.listeners.click();}
els.languageEnglish.listeners.click();assert.equal(doc.documentElement.lang,'en');assert.equal(label.childNodes[0].nodeValue,'How does a medicine travel through the body?');
assert.equal(dynamic.childNodes[0].nodeValue,'Response: 25.0% of the full system maximum.');assert.equal(chart.attrs['aria-label'],'Simulation playback');assert.equal(input.attrs.placeholder,'Use your own words; this answer is not scored.');assert.equal(state(),before);
// All catalogue entries resolve exactly, including scientific notation and prose.
run('Object.entries(THAI_TEXT).forEach(([en,th])=>{if(translateThai(en).trim()!==th.trim())throw Error("Translation mismatch: "+en)})');
assert.equal(run("translateThai('0.05 h⁻¹')"),'0.05 h⁻¹');
console.log('PASS: EN/TH toggle, document language, text/ARIA/placeholder updates, dynamic observer, exact English restoration, user answers and model state preservation, catalogue coverage.');
