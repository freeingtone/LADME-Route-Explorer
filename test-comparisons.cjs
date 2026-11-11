const fs=require('fs'),vm=require('vm'),assert=require('assert');const html=fs.readFileSync(__dirname+'/index.html','utf8'),src=fs.readFileSync(__dirname+'/src/app.js','utf8');
class El{constructor(){this.value='';this.checked=false;this.style={};this.dataset={};this.attrs={};this.classList={toggle(){},add(){},remove(){}};this.children=[];this.open=false;this.textContent='';this.innerHTML='';}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}addEventListener(){}appendChild(v){this.children.push(v)}append(...v){this.children.push(...v)}replaceChildren(...v){this.children=v}querySelector(){return new El}querySelectorAll(){return []}getPointAtLength(){return {x:0,y:0}}getTotalLength(){return 100}}
const els={};for(const m of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)){let e=els[m[1]]=new El;const val=m[0].match(/\bvalue="([^"]*)"/);if(val)e.value=val[1];e.checked=/\bchecked\b/.test(m[0]);}
Object.assign(els.drug,{value:'paracetamol'});Object.assign(els.libModel,{value:'first'});Object.assign(els.speed,{value:'1'});Object.assign(els.route,{value:'oral'});
const stageEls=Array.from({length:5},()=>new El),nodeEls=Array.from({length:7},()=>new El);
const doc={getElementById:id=>els[id]||(els[id]=new El),querySelectorAll:s=>s==='.stage'?stageEls:s==='.node'?nodeEls:[],querySelector:()=>new El,createElement:()=>new El,createElementNS:()=>new El,addEventListener(){},body:new El};
const ctx={document:doc,window:{addEventListener(){}},matchMedia:()=>({matches:false}),requestAnimationFrame(){},setInterval(){},setTimeout(){},console,Date,Math};vm.createContext(ctx);vm.runInContext(src,ctx);const run=s=>vm.runInContext(s,ctx);

els.accumulationSingle.onclick();assert.equal(run('selectedMedicine'),'slowclearance');assert.equal(els.doseSchedule.value,'single');assert(els.accumulationStats.textContent.includes('One dose only'));
assert.equal(run('currentQ.id'),'accumulation-risk');assert.equal(run('time'),0);assert.equal(run('playing'),false);
els.accumulationRepeated.onclick();assert.equal(els.doseSchedule.value,'three');assert(els.accumulationStats.textContent.includes('49.3 / 84.5 / 113.3'));
const summary=els.accumulationStats.textContent;run('setSimulationTime(5)');assert.equal(els.accumulationStats.textContent,summary);
for(const plan of ['single','twice','three','missed','delayed']){els.doseSchedule.value=plan;run('rebuild()');assert(els.accumulationStats.textContent.startsWith('24-hour preview'));assert(!els.accumulationStats.textContent.includes('NaN'));}
els.accumulationStandard.onclick();assert.equal(run('selectedMedicine'),'generic');assert.equal(els.doseSchedule.value,'three');
console.log('PASS: all three comparison buttons, single-dose question, reset/pause, complete-day summaries, all five schedules, paused time scrub.');
