const fs=require('fs'),vm=require('vm'),assert=require('assert');const html=fs.readFileSync(__dirname+'/index.html','utf8'),src=fs.readFileSync(__dirname+'/src/app.js','utf8');
class El{constructor(){this.value='';this.checked=false;this.style={};this.dataset={};this.attrs={};this.classList={toggle(){},add(){},remove(){}};this.children=[];this.open=false;this.textContent='';this.innerHTML='';}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}addEventListener(){}appendChild(v){this.children.push(v)}append(...v){this.children.push(...v)}replaceChildren(...v){this.children=v}querySelector(){return new El}querySelectorAll(){return []}getPointAtLength(){return {x:0,y:0}}getTotalLength(){return 100}}
const els={};for(const m of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)){let e=els[m[1]]=new El;const val=m[0].match(/\bvalue="([^"]*)"/);if(val)e.value=val[1];e.checked=/\bchecked\b/.test(m[0]);}
Object.assign(els.drug,{value:'paracetamol'});Object.assign(els.libModel,{value:'first'});Object.assign(els.speed,{value:'1'});Object.assign(els.route,{value:'oral'});
const stageEls=Array.from({length:5},()=>new El),nodeEls=Array.from({length:7},()=>new El);
const doc={getElementById:id=>els[id]||(els[id]=new El),querySelectorAll:s=>s==='.stage'?stageEls:s==='.node'?nodeEls:[],querySelector:()=>new El,createElement:()=>new El,createElementNS:()=>new El,addEventListener(){},body:new El};
const ctx={document:doc,window:{addEventListener(){}},matchMedia:()=>({matches:false}),requestAnimationFrame(){},setInterval(){},setTimeout(){},console,Date,Math};vm.createContext(ctx);vm.runInContext(src,ctx);const run=s=>vm.runInContext(s,ctx);
assert.equal(els.amountAuc.textContent,'237.6');assert.equal(els.aucRatio.textContent,'0.799');
els.routeCompare.checked=true;run('drawChart()');assert(els.routeExposureRows.innerHTML.includes('Your settings (ORAL)'));const tableBefore=els.routeExposureRows.innerHTML;els.absorb.value=.1;run('rebuild()');assert.notEqual(els.routeExposureRows.innerHTML,tableBefore);assert(els.routeExposureRows.innerHTML.includes('296.5'));els.absorb.value=1.5;run('rebuild()');assert(els.routeExposureRows.innerHTML.includes('296.5'));assert(els.routeExposureRows.innerHTML.includes('0.997'));
run('setSimulationTime(2)');assert.equal(els.storyHeadline.textContent,'Metabolism is most active now');run('setSimulationTime(4)');assert.equal(els.storyHeadline.textContent,'Excretion is most active now');
run("loadScenario('flip-flop')");assert.equal(Number(els.absorb.value),.05);assert(els.inputWarning.textContent.startsWith('Slow-input warning'));assert(els.advanced.open);assert(run('currentQ.id')==='terminal-hl');
run("$('libModel').value='zero';$('zeroRate').value=1;$('absorb').value=1.5;rebuild()");assert(els.exposureWindow.textContent.includes('18.7 units'));assert(els.exposureWindow.textContent.includes('Input is unfinished'));
let maxError=0,min=100;for(const route of ['oral','sc','iv'])for(const ka of [.05,4])for(const kr of [.05,8]){const rows=run(`simulate(${kr},${ka},.8,medicines.generic,'${route}')`);for(const row of rows){min=Math.min(min,...row);maxError=Math.max(maxError,Math.abs(row.reduce((a,b)=>a+b,0)-100));}}
assert(min>=-1e-10);assert(maxError<1e-9);
assert.equal(run('ROUTE_PRESETS.sc.absorption'),.75);assert(run("routePresetParams('sc')[1]")===.75);

// Single-dose mode reproduces the original integrator exactly.
assert.equal(run("JSON.stringify(simulateSchedule(3,1.5,.2,medicines.generic,'oral',undefined,[0]))"),run("JSON.stringify(simulate(3,1.5,.2,medicines.generic,'oral'))"));
let multiError=0;
for(const plan of ['single','twice','three','missed','delayed'])for(const route of ['oral','sc','iv']){
 els.doseSchedule.value=plan;
 for(const cfg of [{model:'first',zeroRate:25,lag:0},{model:'zero',zeroRate:1,lag:3}]){
  const rows=run(`simulateSchedule(3,.75,.2,medicines.generic,'${route}',${JSON.stringify(cfg)})`);
  const times=run('doseTimes().slice()');
  rows.forEach((row,i)=>{const expected=100*times.filter(h=>h<=i*.01+1e-9).length;multiError=Math.max(multiError,Math.abs(row.reduce((a,b)=>a+b,0)-expected));assert(row.every(v=>v>=-1e-10));});
 }
}
assert(multiError<1e-8);
run("loadScenario('morning-evening')");assert.equal(els.doseSchedule.value,'twice');assert.equal(run('currentQ.id'),'dose-overlap');
run('setSimulationTime(12)');assert(els.doseStatus.textContent.includes('200 units'));assert(run('debugSnapshot().massBalancePass'));assert(els.chart.innerHTML.includes('D2'));
run('setSimulationTime(11.996)');assert(run('debugSnapshot().massBalancePass'));
const twice=run('data[1300][2]');run("loadScenario('missed-evening')");assert(run('data[1300][2]')<twice);assert(els.chart.innerHTML.includes('Skipped'));
run("$('doseSchedule').value='twice';currentRoute='iv';$('route').value='iv';loadMedicine()");assert(run('data[1200][2]-data[1199][2]')>99);assert(run('chartMax')>100);assert(els.chart.innerHTML.includes('Hypothetical target'));
els.showTarget.checked=false;run('drawChart();render()');assert(!els.chart.innerHTML.includes('Hypothetical target'));assert(els.targetStatus.hidden);
run("$('doseSchedule').value='twice'");assert.equal(run("scheduledReleaseRate(13,3,{model:'zero',zeroRate:10,lag:2})"),0);assert.equal(run("scheduledReleaseRate(14,3,{model:'zero',zeroRate:10,lag:2})"),10);
console.log('Repeated-dose checks PASS; maximum mass error: '+multiError);
console.log(JSON.stringify({status:'PASS',checks:['full script startup with DOM test harness','graph AUC metrics and route comparison','net-score story transitions','flip-flop scenario and warning','unfinished release warning','mass balance and nonnegative states at new input limits'],maxMassError:maxError,minimumAmount:min},null,2));
