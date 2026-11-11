const fs=require('fs'),vm=require('vm'),assert=require('assert');const html=fs.readFileSync(__dirname+'/index.html','utf8'),src=fs.readFileSync(__dirname+'/src/app.js','utf8');
class El{constructor(){this.value='';this.checked=false;this.style={};this.dataset={};this.attrs={};this.classList={toggle(){},add(){},remove(){}};this.children=[];this.open=false;this.textContent='';this.innerHTML='';}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}addEventListener(){}appendChild(v){this.children.push(v)}append(...v){this.children.push(...v)}replaceChildren(...v){this.children=v}querySelector(){return new El}querySelectorAll(){return []}getPointAtLength(){return {x:0,y:0}}getTotalLength(){return 100}}
const els={};for(const m of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)){let e=els[m[1]]=new El;const val=m[0].match(/\bvalue="([^"]*)"/);if(val)e.value=val[1];e.checked=/\bchecked\b/.test(m[0]);}
Object.assign(els.drug,{value:'paracetamol'});Object.assign(els.libModel,{value:'first'});Object.assign(els.speed,{value:'1'});Object.assign(els.route,{value:'oral'});
const stageEls=Array.from({length:5},()=>new El),nodeEls=Array.from({length:7},()=>new El);
const doc={getElementById:id=>els[id]||(els[id]=new El),querySelectorAll:s=>s==='.stage'?stageEls:s==='.node'?nodeEls:[],querySelector:()=>new El,createElement:()=>new El,createElementNS:()=>new El,addEventListener(){},body:new El};
const ctx={document:doc,window:{addEventListener(){}},matchMedia:()=>({matches:false}),requestAnimationFrame(){},setInterval(){},setTimeout(){},console,Date,Math};vm.createContext(ctx);vm.runInContext(src,ctx);const run=s=>vm.runInContext(s,ctx);

run("loadScenario('accumulation')");
assert.equal(run('selectedMedicine'),'slowclearance');assert.equal(run('currentQ.id'),'accumulation-risk');assert.equal(els.doseSchedule.value,'three');
const peaks=run('[0,8,16].map((t,i)=>Math.max(...data.slice(t*100,i===2?2401:(t+8)*100).map(s=>s[2])))');
assert(peaks[1]>peaks[0]&&peaks[2]>peaks[1]);assert(peaks[2]>50);
assert(run('data[1599][2]+data[1599][3]>baseline[1599][2]+baseline[1599][3]'));
assert(els.chart.innerHTML.includes('Above hypothetical upper limit'));
let error=0;for(const plan of ['single','twice','three','missed','delayed'])for(const route of ['oral','sc','iv']){
 els.doseSchedule.value=plan;
 const times=run('doseTimes()'),rows=run(`simulateSchedule(3,1.5,.2,medicines.slowclearance,'${route}')`);
 rows.forEach((s,i)=>{error=Math.max(error,Math.abs(s.reduce((a,b)=>a+b,0)-100*times.filter(t=>t<=i*.01+1e-9).length));assert(s.every(v=>v>=-1e-10));});
}assert(error<1e-9);
run("loadScenario('accumulation-control')");assert.equal(run('selectedMedicine'),'generic');assert.equal(els.doseSchedule.value,'three');assert(els.accumulationLesson.hidden);
console.log('PASS accumulation: rising peaks '+peaks.map(v=>v.toFixed(1)).join(' / ')+'; max mass error '+error+'; all routes and schedules, comparator and question.');
