const fs=require('fs'),vm=require('vm'),assert=require('assert');const html=fs.readFileSync(__dirname+'/index.html','utf8'),src=fs.readFileSync(__dirname+'/src/app.js','utf8');
class El{constructor(){this.value='';this.checked=false;this.style={};this.dataset={};this.attrs={};this.classList={toggle(){},add(){},remove(){}};this.children=[];this.open=false;this.textContent='';this.innerHTML='';}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}focus(){doc.activeElement=this}addEventListener(){}appendChild(v){this.children.push(v)}append(...v){this.children.push(...v)}replaceChildren(...v){this.children=v}querySelector(){return new El}querySelectorAll(){return []}getPointAtLength(){return {x:0,y:0}}getTotalLength(){return 100}}
const els={};for(const m of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)){let e=els[m[1]]=new El;const val=m[0].match(/\bvalue="([^"]*)"/);if(val)e.value=val[1];e.checked=/\bchecked\b/.test(m[0]);}
Object.assign(els.drug,{value:'paracetamol'});Object.assign(els.libModel,{value:'first'});Object.assign(els.speed,{value:'1'});Object.assign(els.route,{value:'oral'});
const stageEls=Array.from({length:5},()=>new El),nodeEls=Array.from({length:7},()=>new El);
const doc={getElementById:id=>els[id]||(els[id]=new El),querySelectorAll:s=>s==='.stage'?stageEls:s==='.node'?nodeEls:[],querySelector:()=>new El,createElement:()=>new El,createElementNS:()=>new El,addEventListener(){},body:new El};
const ctx={document:doc,window:{addEventListener(){}},matchMedia:()=>({matches:false}),requestAnimationFrame(){},setInterval(){},setTimeout(){},console,Date,Math};vm.createContext(ctx);vm.runInContext(src,ctx);const run=s=>vm.runInContext(s,ctx);

assert.equal(run('learningTab'),'simulation');
assert.equal(run('receptorState(50,0).response'),50);
assert.equal(run('receptorState(0,50).response'),0);
assert.equal(run('receptorState(50,100).response'),25);
assert.equal(run('receptorState(50,0,50,.4).response'),20);
assert(run('receptorState(1000,100).response>receptorState(50,100).response'));
assert(run('receptorState(1e10,100).response>99.999'));
assert(run('receptorState(1e10,0,50,.4).response<40'));
for(const a of [0,1,50,1000])for(const b of [0,50,500])for(const kd of [5,50,200]){const v=run(`receptorState(${a},${b},${kd})`);assert(Math.abs(v.agonist+v.antagonist+v.free-1)<1e-12);assert(v.response>=0&&v.response<=100);}
run('setSimulationTime(7);setPlaying(true)');const saved=run('JSON.stringify({time,playing,currentRoute,selectedMedicine,par:params(),schedule:doseTimes()})');
run("showLearningTab('pharmacology')");els.pdBlocked.onclick();assert(els.pdResponse.textContent.includes('25.0%'));els.pdAlone.onclick();assert(els.pdResponse.textContent.includes('0.0%'));els.pdPartial.onclick();assert(els.pdResponse.textContent.includes('20.0%'));els.pdRescue.onclick();
assert.equal(run('JSON.stringify({time,playing,currentRoute,selectedMedicine,par:params(),schedule:doseTimes()})'),saved);
run("learningTabKey({key:'End',preventDefault(){}},'pharmacology')");assert.equal(run('learningTab'),'simulation');run("learningTabKey({key:'ArrowRight',preventDefault(){}},'simulation')");assert.equal(run('learningTab'),'anatomy');run("learningTabKey({key:'ArrowLeft',preventDefault(){}},'simulation')");assert.equal(run('learningTab'),'pharmacology');
els.pdAdvanced.checked=true;els.pdAdvanced.onchange();assert(els.advancedMode.checked);els.advancedMode.checked=false;run('applyLearnerMode()');assert(!els.pdAdvanced.checked);
els.pdAnswerActive.onclick();assert(els.pdFeedback.textContent.startsWith('Not yet'));els.pdAnswerBlocked.onclick();assert(els.pdFeedback.textContent.startsWith('Correct'));
console.log('PASS: receptor equilibrium, bounded response, partial efficacy, competitive shift and rescue, presets, four-tab keyboard navigation, PK state preservation, shared mode and quiz.');
