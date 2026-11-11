const fs=require('fs'),vm=require('vm'),assert=require('assert');const html=fs.readFileSync(__dirname+'/index.html','utf8'),src=fs.readFileSync(__dirname+'/src/app.js','utf8');
class El{constructor(){this.value='';this.checked=false;this.style={};this.dataset={};this.attrs={};this.classList={toggle(){},add(){},remove(){}};this.children=[];this.open=false;this.textContent='';this.innerHTML='';}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}focus(){doc.activeElement=this}addEventListener(){}appendChild(v){this.children.push(v)}append(...v){this.children.push(...v)}replaceChildren(...v){this.children=v}querySelector(){return new El}querySelectorAll(){return []}getPointAtLength(){return {x:0,y:0}}getTotalLength(){return 100}}
const els={};for(const m of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)){let e=els[m[1]]=new El;const val=m[0].match(/\bvalue="([^"]*)"/);if(val)e.value=val[1];e.checked=/\bchecked\b/.test(m[0]);}
Object.assign(els.drug,{value:'paracetamol'});Object.assign(els.libModel,{value:'first'});Object.assign(els.speed,{value:'1'});Object.assign(els.route,{value:'oral'});
const stageEls=Array.from({length:5},()=>new El),nodeEls=Array.from({length:7},()=>new El);
const doc={getElementById:id=>els[id]||(els[id]=new El),querySelectorAll:s=>s==='.stage'?stageEls:s==='.node'?nodeEls:[],querySelector:()=>new El,createElement:()=>new El,createElementNS:()=>new El,addEventListener(){},body:new El};
const ctx={document:doc,window:{addEventListener(){}},matchMedia:()=>({matches:false}),requestAnimationFrame(){},setInterval(){},setTimeout(){},console,Date,Math};vm.createContext(ctx);vm.runInContext(src,ctx);const run=s=>vm.runInContext(s,ctx);

assert.equal(run('meaningStep'),0);assert(els.meaningLab.hidden);
run('setSimulationTime(6);setPlaying(true)');const saved=run('JSON.stringify({time,playing,currentRoute,par:params(),plan:doseTimes()})');
run('showMeaningStep(1)');els['predict-full'].value='';els['reveal-full'].onclick();assert(els.meaningLab.hidden);
for(const key of ['full','partial','alone','blocked','rescue']){
 const correct=run(`meaningExperiments['${key}'].correct`);els['predict-'+key].value=correct;els['reveal-'+key].onclick();assert(els['feedback-'+key].textContent.startsWith('Your prediction fits'));
 els['predict-'+key].value=correct==='0'?'1':'0';els['reveal-'+key].onclick();assert(els['feedback-'+key].textContent.startsWith('Notice the difference'));
 els['skip-'+key].onclick();assert(els['feedback-'+key].textContent.startsWith('Explore'));
}
run('showMeaningStep(0)');assert(els.meaningLab.hidden);run('showMeaningStep(1)');assert(!els.meaningLab.hidden);assert(els.meaningName.textContent.includes('partial'));
els.meaningAll.checked=true;els.meaningAll.onchange();for(let i=0;i<5;i++)assert(!els['meaningStep'+i].hidden);
els.meaningReflection.value='My explanation';els.meaningCompare.onclick();assert(els.meaningExplanation.textContent.includes('blood carries'));
els.meaningToJourney.onclick();assert.equal(run('learningTab'),'journey');els.pdToSimulation.onclick();assert.equal(run('learningTab'),'simulation');assert.equal(run('JSON.stringify({time,playing,currentRoute,par:params(),plan:doseTimes()})'),saved);
console.log('PASS: initial concealment, empty prediction, all correct/incorrect/skip explanations, revisiting examples, show-all, reflection and state-preserving bridges.');
