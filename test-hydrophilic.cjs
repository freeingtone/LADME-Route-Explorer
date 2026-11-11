const fs=require('fs'),vm=require('vm'),assert=require('assert');const html=fs.readFileSync(__dirname+'/index.html','utf8'),src=fs.readFileSync(__dirname+'/src/app.js','utf8');
class El{constructor(){this.value='';this.checked=false;this.style={};this.dataset={};this.attrs={};this.classList={toggle(){},add(){},remove(){}};this.children=[];this.open=false;this.textContent='';this.innerHTML='';}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}addEventListener(){}appendChild(v){this.children.push(v)}append(...v){this.children.push(...v)}replaceChildren(...v){this.children=v}querySelector(){return new El}querySelectorAll(){return []}getPointAtLength(){return {x:0,y:0}}getTotalLength(){return 100}}
const els={};for(const m of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)){let e=els[m[1]]=new El;const val=m[0].match(/\bvalue="([^"]*)"/);if(val)e.value=val[1];e.checked=/\bchecked\b/.test(m[0]);}
Object.assign(els.drug,{value:'paracetamol'});Object.assign(els.libModel,{value:'first'});Object.assign(els.speed,{value:'1'});Object.assign(els.route,{value:'oral'});
const stageEls=Array.from({length:5},()=>new El),nodeEls=Array.from({length:7},()=>new El);
const doc={getElementById:id=>els[id]||(els[id]=new El),querySelectorAll:s=>s==='.stage'?stageEls:s==='.node'?nodeEls:[],querySelector:()=>new El,createElement:()=>new El,createElementNS:()=>new El,addEventListener(){},body:new El};
const ctx={document:doc,window:{addEventListener(){}},matchMedia:()=>({matches:false}),requestAnimationFrame(){},setInterval(){},setTimeout(){},console,Date,Math};vm.createContext(ctx);vm.runInContext(src,ctx);const run=s=>vm.runInContext(s,ctx);

run("loadScenario('hydrophilic-nac')");
assert.equal(run('selectedMedicine'),'hydrophilic');assert.equal(run('currentRoute'),'iv');
assert(run('data[50][3]<baseline[50][3]'));assert(run('data[50][2]>baseline[50][2]'));
assert.equal(run('currentQ.id'),'hydrophilic-distribution');
assert.equal(run('medicines.hydrophilic.km'),run('medicines.generic.km'));
assert.equal(run('medicines.hydrophilic.ke'),run('medicines.generic.ke'));
let maxError=0;
for(const plan of ['single','twice','three','missed','delayed'])for(const route of ['oral','sc','iv']){
 els.doseSchedule.value=plan;
 const rows=run(`simulateSchedule(3,1.5,.2,medicines.hydrophilic,'${route}')`),times=run('doseTimes()');
 rows.forEach((row,i)=>{const expected=100*times.filter(t=>t<=i*.01+1e-9).length;maxError=Math.max(maxError,Math.abs(row.reduce((a,b)=>a+b,0)-expected));assert(row.every(x=>x>=-1e-10));});
}
assert(maxError<1e-9);
run("loadScenario('morning-evening')");assert.equal(run('selectedMedicine'),'generic');
console.log('PASS: NAC-inspired scenario, reduced early tissue entry, unchanged elimination rates, new question, all routes and dose plans, nonnegative compartments, standard scenario restoration; max mass error '+maxError);
