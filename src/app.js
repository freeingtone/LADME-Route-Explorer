// Route defaults have one source for loading, overlays, tables and labels.
const ROUTE_PRESETS = Object.freeze({
  oral:{
    release:3,absorption:1.5,firstPass:.2
  }
  ,sc:{
    release:0,absorption:.75,firstPass:0
  }
  ,iv:{
    release:0,absorption:0,firstPass:0
  }
}
);
function routePresetParams(route){
  const p=ROUTE_PRESETS[route];
  return [p.release,p.absorption,p.firstPass]
}
// Every dose contributes 100 teaching units; times are hours after 08:00.
const DOSE_PLANS = Object.freeze({
  single: {label:'One morning dose',times:[0]},
  twice: {label:'Morning and evening',times:[0,12]},
  three: {label:'Every 8 hours',times:[0,8,16]},
  missed: {label:'Missed evening dose',times:[0],skipped:[12]},
  delayed: {label:'Late evening dose',times:[0,16]}
});
const TARGET_RANGE = Object.freeze({low:10,high:50});
function dosePlan(){return DOSE_PLANS[$('doseSchedule').value]||DOSE_PLANS.single}
function doseTimes(){return dosePlan().times}
function administeredUnits(t){return doseTimes().filter(h=>h<=Math.round(t*100)/100+1e-9).length*100}
function clockAt(t){const minutes=Math.round((8+t)*60),day=Math.floor(minutes/1440)+1,m=minutes%1440;return 'Day '+day+' · '+String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}
// Linear superposition preserves the independently delayed release of each dose.
function simulateSchedule(kr,ka,f,p=medicines[selectedMedicine],route=currentRoute,lib={model:'first',zeroRate:25,lag:0},times=doseTimes()){
  const one=simulate(kr,ka,f,p,route,lib);
  return one.map((_,i)=>{const total=[0,0,0,0,0,0];for(const h of times){const j=i-Math.round(h*100);if(j>=0)one[j].forEach((v,k)=>total[k]+=v)}return total});
}
function scheduledReleaseRate(t,kr,lib){return doseTimes().reduce((rate,h)=>{const age=t-h-lib.lag;if(age<0)return rate;return rate+(lib.model==='zero'?(age<100/lib.zeroRate?lib.zeroRate:0):100*kr*Math.exp(-kr*age))},0)}
let currentRoute='oral';
const medicines={
  generic:{
    name:'Generic compound',className:'Hypothetical compound · route comparison only',heading:'Same compound, different route',summary:'This generic example isolates how a drug enters circulation. The injection models are not instructions for administering any named medicine.',peak:'Not applicable',half:'Not applicable',url:'https://www.ncbi.nlm.nih.gov/books/NBK595006/',kr:3,ka:1.5,f:.2,kt:.45,kb:.6,km:.32,ke:.01,color:'#526d72',notes:['An oral solid releases drug before absorption.','The oral example absorbs from the gut through portal blood.','All routes use the same reversible blood–tissue exchange.','The liver can metabolise circulating drug after every route. Bypassing first pass does not bypass later metabolism.','Kidneys remove unchanged drug and metabolites in this simplified model.']
  }
  , paracetamol:{
    name:'Paracetamol',className:'Analgesic & antipyretic · pain and fever',heading:'Mostly changed in the liver',summary:'Paracetamol is also called acetaminophen. It relieves pain and fever; its anti-inflammatory action is weak. Most is chemically changed in the liver before its products leave in urine.',peak:'0.5–2 hours',half:'1–4 hours',url:'https://www.medicines.org.uk/emc/product/9128/smpc',kr:6,ka:3,f:.15,kt:.45,kb:.6,km:.32,ke:.01,color:'#087f78',notes:['This example represents an immediate-release oral solid, not an extended-release product.','The product information reports peak plasma levels about 30 minutes to 2 hours after ingestion.','Protein binding is low at usual therapeutic concentrations. This model does not simulate binding.','The liver mainly forms glucuronide and sulfate conjugates. A small reactive pathway is omitted from this teaching model.','Less than 5% is reported to leave as unchanged paracetamol; most urinary material consists of metabolites.']
  }
  , ibuprofen:{
    name:'Ibuprofen',className:'NSAID · nonsteroidal anti-inflammatory drug',heading:'Pain relief with anti-inflammatory action',summary:'Ibuprofen is an NSAID used for pain and inflammation. It is rapidly metabolised; drug-related material leaves mainly in urine. Its class differs from paracetamol even though their blood-level timings can overlap.',peak:'1–2 hours',half:'1.8–2 hours',url:'https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=fae53f7b-3948-2566-e053-6394a90aae36&version=2',kr:3,ka:1.5,f:.05,kt:.3,kb:.6,km:.35,ke:.004,color:'#ad6c31',notes:['This preset represents a conventional oral tablet. Product formulations can differ.','The label reports peak blood levels in 1–2 hours. A meal can slow absorption without greatly changing its extent.','Distribution is more complex than the two pools shown here; the tissue exchange rates are teaching assumptions.','Ibuprofen is rapidly metabolised. This preset directs most elimination through the metabolite pathway.','Urine contains metabolites and conjugated material; the label reports only a small fraction as free ibuprofen.']
  }
  , amoxicillin:{
    name:'Amoxicillin',className:'Penicillin-class antibiotic · antibacterial',heading:'Much of the drug leaves unchanged',summary:'Amoxicillin inhibits bacterial cell-wall synthesis. It is an antibiotic, not a general pain medicine. Its journey highlights renal excretion of unchanged drug rather than extensive liver conversion.',peak:'1–2 hours',half:'About 1 hour',url:'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=110ba6b1-f175-48a1-8e30-616c02212538',kr:4,ka:1.5,f:0,kt:.3,kb:.6,km:.06,ke:.62,color:'#7852ac',notes:['This example represents a conventional oral solid. Amoxicillin is also available in liquid formulations.','The label reports rapid oral absorption and peak levels in 1–2 hours for capsules. Full absorption here is a simplifying assumption.','Amoxicillin reaches many tissues and fluids. The label reports approximately 20% serum protein binding; binding is not modelled.','This example uses little metabolic conversion and zero first-pass loss as teaching assumptions, not measured extraction fractions.','Most amoxicillin is excreted unchanged in urine. The label reports approximately 60% of an oral dose in urine within 6–8 hours.']
  }
}
;
// A conceptual distribution experiment, not a fitted NAC model.
medicines.hydrophilic={...medicines.generic,name:'Hypothetical hydrophilic compound',kt:.08};
medicines.slowclearance={...medicines.generic,name:'Hypothetical slow-removal compound',km:.04,ke:.005};
let selectedMedicine='generic';
const stages=[['L','Release','Release from the tablet (liberation)','The tablet breaks apart and the active drug dissolves in digestive fluid. Dissolved drug is available for absorption. Release can occur in the stomach or intestine.',[0,1]],['A','Absorption','From the gut into blood','Dissolved drug crosses the gut wall, mainly in the small intestine, and enters portal blood. It travels to the liver before reaching the wider circulation.',[1,2]],['D','Distribution','Blood carries drug to tissues','Unchanged drug moves between systemic blood and body tissues. It does not know where to go; blood flow and the drug’s properties influence where it reaches.',[3,4]],['M','Metabolism','The body changes the drug','Enzymes, often in the liver, chemically change drug into metabolites. Some change happens on the first pass, before systemic circulation; more can happen later. Metabolites can circulate in blood and enter tissues; some remain active. This model combines their blood and tissue amounts in one pool.',[2,5]],['E','Excretion','Drug-related material leaves','Kidneys can remove unchanged drug and metabolites into urine. This model shows that route. In real life, some drugs or metabolites also leave in bile and feces.',[6]]];
const $=id=>document.getElementById(id);
let active=0,time=0,playing=false,data,baseline;
const colors=['#bd8333','#10948a','#5288b3','#9974b5','#c16e65'];
$('stages').innerHTML=stages.map((s,i)=>`<button class="stage" style="--c:${colors[i]}" data-stage="${i}" aria-pressed="false"><b>${s[0]}</b><span>${s[1]}</span><small class="activity-label">Ready</small><span class="activity-track"><span class="activity-fill"></span></span></button>`).join('');
function selectStage(i){
  active=i;
  document.querySelectorAll('.stage').forEach((b,j)=>{
    b.classList.toggle('active',i===j);
    b.setAttribute('aria-pressed',i===j)
  }
  );
  $('stageTitle').textContent=stages[i][1]+' · '+(currentRoute!=='oral'&&i===0?'No solid-release step':currentRoute==='iv'&&i===1?'Bypassed by IV bolus':currentRoute==='sc'&&i===1?'From the SC depot into blood':stages[i][2]);
  $('stageText').textContent=stages[i][3];
  $('drugStage').textContent='Hypothetical compound · illustrative model';
  if(currentRoute!=='oral'){
    const msgs=currentRoute==='iv'?['IV solution is already available: there is no tablet liberation step.','Each IV bolus enters blood directly at its scheduled time. There is no absorption phase or gut/liver first-pass step.','Drug moves from blood into tissues and can return to blood.','IV bypasses initial first pass, but circulating drug can still be metabolised by the liver.','Unchanged drug and metabolites can leave through the kidneys.']:['This SC example begins as a dissolved solution under the skin, so tablet liberation is skipped.','Drug leaves the subcutaneous depot and enters systemic blood gradually. The model assumes complete uptake and bypasses gut/liver first pass.','After absorption, drug exchanges between systemic blood and body tissues.','SC bypasses gut/liver first pass. After entering circulation, drug can still undergo liver metabolism.','The kidneys remove drug and metabolites after they reach circulation.'];
    $('stageText').textContent=msgs[i];
    $('drugStage').textContent='Generic teaching example; not a validated injectable medicine model.';
  }
  document.querySelectorAll('[data-organ]').forEach(b=>b.classList.toggle('active',+b.dataset.organ===i));
  document.querySelectorAll('.node').forEach((n,j)=>n.classList.toggle('selected',stages[i][4].includes(j)))
}
document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{
  $('followActivity').checked=false;
  selectStage(+b.dataset.stage)
}
);
function liberationSettings(){
  return {
    model:$('libModel').value,zeroRate:Number($('zeroRate').value),lag:Number($('libLag').value)
  }
}
function releaseFraction(t,kr,cfg){
  const u=Math.max(0,t-cfg.lag);
  return cfg.model==='zero'?Math.min(1,cfg.zeroRate*u/100):-Math.expm1(-kr*u)
}
function terminalBeta(p){
  const k=p.km+p.ke,S=k+p.kt+p.kb;
  return 2*k*p.kb/(S+Math.sqrt(S*S-4*k*p.kb))
}
function tableRows(target,rows){
  $(target).replaceChildren(...Object.entries(rows).map(([key,val])=>{
    const tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');
    th.textContent=key;
    td.textContent=String(val);
    tr.append(th,td);
    return tr
  }
  ))
}
function basicHalfLife(k){
  return Number.isFinite(k)&&k>0?Math.LN2/k:null
}
function calculateBasic(){
  const raw=$('calcK').value,k=Number(raw),v=raw.trim()===''?null:basicHalfLife(k);
  $('calcResult').textContent=v===null?'Enter a finite rate constant greater than zero.':'t½ = 0.693147 / '+k+' = '+v.toPrecision(5)+' hours';
}
function updateAdvanced(){
  const oral=currentRoute==='oral',c=liberationSettings(),kr=params()[0],ka=params()[1],p=medicines[selectedMedicine],beta=terminalBeta(p),k10=p.km+p.ke;
  $('libControls').disabled=!oral;
  $('zeroRate').disabled=!oral||c.model!=='zero';
  $('release').disabled=!oral||c.model!=='first';
  $('libRouteNote').textContent=oral?'Active · changes affect the oral simulation':'Not applicable · '+(currentRoute==='sc'?'SC begins as a dissolved solution':'IV begins directly in blood');
  $('zeroOut').textContent=c.zeroRate+'% of dose / h';
  $('lagOut').textContent=c.lag.toFixed(2)+' h';
  const t50=c.lag+(c.model==='zero'?50/c.zeroRate:Math.LN2/kr);
  $('libFormula').textContent=!oral?'No liberation calculation for this route.':c.model==='zero'?'Released fraction = min(1, r × max(0, t − lag) / 100)':'Released fraction = 1 − exp[−kL × max(0, t − lag)]';
  $('libT50').textContent=oral?'Time to 50% release: '+t50.toFixed(3)+' h from administration'+(c.model==='first'?' · Release half-time after the delay: '+(Math.LN2/kr).toFixed(3)+' h':' · Not an elimination half-life'):'';
  $('libChart').style.display=oral?'':'none';
  if(oral){
    const path=Array.from({
      length:241
    }
    ,(_,i)=>(i?'L':'M')+x(i/10)+','+releaseY(100*releaseFraction(i/10,kr,c))).join(' ');
    $('libChart').innerHTML=[0,50,100].map(v=>`<line x1="42" x2="384" y1="${releaseY(v)}" y2="${releaseY(v)}" stroke="#dce6df"/><text x="32" y="${releaseY(v)+4}" text-anchor="end" font-size="10">${v}</text>`).join('')+[0,6,12,18,24].map(v=>`<text x="${x(v)}" y="195" font-size="10" text-anchor="middle">${v}</text>`).join('')+`<text x="42" y="15" font-size="11">Cumulative release (%)</text><text x="210" y="215" text-anchor="middle" font-size="11">Time (h)</text><path d="${path}" fill="none" stroke="#b27624" stroke-width="3"/><line id="libCursor" y1="30" y2="178" stroke="#087f78" stroke-dasharray="3 3"/>`
  }
  tableRows('halfValues',{
    'Central elimination k₁₀ (h⁻¹)':k10.toFixed(4),'Blood → tissue k₁₂ (h⁻¹)':p.kt.toFixed(4),'Tissue → blood k₂₁ (h⁻¹)':p.kb.toFixed(4),'ln(2) / k₁₀, ignoring tissue exchange':(Math.LN2/k10).toFixed(3)+' h','Terminal disposition β (h⁻¹)':beta.toFixed(5),'Terminal disposition half-life':(Math.LN2/beta).toFixed(3)+' h','Absorption half-time':currentRoute==='iv'?'Not applicable':(Math.LN2/ka).toFixed(3)+' h','Published reference half-life':'Not applicable — hypothetical compound'
  }
  );
  $('halfWorked').textContent='Using these model parameters: t½,β = 0.693147 / '+beta.toFixed(5)+' = '+(Math.LN2/beta).toFixed(3)+' hours. This differs from simply dividing by k₁₀.';
  const inputRates=currentRoute==='iv'?[]:currentRoute==='sc'?[ka]:[ka,...(c.model==='first'?[kr]:[])];
  const slow=inputRates.some(r=>r<beta);
  $('inputWarning').textContent=(slow?'Slow-input warning: release or absorption is slower than disposition. The final blood-level decline may reflect ongoing input (flip-flop kinetics), not β alone. ':'β describes disposition after input has ended or become negligible. ')+(oral&&c.model==='zero'?'Zero-order input ends at '+(c.lag+100/c.zeroRate).toFixed(2)+' h; an earlier curve segment cannot be assumed to be a terminal decline. ':'')+'The time for blood amount to halve after its peak is not necessarily the terminal half-life. These calculations describe the hypothetical compound.';
  calculateBasic();
}
function renderRelease(){
  const oral=currentRoute==='oral';
  $('releasedNow').textContent=oral?'At '+time.toFixed(2)+' h: '+(administeredUnits(time)-data[Math.round(time*100)][0]).toFixed(2)+' units released across doses given so far. The release graph shows one dose.':'Liberation skipped for this route.';
  if($('libCursor')){
    $('libCursor').setAttribute('x1',x(time));
    $('libCursor').setAttribute('x2',x(time))
  }
}
function simulate(kr,ka,f,p=medicines[selectedMedicine],route=currentRoute,lib={
  model:'first',zeroRate:25,lag:0
}
){
  let s=route==='iv'?[0,0,100,0,0,0]:route==='sc'?[0,100,0,0,0,0]:[100,0,0,0,0,0],rows=[s.slice()];
  const dt=.01;
  for(let i=1;
  i<=2400;
  i++){
    let l=route==='oral'?Math.min(s[0],Math.max(0,100*(releaseFraction(i*dt,kr,lib)-releaseFraction((i-1)*dt,kr,lib)))):0,a=route==='iv'?0:ka*s[1]*dt,to=p.kt*s[2]*dt,back=p.kb*s[3]*dt,m=p.km*s[2]*dt,e=p.ke*s[2]*dt,em=.3*s[4]*dt;
    s=[s[0]-l,s[1]+l-a,s[2]+a*(1-(route==='oral'?f:0))-to+back-m-e,s[3]+to-back,s[4]+a*(route==='oral'?f:0)+m-em,s[5]+e+em];
    rows.push(s)
  }
  return rows
}
function params(){
  return [currentRoute==='oral'?+$('release').value:0,currentRoute==='iv'?0:+$('absorb').value,currentRoute==='oral'?+$('firstpass').value/100:0]
}
function setPlaying(v){
  playing=v;
  $('play').textContent=v?'Ⅱ Pause':'▶ Start simulation'
}
function rebuild(){
  const p=medicines[selectedMedicine];
  $('modeLabel').textContent=params().some((v,i)=>Math.abs(v-(routePresetParams(currentRoute))[i])>.00001)?'Hypothetical experiment':'Illustrative teaching preset';
  if(currentRoute==='oral'&&(liberationSettings().model!=='first'||liberationSettings().lag>0))$('modeLabel').textContent='Hypothetical liberation experiment';
  data=simulateSchedule(...params(),p,currentRoute,liberationSettings());
  const hydrophilic=selectedMedicine==='hydrophilic';
  baseline=selectedMedicine!=='generic'?simulateSchedule(...params(),medicines.generic,currentRoute,liberationSettings()):simulateSchedule(...routePresetParams(currentRoute),p,currentRoute);
  $('baselineLegend').textContent=selectedMedicine==='slowclearance'?'┄ Standard removal · same doses and inputs':hydrophilic?'┄ Standard distribution · same inputs':'┄ Selected route preset';
  $('distributionHelp').textContent=selectedMedicine==='slowclearance'?'Slow removal: more parent drug remains when the next dose arrives. Compare the grey curve with standard removal and identical doses. Rates and target limits are invented for teaching.':hydrophilic?'Hydrophilic means water-loving. This experiment reduces movement from blood into the tissue pool. Compare with the grey curve: input, metabolism and renal rates are identical. Tissue still receives some drug. These are invented rates, not measured NAC kinetics.':'Standard hypothetical distribution. Choose the hydrophilic profile to explore reduced entry into the tissue pool.';
  $('parameterTable').innerHTML=`<tr><th>${p.name}</th><td>${params()[0]}</td><td>${params()[1]}</td><td>${params()[2]*100}%</td><td>${p.kt} / ${p.kb}</td><td>${p.km}</td><td>${p.ke}</td></tr>`;
  updateAccumulationSummary();
  time=0;
  setPlaying(false);
  $('releaseOut').textContent=(+$('release').value).toFixed(2)+' h⁻¹';
  $('absorbOut').textContent=(+$('absorb').value).toFixed(2)+' h⁻¹';
  $('firstpassOut').textContent=$('firstpass').value+'%';
  $('fpLabel').textContent=$('firstpass').value+'% changed';
  let pk=0,idx=0;
  data.forEach((s,i)=>{
    if(s[2]>pk){
      pk=s[2];
      idx=i
    }
  }
  );
  $('peak').textContent=pk.toFixed(1)+' units';
  $('peakTime').textContent=(idx/100).toFixed(1)+' h';
  drawChart();
  updateAdvanced();
  drawOverlap();
  render()
}
let chartMax=100;
const x=t=>42+t/24*342,y=v=>178-v/chartMax*148,releaseY=v=>178-v/100*148;
function curve(rows){
  return rows.map((s,i)=>(i?'L':'M')+x(i*.01).toFixed(3)+','+y(s[2]).toFixed(3)).join(' ')
}
function amountExposure(rows){
  let auc=0,peak=rows[0][2],peakIndex=0;
  for(let i=1;
  i<rows.length;
  i++){
    auc+=(rows[i-1][2]+rows[i][2])*.005;
    if(rows[i][2]>peak){
      peak=rows[i][2];
      peakIndex=i
    }
  }
  return {
    auc,peak,peakTime:peakIndex*.01
  }
}
function matchedIvExposure(){
  const p=medicines[selectedMedicine];
  return amountExposure(simulateSchedule(0,0,0,p,'iv')).auc
}
function updateExposure(){
  const iv=matchedIvExposure(),e=amountExposure(data),p=medicines.generic;
  $('amountAuc').textContent=e.auc.toFixed(1);
  $('aucRatio').textContent=(e.auc/iv).toFixed(3);
  $('routeExposure').hidden=!$('routeCompare').checked;
  if($('routeCompare').checked){
    $('routeExposureRows').innerHTML=`<tr class="current-exposure"><th>Your settings (${currentRoute.toUpperCase()})</th><td>${e.peak.toFixed(1)} units</td><td>${e.peakTime.toFixed(2)} h</td><td>${e.auc.toFixed(1)}</td><td>${(e.auc/iv).toFixed(3)}</td></tr>`+['oral','sc','iv'].map(r=>{
      const v=amountExposure(simulateSchedule(...routePresetParams(r),p,r));
      const name=r==='oral'?'Oral preset (eventual F = 80%)':r==='sc'?'SC preset (ka = '+ROUTE_PRESETS.sc.absorption+' h⁻¹; eventual F = 100%)':'IV bolus preset (F = 100%)';
      return `<tr><th>${name}</th><td>${v.peak.toFixed(1)} units</td><td>${v.peakTime.toFixed(2)} h</td><td>${v.auc.toFixed(1)}</td><td>${(v.auc/iv).toFixed(3)}</td></tr>`
    }
    ).join('')
  }
  const end=data[data.length-1],fraction=currentRoute==='oral'?1-params()[2]:1,entered=currentRoute==='iv'?administeredUnits(24):(administeredUnits(24)-end[0]-end[1])*fraction;
  $('exposureWindow').textContent='At 24 h: '+entered.toFixed(1)+' units have entered systemic blood unchanged; '+(end[0]+end[1]).toFixed(1)+' units remain in the formulation or absorption depot. Eventual F per dose is '+(fraction*100).toFixed(0)+'%. '+(end[0]+end[1]>.1?'Input is unfinished: the 24-hour AUC ratio can substantially underestimate eventual F.':'Even with little input remaining, blood and tissue drug after 24 h contribute additional exposure.');
}
function drawChart(){
  updateExposure();
  const comparisons=$('routeCompare').checked?['oral','sc','iv'].map(r=>simulateSchedule(...routePresetParams(r),medicines.generic,r)):[];
  const all=[data,baseline,...comparisons];
  chartMax=Math.max(100,Math.ceil(Math.max(...all.map(rows=>Math.max(...rows.map(row=>row[2]))))/25)*25);
  $('comparisonHelp').hidden=!$('routeCompare').checked;
  $('comparisonHelp').textContent='Solid green: your '+currentRoute.toUpperCase()+' settings. Dashed: original route settings. Every curve uses the same dose times and 100 units per dose.';
  const ticks=Array.from({length:5},(_,i)=>chartMax*i/4);
  const riskBand=$('showTarget').checked&&selectedMedicine==='slowclearance'?`<rect x="42" y="24" width="342" height="${Math.max(0,y(TARGET_RANGE.high)-24)}" fill="#fbe6e3"/><text x="48" y="42" font-size="9" fill="#8a3029">Above hypothetical upper limit</text>`:'';
  const band=$('showTarget').checked?`<rect x="42" y="${y(TARGET_RANGE.high)}" width="342" height="${y(TARGET_RANGE.low)-y(TARGET_RANGE.high)}" fill="#e0f0df"/><line x1="42" x2="384" y1="${y(TARGET_RANGE.low)}" y2="${y(TARGET_RANGE.low)}" stroke="#6b9e61" stroke-dasharray="4 4"/><line x1="42" x2="384" y1="${y(TARGET_RANGE.high)}" y2="${y(TARGET_RANGE.high)}" stroke="#6b9e61" stroke-dasharray="4 4"/><text x="48" y="${y(TARGET_RANGE.high)+12}" font-size="9" fill="#3e6b36">Hypothetical target</text>`:'';
  const markers=doseTimes().map((t,i)=>`<line x1="${x(t)}" x2="${x(t)}" y1="24" y2="178" stroke="#7a8ea2" stroke-dasharray="2 4"/><text x="${x(t)+4}" y="25" font-size="9" fill="#526b7d">D${i+1}</text>`).join('')+(dosePlan().skipped||[]).map(t=>`<line x1="${x(t)}" x2="${x(t)}" y1="30" y2="178" stroke="#b5745e" stroke-dasharray="5 5"/><text x="${x(t)+4}" y="25" font-size="9" fill="#99614e">Skipped</text>`).join('');
  $('chart').innerHTML=riskBand+band+ticks.map(v=>`<line x1="42" y1="${y(v)}" x2="384" y2="${y(v)}" stroke="#e2ebe6"/><text x="34" y="${y(v)+4}" text-anchor="end" font-size="10" fill="#658177">${v}</text>`).join('')+[0,6,12,18,24].map(t=>`<text x="${x(t)}" y="195" text-anchor="middle" font-size="10" fill="#658177">${t}</text>`).join('')+markers+comparisons.map((rows,i)=>`<path d="${curve(rows)}" fill="none" stroke="${['#087f78','#b27624','#7852ac'][i]}" stroke-width="2" stroke-dasharray="6 3"/>`).join('')+`<text x="42" y="14" font-size="10" fill="#658177">Amount in blood (teaching units)</text><text x="210" y="215" text-anchor="middle" font-size="10" fill="#658177">Hours since 08:00 · one day</text><path d="${curve(baseline)}" fill="none" stroke="#a6b6b0" stroke-dasharray="5 4" stroke-width="2"/><path d="${curve(data)}" fill="none" stroke="#087f78" stroke-width="3"/><line id="cursor" y1="30" y2="178" stroke="#d19232" stroke-dasharray="3 3"/><circle id="point" r="5" fill="#087f78"/>`;
}
// Recalculate the day summary only when settings change, not on every frame.
function updateAccumulationSummary(){
  if(selectedMedicine!=='slowclearance')return;
  const times=doseTimes();
  const peaks=times.map((start,i)=>Math.max(...data.slice(Math.round(start*100),i+1<times.length?Math.round(times[i+1]*100):data.length).map(row=>row[2])));
  const remaining=times.slice(1).map(t=>{const row=data[Math.max(0,Math.round(t*100)-1)];return (row[2]+row[3]).toFixed(1)});
  $('accumulationStats').textContent='24-hour preview · blood peak after each dose: '+peaks.map(v=>v.toFixed(1)).join(' / ')+' units. '+(remaining.length?'Parent drug in blood + tissue just before later doses: '+remaining.join(' / ')+' units.':'One dose only: no new dose is added to the remaining drug.');
}
function renderDosing(){
  const count=administeredUnits(time)/100,amount=data[Math.round(time*100)][2];
  $('doseStatus').textContent=clockAt(time)+' · '+count+' of '+doseTimes().length+' doses given · '+administeredUnits(time)+' units administered';
  $('dosePlanText').textContent=dosePlan().label+': '+doseTimes().map(t=>clockAt(t).split(' · ')[1]).join(' and ')+'. Each dose adds 100 teaching units.'+(dosePlan().skipped?' The 20:00 dose is skipped in this example.':'');
  $('accumulationLesson').hidden=selectedMedicine!=='slowclearance';
  $('targetStatus').hidden=!$('showTarget').checked;
  $('targetStatus').textContent=(amount<TARGET_RANGE.low?'Below':amount>TARGET_RANGE.high?'Above':'Within')+' the hypothetical target range (10–50 units)';
}
// Visual phase is independent of changing rates. Rewinding the timeline updates
// the amounts without animating the entry paths backwards.
const particleMotion={lastTime:0,phase:0};
function particlePosition(phase,particleIndex,pathIndex){
  return (phase+particleIndex/3+pathIndex*.11)%1;
}
const circles=[];
for(let i=0;
i<9;
i++){
  circles[i]=[];
  for(let j=0;
  j<3;
  j++){
    const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('r','3.5');
    c.setAttribute('class',i===5||i===6||i===7?'metaflow':'flow');
    $('particles').appendChild(c);
    circles[i].push(c)
  }
}
function processRates(s,t,p,route,par,lib){
  const [kr,ka,f]=par;
  const l=route==='oral'?scheduledReleaseRate(t,kr,lib):0;
  const a=route==='iv'?0:ka*s[1],fp=route==='oral'?a*f:0;
  const to=p.kt*s[2],back=p.kb*s[3],m=p.km*s[2],e=p.ke*s[2],em=.3*s[4];
  return {
    stages:[l,a,Math.abs(to-back),m+fp,e+em],exchange:to+back,netDistribution:to-back,paths:[l,a,route==='oral'?a*(1-f):0,to,back,m,fp,em,e]
  }
}
function currentRates(){
  return processRates(data[Math.min(2400,Math.round(time*100))],Math.round(time*100)/100,medicines[selectedMedicine],currentRoute,params(),liberationSettings())
}
function drawOverlap(){
  const samples=Array.from({
    length:121
  }
  ,(_,i)=>processRates(data[i*20],i*.2,medicines[selectedMedicine],currentRoute,params(),liberationSettings()).stages),maxima=stages.map((_,j)=>Math.max(...samples.map(v=>v[j])));
  $('overlapChart').innerHTML=stages.map((st,j)=>`<text x="0" y="${16+j*20}" font-size="11" fill="#40685f">${st[1]}</text>`+samples.slice(0,120).map((v,i)=>`<rect x="${100+i*(520/120)}" y="${5+j*20}" width="${520/120}" height="12" fill="${colors[j]}" opacity="${maxima[j]>0?.08+.92*v[j]/maxima[j]:.06}"/>`).join('')).join('')+[0,6,12,18,24].map(h=>`<text x="${100+h/24*520}" y="122" font-size="10" text-anchor="middle">${h} h</text>`).join('')+'<line id="overlapCursor" y1="2" y2="105" stroke="#163e3d" stroke-width="2"/>'
}
function renderStory(){
  const r=currentRates(),max=Math.max(...r.stages),threshold=.01,top=max>threshold?r.stages.indexOf(max):-1,live=r.stages.map((v,i)=>v>threshold?i:-1).filter(i=>i>=0);
  if($('followActivity').checked&&top>=0&&active!==top)selectStage(top);
  document.querySelectorAll('.stage').forEach((b,i)=>{
    const skipped=(i===0&&currentRoute!=='oral')||(i===1&&currentRoute==='iv');
    b.classList.toggle('dominant',i===top);
    b.classList.toggle('bypassed',skipped);
    b.querySelector('.activity-fill').style.width=(max>threshold?r.stages[i]/max*100:0)+'%';
    b.querySelector('.activity-label').textContent=skipped?'Bypassed':i===top?'Most active now':i===2&&r.exchange>threshold?'Exchange continues':r.stages[i]>threshold?'Also active':'Little / no activity';
    b.title=stages[i][1]+': '+r.stages[i].toFixed(2)+' units/h'+(i===2?' net; gross exchange '+r.exchange.toFixed(2)+' units/h':'');
  }
  );
  const stories=['Drug is being released from the formulation into digestive fluid.','Drug is moving from '+(currentRoute==='sc'?'the injection site':'the gut')+' into blood.','Net drug movement is '+(r.netDistribution>=0?'from blood into tissues.':'from tissues back into blood.'),'Drug is being chemically changed into metabolites. They can circulate and enter tissues before excretion.','Unchanged drug and metabolites are leaving in urine.'];
  const waiting=currentRoute==='oral'&&time<liberationSettings().lag;
  $('storyHeadline').textContent=top<0?(waiting?'Waiting for release to begin':'Very little transfer at this time'):stages[top][1]+' is most active now';
  $('storyText').textContent=(top<0?(waiting?'The formulation delay has not ended yet.':'Small amounts can remain even when transfer rates are very low.'):stories[top])+(live.length>1?' At the same time: '+live.filter(i=>i!==top).map(i=>stages[i][1].toLowerCase()).join(', ')+'.':'')+(r.exchange>threshold?' Blood–tissue exchange continues in both directions.':'')+(currentRoute==='iv'&&time<.01?' The IV bolus has already entered the blood.':'');
  document.querySelectorAll('.node').forEach((n,j)=>{
    n.classList.toggle('dominant',top>=0&&stages[top][4].includes(j));
    n.classList.toggle('running',!(top>=0&&stages[top][4].includes(j))&&(live.some(i=>i!==top&&stages[i][4].includes(j))||(r.exchange>threshold&&stages[2][4].includes(j))))
  }
  );
  if($('overlapCursor')){
    $('overlapCursor').setAttribute('x1',100+time/24*520);
    $('overlapCursor').setAttribute('x2',100+time/24*520)
  }
  particleMotion.phase=(particleMotion.phase+Math.max(0,time-particleMotion.lastTime)*.65)%1;
  particleMotion.lastTime=time;
  const peak=Math.max(...r.paths,threshold);
  circles.forEach((group,i)=>{
    const path=$('p'+i),rate=r.paths[i],strength=Math.sqrt(rate/peak);
    path.style.stroke=rate>threshold?([5,6,7].includes(i)?'#79528e':'#58a99b'):'#c6dcd5';
    path.style.strokeWidth=rate>threshold?2+3*strength:2;
    group.forEach((c,j)=>{
      const progress=particlePosition(particleMotion.phase,j,i);
      const pt=path.getPointAtLength(progress*path.getTotalLength());
      // Fade at both ends so a loop never looks like a visible return journey.
      const edgeFade=Math.min(1,progress/.08,(1-progress)/.08);
      c.setAttribute('cx',pt.x);
      c.setAttribute('cy',pt.y);
      c.style.opacity=$('showParticles').checked&&rate>threshold?edgeFade*(.35+.65*strength):0
    }
    )
  }
  );
}
function bioavailabilityState(){
  const s=data[Math.min(2400,Math.round(time*100))],fraction=currentRoute==='oral'?1-params()[2]:1;
  const total=administeredUnits(time),absorbed=currentRoute==='iv'?total:Math.max(0,total-s[0]-s[1]);
  return {
    eventualPercent:100*fraction,enteredUnits:absorbed*fraction
  }
  ;
}
function renderBioavailability(){
  const b=bioavailabilityState();
  $('bioTotal').textContent=b.eventualPercent.toFixed(0)+'%';
  $('bioEntered').textContent=b.enteredUnits.toFixed(1)+' units';
  $('bioFormula').textContent=currentRoute==='oral'?'F = 100% − '+$('firstpass').value+'% first-pass change = '+b.eventualPercent.toFixed(0)+'%':currentRoute==='iv'?'F = 100% · the IV bolus enters circulating blood directly.':'F = 100% · complete eventual uptake from the SC depot is assumed.';
  $('bioAssumption').textContent=currentRoute==='oral'?'This model assumes complete eventual uptake from the gut. Only the first-pass fraction reduces F; slower release or absorption changes timing. Real oral bioavailability also depends on incomplete absorption and drug changes in the gut wall.':currentRoute==='sc'?'Real SC bioavailability can be less than 100%. This simplified example assumes complete uptake and no loss before reaching circulating blood.':'IV bioavailability is 100% by definition. Distribution and elimination can reduce the amount remaining in blood after the bolus.';
}
function calculateAbsoluteBioavailability(aucOral,aucIv,doseOral,doseIv){
  if(![aucOral,aucIv,doseOral,doseIv].every(Number.isFinite)||aucOral<0||aucIv<=0||doseOral<=0||doseIv<=0)return null;
  const result=(aucOral/aucIv)*(doseIv/doseOral)*100;
  return Number.isFinite(result)?result:null;
}
function calculateAuc(){
  const raw=['aucOral','aucIv','doseOral','doseIv'].map(id=>$(id).value);
  const result=raw.some(v=>v.trim()==='')?null:calculateAbsoluteBioavailability(...raw.map(Number));
  if(result===null){
    $('aucResult').textContent='Enter finite values: oral AUC may be zero; IV AUC and both doses must be greater than zero.';
    $('aucNote').textContent='';
    return
  }
  const [oral,iv,oralDose,ivDose]=raw.map(Number);
  $('aucResult').textContent='F = ('+oral+' ÷ '+iv+') × ('+ivDose+' ÷ '+oralDose+') × 100 = '+Number(result.toPrecision(5))+'%';
  $('aucNote').textContent=result>100?'This apparent value exceeds 100%. Check the units, inputs and comparison assumptions; it should not be interpreted as a true fraction above 100%.':'With these example values, '+Number(result.toPrecision(5))+'% of the oral dose reaches circulating blood unchanged.';
}
function render(){
  renderBioavailability();
  for(const id of ['chart','overlapChart','libChart']){
    $(id).setAttribute('aria-valuenow',time.toFixed(2));
    $(id).setAttribute('aria-valuetext',time.toFixed(2)+' simulated hours')
  }
  ;
  renderRelease();
  renderDosing();
  let s=data[Math.min(2400,Math.round(time*100))];
  s.forEach((v,i)=>$('v'+i).textContent=v.toFixed(1)+' units');
  $('clock').textContent=time.toFixed(2)+' / 24 h';
  $('timeline').value=time;
  $('current').textContent=s[2].toFixed(1)+' units';
  $('cursor').setAttribute('x1',x(time));
  $('cursor').setAttribute('x2',x(time));
  $('point').setAttribute('cx',x(time));
  $('point').setAttribute('cy',y(s[2]));
  renderStory()
}
$('play').onclick=()=>{
  if(time>=24){
    time=0;
    render()
  }
  setPlaying(!playing)
}
;
$('reset').onclick=()=>{
  time=0;
  setPlaying(false);
  render()
}
;
$('timeline').oninput=()=>setSimulationTime(+$('timeline').value);
/* All graphs and the range control use the same 0.01-hour time grid. */
function normalizedTime(t){
  return Math.round(Math.max(0,Math.min(24,t))*100)/100
}
function setSimulationTime(t){
  time=normalizedTime(t);
  setPlaying(false);
  render()
}
function svgTimeFromEvent(svg,evt,x0,span){
  const pt=svg.createSVGPoint();
  pt.x=evt.clientX;
  pt.y=evt.clientY;
  const ctm=svg.getScreenCTM();
  if(!ctm)return time;
  const loc=pt.matrixTransform(ctm.inverse());
  return normalizedTime((loc.x-x0)/span*24)
}
function enableGraphScrub(svgId,x0,span){
  const svg=$(svgId);
  if(!svg)return;
  svg.setAttribute('tabindex','0');
  svg.setAttribute('role','slider');
  svg.setAttribute('aria-valuemin','0');
  svg.setAttribute('aria-valuemax','24');
  svg.setAttribute('aria-describedby','graphHelp');
  svg.style.touchAction='none';
  svg.style.cursor='ew-resize';
  let pointer=null;
  const scrub=e=>setSimulationTime(svgTimeFromEvent(svg,e,x0,span));
  svg.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    pointer=e.pointerId;
    svg.setPointerCapture(pointer);
    scrub(e);
    e.preventDefault()
  }
  );
  svg.addEventListener('pointermove',e=>{
    if(pointer===e.pointerId){
      scrub(e);
      e.preventDefault()
    }
  }
  );
  const end=e=>{
    if(pointer!==e.pointerId)return;
    pointer=null;
    if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);
    logDebug('graph-scrub',{
      graph:svgId,time
    }
    )
  }
  ;
  svg.addEventListener('pointerup',end);
  svg.addEventListener('pointercancel',end);
  svg.addEventListener('lostpointercapture',()=>{
    pointer=null
  }
  );
  svg.addEventListener('keydown',e=>{
    const step=e.shiftKey?1:.25;
    const values={
      ArrowLeft:time-step,ArrowDown:time-step,ArrowRight:time+step,ArrowUp:time+step,Home:0,End:24
    }
    ;
    if(e.key in values){
      e.preventDefault();
      setSimulationTime(values[e.key]);
      logDebug('graph-keyboard',{
        graph:svgId,time
      }
      )
    }
  }
  )
}
enableGraphScrub('chart',42,342);
enableGraphScrub('overlapChart',100,520);
enableGraphScrub('libChart',42,342);
['release','absorb','firstpass'].forEach(id=>$(id).oninput=rebuild);
$('defaults').onclick=()=>{
  clearScenario();
  loadMedicine()
}
;
/* old prediction handler removed */
/* ===== Question bank & guided scenarios (v2.8.0) ===== */
const questionBank=[
{id:'accumulation-risk',routes:['oral','sc','iv'],q:'Why can repeated doses raise toxicity risk when removal is slow?',answers:[{id:'left',label:'New doses add to drug still in the body'},{id:'reset',label:'Each dose clears the previous dose'}],correct:'left',ok:'Correct. Remaining drug plus each new dose can raise exposure and toxicity risk; the model’s upper limit is only a teaching boundary.',bad:'Try again. A new dose does not clear the previous dose, so slow removal allows drug to build up.'},

{id:'hydrophilic-distribution',routes:['oral','sc','iv'],q:'In the hydrophilic experiment, what changes when movement from blood into tissues is reduced?',answers:[{id:'less',label:'Less drug enters the tissue pool initially'},{id:'none',label:'No drug can ever reach any tissue'}],correct:'less',ok:'Correct. Reduced entry lowers early tissue uptake in this experiment; it does not prevent all tissue access.',bad:'Try again. Water-loving properties do not make every tissue inaccessible; the model still allows entry and return.'},

{id:'dose-overlap',routes:['oral','sc','iv'],q:'When an evening dose is given, what happens to drug already in the body?',answers:[{id:'adds',label:'It can overlap with the new dose'},{id:'reset',label:'The body resets to zero'}],correct:'adds',ok:'Correct. The new dose joins any drug still in the blood, tissues or other compartments. The body does not reset between doses.',bad:'Try again. Drug from an earlier dose can still be present when a later dose arrives.'},
{id:'target-example',routes:['oral','sc','iv'],q:'Does the green band prove that a real medicine is effective or safe?',answers:[{id:'no',label:'No — it is an invented teaching target'},{id:'yes',label:'Yes — it proves the medicine works'}],correct:'no',ok:'Correct. The band is a hypothetical amount range. Real therapeutic targets depend on the medicine, measured concentrations, patient and response.',bad:'Try again. These units and the target band are invented for this lesson.'},
 {
  id:'bioavailability',routes:['oral','sc','iv'],q:'If bioavailability is 60%, does that mean 60% of the dose is in blood at every moment?',answers:[{
    id:'no',label:'No — it is the fraction that reaches blood unchanged'
  }
  ,{
    id:'yes',label:'Yes — that amount stays in blood'
  }
  ],correct:'no',ok:'Correct. Bioavailability describes entry into circulating blood. Distribution, metabolism and excretion change how much is in blood at a particular time.',bad:'Try again. Reaching blood and remaining in blood are different. Follow the amounts as time passes.'
}
, {
  id:'firstpass',routes:['oral'],q:'If more drug is changed during the first pass, what happens to the peak amount of unchanged drug in blood?',  answers:[{
    id:'lower',label:'It decreases'
  }
  ,{
    id:'higher',label:'It increases'
  }
  ,{
    id:'same',label:'It stays the same'
  }
  ],  correct:'lower',  ok:'Correct. A larger first-pass fraction removes more drug before it reaches systemic blood, so the peak of unchanged drug falls.',  bad:'Try again. First-pass metabolism occurs before the drug reaches the systemic circulation.'
}
, {
  id:'erosion-cmax',routes:['oral'],q:'If you slow tablet dissolution / erosion, what usually happens to the peak amount in blood?',  answers:[{
    id:'lower',label:'It decreases'
  }
  ,{
    id:'higher',label:'It increases'
  }
  ,{
    id:'same',label:'It stays the same'
  }
  ],  correct:'lower',  ok:'Correct. Slower liberation spreads the dose over time, lowering and usually delaying the peak.',  bad:'Try again. Slower release typically reduces the peak amount and delays the peak.'
}
, {
  id:'terminal-hl',routes:['oral','sc','iv'],q:'Does changing release or absorption change the disposition half-life set by this model’s distribution and elimination rates?',  answers:[{
    id:'no',label:'No — disposition half-life stays the same'
  }
  ,{
    id:'yes',label:'Yes — disposition half-life changes'
  }
  ,{
    id:'maybe',label:'Only for IV'
  }
  ],  correct:'no',  ok:'Correct. Disposition half-life is set by distribution and elimination. Slow ongoing input can still change the final slope you observe in blood (flip-flop kinetics).',  bad:'Try again. In this model the terminal disposition half-life does not depend on ka or release rate under usual conditions.'
}
, {
  id:'iv-start',routes:['sc','iv','oral'],q:'Which route starts with all of the input already in systemic blood at time zero?',  answers:[{
    id:'iv',label:'IV bolus'
  }
  ,{
    id:'sc',label:'SC solution'
  }
  ,{
    id:'oral',label:'Oral'
  }
  ],  correct:'iv',  ok:'Correct. An IV bolus places 100% in systemic blood at t = 0. SC and oral must still absorb.',  bad:'Try again. Only the IV bolus starts fully in systemic blood.'
}
, {
  id:'overlap',routes:['oral','sc','iv'],q:'Can metabolism and excretion still be active while absorption is continuing?',  answers:[{
    id:'yes',label:'Yes — processes overlap'
  }
  ,{
    id:'no',label:'No — they wait until absorption finishes'
  }
  ],  correct:'yes',  ok:'Correct. LADME processes overlap in time. The activity bands show several processes running together.',  bad:'Try again. Look at the activity bands: several processes can be active at the same moment.'
}
, {
  id:'zero-order',routes:['oral'],q:'With zero-order release at 20% of the starting dose per hour and no delay, when is all the drug released?',  answers:[{
    id:'five',label:'After 5 hours'
  }
  ,{
    id:'two',label:'After 2 hours'
  }
  ,{
    id:'always',label:'It never finishes'
  }
  ],  correct:'five',  ok:'Correct. 100% ÷ 20% per hour = 5 hours. The blood curve also depends on absorption, distribution and elimination.',  bad:'Try again. Divide 100% of the starting dose by 20% per hour.'
}
, {
  id:'tissue',routes:['oral','sc','iv'],q:'Why does drug that has entered tissues later return to blood?',  answers:[{
    id:'reversible',label:'Blood–tissue exchange is reversible'
  }
  ,{
    id:'onlyout',label:'Tissues only take drug up, never release it'
  }
  ,{
    id:'urine',label:'Only the kidneys move drug back'
  }
  ],  correct:'reversible',  ok:'Correct. The model uses reversible first-order exchange (k12 and k21). Net movement in this model depends on the amounts in blood and tissue and their exchange rates.',  bad:'Try again. Distribution between blood and tissue is modelled as reversible.'
}
, {
  id:'sc-depot',routes:['sc'],q:'In the SC model, where is the drug at time zero?',  answers:[{
    id:'depot',label:'In the subcutaneous depot'
  }
  ,{
    id:'blood',label:'Already in systemic blood'
  }
  ,{
    id:'gut',label:'In the gut lumen'
  }
  ],  correct:'depot',  ok:'Correct. SC starts as a dissolved depot under the skin that absorbs into blood over time.',  bad:'Try again. SC begins in the injection-site depot, not in blood.'
}
];
const scenarios=[
{ id:'accumulation-single',title:'Accumulation comparison · one dose',goal:'Give one oral dose of the same slow-removal compound. Compare with three doses to see what repeated dosing adds.',route:'oral',profile:'slowclearance',dosePlan:'single',tip:'The grey line still represents standard removal with the same single dose. Switch to Three doses · slow removal for the accumulation experiment. Total administered amount changes from 100 to 300 units; this is not a dose-normalized comparison.' },

{ id:'accumulation',title:'Accumulation · slower removal',goal:'Give three oral doses, 8 hours apart. Watch later peaks rise as new drug joins what remains. Compare with standard removal (grey).',route:'oral',profile:'slowclearance',dosePlan:'three',tip:'The red area above 50 units marks the hypothetical upper limit. Higher exposure can increase toxicity risk, but crossing this invented boundary does not diagnose toxicity. This 24-hour view shows early accumulation, not steady state.' },
{ id:'accumulation-control',title:'Accumulation comparison · standard removal',goal:'Use the same three oral doses with standard removal. Compare remaining drug and later peaks with the slower-removal scenario.',route:'oral',dosePlan:'three',tip:'The doses and intervals are identical; removal is faster. Return to Accumulation · slower removal to compare.' },

{ id:'hydrophilic-nac',title:'Water-loving drug · NAC-inspired',goal:'Explore reduced movement into tissues after a hypothetical IV bolus. Compare the solid blood curve with standard distribution (grey).',route:'iv',profile:'hydrophilic',tip:'NAC means N-acetylcysteine. This is a conceptual water-loving compound, not an NAC dosing or concentration model. Solubility alone does not determine protein binding, absorption or removal. IV here isolates distribution; actual NAC injections are infused, not given as this model’s bolus.' },

{ id:'morning-evening',title:'Morning and evening doses',goal:'Give 100 units at 08:00 and 20:00. Compare the two peaks and watch what remains before the evening dose.',route:'oral',dosePlan:'twice',tip:'D1 and D2 mark dose times. A new dose adds to drug still in the body; the green band is an invented target for this lesson.' },
{ id:'missed-evening',title:'What if the evening dose is missed?',goal:'Skip the 20:00 dose and watch the blood amount compared with the hypothetical target.',route:'oral',dosePlan:'missed',tip:'Compare with Morning and evening doses. This is a learning experiment, not advice on handling missed medicines.' },
{ id:'three-doses',title:'Three doses across the day',goal:'Compare 08:00, 16:00 and 00:00 doses with the morning/evening schedule.',route:'oral',dosePlan:'three',tip:'The interval changes to 8 hours. Total administered amount also changes from 200 to 300 units, so both timing and daily amount influence this comparison.' },
 {
  id:'flip-flop',title:'Slow absorption · flip-flop kinetics',goal:'Set absorption to 0.05 h⁻¹, below disposition β ≈ 0.163 h⁻¹. Compare the long input tail with the route preset.',route:'oral',medicine:'generic',libModel:'first',release:3,absorb:.05,advanced:true,tip:'Open the half-life section: absorption half-time is 13.86 h while disposition half-life stays about 4.26 h. Input is still substantial at 24 h; the observed late decline is not a clean estimate of disposition β.'
}
, {
  id:'ir-vs-slow',title:'Fast vs slow release',  goal:'Compare fast and slow release from a tablet. Watch the peak amount, time to peak and release band.',  route:'oral',medicine:'generic',libModel:'first',release:6,lag:0,  tip:'Lower the Tablet release slider in Change the journey, then explore the graph.'
}
, {
  id:'firstpass',title:'Strong first-pass effect',  goal:'See how a large first-pass fraction reduces the peak of unchanged drug in blood.',  route:'oral',medicine:'generic',libModel:'first',release:5,firstpass:60,lag:0,  tip:'Raise or lower the first-pass slider and watch the blood curve.'
}
, {
  id:'iv-vs-oral',title:'IV bolus vs oral',  goal:'Same compound and elimination, different start. Use route comparison to overlay the curves.',  route:'iv',medicine:'generic',compare:true,  tip:'The three route curves are overlaid. Explore time to compare their beginnings.'
}
, {
  id:'zero-order',title:'Zero-order release',  goal:'Release 20% of the starting dose each hour, until the tablet is empty.',  route:'oral',medicine:'generic',libModel:'zero',zeroRate:20,lag:0,  tip:'The release controls are open below. Change the rate and watch the release graph.'
}
, {
  id:'lag',title:'Delayed release (lag)',  goal:'A lag before liberation begins. Absorption and the blood curve start later.',  route:'oral',medicine:'generic',libModel:'first',release:4,lag:3,  tip:'Scrub the activity bands — liberation stays quiet until the lag ends.'
}
];
let qIndex=0, currentQ=null, activeScenario=null;
function questionsForRoute(){
  return questionBank.filter(q=>(q.id!=='accumulation-risk'||(activeScenario&&activeScenario.id.startsWith('accumulation')))&&(q.id!=='hydrophilic-distribution'||selectedMedicine==='hydrophilic')&&(q.routes.includes(currentRoute)||q.routes.includes('any')));
}
function showQuestion(i){
  const list=questionsForRoute();
  if(!list.length)return;
  qIndex=((i%list.length)+list.length)%list.length;
  currentQ=list[qIndex];
  $('predictionQuestion').textContent=currentQ.q;
  $('predictionAnswers').innerHTML=currentQ.answers.map(a=>`<button type="button" data-answer="${a.id}">${a.label}</button>`).join('');
  $('feedback').textContent='Choose an answer.';
  $('qMeta').textContent=`Question ${qIndex+1} of ${list.length}`;
  $('qContext').textContent=activeScenario?('Linked to scenario: '+activeScenario.title):'Test a key idea, then explore the graph.';
}
function showQuestionForRoute(){
  showQuestion(0)
}
function nextQuestion(){
  showQuestion(qIndex+1)
}
$('predictionAnswers').onclick=e=>{
  const b=e.target.closest('[data-answer]');
  if(!b||!currentQ)return;
  const ok=b.dataset.answer===currentQ.correct;
  $('feedback').textContent=ok?currentQ.ok:currentQ.bad;
  [...$('predictionAnswers').querySelectorAll('button')].forEach(btn=>{
    btn.classList.remove('correct','wrong');
    if(btn.dataset.answer===currentQ.correct)btn.classList.add('correct');
    if(btn===b&&!ok)btn.classList.add('wrong');
  }
  );
  logDebug('prediction',{
    id:currentQ.id,answer:b.dataset.answer,correct:ok
  }
  );
}
;
$('nextQuestion').onclick=()=>nextQuestion();
function renderScenarioList(){
  $('scenarioList').innerHTML=scenarios.map(s=>`<button type="button" data-scenario="${s.id}" class="${s.advanced?'advanced-only ':''}${activeScenario&&activeScenario.id===s.id?'active':''}"><b>${s.title}</b>${s.goal}</button>`).join('');
}
function clearScenario(){
  activeScenario=null;
  $('scenarioGoal').classList.remove('show');
  $('scenarioGoal').textContent='';
  renderScenarioList();
  showQuestionForRoute()
}
function loadScenario(id){
  const scenario=scenarios.find(item=>item.id===id);
  if(!scenario)return;
  activeScenario=scenario;
  $('distributionProfile').value=scenario.profile||'generic';
  $('doseSchedule').value=scenario.dosePlan||'single';
  currentRoute=scenario.route;
  $('route').value=currentRoute;
  $('routeCompare').checked=!!scenario.compare;
  if(id.startsWith('accumulation'))$('showTarget').checked=true;
  active=currentRoute==='iv'?2:currentRoute==='sc'?1:0;
  $('followActivity').checked=true;
  loadMedicine();
  $('libModel').value=scenario.libModel||'first';
  $('release').value=scenario.release??medicines.generic.kr;
  $('libLag').value=scenario.lag??0;
  $('zeroRate').value=scenario.zeroRate??25;
  $('firstpass').value=scenario.firstpass??medicines.generic.f*100;
  if(scenario.absorb!==undefined)$('absorb').value=scenario.absorb;
  if(scenario.advanced||scenario.libModel==='zero'||scenario.lag>0){
    $('advancedMode').checked=true;
    applyLearnerMode();
    $('advanced').open=true
  }
  rebuild();
  $('scenarioGoal').classList.add('show');
  $('scenarioGoal').innerHTML=`<b>Your task:</b> ${scenario.goal}<br><span class="small">${scenario.tip||''}</span>`;
  renderScenarioList();
  const preferred={
    'accumulation-single':'accumulation-risk','accumulation':'accumulation-risk','accumulation-control':'accumulation-risk','hydrophilic-nac':'hydrophilic-distribution','morning-evening':'dose-overlap','missed-evening':'dose-overlap','three-doses':'dose-overlap','flip-flop':'terminal-hl','ir-vs-slow':'erosion-cmax','firstpass':'firstpass','iv-vs-oral':'iv-start','zero-order':'zero-order','lag':'overlap'
  }
  [id];
  showQuestion(Math.max(0,questionsForRoute().findIndex(q=>q.id===preferred)));
  logDebug('scenario',{
    id
  }
  );
}
$('accumulationSingle').onclick=()=>loadScenario('accumulation-single');
$('accumulationRepeated').onclick=()=>loadScenario('accumulation');
$('accumulationStandard').onclick=()=>loadScenario('accumulation-control');
$('scenarioList').onclick=e=>{
  const b=e.target.closest('[data-scenario]');
  if(b)loadScenario(b.dataset.scenario);
}
;
renderScenarioList();
function configureRoute(){
  const oral=currentRoute==='oral',iv=currentRoute==='iv';
  $('routeSummary').textContent=oral?'Oral: solid → dissolved drug in gut → portal blood and first-pass liver → systemic blood.':iv?'IV bolus: each scheduled dose enters systemic blood directly. Release and absorption are bypassed.':'SC: a dissolved depot under the skin gradually enters systemic blood. No gut/liver first pass.';
  $('diagramLabel').textContent=oral?'Oral pathway':iv?'IV bolus pathway':'Subcutaneous pathway';
  $('pathway').setAttribute('aria-label',$('routeSummary').textContent+' Distribution, metabolism and renal excretion follow.');
  for(const id of ['n0','n2','p0','p2','p6','portalLabel'])$(id).style.display=oral?'':'none';
  $('n1').style.display=iv?'none':'';
  $('p1').style.display=iv?'none':'';
  $('p1').setAttribute('d',oral?'M385 70H460':'M310 110V145');
  $('ivEntry').style.display=iv?'':'none';
  $('depotTitle').textContent=oral?'Dissolved in gut':'SC solution depot';
  $('depotSubtitle').textContent=oral?'ready for absorption':'under the skin';
  $('releaseControl').style.display=oral?'':'none';
  $('firstpassControl').style.display=oral?'':'none';
  $('absorbControl').style.display=iv?'none':'';
  $('absorbLabel').textContent=oral?'Absorption':'SC absorption';
  $('absorbHelp').textContent=oral?'How quickly dissolved drug enters portal blood.':'How quickly drug moves from the SC depot into systemic blood.';
  $('release').disabled=!oral;
  $('firstpass').disabled=!oral;
  $('absorb').disabled=iv;
  document.querySelector('[data-organ="1"]').style.display=oral?'':'none';
  $('compareLegend').textContent=$('routeCompare').checked?'Original presets · teal: oral · amber: SC · purple: IV':'';
  showQuestionForRoute();
}
function updateMedicineFacts(){
  const p=medicines[$('drug').value];
  $('drugClass').textContent=p.className;
  $('drugHeading').textContent=p.heading;
  $('drugSummary').textContent=p.summary;
  $('factPeak').textContent=p.peak;
  $('factHalf').textContent=p.half;
  $('drugSource').href=p.url
}
function loadMedicine(){
  selectedMedicine=['hydrophilic','slowclearance'].includes($('distributionProfile').value)?$('distributionProfile').value:'generic';
  const p=medicines[selectedMedicine];
  $('libModel').value='first';
  $('libLag').value=0;
  $('zeroRate').value=25;
  const preset=ROUTE_PRESETS[currentRoute];
  $('release').value=preset.release||p.kr;
  $('absorb').value=preset.absorption||p.ka;
  $('firstpass').value=preset.firstPass*100;
  configureRoute();
  selectStage(active);
  rebuild()
}
['libModel','zeroRate','libLag'].forEach(id=>$(id).addEventListener('input',rebuild));
$('resetLib').onclick=()=>{
  $('libModel').value='first';
  $('libLag').value=0;
  $('zeroRate').value=25;
  $('release').value=medicines[selectedMedicine].kr;
  rebuild()
}
;
$('calcK').oninput=calculateBasic;
function applyLearnerMode(){
  const on=$('advancedMode').checked;
  $('pdAdvanced').checked=on;
  document.body.classList.toggle('beginner',!on);
  $('levelTitle').textContent=on?'Advanced mode':'Beginner mode';
  $('levelHelp').textContent=on?'Explore AUC, release models, half-life equations, and model checks.':'Start with the journey, the pictures, and the main graph.';
  if(!on){
    $('advanced').open=false;
    $('debugPanel').open=false;
    $('aucCalculator').open=false;
  }
}
$('advancedMode').onchange=()=>{
  applyLearnerMode();
  logDebug('learner-mode',{
    mode:$('advancedMode').checked?'advanced':'beginner'
  }
  )
}
;
$('followActivity').onchange=renderStory;
$('showParticles').onchange=renderStory;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)$('showParticles').checked=false;
$('drug').onchange=updateMedicineFacts;
$('distributionProfile').onchange=()=>{
  selectedMedicine=['hydrophilic','slowclearance'].includes($('distributionProfile').value)?$('distributionProfile').value:'generic';
  clearScenario();rebuild();
  logDebug('distribution-profile',{profile:selectedMedicine});
};
$('doseSchedule').onchange=()=>{clearScenario();rebuild();logDebug('dose-plan',{plan:$('doseSchedule').value})};
$('showTarget').onchange=()=>{drawChart();render();logDebug('target-range',{visible:$('showTarget').checked})};
$('route').onchange=()=>{
  clearScenario();
  currentRoute=$('route').value;
  active=currentRoute==='iv'?2:currentRoute==='sc'?1:0;
  loadMedicine()
}
;
$('routeCompare').onchange=()=>{
  clearScenario();
  configureRoute();
  drawChart();
  render()
}
;
document.querySelectorAll('[data-organ]').forEach(b=>b.onclick=()=>{
  $('followActivity').checked=false;
  selectStage(+b.dataset.organ)
}
);
$('parameterTable').innerHTML=[medicines.generic].map(p=>`<tr><th>${p.name}</th><td>${p.kr}</td><td>${p.ka}</td><td>${p.f*100}%</td><td>${p.kt} / ${p.kb}</td><td>${p.km}</td><td>${p.ke}</td></tr>`).join('');
updateMedicineFacts();
loadMedicine();
let last=0;
function tick(ts){
  if(last&&playing){
    time=Math.min(24,time+Math.min((ts-last)/1000,.1)*.35*+$('speed').value);
    if(time>=24)setPlaying(false);
    render()
  }
  last=ts;
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick);
// Diagnostic instrumentation; does not alter the pharmacokinetic equations.
const APP_VERSION='3.1.5', BUILD_ID='20261110-count-only-mode', MODEL_VERSION='route-release-two-pool-profiles-v7';
const debugEvents=[];
function debugSnapshot(){
  const p=medicines[selectedMedicine],s=data[Math.min(2400,Math.round(time*100))];
  const total=s.reduce((a,b)=>a+b,0),k=p.km+p.ke,a=p.kt+k+p.kb;
  const lambda=terminalBeta(p);
  return {
    appVersion:APP_VERSION,buildId:BUILD_ID,modelVersion:MODEL_VERSION,learnerMode:$('advancedMode').checked?'advanced':'beginner',activityRates:currentRates().stages,distributionScoring:'absolute net transfer',grossDistributionExchange:currentRates().exchange,exposure:{
      windowHours:24,amountAuc:amountExposure(data).auc,ivAmountAuc:matchedIvExposure(),ratioToIv:amountExposure(data).auc/matchedIvExposure()
    }
    ,followActivity:$('followActivity').checked,particles:$('showParticles').checked,route:currentRoute,routeComparison:$('routeCompare').checked,bioavailability:bioavailabilityState(),liberation:currentRoute==='oral'?liberationSettings():{
      model:'not-applicable'
    }
    ,medicine:selectedMedicine,mode:$('modeLabel').textContent,simulationHours:time,playing,speed:Number($('speed').value),simulatedMinutesPerRealSecond:21*Number($('speed').value),parameters:{
      release:params()[0],absorption:params()[1],firstPassFraction:params()[2],toTissue:p.kt,fromTissue:p.kb,metabolism:p.km,unchangedRenal:p.ke,metaboliteExcretion:.3
    }
    ,amountsUnits:{
      unreleased:s[0],absorptionDepot:s[1],blood:s[2],tissue:s[3],metabolites:s[4],urine:s[5]
    }
    ,totalUnits:total,administeredUnits:administeredUnits(time),doseTimes:doseTimes(),dosePlan:$('doseSchedule').value,targetRange:TARGET_RANGE,massBalanceError:total-administeredUnits(time),massBalancePass:Math.abs(total-administeredUnits(time))<1e-7&&s.every(v=>Number.isFinite(v)&&v>=0),calculatedTerminalHalfLifeHours:Math.log(2)/lambda,publishedHalfLife:p.half,limitations:['Illustrative parameters; not clinically calibrated','Complete uptake assumed for oral and SC; renal-only final removal','IV uses discrete scheduled boluses, not an infusion','Target band is arbitrary teaching units, not clinical efficacy or toxicity thresholds']
  }
}
function refreshDebug(){
  const d=debugSnapshot();
  $('buildInfo').textContent=APP_VERSION+' / '+BUILD_ID;
  const rows={
    'Route':d.route,'Medicine':d.medicine,'Time (h)':d.simulationHours.toFixed(2),'Calculated terminal disposition half-life (h)':d.calculatedTerminalHalfLifeHours.toFixed(2),'Published reference half-life':d.publishedHalfLife,'Total drug-equivalent amount (units)':d.totalUnits.toFixed(8),'Administered amount (units)':d.administeredUnits,'Dose times (h)':d.doseTimes.join(', '),'Mass-balance error':d.massBalanceError.toExponential(2),'Arithmetic check':d.massBalancePass?'PASS':'FAIL','Parameters (rates in h⁻¹)':JSON.stringify(d.parameters),'Events retained':debugEvents.length
  }
  ;
  $('debugValues').replaceChildren(...Object.entries(rows).map(([key,value])=>{
    const tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');
    th.textContent=key;
    td.textContent=String(value);
    tr.append(th,td);
    return tr
  }
  ));
  $('eventHistory').textContent=debugEvents.slice(-30).map(e=>e.at+' | '+e.event+' | '+JSON.stringify(e.details)).join('\n')
}
function logDebug(event,details={
}
){
  debugEvents.push({
    at:new Date().toISOString(),event,details
  }
  );
  if(debugEvents.length>200)debugEvents.shift();
  if($('debugPanel').open)refreshDebug()
}
$('debugPanel').addEventListener('toggle',()=>{
  if($('debugPanel').open)refreshDebug()
}
);
document.addEventListener('click',e=>{
  const b=e.target.closest('button');
  if(b&&!['exportDebug','clearDebug'].includes(b.id))logDebug('button',{
    id:b.id||b.dataset.stage||b.dataset.organ,label:b.textContent.trim(),medicine:selectedMedicine,time
  }
  )
}
);
document.addEventListener('change',e=>{
  if(e.target.matches('input,select'))logDebug('setting',{
    id:e.target.id,value:e.target.type==='checkbox'?e.target.checked:e.target.value,medicine:selectedMedicine
  }
  )
}
);
window.addEventListener('error',e=>logDebug('runtime-error',{
  message:e.message,line:e.lineno
}
));
window.addEventListener('unhandledrejection',e=>logDebug('unhandled-rejection',{
  message:String(e.reason)
}
));
$('clearDebug').onclick=()=>{
  debugEvents.length=0;
  logDebug('history-cleared');
  refreshDebug();
  $('debugStatus').textContent='Event history cleared.'
}
;
$('exportDebug').onclick=()=>{
  logDebug('report-export');
  const report={
    generatedAt:new Date().toISOString(),...debugSnapshot(),events:debugEvents.slice()
  }
  ;
  const blob=new Blob([JSON.stringify(report,null,2)],{
    type:'application/json'
  }
  ),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;
  a.download='LADME-debug-v'+APP_VERSION+'.json';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('debugStatus').textContent='Debug report downloaded. It contains model settings and this session’s events.'
}
;
['aucOral','aucIv','doseOral','doseIv'].forEach(id=>$(id).addEventListener('input',calculateAuc));
$('aucExample').onclick=()=>{
  ['aucOral','aucIv','doseOral','doseIv'].forEach((id,i)=>$(id).value=[40,50,100,100][i]);
  calculateAuc()
}
;
calculateAuc();
setInterval(()=>{
  if($('debugPanel').open)refreshDebug()
}
,1000);
logDebug('app-loaded',{
  version:APP_VERSION,build:BUILD_ID
}
);
refreshDebug();


// ===== Independent learning interface: no changes to the PK engine above =====
const LEARNING_TABS = ['anatomy', 'journey', 'pharmacology', 'simulation'];
let learningTab = 'simulation';
let anatomySelection = 'mouth';
let journeySelection = 'oral';
let bridgeHighlightTimer;
const ANATOMY_LESSONS = {
  mouth: {name:'Mouth & oesophagus',where:'The mouth is in the head; the oesophagus is the tube down the neck and chest to the stomach.',job:'The mouth receives food and drink. The oesophagus moves swallowed material to the stomach.',medicine:'A swallowed tablet travels through the oesophagus toward the stomach.'},
  stomach: {name:'Stomach',where:'The stomach sits in the upper abdomen, mostly on the body’s left side.',job:'It stores and mixes swallowed material with digestive fluid.',medicine:'A swallowed formulation may begin releasing drug here before it moves onward.'},
  intestine: {name:'Small intestine',where:'The small intestine is a long, folded tube in the abdomen, between the stomach and large intestine.',job:'It continues digestion and absorbs many nutrients through its lining.',medicine:'Most absorption of many swallowed medicines happens through the small intestine.'},
  liver: {name:'Liver',where:'The liver is in the upper abdomen, mostly on the body’s right side.',job:'It processes substances carried in blood and makes bile to help digestion.',medicine:'Drug absorbed from the gut usually reaches the liver through portal blood before wider circulation.'},
  heart: {name:'Heart & blood vessels',where:'The heart is in the chest; blood vessels form a network throughout the body.',job:'Heart circulates blood. Blood vessels carry blood to and from tissues.',medicine:'Blood carries medicine around the body rather than delivering it directly to one chosen organ.'},
  urinary: {name:'Kidneys & bladder',where:'The two kidneys are toward the back of the upper abdomen; the bladder is lower down in the pelvis.',job:'Kidneys filter blood and form urine. Bladder stores urine.',medicine:'Some unchanged drugs and metabolites pass into urine before it is stored in the bladder.'},
  skin: {name:'Skin & subcutaneous tissue',where:'Skin covers the body; subcutaneous tissue lies just beneath it.',job:'Skin forms a protective barrier, and the tissue underneath contains fat, vessels and other structures.',medicine:'An SC injection places a medicine into tissue beneath the skin for uptake into circulation.'}
};
const JOURNEY_ENTRY = {
  oral:['Swallowed formulation','Travels through digestive tract','Main absorption in small intestine','Portal circulation → liver','Enters systemic circulation'],
  sc:['Injected into tissue under the skin','Taken up into circulation'],
  iv:['Injected directly into a vein']
};
function showLearningTab(name, focusTab=false) {
  if (!LEARNING_TABS.includes(name)) return;
  learningTab = name;
  document.body.dataset.activeTab = name;
  LEARNING_TABS.forEach(key => {
    const tab=$('tab-'+key), selected=key===name;
    tab.setAttribute('aria-selected',String(selected));
    tab.tabIndex=selected?0:-1;
    $('panel-'+key).hidden=!selected;
  });
  // Hiding the dock does not change playback or any simulation setting.
  document.querySelectorAll('.playback-dock').forEach(dock=>{dock.hidden=name!=='simulation'});
  if(focusTab) $('tab-'+name).focus();
}
function learningTabKey(event, name) {
  const index=LEARNING_TABS.indexOf(name);
  let next=index;
  if((event.key==='ArrowRight'||event.key==='ArrowDown')) next=(index+1)%LEARNING_TABS.length;
  else if((event.key==='ArrowLeft'||event.key==='ArrowUp')) next=(index+LEARNING_TABS.length-1)%LEARNING_TABS.length;
  else if(event.key==='Home') next=0;
  else if(event.key==='End') next=LEARNING_TABS.length-1;
  else return;
  event.preventDefault();
  showLearningTab(LEARNING_TABS[next],true);
}
function selectAnatomyRegion(key) {
  const lesson=ANATOMY_LESSONS[key];
  if(!lesson) return;
  anatomySelection=key;
  document.querySelectorAll('[data-anatomy]').forEach(control=>{
    const selected=control.dataset.anatomy===key;
    control.setAttribute('aria-pressed',String(selected));
    control.classList.toggle('anatomy-selected',selected);
  });
  Object.keys(ANATOMY_LESSONS).forEach(name=>$('shape-'+name).classList.toggle('anatomy-body-highlight',name===key));
  $('shape-bladder').classList.toggle('anatomy-body-highlight',key==='urinary');
  $('shape-vessels').classList.toggle('anatomy-body-highlight',key==='heart');
  $('anatomyCardTitle').textContent=lesson.name;
  $('anatomyWhere').textContent=lesson.where;
  $('anatomyFunction').textContent=lesson.job;
  $('anatomyMedicine').textContent=lesson.medicine;
  $('anatomyFeedback').textContent=lesson.name+' selected. '+lesson.job;
}
function updateJourneyRoute() {
  const route=$('journeyRoute').value;
  if(!JOURNEY_ENTRY[route]) return;
  journeySelection=route;
  ['oral','sc','iv'].forEach(key=>$('journey-figure-'+key).hidden=key!==route);
  $('journeyEntryHeading').textContent='Entry into blood · '+(route==='oral'?'oral':route.toUpperCase());
  $('journeySteps').replaceChildren(...JOURNEY_ENTRY[route].map(text=>{
    const li=document.createElement('li');li.textContent=text;return li;
  }));
}
function bridgeJourneyToSimulation() {
  // Deliberately avoid route.onchange/loadMedicine: those restore rate defaults.
  // Rebuild uses the existing slider values and has the existing t=0/pause effect.
  currentRoute=journeySelection;
  $('route').value=currentRoute;
  active=currentRoute==='iv'?2:currentRoute==='sc'?1:0;
  configureRoute();
  selectStage(active);
  rebuild();
  showLearningTab('simulation');
  const ids=currentRoute==='oral'?['n0','n1','n2','n3']:currentRoute==='sc'?['n1','n3']:['n3'];
  clearTimeout(bridgeHighlightTimer);
  ['n0','n1','n2','n3'].forEach(id=>$(id).classList.remove('bridge-highlight'));
  ids.forEach(id=>$(id).classList.add('bridge-highlight'));
  bridgeHighlightTimer=setTimeout(()=>ids.forEach(id=>$(id).classList.remove('bridge-highlight')),3000);
  $('learningAnnouncement').textContent=(currentRoute==='oral'?'Oral':currentRoute.toUpperCase())+' route selected. Simulation paused at 0 hours. Dose schedule, slider values and learning mode preserved.';
  $('simulationPanelHeading').focus();
}
function answerUrineQuestion(answer) {
  $('urineFeedback').textContent=answer==='bladder'?'Correct — The bladder stores urine until it leaves the body.':answer==='kidneys'?'Not yet — The kidneys form urine, while the bladder stores it.':'Not yet — The heart circulates blood, while the bladder stores urine.';
}
function checkOralOrder() {
  const choices=Array.from({length:5},(_,i)=>$('order-'+i).value);
  const correct=choices.every((choice,i)=>choice===String(i));
  $('orderFeedback').textContent=correct?'Correct — After swallowing, the route passes through the digestive tract, small-intestine absorption and portal blood to the liver before systemic circulation.':'Not yet — Use each step once: swallowed formulation, digestive tract, small-intestine absorption, portal blood to the liver, then systemic circulation.';
}
LEARNING_TABS.forEach(name=>{
  $('tab-'+name).addEventListener('click',()=>showLearningTab(name));
  $('tab-'+name).addEventListener('keydown',event=>learningTabKey(event,name));
});
document.querySelectorAll('[data-anatomy]').forEach(control=>{
  control.setAttribute('aria-controls','anatomyCard');
  control.addEventListener('click',()=>selectAnatomyRegion(control.dataset.anatomy));
  if(control.tagName.toLowerCase()==='g') control.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();selectAnatomyRegion(control.dataset.anatomy)}
  });
});
document.querySelectorAll('[data-urine-answer]').forEach(button=>button.addEventListener('click',()=>answerUrineQuestion(button.dataset.urineAnswer)));
$('journeyRoute').addEventListener('change',updateJourneyRoute);
$('exploreJourneyRoute').addEventListener('click',bridgeJourneyToSimulation);
$('checkOralOrder').addEventListener('click',checkOralOrder);
$('anatomy-body').addEventListener('click',event=>{const target=event.target.closest('[data-organ-tap]');if(target)selectAnatomyRegion(target.dataset.organTap)});
showLearningTab('simulation');
selectAnatomyRegion('mouth');
$('journeyRoute').value=journeySelection;
updateJourneyRoute();

// Independent equilibrium receptor lesson; no coupling to the PK integrator.
function receptorState(a,b,kd=50,epsilon=1){
  const denominator=1+a/kd+b/50;
  return {agonist:(a/kd)/denominator,antagonist:(b/50)/denominator,free:1/denominator,response:100*epsilon*(a/kd)/denominator};
}
function renderPharmacology(){
  const a=+$('pdAgonist').value,b=+$('pdAntagonist').value,kd=+$('pdKd').value,epsilon=$('pdType').value==='partial'?.4:1;
  const state=receptorState(a,b,kd,epsilon);
  $('pdLiveHeading').textContent=($('pdType').value==='partial'?'Partial agonist':'Full agonist')+(b>0?' + antagonist':'')+' · binding ≠ response';
  $('pdAgonistOut').textContent=a+' units';$('pdAntagonistOut').textContent=b+' units';$('pdKdOut').textContent=kd+' units';
  $('pdOccupancy').textContent='Agonist-bound: '+(state.agonist*100).toFixed(1)+'%; antagonist-bound: '+(state.antagonist*100).toFixed(1)+'%; free: '+(state.free*100).toFixed(1)+'%.';
  $('pdResponseFill').style.width=state.response+'%';
  $('pdCeilingMarker').hidden=epsilon===1;$('pdCeilingLabel').hidden=epsilon===1;
  $('pdResponse').textContent='Response: '+state.response.toFixed(1)+'% of the full system maximum.';
  const nA=Math.round(state.agonist*20),nB=Math.min(20-nA,Math.round(state.antagonist*20));
  $('pdReceptors').innerHTML=Array.from({length:20},(_,i)=>{const x=10+(i%10)*59,y=4+Math.floor(i/10)*42,type=i<nA?'A':i<nA+nB?'B':'○';return `<g><rect x="${x}" y="${y}" width="40" height="36" rx="${type==='B'?1:12}" fill="${type==='A'?'#e4f1ec':type==='B'?'#f6e4de':'#fff'}" stroke="#45344f" stroke-width="2"/><text x="${x+20}" y="${y+25}" text-anchor="middle" font-size="19" fill="#35233f">${type}</text></g>`}).join('');
  const x=v=>55+v/1000*520,y=v=>265-v*2.2;
  const curve=(ant,eff)=>Array.from({length:201},(_,i)=>{const v=i*5;return (i?'L':'M')+x(v).toFixed(2)+' '+y(receptorState(v,ant,kd,eff).response).toFixed(2)}).join(' ');
  $('pdChart').innerHTML=[0,25,50,75,100].map(v=>`<line x1="55" x2="575" y1="${y(v)}" y2="${y(v)}" stroke="#d7ddd9"/><text x="45" y="${y(v)+4}" text-anchor="end" font-size="13">${v}%</text>`).join('')+[0,500,1000].map(v=>`<text x="${x(v)}" y="285" text-anchor="${v===1000?'end':'middle'}" font-size="13">${v}</text>`).join('')+`<path d="${curve(0,1)}" stroke="#687873" stroke-width="3" stroke-dasharray="7 5" fill="none"/><path d="${curve(b,epsilon)}" stroke="#71408b" stroke-width="3" fill="none"/><circle cx="${x(a)}" cy="${y(state.response)}" r="6" fill="#71408b" stroke="white" stroke-width="2"/>`;
  if(epsilon<1)$('pdChart').innerHTML+=`<line x1="55" x2="575" y1="${y(40)}" y2="${y(40)}" stroke="#45344f" stroke-width="2" stroke-dasharray="2 5"/><text x="575" y="${y(40)-12}" text-anchor="end">40% ceiling</text>`;
  $('pdChart').setAttribute('aria-label','Concentration-response graph. '+$('pdResponse').textContent+(epsilon<1?' Partial agonist ceiling: 40%.':''));
  $('pdInterpretation').textContent=a===0?'With no agonist, this model has no activation, even when antagonist occupies receptors.':epsilon<1?'The partial agonist has a lower limiting response (40%) in this system.'+(b>0?' Competition also shifts its curve right.':''):b>0?'Competition shifts the curve right: more agonist is needed for the same response. The limiting maximum is still 100%, although the plotted concentrations may not reach it.':'As agonist concentration increases, the response approaches a maximum; doubling concentration does not always double response.';
  $('pdParameters').textContent='Current Kd = '+kd+'; Ki = 50; ε = '+epsilon+'; apparent EC50 = '+(kd*(1+b/50)).toFixed(1)+' units.';
}
function loadReceptorExample(type,a,b){$('pdType').value=type;$('pdAgonist').value=a;$('pdAntagonist').value=b;$('pdKd').value=50;renderPharmacology()}
['pdAgonist','pdAntagonist','pdKd','pdType'].forEach(id=>$(id).addEventListener('input',renderPharmacology));
$('pdFull').onclick=()=>loadReceptorExample('full',50,0);
$('pdPartial').onclick=()=>loadReceptorExample('partial',50,0);
$('pdBlocked').onclick=()=>loadReceptorExample('full',50,100);
$('pdAlone').onclick=()=>loadReceptorExample('full',0,50);
$('pdRescue').onclick=()=>{$('pdAgonist').value=1000;renderPharmacology()};
$('pdAnswerActive').onclick=()=>{$('pdFeedback').textContent='Not yet — Binding alone does not activate these receptors; the antagonist has no activating efficacy.'};
$('pdAnswerBlocked').onclick=()=>{$('pdFeedback').textContent='Correct — The antagonist binds without activating, so response is zero when no agonist is present in this model.'};
$('pdAdvanced').onchange=()=>{$('advancedMode').checked=$('pdAdvanced').checked;applyLearnerMode()};
$('pdToSimulation').onclick=()=>{showLearningTab('simulation');$('simulationPanelHeading').focus()};
$('pdType').value='full';renderPharmacology();

// Meaning-first lesson navigation and prediction feedback, separate from PK/PD maths.
let meaningStep=0;
const meaningRevealedSteps=new Set();
const meaningLastExample={};
const meaningSavedSettings={};
let meaningLabOwner=null;
function saveMeaningSettings(){if(meaningLabOwner!==null)meaningSavedSettings[meaningLabOwner]=['pdType','pdAgonist','pdAntagonist','pdKd'].map(id=>$(id).value);}
const meaningExperiments={
 full:{step:1,correct:'0',type:'full',a:50,b:0,name:'You saw activation. The name is full agonist.',why:'More agonist raises the response toward a limit because this system cannot respond without limit.'},
 partial:{step:1,correct:'1',type:'partial',a:50,b:0,name:'You saw a lower maximum. The name is partial agonist.',why:'The partial agonist has a lower maximum in this system even when its concentration is very high.'},
 alone:{step:2,correct:'1',type:'full',a:0,b:50,name:'It fits without activating. The name is antagonist.',why:'The antagonist occupies receptors but produces no activation when no agonist is present in this model.'},
 blocked:{step:3,correct:'0',type:'full',a:50,b:100,name:'Two molecules compete for a place: competitive antagonism.',why:'The antagonist reduces agonist binding, so the response falls at the same agonist concentration.'},
 rescue:{step:3,correct:'0',type:'full',a:1000,b:100,name:'More agonist can overcome reversible competition in this model.',why:'With the same antagonist concentration, more agonist competes successfully and raises the response again.'}
};
function showMeaningStep(index,focus=false){
 saveMeaningSettings();
 meaningStep=Math.max(0,Math.min(4,index));const all=$('meaningAll').checked;
 for(let i=0;i<5;i++)$('meaningStep'+i).hidden=!all&&i!==meaningStep;
 $('meaningBack').disabled=all||meaningStep===0;$('meaningNext').disabled=all||meaningStep===4;
 $('meaningProgress').textContent=all?'All five steps':'Step '+(meaningStep+1)+' of 5';
 if(!all){$('meaningHost'+meaningStep).appendChild($('meaningLab'));$('meaningLab').hidden=!meaningRevealedSteps.has(meaningStep);}else {if(meaningLabOwner!==null)$('meaningHost'+meaningLabOwner).appendChild($('meaningLab'));$('meaningLab').hidden=meaningLabOwner===null;}
 if(!all&&meaningLastExample[meaningStep]){const e=meaningExperiments[meaningLastExample[meaningStep]];$('meaningName').textContent=e.name;const saved=meaningSavedSettings[meaningStep];if(saved){['pdType','pdAgonist','pdAntagonist','pdKd'].forEach((id,i)=>$(id).value=saved[i]);renderPharmacology();}else loadReceptorExample(e.type,e.a,e.b);meaningLabOwner=meaningStep;}
 if(focus)$('meaningHeading'+meaningStep).focus();
}
function revealMeaning(key,skip=false){
 saveMeaningSettings();
 const e=meaningExperiments[key],choice=$('predict-'+key).value;
 if(!skip&&choice===''){$('feedback-'+key).textContent='Choose a prediction, or select Explore without answering.';return;}
 $('feedback-'+key).textContent=(skip?'Explore. ':choice===e.correct?'Your prediction fits. ':'Notice the difference. ')+e.why;
 meaningLabOwner=e.step;
 meaningRevealedSteps.add(e.step);meaningLastExample[e.step]=key;
 $('meaningName').textContent=e.name;$('meaningHost'+e.step).appendChild($('meaningLab'));$('meaningLab').hidden=false;
 loadReceptorExample(e.type,e.a,e.b);
 $('pdLive').focus();
}
Object.keys(meaningExperiments).forEach(key=>{
 $('reveal-'+key).onclick=()=>revealMeaning(key);$('skip-'+key).onclick=()=>revealMeaning(key,true);
 ['0','1'].forEach(value=>$('choice-'+key+'-'+value).addEventListener('change',()=>{$('predict-'+key).value=value;$('feedback-'+key).textContent='Prediction saved. Reveal the result when you are ready.'}));
 $('predict-'+key).addEventListener('change',()=>{$('feedback-'+key).textContent='Prediction saved. Reveal the result when you are ready.'});
});
$('meaningBack').onclick=()=>showMeaningStep(meaningStep-1,true);$('meaningNext').onclick=()=>showMeaningStep(meaningStep+1,true);
$('meaningAll').onchange=()=>showMeaningStep(meaningStep);
$('meaningCompare').onclick=()=>{$('meaningExplanation').textContent='Compare your reasoning — More drug is not always better because responses can reach a limit while unwanted effects may increase, and blood carries medicines to tissues rather than straight to one chosen organ.'};
$('meaningToJourney').onclick=()=>{showLearningTab('journey');$('panel-journey').focus()};
$('meaningPrint').onclick=()=>window.print();
showMeaningStep(0);

// Keep plotted labels at 14 CSS pixels as the chart changes width.
if(typeof ResizeObserver!=='undefined')new ResizeObserver(entries=>{for(const entry of entries)if(entry.contentRect.width>0)entry.target.style.setProperty('--pd-axis-font',(14*600/entry.contentRect.width)+'px')}).observe($('pdChart'));
if(typeof ResizeObserver!=='undefined'){
 const tabs=document.querySelector('.learning-tabs');
 if(tabs)new ResizeObserver(entries=>{for(const entry of entries)document.documentElement.style.setProperty('--learning-tabs-height',entry.target.getBoundingClientRect().height+'px')}).observe(tabs);
}

// Offline English–Thai presentation catalogue. Does not alter model values or equations.
const THAI_TEXT = Object.freeze({
  "LADME Route Explorer · v3.1.5": "สำรวจเส้นทางยา LADME · v3.1.5",
  "Explorer": "สำรวจเส้นทางยา",
  "PHARMACOLOGY · ORAL / SC / IV · v3.1.5": "เภสัชวิทยา · กิน / SC / IV · v3.1.5",
  "AN INTERACTIVE PHARMACOLOGY LESSON": "บทเรียนเภสัชวิทยาแบบโต้ตอบ",
  "How does a medicine travel through the body?": "ยาเดินทางผ่านร่างกายอย่างไร?",
  "What happens after you take a medicine? Watch it enter the blood, move into tissues, change in the liver, and leave the body. Explore each step at your own pace.": "หลังจากรับยาแล้วเกิดอะไรขึ้น? ดูยาเข้าสู่เลือด กระจายไปยังเนื้อเยื่อ เปลี่ยนแปลงที่ตับ และออกจากร่างกาย สำรวจแต่ละขั้นตามจังหวะของคุณ",
  "Anatomy": "กายวิภาค",
  "Drug journey": "เส้นทางยา",
  "Pharmacology": "เภสัชวิทยา",
  "Simulation": "แบบจำลอง",
  "Anatomy · meet the body": "กายวิภาค · รู้จักร่างกาย",
  "Choose a labelled region or use the organ buttons below. Learn its location, its everyday job, and its link to a medicine’s journey.": "แตะบริเวณที่มีป้ายชื่อ หรือเลือกปุ่มอวัยวะด้านล่าง เพื่อเรียนรู้ตำแหน่ง หน้าที่ และความเกี่ยวข้องกับเส้นทางยา",
  "This diagram shows where things are. The simulation uses a simplified invented compound.": "ภาพนี้แสดงตำแหน่งของส่วนต่าง ๆ แบบจำลองใช้สารสมมติและลดความซับซ้อนของร่างกาย",
  "Front view of a standing human figure with seven selectable regions": "ภาพร่างกายด้านหน้า มีเจ็ดบริเวณให้เลือก",
  "Simplified front view, not to scale. Left and right on this picture are the viewer’s left and right, so the liver appears on the picture’s left. A matching button list follows the diagram.": "ภาพด้านหน้าแบบย่อ ไม่ได้วาดตามสัดส่วนจริง ซ้ายและขวาหมายถึงด้านของผู้ดู ดังนั้นตับจึงอยู่ด้านซ้ายของภาพ มีรายการปุ่มให้เลือกแทนภาพด้านล่าง",
  "Mouth &": "ปากและ",
  "oesophagus": "หลอดอาหาร",
  "Skin &": "ผิวหนังและ",
  "tissue under": "เนื้อเยื่อ",
  "the skin": "ใต้ผิวหนัง",
  "Liver": "ตับ",
  "Small": "ลำไส้",
  "intestine": "เล็ก",
  "Heart &": "หัวใจและ",
  "blood": "หลอด",
  "vessels": "เลือด",
  "Stomach": "กระเพาะ",
  "Kidneys": "ไต",
  "& bladder": "และกระเพาะปัสสาวะ",
  "Front view · simplified and not to scale. The outline of the body is skin; the hatched patch marks the tissue layer just beneath it. Tap an organ, its label, or a button below. All three open the same card.": "ภาพด้านหน้าแบบย่อ ไม่ได้วาดตามสัดส่วนจริง ขอบร่างกายคือผิวหนัง บริเวณลายขีดคือชั้นเนื้อเยื่อใต้ผิวหนัง แตะอวัยวะ ป้ายชื่อ หรือปุ่มด้านล่างเพื่อเปิดคำอธิบายเดียวกัน",
  "Mouth & oesophagus": "ปากและหลอดอาหาร",
  "Small intestine": "ลำไส้เล็ก",
  "Skin & subcutaneous tissue": "ผิวหนังและเนื้อเยื่อใต้ผิวหนัง",
  "Heart & blood vessels": "หัวใจและหลอดเลือด",
  "Kidneys & bladder": "ไตและกระเพาะปัสสาวะ",
  "Where is it?": "อยู่ที่ไหน?",
  "What does it do?": "ทำหน้าที่อะไร?",
  "Medicine link": "เกี่ยวข้องกับยาอย่างไร?",
  "Quick check · which organ stores urine?": "ลองตอบ · อวัยวะใดเก็บปัสสาวะ?",
  "Bladder": "กระเพาะปัสสาวะ",
  "Heart": "หัวใจ",
  "Choose an answer to see an explanation.": "เลือกคำตอบเพื่อดูคำอธิบาย",
  "Illustration source and licence": "ที่มาและสิทธิ์การใช้ภาพ",
  "“Front-view body and organ regions”: original schematic SVG drawn for this app, source": "“ร่างกายด้านหน้าและบริเวณอวัยวะ”: ภาพ SVG แบบย่อที่วาดขึ้นสำหรับแอปนี้ แหล่งต้นฉบับ",
  "(output pasted into": "(นำผลลัพธ์ไปใส่ใน",
  "). Licence: CC0 1.0 public-domain dedication. Original asset; not adapted from an external figure. Labels and leader lines are part of the same asset. No external files, fonts or network requests are required.": ") สิทธิ์: CC0 1.0 อุทิศให้เป็นสาธารณสมบัติ เป็นภาพต้นฉบับ ไม่ได้ดัดแปลงจากภาพภายนอก ป้ายชื่อและเส้นชี้เป็นส่วนหนึ่งของภาพ ไม่ต้องใช้ไฟล์ ฟอนต์ หรือเครือข่ายภายนอก",
  "Drug journey · connect the organs": "เส้นทางยา · เชื่อมโยงอวัยวะ",
  "First follow entry into the blood. Then explore processes that can happen together.": "เริ่มจากการเข้าสู่เลือด แล้วสำรวจกระบวนการที่เกิดขึ้นพร้อมกันได้",
  "Choose an entry route": "เลือกทางเข้าสู่ร่างกาย",
  "Oral · swallowed": "กิน · กลืนยา",
  "SC · under the skin": "SC · ใต้ผิวหนัง",
  "IV · into a vein": "IV · เข้าหลอดเลือดดำ",
  "Entry into blood · oral": "เข้าสู่เลือด · ยากิน",
  "ORAL entry route: Swallowed formulation, then Digestive tract, then Small intestine, then Portal blood → liver, then Systemic circulation. Arrows show entry, not the order of later processes.": "เส้นทางยากิน: กลืนรูปแบบยา ผ่านทางเดินอาหาร ลำไส้เล็ก เลือดพอร์ทัลไปตับ และระบบไหลเวียนทั่วร่างกาย ลูกศรแสดงทางเข้า ไม่ใช่ลำดับของกระบวนการภายหลัง",
  "Swallowed formulation": "กลืนรูปแบบยา",
  "Tablet or capsule": "ยาเม็ดหรือแคปซูล",
  "Digestive tract": "ทางเดินอาหาร",
  "Mouth, oesophagus, stomach": "ปาก หลอดอาหาร กระเพาะอาหาร",
  "Drug crosses into blood": "ยาผ่านเข้าสู่เลือด",
  "Portal blood → liver": "เลือดพอร์ทัล → ตับ",
  "Before wider circulation": "ก่อนเข้าสู่การไหลเวียนทั่วร่างกาย",
  "Systemic circulation": "การไหลเวียนทั่วร่างกาย",
  "Blood carries drug to tissues": "เลือดพายาไปยังเนื้อเยื่อ",
  "SC entry route: Under the skin, then Systemic circulation. Arrows show entry, not the order of later processes.": "เส้นทาง SC: ใต้ผิวหนัง แล้วเข้าสู่การไหลเวียนทั่วร่างกาย ลูกศรแสดงทางเข้า ไม่ใช่ลำดับของกระบวนการภายหลัง",
  "Under the skin": "ใต้ผิวหนัง",
  "Injection into tissue": "ฉีดเข้าสู่เนื้อเยื่อ",
  "Drug is taken up into blood": "ยาถูกดูดซึมเข้าสู่เลือด",
  "IV entry route: A vein, then Systemic circulation. Arrows show entry, not the order of later processes.": "เส้นทาง IV: หลอดเลือดดำ แล้วเข้าสู่การไหลเวียนทั่วร่างกาย ลูกศรแสดงทางเข้า ไม่ใช่ลำดับของกระบวนการภายหลัง",
  "A vein": "หลอดเลือดดำ",
  "Injection directly into blood": "ฉีดเข้าสู่เลือดโดยตรง",
  "No absorption step needed": "ไม่ต้องมีขั้นตอนการดูดซึม",
  "Entry map · arrows end at circulation. Distribution, metabolism and excretion can overlap afterwards.": "แผนภาพทางเข้า · ลูกศรสิ้นสุดที่การไหลเวียนเลือด หลังจากนั้นการกระจาย การเปลี่ยนแปลงยา และการขับออกเกิดซ้อนกันได้",
  "Liberation means the drug is released from its formulation; it is not the job of an organ.": "การปลดปล่อยยา (Liberation) คือการที่ยาออกจากรูปแบบยา ไม่ใช่หน้าที่ของอวัยวะใดอวัยวะหนึ่ง",
  "After entry: three processes can overlap": "หลังเข้าสู่เลือด: สามกระบวนการเกิดซ้อนกันได้",
  "Distribution": "กระจาย",
  "Medicines are carried by the blood to tissues. They do not travel directly to a target organ.": "เลือดพายาไปยังเนื้อเยื่อ ยาไม่ได้เดินทางตรงไปยังอวัยวะเป้าหมาย",
  "Some drug can also return from tissues to blood.": "ยาบางส่วนกลับจากเนื้อเยื่อเข้าสู่เลือดได้ด้วย",
  "Metabolism": "เปลี่ยนรูป",
  "The liver is a major site of metabolism, not the only one.": "ตับเป็นแหล่งสำคัญของการเปลี่ยนแปลงยา แต่ไม่ใช่แหล่งเดียว",
  "Metabolism chemically changes a drug into metabolites. These can circulate in blood, enter tissues, and later be excreted; some remain active.": "การเปลี่ยนแปลงยาเปลี่ยนโครงสร้างทางเคมีให้เป็นสารที่เรียกว่าเมแทบอไลต์ สารเหล่านี้หมุนเวียนในเลือด เข้าเนื้อเยื่อ และถูกขับออกภายหลังได้ บางชนิดยังออกฤทธิ์ได้",
  "Excretion": "ขับออก",
  "Kidneys filter blood and form urine. Bladder stores urine.": "ไตกรองเลือดและสร้างปัสสาวะ กระเพาะปัสสาวะเก็บปัสสาวะ",
  "Some drugs and metabolites leave in urine; other routes of removal also exist.": "ยาและเมแทบอไลต์บางชนิดออกทางปัสสาวะ และยังมีทางขับออกอื่น ๆ",
  "These boxes are parallel: there is no required “distribution, then metabolism, then excretion” order.": "กล่องเหล่านี้แสดงกระบวนการคู่ขนาน ไม่จำเป็นต้องกระจายยา แล้วเปลี่ยนแปลงยา แล้วจึงขับออกตามลำดับ",
  "Explore this route in the simulator": "สำรวจเส้นทางนี้ในแบบจำลอง",
  "Uses the selected route, keeps your dose schedule and slider settings, and starts paused at 0 h.": "ใช้เส้นทางที่เลือก คงตารางให้ยาและค่าตัวเลื่อน แล้วเริ่มในสถานะหยุดที่ 0 ชั่วโมง",
  "Put the oral entry steps in order": "เรียงขั้นตอนทางเข้าของยากิน",
  "Choose one step for each numbered position, using each step once. The selects work with a keyboard.": "เลือกหนึ่งขั้นตอนสำหรับแต่ละตำแหน่ง ใช้แต่ละขั้นเพียงครั้งเดียว เลือกด้วยแป้นพิมพ์ได้",
  "Position 1": "ตำแหน่งที่ 1",
  "Choose a step": "เลือกขั้นตอน",
  "Travels through digestive tract": "ผ่านทางเดินอาหาร",
  "Main absorption in small intestine": "ดูดซึมหลักที่ลำไส้เล็ก",
  "Portal circulation → liver": "การไหลเวียนพอร์ทัล → ตับ",
  "Enters systemic circulation": "เข้าสู่การไหลเวียนทั่วร่างกาย",
  "Position 2": "ตำแหน่งที่ 2",
  "Position 3": "ตำแหน่งที่ 3",
  "Position 4": "ตำแหน่งที่ 4",
  "Position 5": "ตำแหน่งที่ 5",
  "Check my order": "ตรวจลำดับของฉัน",
  "Choose all five positions, then check your order.": "เลือกให้ครบทั้งห้าตำแหน่ง แล้วตรวจลำดับ",
  "Route illustration sources and licences": "ที่มาและสิทธิ์การใช้ภาพเส้นทาง",
  "Oral, SC and IV entry maps: original inline SVGs drawn for this app in": "แผนภาพทางเข้ายากิน SC และ IV: ภาพ SVG ต้นฉบับที่วาดขึ้นสำหรับแอปนี้ใน",
  ", IDs": "รหัสภาพ",
  "and": "และ",
  ". Each is dedicated to CC0 1.0; no external source was modified. Schematic teaching maps, not anatomical plates.": "ภาพแต่ละภาพใช้สิทธิ์ CC0 1.0 ไม่ได้ดัดแปลงจากแหล่งภายนอก เป็นแผนภาพเพื่อการเรียนรู้ ไม่ใช่ภาพกายวิภาคโดยละเอียด",
  "Can fitting and acting be different?": "จับได้กับออกฤทธิ์ได้ ต่างกันหรือไม่?",
  "Start with the meaning. Predict, explore, then learn the name.": "เริ่มจากความหมาย คาดการณ์ ทดลอง แล้วจึงรู้จักชื่อ",
  "Back": "ย้อนกลับ",
  "Next": "ถัดไป",
  "Show all": "แสดงทั้งหมด",
  "1 · Can two molecules fit the same place but do different things?": "1 · โมเลกุลสองชนิดจับตำแหน่งเดียวกัน แต่ทำให้เกิดผลต่างกันได้หรือไม่?",
  "Imagine a key that fits a lock. Fitting is only the first part: can it turn and change what happens?": "ลองนึกถึงกุญแจที่เข้ากับแม่กุญแจ การใส่เข้าได้เป็นเพียงจุดเริ่มต้น มันหมุนและทำให้เกิดการเปลี่ยนแปลงได้หรือไม่?",
  "A cell has proteins that receive signals. These are called": "เซลล์มีโปรตีนที่รับสัญญาณ เรียกว่า",
  "receptors": "ตัวรับ (receptor)",
  ". A drug may fit one of these proteins, but fitting alone does not tell us what it will do.": "ยาอาจจับโปรตีนเหล่านี้ได้ แต่การจับได้เพียงอย่างเดียวไม่ได้บอกว่าจะเกิดผลอะไร",
  "Think of three keys: one turns fully, one turns only part-way, and one fits but cannot turn. We will explore each before naming it.": "นึกถึงกุญแจสามแบบ: หมุนได้เต็มที่ หมุนได้เพียงบางส่วน และใส่ได้แต่หมุนไม่ได้ เราจะทดลองก่อนเรียนรู้ชื่อของแต่ละแบบ",
  "Analogy limit:": "ข้อจำกัดของการเปรียบเทียบ:",
  "real receptors are not rigid locks; they change shape, and cells can change how they respond. Not every drug acts through a receptor.": "ตัวรับจริงไม่ใช่แม่กุญแจแข็ง ๆ ตัวรับเปลี่ยนรูปร่างได้ และเซลล์ปรับการตอบสนองได้ ยาทุกชนิดไม่ได้ออกฤทธิ์ผ่านตัวรับ",
  "2 · Fit, then switch on": "2 · จับแล้วกระตุ้น",
  "First try a key that turns fully. More turning keys can produce a bigger response, until the system approaches its limit. Then compare a key that turns only part-way.": "เริ่มจากกุญแจที่หมุนได้เต็มที่ เมื่อมีกุญแจที่หมุนได้มากขึ้น การตอบสนองอาจเพิ่มจนเข้าใกล้ขีดจำกัดของระบบ แล้วเปรียบเทียบกับกุญแจที่หมุนได้บางส่วน",
  "“Response” means the change we measure in the cell or body. “Concentration” means how much of a substance is present in a given volume. Here, all numbers are invented teaching units.": "“การตอบสนอง” คือการเปลี่ยนแปลงที่เราวัดในเซลล์หรือร่างกาย “ความเข้มข้น” คือปริมาณสารในปริมาตรหนึ่ง ตัวเลขทั้งหมดที่นี่เป็นหน่วยสมมติเพื่อการเรียนรู้",
  "Predict before you explore": "คาดการณ์ก่อนทดลอง",
  "What do you expect when more turning keys are present?": "ถ้ามีกุญแจที่หมุนได้มากขึ้น คิดว่าจะเกิดอะไรขึ้น?",
  "The response increases toward a limit": "การตอบสนองเพิ่มขึ้นจนเข้าใกล้ขีดจำกัด",
  "The response grows without any limit": "การตอบสนองเพิ่มขึ้นอย่างไม่มีขีดจำกัด",
  "Reveal and explore": "ดูผลและทดลอง",
  "Explore without answering": "ทดลองโดยไม่ตอบ",
  "Your prediction is saved when you move between steps.": "คำคาดการณ์ของคุณจะคงอยู่เมื่อเปลี่ยนขั้นตอน",
  "Can more partly turning keys reach the same maximum as fully turning keys?": "เพิ่มกุญแจที่หมุนได้บางส่วนแล้ว จะได้ผลสูงสุดเท่ากุญแจที่หมุนได้เต็มที่หรือไม่?",
  "Yes, enough will always do it": "ได้ ถ้าเพิ่มมากพอก็จะได้เสมอ",
  "No, their maximum remains lower": "ไม่ได้ ผลสูงสุดยังคงต่ำกว่า",
  "3 · Fit without switching on": "3 · จับได้แต่ไม่กระตุ้น",
  "Now remove the turning keys. Put in keys that fit but cannot turn. They occupy places, yet do not activate the response in this model.": "นำกุญแจที่หมุนได้ออก แล้วใส่กุญแจที่เข้ากันแต่หมุนไม่ได้ กุญแจเหล่านี้ครองตำแหน่งไว้ แต่ไม่กระตุ้นการตอบสนองในแบบจำลองนี้",
  "Look at both the occupied spaces and the response number. They answer different questions: “What is attached?” and “What is happening?”": "ดูทั้งตำแหน่งที่ถูกจับและค่าการตอบสนอง ทั้งสองอย่างตอบคนละคำถาม: “อะไรจับอยู่?” และ “เกิดผลอะไร?”",
  "A key fits but cannot turn; what happens without any turning keys?": "กุญแจใส่ได้แต่หมุนไม่ได้ ถ้าไม่มีกุญแจที่หมุนได้จะเกิดอะไรขึ้น?",
  "Binding alone switches the response on": "แค่จับก็ทำให้เกิดการตอบสนอง",
  "There is no activation in this model": "ไม่มีการกระตุ้นในแบบจำลองนี้",
  "4 · Compete for the same place": "4 · แข่งขันกันจับตำแหน่งเดียวกัน",
  "Put turning and non-turning keys together. Both can fit the same place, but only one can occupy it at a time.": "ใส่กุญแจที่หมุนได้และหมุนไม่ได้พร้อมกัน ทั้งคู่เข้าตำแหน่งเดียวกันได้ แต่หนึ่งตำแหน่งรับได้ครั้งละหนึ่งดอก",
  "These keys can come off again. First predict what the blocking keys will do. Then keep their number fixed and add more turning keys. This is an experiment with invented units, not advice to take more medicine.": "กุญแจเหล่านี้หลุดออกได้ เริ่มจากคาดการณ์ผลของกุญแจที่ขวางไว้ แล้วคงจำนวนไว้และเพิ่มกุญแจที่หมุนได้ นี่คือการทดลองด้วยหน่วยสมมติ ไม่ใช่คำแนะนำให้เพิ่มยา",
  "What happens when non-turning keys compete with turning keys?": "เมื่อกุญแจที่หมุนไม่ได้แข่งขันกับกุญแจที่หมุนได้ จะเกิดอะไรขึ้น?",
  "The response falls at the same turning-key concentration": "การตอบสนองลดลง แม้ความเข้มข้นของกุญแจที่หมุนได้เท่าเดิม",
  "The response must increase": "การตอบสนองต้องเพิ่มขึ้น",
  "Keep the blocking keys present and add more turning keys; what happens?": "คงกุญแจที่ขวางไว้ แล้วเพิ่มกุญแจที่หมุนได้ จะเกิดอะไรขึ้น?",
  "The response can rise again": "การตอบสนองเพิ่มขึ้นได้อีก",
  "The response must stay at zero": "การตอบสนองต้องคงที่ศูนย์",
  "Now name what you observed: potency and efficacy": "รู้จักชื่อของสิ่งที่สังเกต: potency และ efficacy",
  "Potency": "ความแรง (potency)",
  "describes how much concentration is needed for a specified response. Competition means more is needed here.": "บอกว่าต้องใช้ความเข้มข้นเท่าใดเพื่อให้ได้ผลระดับหนึ่ง การแข่งขันในตัวอย่างนี้ทำให้ต้องใช้ความเข้มข้นมากขึ้น",
  "Efficacy": "ความสามารถในการให้ผล (efficacy)",
  "describes the ability to produce a response; in this comparison, the partial agonist has a lower maximum. Greater potency does not mean a greater maximum or greater safety.": "บอกความสามารถในการทำให้เกิดการตอบสนอง ในการเปรียบเทียบนี้ partial agonist ให้ผลสูงสุดต่ำกว่า ความแรงมากกว่าไม่ได้แปลว่าให้ผลสูงสุดมากกว่าหรือปลอดภัยกว่า",
  "5 · Connect the meaning to medicines": "5 · เชื่อมความหมายกับยาจริง",
  "Salbutamol activates receptors on airway smooth muscle and helps it relax: an example of agonist action. A model, not a prescribing guide.": "ซาลบูทามอลกระตุ้นตัวรับบนกล้ามเนื้อเรียบของทางเดินหายใจและช่วยให้คลายตัว เป็นตัวอย่างการออกฤทธิ์แบบ agonist นี่เป็นแบบจำลอง ไม่ใช่แนวทางสั่งยา",
  "Antihistamines block histamine’s effects at histamine receptors. A model, not a prescribing guide; their detailed action is explained in Teacher notes.": "ยาต้านฮิสตามีนยับยั้งผลของฮิสตามีนที่ตัวรับฮิสตามีน นี่เป็นแบบจำลอง ไม่ใช่แนวทางสั่งยา รายละเอียดกลไกอยู่ในบันทึกสำหรับครู",
  "Caffeine blocks adenosine receptors, reducing adenosine’s action there. A model, not a prescribing guide.": "คาเฟอีนยับยั้งตัวรับอะดีโนซีน จึงลดผลของอะดีโนซีนที่ตัวรับนั้น นี่เป็นแบบจำลอง ไม่ใช่แนวทางสั่งยา",
  "Connect the two big ideas: drug journey and drug effect": "เชื่อมสองแนวคิด: เส้นทางยาและผลของยา",
  "Pharmacokinetics": "เภสัชจลนศาสตร์ (pharmacokinetics)",
  "means what the body does to a drug: how it enters, moves, changes and leaves.": "คือสิ่งที่ร่างกายทำต่อยา ได้แก่ การเข้าสู่ร่างกาย การเคลื่อนย้าย การเปลี่ยนแปลง และการออกจากร่างกาย",
  "Pharmacodynamics": "เภสัชพลศาสตร์ (pharmacodynamics)",
  "means what a drug does to the body: how it changes a response. Blood carries medicines to tissues; medicines do not travel directly to a chosen organ.": "คือสิ่งที่ยาทำต่อร่างกาย หรือการเปลี่ยนการตอบสนอง เลือดพายาไปยังเนื้อเยื่อ ยาไม่ได้เดินทางตรงสู่อวัยวะที่เลือกไว้",
  "Explain in your own words": "อธิบายด้วยคำของคุณเอง",
  "Is more drug always better? Does a drug go straight to its target? Explain why.": "ยามากขึ้นดีกว่าเสมอหรือไม่? ยาเดินทางตรงไปยังเป้าหมายหรือไม่? เพราะอะไร?",
  "Compare with an explanation": "เทียบกับคำอธิบาย",
  "Back to the drug journey": "กลับไปดูเส้นทางยา",
  "See drug amount over time": "ดูปริมาณยาตามเวลา",
  "The icons show who is attached; the response shows what happens. Concentrations and responses are invented. This experiment is independent of the Simulation tab.": "สัญลักษณ์บอกว่าอะไรจับอยู่ การตอบสนองบอกว่าเกิดผลอะไร ความเข้มข้นและผลเป็นค่าที่สมมติขึ้น การทดลองนี้เป็นอิสระจากแท็บแบบจำลอง",
  "Full agonist": "Agonist เต็มที่",
  "Partial agonist": "Agonist บางส่วน",
  "Agonist + antagonist": "Agonist ร่วมกับ antagonist",
  "Antagonist alone": "Antagonist เพียงอย่างเดียว",
  "Increase agonist": "เพิ่ม agonist",
  "Attached ≠ activated": "จับได้ ≠ กระตุ้นได้",
  "A = agonist · B = antagonist · ○ free (icons rounded)": "A = agonist · B = antagonist · ○ ว่าง (จำนวนภาพปัดเศษ)",
  "Partial agonist ceiling: 40%": "เพดานผลของ partial agonist: 40%",
  "Change the experiment": "ปรับการทดลอง",
  "Agonist type": "ชนิดของ agonist",
  "Agonist concentration": "ความเข้มข้นของ agonist",
  "Competitive antagonist concentration": "ความเข้มข้นของ antagonist แบบแข่งขัน",
  "Agonist Kd · lower means stronger binding": "Kd ของ agonist · ค่ายิ่งต่ำยิ่งจับแน่น",
  "Concentrations are arbitrary teaching units. Use arrow keys on a slider for small changes.": "ความเข้มข้นใช้หน่วยสมมติ ใช้ปุ่มลูกศรบนตัวเลื่อนเพื่อปรับทีละน้อย",
  "Concentration–response curve": "กราฟความเข้มข้น–การตอบสนอง",
  "Response (% of full system maximum)": "การตอบสนอง (% ของผลสูงสุดของระบบ)",
  "Agonist concentration (teaching units)": "ความเข้มข้น agonist (หน่วยสมมติ)",
  "Solid purple: chosen experiment. Dashed grey: full agonist without antagonist, with the same binding affinity. The dot marks your selected agonist concentration. The horizontal axis is concentration, not time.": "เส้นทึบสีม่วง: การทดลองที่เลือก เส้นประสีเทา: full agonist ที่ไม่มี antagonist และมีความสามารถในการจับเท่ากัน จุดคือความเข้มข้นที่เลือก แกนนอนแสดงความเข้มข้น ไม่ใช่เวลา",
  "Advanced mode · shared with Simulation": "โหมดขั้นสูง · ใช้ร่วมกับแท็บแบบจำลอง",
  "Advanced · equations and assumptions": "ขั้นสูง · สมการและข้อสมมติ",
  "At equilibrium: D = 1 + A/Kd + B/Ki. Agonist occupancy = (A/Kd)/D; antagonist occupancy = (B/Ki)/D; free fraction = 1/D.": "ที่สมดุล: D = 1 + A/Kd + B/Ki สัดส่วนตัวรับที่ agonist จับ = (A/Kd)/D ที่ antagonist จับ = (B/Ki)/D และที่ว่าง = 1/D",
  "Response (%) = 100 × ε × agonist occupancy. ε = 1 for full agonist or 0.4 for partial agonist; Ki = 50 concentration units. EC50 = Kd × (1 + B/Ki), defined relative to that agonist’s own maximum.": "การตอบสนอง (%) = 100 × ε × สัดส่วนตัวรับที่ agonist จับ โดย ε = 1 สำหรับ full agonist หรือ 0.4 สำหรับ partial agonist; Ki = 50 หน่วยความเข้มข้น EC50 = Kd × (1 + B/Ki) เทียบกับผลสูงสุดของ agonist ชนิดนั้นเอง",
  "This model assumes one binding site, reversible competition, zero basal activity, no spare receptors, and response proportional to occupancy. Kd and EC50 need not be equal in real systems. Noncompetitive antagonism, inverse agonism, full/partial agonist mixtures, signaling delays and desensitization are not modelled.": "สมมติให้มีตำแหน่งจับชนิดเดียว แข่งขันแบบย้อนกลับได้ ไม่มีการทำงานพื้นฐาน ไม่มีตัวรับสำรอง และผลแปรตามสัดส่วนการจับ ในระบบจริง Kd กับ EC50 ไม่จำเป็นต้องเท่ากัน ไม่จำลองการต้านแบบไม่แข่งขัน inverse agonism ส่วนผสม full/partial agonist ความล่าช้าของสัญญาณ หรือการลดความไว",
  "Tap to open the word guide": "แตะเพื่อเปิดคำศัพท์",
  "Receptor": "ตัวรับ (receptor)",
  "A protein that receives a signal and can change cell activity.": "โปรตีนที่รับสัญญาณและเปลี่ยนการทำงานของเซลล์ได้",
  "Bind": "การจับ (binding)",
  "Attach to a receptor; attachment alone does not mean activation.": "การเกาะกับตัวรับ การจับได้เพียงอย่างเดียวไม่แปลว่ากระตุ้นได้",
  "Agonist": "สารกระตุ้นตัวรับ (agonist)",
  "A substance that binds and activates a receptor.": "สารที่จับและกระตุ้นตัวรับ",
  "An agonist with a lower maximum response in the same system.": "Agonist ที่ให้ผลสูงสุดต่ำกว่าในระบบเดียวกัน",
  "Antagonist": "สารต้านตัวรับ (antagonist)",
  "A substance that blocks an agonist’s action; our reversible competitive example binds without activating.": "สารที่ยับยั้งการออกฤทธิ์ของ agonist ตัวอย่างแบบแข่งขันที่ย้อนกลับได้ของเราจับโดยไม่กระตุ้น",
  "Concentration": "ความเข้มข้น",
  "The amount of a substance in a given volume.": "ปริมาณสารในปริมาตรหนึ่ง",
  "Affinity": "ความสามารถในการจับ (affinity)",
  "How strongly a substance binds; lower Kd means stronger binding in our model.": "ความแน่นในการจับตัวรับ ในแบบจำลองนี้ Kd ต่ำหมายถึงจับแน่นกว่า",
  "Teacher notes · 45-minute lesson": "บันทึกสำหรับครู · บทเรียน 45 นาที",
  "0–5 min: discuss the opening question. 5–15 min: full and partial activation. 15–25 min: binding without activation. 25–35 min: competition and recovery. 35–45 min: medicine examples, reflection and review.": "0–5 นาที: คุยคำถามเปิดเรื่อง 5–15 นาที: กระตุ้นเต็มที่และบางส่วน 15–25 นาที: จับโดยไม่กระตุ้น 25–35 นาที: แข่งขันและเพิ่มการตอบสนองกลับ 35–45 นาที: ตัวอย่างยา สะท้อนความคิด และทบทวน",
  "Misconceptions: fitting means activating; an antagonist must cause an opposite response; a partial agonist becomes full if enough is added; potency means safety; blood delivers a medicine only to a chosen organ.": "ความเข้าใจผิดที่พบบ่อย: จับได้แปลว่ากระตุ้นได้; antagonist ต้องให้ผลตรงข้าม; partial agonist กลายเป็น full agonist เมื่อเพิ่มมากพอ; ความแรงแปลว่าปลอดภัย; เลือดส่งยาไปเฉพาะอวัยวะที่เลือก",
  "Prediction answers: 1 response approaches a limit; 2 the partial maximum stays lower; 3 no activation without agonist; 4 competing blocker reduces response at the same agonist concentration; 5 more agonist can overcome reversible competition. Each follows from binding and activation being different.": "เฉลยคำคาดการณ์: 1 ผลเข้าใกล้ขีดจำกัด 2 ผลสูงสุดของ partial agonist ยังต่ำกว่า 3 ไม่มีการกระตุ้นเมื่อไม่มี agonist 4 คู่แข่งลดผลที่ความเข้มข้น agonist เท่าเดิม 5 เพิ่ม agonist เพื่อเอาชนะการแข่งขันแบบย้อนกลับได้ ทั้งหมดแสดงว่าการจับและการกระตุ้นต่างกัน",
  "H1 antihistamines are generally inverse agonists: they favour the inactive receptor state. “Block histamine’s effects” is suitable beginner wording, but they are not exact examples of this zero-basal-activity neutral antagonist model.": "ยาต้านฮิสตามีน H1 โดยทั่วไปเป็น inverse agonist ซึ่งเอื้อต่อสภาวะไม่ทำงานของตัวรับ คำว่า “ยับยั้งผลของฮิสตามีน” เหมาะกับผู้เริ่มเรียน แต่ไม่ใช่ตัวอย่างตรงตัวของ neutral antagonist ในแบบจำลองที่ไม่มีการทำงานพื้นฐานนี้",
  "Not modelled: noncompetitive antagonism, inverse agonism, desensitisation, agonist mixtures, spare receptors, signaling delays or clinical toxicity. No dose advice or decisions about starting/stopping medicines are provided.": "สิ่งที่ไม่จำลอง: การต้านแบบไม่แข่งขัน inverse agonism การลดความไว ส่วนผสม agonist ตัวรับสำรอง ความล่าช้าของสัญญาณ หรือพิษทางคลินิก ไม่มีคำแนะนำขนาดยา หรือการเริ่ม/หยุดยา",
  "Written reflection is self-assessed against a model explanation; the app does not judge free text. Answers stay on this page during the session and are not sent anywhere.": "ผู้เรียนประเมินคำอธิบายของตนเทียบกับแนวคำตอบ แอปไม่ตัดสินข้อความอิสระ คำตอบคงอยู่ในหน้านี้ระหว่างใช้งานและไม่ถูกส่งไปที่อื่น",
  "Print one-page summary": "พิมพ์สรุปหนึ่งหน้า",
  "Fitting is not the same as acting": "การจับได้ไม่เหมือนกับการออกฤทธิ์ได้",
  "Drug journey: blood carries medicines to tissues. Pharmacokinetics describes entry, movement, change and removal. Drug effect: pharmacodynamics describes how a drug changes a response. Not every medicine acts through receptors.": "เส้นทางยา: เลือดพายาไปยังเนื้อเยื่อ เภสัชจลนศาสตร์อธิบายการเข้า เคลื่อนย้าย เปลี่ยนแปลง และออกของยา ผลของยา: เภสัชพลศาสตร์อธิบายการเปลี่ยนการตอบสนอง ยาทุกชนิดไม่ได้ออกฤทธิ์ผ่านตัวรับ",
  "Three key meanings": "สามความหมายสำคัญ",
  "fits and activates.": "จับและกระตุ้น",
  "activates with a lower maximum in the same system.": "กระตุ้นแต่ให้ผลสูงสุดต่ำกว่าในระบบเดียวกัน",
  "fits without activating and competes for the same place.": "จับโดยไม่กระตุ้นและแข่งขันในตำแหน่งเดียวกัน",
  "Key-and-lock analogy: a key can turn fully, partly, or fit without turning. Real receptors are not rigid locks.": "เปรียบกับกุญแจและแม่กุญแจ: หมุนได้เต็มที่ หมุนได้บางส่วน หรือใส่ได้แต่หมุนไม่ได้ ตัวรับจริงไม่ใช่แม่กุญแจแข็ง ๆ",
  "What the experiments teach": "สิ่งที่ได้เรียนรู้จากการทดลอง",
  "Binding alone is not activation. More agonist can overcome reversible competition in this model. More partial agonist cannot reach the full maximum. Potency means how much is needed for an effect; efficacy concerns the ability to produce a response.": "การจับเพียงอย่างเดียวไม่ใช่การกระตุ้น เพิ่ม agonist เพื่อเอาชนะการแข่งขันแบบย้อนกลับได้ในแบบจำลองนี้ได้ แต่เพิ่ม partial agonist ก็ไม่ถึงผลสูงสุดแบบเต็มที่ Potency คือความเข้มข้นที่ต้องใช้เพื่อให้ได้ผล ส่วน efficacy คือความสามารถในการให้ผล",
  "Explain why": "อธิบายเหตุผล",
  "More drug is not always better: responses can approach a limit while unwanted effects may increase. Medicines are carried in blood to tissues, not directly to a chosen organ.": "ยามากขึ้นไม่ดีกว่าเสมอ ผลอาจเข้าใกล้ขีดจำกัดแต่ผลไม่พึงประสงค์ยังเพิ่มได้ เลือดพายาไปยังเนื้อเยื่อ ไม่ได้ส่งตรงสู่อวัยวะที่เลือก",
  "All numbers are invented teaching units. This model is not a prescribing guide. Noncompetitive antagonism, inverse agonism, desensitisation and agonist mixtures are not modelled.": "ตัวเลขทั้งหมดเป็นหน่วยสมมติ แบบจำลองนี้ไม่ใช่แนวทางสั่งยา ไม่จำลองการต้านแบบไม่แข่งขัน inverse agonism การลดความไว หรือส่วนผสม agonist",
  "Sources: IUPHAR Pharmacology Education Project; NCI caffeine dictionary; teacher notes explain the antihistamine limitation. Original receptor illustrations: CC0.": "แหล่งข้อมูล: IUPHAR Pharmacology Education Project; พจนานุกรมคาเฟอีนของ NCI; บันทึกครูอธิบายข้อจำกัดของตัวอย่างยาต้านฮิสตามีน ภาพตัวรับต้นฉบับ: CC0",
  "Sources, illustration credits and teaching limits": "แหล่งข้อมูล สิทธิ์ภาพ และข้อจำกัดในการสอน",
  "IUPHAR Pharmacology Education Project · Pharmacodynamics": "IUPHAR Pharmacology Education Project · เภสัชพลศาสตร์",
  ". The model demonstrates reversible competitive antagonism, not every antagonist mechanism. Greater response is not automatically greater benefit; adverse effects may involve other targets.": "แบบจำลองแสดงการต้านแบบแข่งขันที่ย้อนกลับได้ ไม่ใช่กลไกต้านทุกชนิด ผลตอบสนองมากกว่าไม่ได้แปลว่าเป็นประโยชน์มากกว่าโดยอัตโนมัติ ผลไม่พึงประสงค์อาจเกี่ยวข้องกับตำแหน่งออกฤทธิ์อื่น",
  "Receptor icons and graph are original inline SVGs in src/app.js, dedicated to CC0 1.0. No external illustrations, fonts or network dependencies. The reference link requires internet access.": "ภาพตัวรับและกราฟเป็น SVG ต้นฉบับใน src/app.js ใช้ CC0 1.0 ไม่พึ่งภาพ ฟอนต์ หรือเครือข่ายภายนอก ลิงก์อ้างอิงต้องใช้อินเทอร์เน็ต",
  "Further sources:": "แหล่งข้อมูลเพิ่มเติม:",
  "Salbutamol product information": "ข้อมูลผลิตภัณฑ์ซาลบูทามอล",
  "H1 antihistamine mechanisms": "กลไกยาต้านฮิสตามีน H1",
  "NCI caffeine reference": "ข้อมูลคาเฟอีนจาก NCI",
  "Simulation · explore the journey": "แบบจำลอง · สำรวจเส้นทางยา",
  "Beginner mode": "โหมดเริ่มต้น",
  "Start with the journey, the pictures, and the main graph.": "เริ่มจากเส้นทางยา ภาพ และกราฟหลัก",
  "Advanced mode": "โหมดขั้นสูง",
  "One hypothetical compound": "สารสมมติหนึ่งชนิด",
  "These curves show a teaching example. Real-medicine facts are in a separate reference section below.": "กราฟนี้เป็นตัวอย่างเพื่อการเรียนรู้ ข้อมูลยาจริงแยกไว้ในส่วนอ้างอิงด้านล่าง",
  "Administration route": "วิธีให้ยา",
  "Oral · swallowed solid": "กิน · ยารูปแบบของแข็ง",
  "SC · subcutaneous solution": "SC · สารละลายฉีดใต้ผิวหนัง",
  "IV · single bolus": "IV · ฉีดเข้าหลอดเลือดดำแบบ bolus",
  "Compare the three route presets": "เปรียบเทียบค่าตั้งต้นของสามเส้นทาง",
  "The dashed comparison curves use the original route settings. Your solid green curve follows the sliders.": "กราฟเส้นประใช้ค่าตั้งต้นของแต่ละเส้นทาง เส้นทึบสีเขียวเปลี่ยนตามตัวเลื่อนของคุณ",
  "Compound experiment": "ทดลองกับสารสมมติ",
  "Standard hypothetical compound": "สารสมมติแบบมาตรฐาน",
  "Hydrophilic · reduced tissue entry": "ชอบน้ำ · เข้าเนื้อเยื่อน้อยลง",
  "Slow removal · accumulation": "กำจัดช้า · การสะสม",
  "NAC: real medicine, teaching example": "NAC: ยาจริง ตัวอย่างเพื่อการสอน",
  "NAC (N-acetylcysteine, also called acetylcysteine) is a water-soluble medicine. This scenario illustrates one possible distribution pattern for a water-loving compound. Water solubility alone cannot predict a drug’s complete journey.": "NAC (N-acetylcysteine หรือ acetylcysteine) เป็นยาที่ละลายน้ำได้ ตัวอย่างนี้แสดงรูปแบบการกระจายที่เป็นไปได้แบบหนึ่งของสารชอบน้ำ ความสามารถละลายน้ำเพียงอย่างเดียวทำนายเส้นทางทั้งหมดของยาไม่ได้",
  "The acetylcysteine injection label reports substantial protein binding (66–87%) and metabolism to other substances. Water-loving does not mean unbound or excreted unchanged. The simulator does not model binding or predict real NAC levels.": "ฉลาก acetylcysteine ชนิดฉีดระบุการจับโปรตีนค่อนข้างมาก (66–87%) และการเปลี่ยนเป็นสารอื่น ชอบน้ำไม่ได้แปลว่าไม่จับโปรตีนหรือถูกขับออกโดยไม่เปลี่ยนรูป แบบจำลองไม่จำลองการจับโปรตีนหรือทำนายระดับ NAC จริง",
  "Source: acetylcysteine injection label · DailyMed": "แหล่งข้อมูล: ฉลาก acetylcysteine ชนิดฉีด · DailyMed",
  "Source: Health Canada product monograph · solubility": "แหล่งข้อมูล: เอกสารผลิตภัณฑ์ Health Canada · การละลาย",
  ". Sources open online; the simulation works offline.": "แหล่งอ้างอิงเปิดออนไลน์ ส่วนแบบจำลองทำงานออฟไลน์ได้",
  "Illustrative teaching preset": "ค่าตั้งต้นเพื่อการสอน",
  "When are the doses given?": "ให้ยาเมื่อใดบ้าง?",
  "Dose schedule": "ตารางให้ยา",
  "One morning dose · 08:00": "ครั้งเดียวตอนเช้า · 08:00",
  "Morning and evening · 08:00 & 20:00": "เช้าและเย็น · 08:00 และ 20:00",
  "Every 8 hours · 08:00, 16:00 & 00:00": "ทุก 8 ชั่วโมง · 08:00, 16:00 และ 00:00",
  "Missed evening dose · morning only": "ลืมครั้งเย็น · ให้เฉพาะตอนเช้า",
  "Late evening dose · 08:00 & 00:00": "ครั้งเย็นล่าช้า · 08:00 และ 00:00",
  "The view covers 24 hours starting at 08:00. Each new dose joins any drug still in the body. These are invented schedules for learning.": "แสดงช่วง 24 ชั่วโมงเริ่มที่ 08:00 ยาครั้งใหม่รวมกับยาที่ยังเหลือในร่างกาย ตารางเหล่านี้สมมติขึ้นเพื่อการเรียนรู้",
  "Try a guided scenario": "ลองสถานการณ์แนะนำ",
  "Load a ready-made teaching situation. Controls and the prediction question update to match.": "โหลดสถานการณ์เพื่อการสอน ตัวควบคุมและคำถามคาดการณ์จะปรับให้ตรงกัน",
  "Compare accumulation experiments": "เปรียบเทียบการทดลองการสะสม",
  "Each button loads a fresh experiment and starts paused at 0 h.": "แต่ละปุ่มเริ่มการทดลองใหม่ในสถานะหยุดที่ 0 ชั่วโมง",
  "One dose · slow removal": "ครั้งเดียว · กำจัดช้า",
  "Three doses · slow removal": "สามครั้ง · กำจัดช้า",
  "Three doses · standard removal": "สามครั้ง · กำจัดมาตรฐาน",
  "One versus three doses changes the total amount administered. The two three-dose experiments isolate the effect of removal rate.": "การให้หนึ่งเทียบกับสามครั้งเปลี่ยนปริมาณรวมที่ให้ ส่วนการเปรียบเทียบสามครั้งทั้งสองแบบแยกให้เห็นผลของอัตราการกำจัด",
  "Watch the medicine travel": "ดูยาเดินทาง",
  "Move through time": "เลื่อนไปตามเวลา",
  "Move the slider or drag a graph to explore any moment.": "เลื่อนตัวเลื่อนหรือลากกราฟเพื่อสำรวจช่วงเวลาที่ต้องการ",
  "Keyboard: arrows = 15 minutes; Shift + arrow = 1 hour; Home / End = start / finish.": "แป้นพิมพ์: ลูกศร = 15 นาที; Shift + ลูกศร = 1 ชั่วโมง; Home / End = ต้น / ท้าย",
  "Ready to begin": "พร้อมเริ่ม",
  "Follow the most active process": "ติดตามกระบวนการที่เด่นที่สุด",
  "Moving particles": "แสดงอนุภาคเคลื่อนไหว",
  "Particles follow the arrows; only blood–tissue exchange has a return path. Particle speed is illustrative. Gold compares net distribution with the other transfer rates; green arrows show ongoing transfers, including exchange in both directions. Several processes can happen together.": "อนุภาคเคลื่อนตามลูกศร มีเฉพาะการแลกเปลี่ยนเลือด–เนื้อเยื่อที่มีทางกลับ ความเร็วมีไว้ประกอบภาพ สีทองเปรียบเทียบอัตรากระจายสุทธิกับอัตราอื่น ลูกศรสีเขียวแสดงการถ่ายโอนที่ยังเกิดอยู่ รวมถึงการแลกเปลี่ยนสองทิศทาง หลายกระบวนการเกิดพร้อมกันได้",
  "Bands show each process relative to its own maximum. They do not add up to percentages of a dose.": "แต่ละแถบเทียบกับค่าสูงสุดของกระบวนการนั้นเอง จึงไม่รวมกันเป็นร้อยละของยาหนึ่งครั้ง",
  "Inside the body": "ภายในร่างกาย",
  "Schematic · not to anatomical scale": "ภาพแบบย่อ · ไม่ได้วาดตามสัดส่วนกายวิภาค",
  "Gut · release & absorption": "ทางเดินอาหาร · ปลดปล่อยและดูดซึม",
  "Liver · metabolism": "ตับ · เปลี่ยนแปลงยา",
  "Kidneys · excretion": "ไต · ขับออก",
  "IV: each dose enters blood directly": "IV: ยาแต่ละครั้งเข้าสู่เลือดโดยตรง",
  "Oral tablet": "ยาเม็ดที่กิน",
  "unreleased drug": "ยายังไม่ถูกปลดปล่อย",
  "Dissolved in gut": "ยาละลายในลำไส้",
  "ready for absorption": "พร้อมดูดซึม",
  "First-pass liver": "ผ่านตับครั้งแรก",
  "portal blood": "เลือดพอร์ทัล",
  "Blood · parent drug": "เลือด · ยาต้นแบบ",
  "Tissues · parent drug": "เนื้อเยื่อ · ยาต้นแบบ",
  "Metabolites in body": "เมแทบอไลต์ในร่างกาย",
  "one combined model pool": "แบบจำลองรวมเป็นแหล่งเดียว",
  "liver processing": "การเปลี่ยนแปลงที่ตับ",
  "Carried in blood": "เคลื่อนมากับเลือด",
  "metabolites → kidneys": "เมแทบอไลต์ → ไต",
  "Tissue access": "เข้าสู่เนื้อเยื่อ",
  "depends on metabolite": "ขึ้นกับเมแทบอไลต์",
  "Dashed: possible exchange": "เส้นประ: อาจแลกเปลี่ยนได้",
  "not separately calculated": "ไม่ได้คำนวณแยก",
  "Kidneys → urine": "ไต → ปัสสาวะ",
  "Amounts in teaching": "ปริมาณในหน่วย",
  "units · 100 per dose.": "สมมติ · 100 ต่อครั้ง",
  "● Unchanged drug": "● ยาที่ยังไม่เปลี่ยนรูป",
  "● Metabolites (changed drug)": "● เมแทบอไลต์ (ยาที่เปลี่ยนรูป)",
  "Metabolism changes a molecule; it does not immediately remove it.": "การเปลี่ยนแปลงยาเปลี่ยนโมเลกุล แต่ไม่ได้กำจัดออกจากร่างกายทันที",
  "Metabolites can circulate in blood and reach tissues. Their properties and effects may differ from the parent drug. Purple particles show changed drug carried toward urinary excretion. The amount shown is one combined metabolite pool; blood and tissue amounts are not calculated separately.": "เมแทบอไลต์หมุนเวียนในเลือดและเข้าเนื้อเยื่อได้ คุณสมบัติและผลอาจต่างจากยาต้นแบบ อนุภาคสีม่วงแสดงยาที่เปลี่ยนรูปกำลังเคลื่อนไปสู่การขับออกทางปัสสาวะ ปริมาณที่แสดงรวมเมแทบอไลต์เป็นแหล่งเดียว ไม่แยกคำนวณเลือดกับเนื้อเยื่อ",
  "Other possible routes": "เส้นทางอื่นที่เป็นไปได้",
  "Some metabolites undergo further metabolism or enter bile and the gut. These routes are not included in this simulation. A metabolite returning from tissue to blood remains a metabolite.": "เมแทบอไลต์บางชนิดเปลี่ยนแปลงต่อ หรือเข้าสู่น้ำดีและลำไส้ แบบจำลองนี้ไม่รวมเส้นทางเหล่านี้ เมแทบอไลต์ที่กลับจากเนื้อเยื่อสู่เลือดยังคงเป็นเมแทบอไลต์",
  "Reference: Why do metabolites circulate?": "อ้างอิง: ทำไมเมแทบอไลต์จึงหมุนเวียนได้?",
  "Try a change": "ลองปรับค่า",
  "Move one slider, then watch again. The dashed line shows the original settings. Each change restarts the journey.": "ปรับตัวเลื่อนหนึ่งค่าแล้วดูอีกครั้ง เส้นประคือค่าตั้งต้น การปรับแต่ละครั้งเริ่มเส้นทางใหม่",
  "Tablet release speed": "ความเร็วการปลดปล่อยจากยาเม็ด",
  "How quickly drug dissolves from the tablet.": "ยาละลายออกจากยาเม็ดเร็วเพียงใด",
  "Absorption": "ดูดซึม",
  "How quickly dissolved drug enters portal blood.": "ยาที่ละลายเข้าสู่เลือดพอร์ทัลเร็วเพียงใด",
  "First-pass metabolism": "การเปลี่ยนแปลงยาก่อนเข้าสู่เลือดทั่วร่างกาย",
  "Fraction changed before reaching systemic blood.": "สัดส่วนที่เปลี่ยนรูปก่อนเข้าสู่การไหลเวียนทั่วร่างกาย",
  "Restore route preset": "คืนค่าตั้งต้นของเส้นทาง",
  "How much is in the blood?": "มีปริมาณยาในเลือดเท่าใด?",
  "Your settings": "ค่าที่คุณตั้ง",
  "┄ Selected route preset": "┄ ค่าตั้งต้นของเส้นทางที่เลือก",
  "Show hypothetical therapeutic target": "แสดงช่วงเป้าหมายการรักษาสมมติ",
  "The green band is an invented target of 10–50 teaching units in blood. It is not a real therapeutic concentration and does not predict benefit or toxicity.": "แถบสีเขียวคือช่วงเป้าหมายสมมติ 10–50 หน่วยในเลือด ไม่ใช่ความเข้มข้นในการรักษาจริง และไม่ทำนายประโยชน์หรือพิษ",
  "When doses overlap": "เมื่อยาแต่ละครั้งซ้อนกัน",
  "New doses add to drug still present. Slower removal can raise exposure and toxicity risk. The red region is above an invented upper limit, not a measured toxic concentration. Toxicity also depends on the drug, its metabolites and the person.": "ยาครั้งใหม่เพิ่มจากยาที่ยังเหลือ การกำจัดช้าลงอาจเพิ่มการสัมผัสยาและความเสี่ยงพิษ บริเวณสีแดงสูงกว่าขีดจำกัดสมมติ ไม่ใช่ความเข้มข้นที่วัดว่ามีพิษ พิษยังขึ้นกับยา เมแทบอไลต์ และแต่ละบุคคล",
  "This 24-hour view does not establish steady state. With continued repeated doses, steady state may take several days.": "ภาพ 24 ชั่วโมงนี้ยังยืนยันภาวะคงตัวไม่ได้ เมื่อให้ซ้ำต่อเนื่อง อาจใช้เวลาหลายวันกว่าจะถึงภาวะคงตัว",
  "Learn about repeated dosing and accumulation": "เรียนรู้การให้ยาซ้ำและการสะสม",
  "in blood now": "ในเลือดขณะนี้",
  "highest amount": "ปริมาณสูงสุด",
  "time to highest amount": "เวลาที่ปริมาณสูงสุด",
  "Advanced · total exposure": "ขั้นสูง · การสัมผัสยารวม",
  "amount AUC₀–₂₄ (units · h)": "AUC ปริมาณ₀–₂₄ (หน่วย · ชั่วโมง)",
  "AUC₀–₂₄ / matched IV": "AUC₀–₂₄ / IV ที่เทียบกัน",
  "AUC adds up the amount in blood over time: it shows exposure as well as the peak.": "AUC รวมปริมาณยาในเลือดตลอดช่วงเวลา จึงแสดงการสัมผัสยาเพิ่มเติมจากค่าสูงสุด",
  "Your settings and route presets · 0–24 h": "ค่าของคุณและค่าตั้งต้น · 0–24 ชั่วโมง",
  "Route": "เส้นทาง",
  "Peak": "ค่าสูงสุด",
  "Time to peak": "เวลาถึงค่าสูงสุด",
  "Amount AUC₀–₂₄": "AUC ปริมาณ₀–₂₄",
  "(units · h)": "(หน่วย · ชั่วโมง)",
  "The first row follows your sliders and solid green curve. The other rows match the dashed original presets. Their absorption rates stay fixed. SC has eventual F = 100%; its 24 h ratio can be below 1 because input and exposure can continue after the window ends. Every row uses the same scheduled doses.": "แถวแรกตรงกับตัวเลื่อนและเส้นทึบสีเขียว แถวอื่นตรงกับเส้นประค่าตั้งต้นซึ่งคงอัตราดูดซึมไว้ SC มี F ในที่สุด = 100% แต่อัตราส่วน 24 ชั่วโมงอาจต่ำกว่า 1 เพราะยายังเข้าและอยู่ในเลือดต่อหลังช่วงแสดงผล ทุกแถวใช้ตารางให้ยาเดียวกัน",
  "With the same constant blood volume across routes, amount AUC ÷ IV amount AUC equals the concentration-AUC ratio. All route comparisons use identical dose times, dose amounts and disposition parameters. AUC₀–₂₄ covers only this window; it is not AUC to infinity or an exact estimate of eventual F when input or elimination continues beyond 24 h.": "เมื่อปริมาตรเลือดคงที่และเท่ากันทุกเส้นทาง อัตราส่วน AUC ปริมาณต่อ IV จะเท่ากับอัตราส่วน AUC ความเข้มข้น การเปรียบเทียบใช้เวลาให้ยา ปริมาณยา และค่าการกระจาย/กำจัดเดียวกัน AUC₀–₂₄ ครอบคลุมเฉพาะช่วงนี้ ไม่ใช่ AUC ถึงอนันต์ และไม่ใช่ F ในที่สุดอย่างแม่นยำเมื่อการเข้าหรือการกำจัดยังดำเนินต่อหลัง 24 ชั่วโมง",
  "This graph shows": "กราฟนี้แสดง",
  "amount": "ปริมาณ",
  ", not concentration, potency, or treatment effectiveness. Each dose adds 100 teaching units; repeated doses can produce amounts above 100. This is a simplified example for learning how medicines move.": "ไม่ใช่ความเข้มข้น ความแรง หรือประสิทธิผลการรักษา แต่ละครั้งเพิ่ม 100 หน่วยสมมติ การให้ซ้ำจึงทำให้ปริมาณเกิน 100 ได้ นี่เป็นตัวอย่างอย่างง่ายเพื่อเรียนรู้การเคลื่อนที่ของยา",
  "How much reaches the blood?": "ยาเข้าสู่เลือดได้มากเท่าใด?",
  "Bioavailability (F)": "ชีวปริมาณออกฤทธิ์ (F)",
  "is the fraction of a dose that reaches circulating blood as unchanged drug.": "คือสัดส่วนของยาที่เข้าสู่การไหลเวียนเลือดในรูปที่ยังไม่เปลี่ยนแปลง",
  "of each dose will eventually reach blood": "ของยาแต่ละครั้งจะเข้าสู่เลือดในที่สุด",
  "has entered blood so far": "เข้าสู่เลือดสะสมจนถึงขณะนี้",
  "“Entered so far” counts everything that has reached the blood. Some of it may already have moved into tissues or left the body. “In blood now” shows what remains there at this moment. Some slow-release drug may enter after the graph ends.": "“เข้าสู่เลือดสะสม” นับทั้งหมดที่เคยเข้าถึงเลือด บางส่วนอาจเข้าเนื้อเยื่อหรือออกจากร่างกายแล้ว “ในเลือดขณะนี้” คือส่วนที่ยังอยู่ในเลือดตอนนี้ ยาปลดปล่อยช้าบางส่วนอาจเข้าหลังกราฟสิ้นสุด",
  "Try a bioavailability calculation with AUC": "ลองคำนวณชีวปริมาณออกฤทธิ์ด้วย AUC",
  "AUC means area under a": "AUC คือพื้นที่ใต้กราฟ",
  "concentration–time": "ความเข้มข้น–เวลา",
  "curve: a measure of total exposure. To estimate absolute oral bioavailability, compare oral and IV doses of the same compound.": "ใช้วัดการสัมผัสยารวม การประมาณชีวปริมาณออกฤทธิ์สัมบูรณ์ของยากินต้องเปรียบเทียบการกินกับ IV ของสารเดียวกัน",
  "F (%) = (AUC oral ÷ AUC IV) × (Dose IV ÷ Dose oral) × 100": "F (%) = (AUC กิน ÷ AUC IV) × (ปริมาณ IV ÷ ปริมาณกิน) × 100",
  "Use total AUC from time zero to infinity, matching concentration and time units, and matching dose units. This comparison assumes linear kinetics and the same clearance for both routes. The graph now reports amount AUC₀–₂₄ and its matched IV ratio. With the same constant blood volume these ratios also apply to concentration AUC, but this standalone exercise uses total concentration AUC to infinity.": "ใช้ AUC ตั้งแต่ศูนย์ถึงอนันต์ หน่วยความเข้มข้น เวลา และปริมาณยาต้องสอดคล้องกัน สมมติจลนศาสตร์เชิงเส้นและ clearance เท่ากันทั้งสองเส้นทาง กราฟรายงาน AUC ปริมาณ₀–₂₄ และอัตราส่วนต่อ IV เมื่อปริมาตรเลือดคงที่เท่ากัน อัตราส่วนใช้กับ AUC ความเข้มข้นได้ด้วย แต่แบบฝึกแยกนี้ใช้ AUC ความเข้มข้นถึงอนันต์",
  "Oral AUC": "AUC ทางกิน",
  "concentration × time units": "หน่วยความเข้มข้น × เวลา",
  "IV AUC": "AUC ทาง IV",
  "same AUC units": "ใช้หน่วย AUC เดียวกัน",
  "Oral dose": "ปริมาณทางกิน",
  "relative dose units": "หน่วยปริมาณสัมพัทธ์",
  "IV dose": "ปริมาณทาง IV",
  "same dose units": "ใช้หน่วยปริมาณเดียวกัน",
  "Reset example": "คืนค่าตัวอย่าง",
  "These example inputs do not change the simulation or represent a clinical dose.": "ค่าตัวอย่างเหล่านี้ไม่เปลี่ยนแบบจำลองและไม่ใช่ขนาดยาทางคลินิก",
  "Pause & predict": "หยุดและคาดการณ์",
  "Test a key idea, then explore the graph.": "ทดสอบแนวคิดสำคัญ แล้วสำรวจกราฟ",
  "Choose an answer.": "เลือกคำตอบ",
  "Next question": "คำถามถัดไป",
  "Real medicines · facts and sources": "ยาจริง · ข้อมูลและแหล่งอ้างอิง",
  "These reference facts do not change the simulation. The graphs above represent one hypothetical compound.": "ข้อมูลอ้างอิงนี้ไม่เปลี่ยนแบบจำลอง กราฟด้านบนใช้สารสมมติหนึ่งชนิด",
  "Medicine reference": "ข้อมูลอ้างอิงยา",
  "Paracetamol (acetaminophen)": "พาราเซตามอล (acetaminophen)",
  "Ibuprofen": "ไอบูโพรเฟน",
  "Amoxicillin": "อะม็อกซีซิลลิน",
  "PUBLISHED PROPERTIES · NOT MODEL OUTPUTS": "คุณสมบัติที่ตีพิมพ์ · ไม่ใช่ผลจากแบบจำลอง",
  "Reported time to peak blood level": "เวลาถึงระดับสูงสุดในเลือดตามรายงาน",
  "Reported elimination half-life": "ครึ่งชีวิตการกำจัดตามรายงาน",
  "Half-life is the time for a drug level to fall by half during its elimination phase. Values vary with formulation and person.": "ครึ่งชีวิตคือเวลาที่ระดับยาลดลงครึ่งหนึ่งระหว่างช่วงกำจัด ค่าแตกต่างตามรูปแบบยาและบุคคล",
  "Read the product information ↗": "อ่านข้อมูลผลิตภัณฑ์ ↗",
  "Advanced · drug liberation & half-life calculations": "ขั้นสูง · การปลดปล่อยยาและการคำนวณครึ่งชีวิต",
  "With repeated dosing, the liberation graph shows one dose; the body diagram and main graph combine all doses given so far. Disposition half-life stays fixed in this linear model.": "เมื่อให้ซ้ำ กราฟปลดปล่อยแสดงยาหนึ่งครั้ง ส่วนภาพร่างกายและกราฟหลักรวมทุกครั้งที่ให้แล้ว ครึ่งชีวิตการกระจาย/กำจัดคงที่ในแบบจำลองเชิงเส้นนี้",
  "Explore release from an oral solid separately from absorption into blood. These are teaching models, not fitted dissolution profiles.": "สำรวจการปลดปล่อยจากยากินชนิดแข็งแยกจากการดูดซึมเข้าเลือด เป็นแบบจำลองเพื่อการสอน ไม่ใช่ข้อมูลการละลายที่ปรับให้ตรงยาจริง",
  "1. Drug liberation": "1. การปลดปล่อยยา",
  "Release model": "แบบจำลองการปลดปล่อย",
  "First-order · release slows as the tablet empties": "อันดับหนึ่ง · ปลดปล่อยช้าลงเมื่อยาในเม็ดเหลือน้อย",
  "Zero-order · constant amount per hour": "อันดับศูนย์ · ปลดปล่อยปริมาณคงที่ต่อชั่วโมง",
  "First-order uses the Tablet release slider above. Zero-order uses the rate below. Both can have a delay before release begins.": "อันดับหนึ่งใช้ตัวเลื่อนการปลดปล่อยด้านบน อันดับศูนย์ใช้อัตราด้านล่าง ทั้งสองแบบกำหนดเวลาหน่วงก่อนเริ่มได้",
  "Zero-order rate": "อัตราปลดปล่อยอันดับศูนย์",
  "Release delay": "เวลาหน่วงการปลดปล่อย",
  "Reset liberation settings": "คืนค่าการปลดปล่อย",
  "Release is capped at 100%. Released drug may still be in the gut: release does not mean absorption. A delay is an idealised formulation lag, not a stomach-emptying or enteric-coating prediction.": "ปลดปล่อยได้สูงสุด 100% ยาที่ปลดปล่อยอาจยังอยู่ในลำไส้ การปลดปล่อยไม่ได้แปลว่าดูดซึมแล้ว เวลาหน่วงเป็นสมมติฐานของรูปแบบยา ไม่ใช่การทำนายการระบายกระเพาะหรือสารเคลือบแตกตัวในลำไส้",
  "2. Half-life in this model": "2. ครึ่งชีวิตในแบบจำลองนี้",
  "One-compartment reference:": "อ้างอิงแบบหนึ่งห้อง:",
  "For the current two-compartment model:": "สำหรับแบบจำลองสองห้องปัจจุบัน:",
  "metabolism": "การเปลี่ยนแปลงยา",
  "renal": "ขับออกทางไต",
  "Terminal disposition t½ = ln(2) / β": "ครึ่งชีวิตช่วงปลาย t½ = ln(2) / β",
  "k₁₂ is blood → tissue; k₂₁ is tissue → blood. Rates are in h⁻¹ and half-lives in hours. Metabolism removes unchanged parent drug, even while metabolites remain in the body.": "k₁₂ คือเลือด → เนื้อเยื่อ; k₂₁ คือเนื้อเยื่อ → เลือด อัตรามีหน่วย h⁻¹ ครึ่งชีวิตมีหน่วยชั่วโมง การเปลี่ยนแปลงยาลดยาต้นแบบที่ไม่เปลี่ยนรูป แม้เมแทบอไลต์ยังอยู่ในร่างกาย",
  "3. Try the basic calculation": "3. ลองคำนวณพื้นฐาน",
  "First-order rate constant k (h⁻¹)": "ค่าคงที่อัตราอันดับหนึ่ง k (h⁻¹)",
  "This standalone calculator does not change the simulation. It assumes a single exponential decay with no ongoing input. A zero-order release model has a time to 50% release, not a constant half-life.": "เครื่องคำนวณแยกนี้ไม่เปลี่ยนแบบจำลอง สมมติการลดลงแบบเอ็กซ์โพเนนเชียลเดียวและไม่มีการเข้าของยา การปลดปล่อยอันดับศูนย์มีเวลาถึง 50% แต่ไม่มีครึ่งชีวิตคงที่",
  "Background:": "ความรู้พื้นฐาน:",
  "Two-compartment model equations": "สมการแบบจำลองสองห้อง",
  "Examples of release-kinetic models": "ตัวอย่างแบบจำลองจลนศาสตร์การปลดปล่อย",
  ". This model is illustrative and is not fitted to a real medicine.": "แบบจำลองนี้เป็นตัวอย่าง ไม่ได้ปรับให้ตรงกับยาจริง",
  "Teacher notes & model assumptions": "บันทึกสำหรับครูและข้อสมมติ",
  "LADME processes overlap; they are not five separate time windows. Clicking a letter highlights a concept without changing time. Use the scrubber to examine any moment. Activity is calculated from current model transfer rates. Distribution scoring uses the absolute net rate |k₁₂ × blood − k₂₁ × tissue|. The two distribution arrows retain their separate one-way rates, and an “Exchange continues” label shows ongoing exchange even when net movement is small. Excretion activity includes unchanged drug and metabolites; metabolism and excretion describe different transfers, not interchangeable measures of parent-drug clearance. Gold marks the largest rate; other rates above 0.01 units/h are active. These thresholds are display choices, not physiological cutoffs. Bands use each process’s own maximum; stage bars use the current largest rate. Particles indicate active routes and are decorative, not individual molecules or measured counts. Clicking a stage pauses automatic explanation-following; it does not pause time.": "กระบวนการ LADME เกิดซ้อนกันได้ ไม่ใช่ห้าช่วงเวลาแยกกัน คลิกตัวอักษรเพื่อเน้นแนวคิดโดยไม่เปลี่ยนเวลา ใช้ตัวเลื่อนสำรวจแต่ละขณะ กิจกรรมคำนวณจากอัตราถ่ายโอนปัจจุบัน คะแนนการกระจายใช้ค่าสัมบูรณ์ของอัตราสุทธิ |k₁₂ × เลือด − k₂₁ × เนื้อเยื่อ| ลูกศรสองทิศยังแสดงอัตราแต่ละทาง และป้าย “ยังแลกเปลี่ยนอยู่” แสดงเมื่อการเคลื่อนสุทธิน้อย การขับออกรวมยาที่ไม่เปลี่ยนรูปกับเมแทบอไลต์ การเปลี่ยนแปลงยาและการขับออกเป็นคนละการถ่ายโอน สีทองหมายถึงอัตราสูงสุด อัตราอื่นที่เกิน 0.01 หน่วย/ชั่วโมงยังถือว่าทำงาน เกณฑ์นี้มีไว้แสดงผล ไม่ใช่เกณฑ์สรีรวิทยา แถบเวลาเทียบค่าสูงสุดของแต่ละกระบวนการ ส่วนแถบขั้นตอนเทียบอัตราสูงสุดขณะนั้น อนุภาคใช้ประกอบภาพ ไม่ใช่โมเลกุลหรือจำนวนที่วัดจริง คลิกขั้นตอนหยุดการติดตามคำอธิบายอัตโนมัติ แต่ไม่หยุดเวลา",
  "The illustrative oral model assumes full eventual absorption, first-order or zero-order release (optionally delayed), and first-order absorption, a fixed first-pass fraction, reversible blood–tissue exchange, liver conversion to metabolites, and renal excretion of unchanged drug and metabolites. Metabolite values use starting-drug equivalents, so compartments sum to the amount administered so far. First-pass processing is an instantaneous split, not a storage compartment.": "แบบจำลองยากินสมมติว่าดูดซึมครบในที่สุด ปลดปล่อยอันดับหนึ่งหรือศูนย์ (หน่วงเวลาได้) ดูดซึมอันดับหนึ่ง มีสัดส่วนผ่านครั้งแรกคงที่ แลกเปลี่ยนเลือด–เนื้อเยื่อแบบย้อนกลับได้ เปลี่ยนเป็นเมแทบอไลต์ที่ตับ และขับยากับเมแทบอไลต์ทางไต ปริมาณเมแทบอไลต์ใช้หน่วยเทียบเท่ายาตั้งต้น จึงรวมได้เท่าปริมาณที่ให้แล้ว การผ่านครั้งแรกเป็นการแบ่งสัดส่วนทันที ไม่ใช่ห้องเก็บยา",
  "Route models:": "แบบจำลองแต่ละเส้นทาง:",
  "Each oral dose adds 100 units to its own solid formulation. Each SC dose adds 100 units to a dissolved injection-site depot; absorption follows a first-order rate, with complete eventual uptake assumed and no gut/liver first pass. Each IV bolus adds 100 units to systemic blood at its scheduled time, with no release or absorption step. All routes share the same blood–tissue exchange and elimination equations. Real SC uptake can be incomplete, include lymphatic transport, and depend on formulation and local blood flow; those effects are omitted. SC is not necessarily slower than oral for every medicine.": "ยากินแต่ละครั้งเพิ่ม 100 หน่วยในรูปแบบยาแข็งของตน SC เพิ่ม 100 หน่วยในแหล่งสารละลายใต้ผิวหนัง ดูดซึมอันดับหนึ่ง สมมติรับเข้าได้ครบและไม่มีการผ่านลำไส้/ตับครั้งแรก IV เพิ่ม 100 หน่วยเข้าเลือดตามเวลาที่กำหนด ไม่มีขั้นปลดปล่อยหรือดูดซึม ทุกเส้นทางใช้สมการแลกเปลี่ยนและกำจัดเดียวกัน ในความจริง SC อาจดูดซึมไม่ครบ ผ่านน้ำเหลือง และขึ้นกับรูปแบบยาและเลือดในบริเวณนั้น ซึ่งไม่ได้จำลอง SC ไม่ได้ช้ากว่ายากินเสมอไป",
  "Real medicines differ from this hypothetical compound. The model combines disintegration and dissolution into a single release process. First-order liberation uses an analytical cumulative release curve; absorption and disposition use 0.01-hour Euler steps. The model omits stomach emptying, intestinal metabolism, unabsorbed drug in feces, biliary excretion, protein binding, active metabolites, and saturation. Liberation can occur in the stomach or intestine. Metabolism can create active or inactive products. Excretion is physical removal; metabolism is chemical change. The graph represents a hypothetical compound. Real medicine facts are provided separately. No clinical dose or patient is represented. Published half-lives appear only in the separate medicine reference panel. Tissue exchange affects the simulated blood decline.": "ยาจริงต่างจากสารสมมตินี้ แบบจำลองรวมการแตกตัวและละลายเป็นการปลดปล่อยเดียว อันดับหนึ่งใช้สมการปลดปล่อยสะสม ส่วนการดูดซึมและกระจาย/กำจัดใช้ Euler ขั้นละ 0.01 ชั่วโมง ไม่รวมการระบายกระเพาะ การเปลี่ยนยาที่ลำไส้ ยาที่ไม่ดูดซึมออกทางอุจจาระ การขับทางน้ำดี การจับโปรตีน ฤทธิ์ของเมแทบอไลต์ หรือการอิ่มตัว การปลดปล่อยเกิดในกระเพาะหรือลำไส้ได้ การเปลี่ยนยาอาจให้ผลิตภัณฑ์ที่มีหรือไม่มีฤทธิ์ การขับออกคือออกจากร่างกาย ส่วนการเปลี่ยนยาคือเปลี่ยนทางเคมี กราฟใช้สารสมมติ ข้อมูลยาจริงแยกต่างหาก ไม่แทนขนาดยาหรือผู้ป่วยจริง ครึ่งชีวิตที่ตีพิมพ์อยู่ในส่วนอ้างอิง การแลกเปลี่ยนเนื้อเยื่อมีผลต่อการลดลงในเลือด",
  "Parameter transparency:": "ที่มาของพารามิเตอร์:",
  "All release, absorption, first-pass, tissue-exchange, metabolic, and renal rate settings below are selected teaching assumptions for the hypothetical compound. Named medicine facts are separate from this simulation. All rate constants have illustrative units of h⁻¹. First-pass fractions are particularly uncertain and are not inferred from the total amount metabolised.": "อัตราปลดปล่อย ดูดซึม ผ่านครั้งแรก แลกเปลี่ยนเนื้อเยื่อ เปลี่ยนแปลงยา และขับทางไตล้วนเป็นข้อสมมติเพื่อการสอน ข้อมูลยาที่มีชื่อแยกจากแบบจำลอง ค่าคงที่อัตราใช้หน่วย h⁻¹ สัดส่วนผ่านครั้งแรกมีความไม่แน่นอนมากและไม่ได้อนุมานจากปริมาณที่เปลี่ยนรูปทั้งหมด",
  "Preset": "ค่าตั้งต้น",
  "Release": "ปลดปล่อย",
  "First pass": "ผ่านครั้งแรก",
  "To tissue / back": "ไปเนื้อเยื่อ / กลับ",
  "Unchanged renal": "ขับยาที่ไม่เปลี่ยนรูปทางไต",
  "The metabolite excretion rate is 0.30 h⁻¹. Total drug-equivalent amount equals the amount administered so far (100 units per dose). Complete uptake and renal-only final removal are simplifying assumptions; they do not describe every real medicine.": "อัตราขับเมแทบอไลต์ = 0.30 h⁻¹ ปริมาณรวมในหน่วยเทียบเท่ายาเท่ากับปริมาณที่ให้แล้ว (100 หน่วยต่อครั้ง) การรับเข้าครบและขับออกสุดท้ายทางไตเท่านั้นเป็นข้อสมมติที่ลดความซับซ้อน ไม่ได้อธิบายยาจริงทุกชนิด",
  "Classroom prompts: Which process is slowed by slower tablet dissolution or erosion? How does release rate affect peak amount and time to peak? Why does disposition half-life stay the same when absorption changes? When can flip-flop kinetics appear? Why does tissue drug return to blood? Can metabolism happen while absorption continues? Use the guided scenarios and the question bank to test these ideas.": "คำถามในชั้น: การละลายหรือกร่อนช้าลงทำให้กระบวนการใดช้าลง? อัตราปลดปล่อยมีผลต่อค่าสูงสุดและเวลาถึงค่านั้นอย่างไร? ทำไมครึ่งชีวิตการกระจาย/กำจัดคงเดิมเมื่อดูดซึมเปลี่ยน? flip-flop เกิดเมื่อใด? ทำไมยาจากเนื้อเยื่อกลับเข้าเลือด? เปลี่ยนแปลงยาระหว่างที่ยังดูดซึมได้หรือไม่? ใช้สถานการณ์และคลังคำถามเพื่อทดสอบแนวคิด",
  "Route background:": "ความรู้พื้นฐานเกี่ยวกับเส้นทาง:",
  "NCBI Bookshelf: Pharmacokinetics and pharmacodynamics": "NCBI Bookshelf: เภสัชจลนศาสตร์และเภสัชพลศาสตร์",
  ". SC uptake background:": "ความรู้พื้นฐานเกี่ยวกับการดูดซึม SC:",
  "Mechanistic determinants of SC absorption": "ปัจจัยเชิงกลไกของการดูดซึมใต้ผิวหนัง",
  "Further reading:": "อ่านเพิ่มเติม:",
  "NIH pharmacology miniseries": "บทเรียนเภสัชวิทยาชุดสั้นจาก NIH",
  "NICHD: About pharmacology": "NICHD: เกี่ยวกับเภสัชวิทยา",
  "Illustration credits & licences": "เครดิตภาพและสิทธิ์การใช้",
  "Embedded, unmodified SVG illustrations from SVG Repo. Each source page lists CC0. Figures are simplified icons, not anatomical teaching plates.": "ภาพ SVG จาก SVG Repo ฝังไว้โดยไม่ดัดแปลง หน้าแหล่งข้อมูลระบุ CC0 เป็นไอคอนแบบย่อ ไม่ใช่ภาพกายวิภาคโดยละเอียด",
  "Digestive System · SVG Repo": "ระบบย่อยอาหาร · SVG Repo",
  "Liver · SVG Repo": "ตับ · SVG Repo",
  "Kidneys · SVG Repo": "ไต · SVG Repo",
  "CC0 1.0 public-domain dedication": "CC0 1.0 อุทิศให้เป็นสาธารณสมบัติ",
  ". Images are embedded so this file works offline. Source links require internet access.": "ฝังภาพไว้ให้ทำงานออฟไลน์ได้ ลิงก์อ้างอิงต้องใช้อินเทอร์เน็ต",
  "Version & diagnostics · v3.1.5": "รุ่นและการตรวจสอบ · v3.1.5",
  "Build:": "บิลด์:",
  "Model:": "แบบจำลอง:",
  "Known limitation:": "ข้อจำกัดที่ทราบ:",
  "The model represents a hypothetical compound. Mass balance compares all compartments with the amount administered so far. A pass confirms arithmetic consistency, not clinical accuracy.": "แบบจำลองใช้สารสมมติ สมดุลมวลเปรียบเทียบผลรวมทุกส่วนกับปริมาณที่ให้แล้ว การผ่านเกณฑ์ยืนยันความสอดคล้องทางคณิตศาสตร์ ไม่ใช่ความแม่นยำทางคลินิก",
  "At 1×, one real second represents 21 simulated minutes. Playback speed changes the animation only.": "ที่ 1× หนึ่งวินาทีจริงแทน 21 นาทีจำลอง ความเร็วเล่นเปลี่ยนเฉพาะภาพเคลื่อนไหว",
  "Download debug report": "ดาวน์โหลดรายงานตรวจสอบ",
  "Clear event history": "ล้างประวัติเหตุการณ์",
  "Session-only event history; no automatic uploads or persistent storage.": "ประวัติเหตุการณ์อยู่เฉพาะระหว่างใช้งาน ไม่มีอัปโหลดอัตโนมัติหรือเก็บถาวร",
  "Version 3.1.5 · Build 20261110-count-only-mode · Educational simulation for introductory pharmacology. Not a dosing calculator.": "รุ่น 3.1.5 · บิลด์ 20261110-count-only-mode · แบบจำลองเพื่อเรียนเภสัชวิทยาเบื้องต้น ไม่ใช่เครื่องคำนวณขนาดยา",
  "▶ Start simulation": "▶ เริ่มจำลอง",
  "↺ Reset": "↺ เริ่มใหม่",
  "Speed": "ความเร็ว",
  "One morning dose": "ครั้งเดียวตอนเช้า",
  "Morning and evening": "เช้าและเย็น",
  "Every 8 hours": "ทุก 8 ชั่วโมง",
  "Missed evening dose": "ลืมครั้งเย็น",
  "Late evening dose": "ครั้งเย็นล่าช้า",
  "Generic compound": "สารสมมติทั่วไป",
  "Hypothetical compound · route comparison only": "สารสมมติ · ใช้เปรียบเทียบเส้นทางเท่านั้น",
  "Same compound, different route": "สารเดียวกัน ต่างเส้นทาง",
  "This generic example isolates how a drug enters circulation. The injection models are not instructions for administering any named medicine.": "ตัวอย่างนี้แยกให้เห็นวิธีที่ยาเข้าสู่การไหลเวียน แบบจำลองการฉีดไม่ใช่คำแนะนำให้ฉีดยาที่มีชื่อใด ๆ",
  "Not applicable": "ไม่เกี่ยวข้อง",
  "An oral solid releases drug before absorption.": "ยากินชนิดแข็งปลดปล่อยยาก่อนดูดซึม",
  "The oral example absorbs from the gut through portal blood.": "ตัวอย่างยากินดูดซึมจากลำไส้ผ่านเลือดพอร์ทัล",
  "All routes use the same reversible blood–tissue exchange.": "ทุกเส้นทางใช้การแลกเปลี่ยนเลือด–เนื้อเยื่อแบบย้อนกลับได้เหมือนกัน",
  "The liver can metabolise circulating drug after every route. Bypassing first pass does not bypass later metabolism.": "ตับเปลี่ยนแปลงยาที่ไหลเวียนได้หลังให้ยาทุกเส้นทาง การข้ามการผ่านครั้งแรกไม่ได้ข้ามการเปลี่ยนแปลงยาภายหลัง",
  "Kidneys remove unchanged drug and metabolites in this simplified model.": "ไตขับยาที่ไม่เปลี่ยนรูปและเมแทบอไลต์ในแบบจำลองอย่างง่ายนี้",
  "Analgesic & antipyretic · pain and fever": "ยาบรรเทาปวดและลดไข้",
  "Mostly changed in the liver": "ส่วนใหญ่เปลี่ยนแปลงที่ตับ",
  "Paracetamol is also called acetaminophen. It relieves pain and fever; its anti-inflammatory action is weak. Most is chemically changed in the liver before its products leave in urine.": "พาราเซตามอลเรียกอีกชื่อว่า acetaminophen บรรเทาปวดและลดไข้ แต่ต้านการอักเสบได้น้อย ส่วนใหญ่เปลี่ยนทางเคมีที่ตับก่อนผลิตภัณฑ์ออกทางปัสสาวะ",
  "This example represents an immediate-release oral solid, not an extended-release product.": "ตัวอย่างนี้แทนยากินชนิดแข็งที่ปลดปล่อยทันที ไม่ใช่ชนิดออกฤทธิ์ยาว",
  "The product information reports peak plasma levels about 30 minutes to 2 hours after ingestion.": "ข้อมูลผลิตภัณฑ์รายงานระดับสูงสุดในพลาสมาประมาณ 30 นาทีถึง 2 ชั่วโมงหลังรับประทาน",
  "Protein binding is low at usual therapeutic concentrations. This model does not simulate binding.": "ที่ความเข้มข้นในการรักษาปกติมีการจับโปรตีนต่ำ แบบจำลองนี้ไม่จำลองการจับโปรตีน",
  "The liver mainly forms glucuronide and sulfate conjugates. A small reactive pathway is omitted from this teaching model.": "ตับสร้างสารจับคู่กลูคูโรไนด์และซัลเฟตเป็นหลัก แบบจำลองสอนไม่รวมเส้นทางส่วนน้อยที่สร้างสารไวต่อปฏิกิริยา",
  "Less than 5% is reported to leave as unchanged paracetamol; most urinary material consists of metabolites.": "รายงานว่าขับออกเป็นพาราเซตามอลที่ไม่เปลี่ยนรูปน้อยกว่า 5% สารในปัสสาวะส่วนใหญ่เป็นเมแทบอไลต์",
  "NSAID · nonsteroidal anti-inflammatory drug": "NSAID · ยาต้านการอักเสบที่ไม่ใช่สเตียรอยด์",
  "Pain relief with anti-inflammatory action": "บรรเทาปวดและต้านการอักเสบ",
  "Ibuprofen is an NSAID used for pain and inflammation. It is rapidly metabolised; drug-related material leaves mainly in urine. Its class differs from paracetamol even though their blood-level timings can overlap.": "ไอบูโพรเฟนเป็น NSAID ใช้กับอาการปวดและอักเสบ เปลี่ยนแปลงยาเร็ว สารที่เกี่ยวกับยาขับออกทางปัสสาวะเป็นหลัก เป็นยาคนละกลุ่มกับพาราเซตามอล แม้ช่วงเวลาระดับในเลือดอาจใกล้กัน",
  "This preset represents a conventional oral tablet. Product formulations can differ.": "ค่าตั้งต้นนี้แทนยาเม็ดกินทั่วไป แต่ละผลิตภัณฑ์อาจมีรูปแบบต่างกัน",
  "The label reports peak blood levels in 1–2 hours. A meal can slow absorption without greatly changing its extent.": "ฉลากรายงานระดับสูงสุดในเลือดที่ 1–2 ชั่วโมง อาหารอาจทำให้ดูดซึมช้าลงโดยไม่เปลี่ยนปริมาณรวมที่ดูดซึมมากนัก",
  "Distribution is more complex than the two pools shown here; the tissue exchange rates are teaching assumptions.": "การกระจายจริงซับซ้อนกว่าสองแหล่งที่แสดง อัตราแลกเปลี่ยนเนื้อเยื่อเป็นข้อสมมติเพื่อการสอน",
  "Ibuprofen is rapidly metabolised. This preset directs most elimination through the metabolite pathway.": "ไอบูโพรเฟนเปลี่ยนแปลงเร็ว ค่าตั้งต้นนี้ให้กำจัดส่วนใหญ่ผ่านเส้นทางเมแทบอไลต์",
  "Urine contains metabolites and conjugated material; the label reports only a small fraction as free ibuprofen.": "ปัสสาวะมีเมแทบอไลต์และสารจับคู่ ฉลากรายงานไอบูโพรเฟนอิสระเพียงส่วนน้อย",
  "Penicillin-class antibiotic · antibacterial": "ยาปฏิชีวนะกลุ่มเพนิซิลลิน · ต้านแบคทีเรีย",
  "Much of the drug leaves unchanged": "ยาส่วนมากออกโดยไม่เปลี่ยนรูป",
  "Amoxicillin inhibits bacterial cell-wall synthesis. It is an antibiotic, not a general pain medicine. Its journey highlights renal excretion of unchanged drug rather than extensive liver conversion.": "อะม็อกซีซิลลินยับยั้งการสร้างผนังเซลล์แบคทีเรีย เป็นยาปฏิชีวนะ ไม่ใช่ยาแก้ปวดทั่วไป เส้นทางยาเน้นการขับยาที่ไม่เปลี่ยนรูปทางไต มากกว่าการเปลี่ยนที่ตับอย่างมาก",
  "About 1 hour": "ประมาณ 1 ชั่วโมง",
  "This example represents a conventional oral solid. Amoxicillin is also available in liquid formulations.": "ตัวอย่างนี้แทนยากินชนิดแข็งทั่วไป อะม็อกซีซิลลินมีชนิดน้ำด้วย",
  "The label reports rapid oral absorption and peak levels in 1–2 hours for capsules. Full absorption here is a simplifying assumption.": "ฉลากรายงานการดูดซึมยากินเร็วและระดับสูงสุดที่ 1–2 ชั่วโมงสำหรับแคปซูล การดูดซึมครบที่นี่เป็นข้อสมมติลดความซับซ้อน",
  "Amoxicillin reaches many tissues and fluids. The label reports approximately 20% serum protein binding; binding is not modelled.": "อะม็อกซีซิลลินเข้าถึงเนื้อเยื่อและของเหลวหลายชนิด ฉลากรายงานการจับโปรตีนในซีรัมประมาณ 20% แบบจำลองไม่รวมการจับโปรตีน",
  "This example uses little metabolic conversion and zero first-pass loss as teaching assumptions, not measured extraction fractions.": "ตัวอย่างสมมติให้เปลี่ยนแปลงยาน้อยและไม่สูญเสียเมื่อผ่านครั้งแรก ไม่ใช่สัดส่วนสกัดที่วัดจริง",
  "Most amoxicillin is excreted unchanged in urine. The label reports approximately 60% of an oral dose in urine within 6–8 hours.": "อะม็อกซีซิลลินส่วนใหญ่ขับออกทางปัสสาวะโดยไม่เปลี่ยนรูป ฉลากรายงานประมาณ 60% ของยากินออกในปัสสาวะภายใน 6–8 ชั่วโมง",
  "Hypothetical hydrophilic compound": "สารชอบน้ำสมมติ",
  "Hypothetical slow-removal compound": "สารสมมติที่กำจัดช้า",
  "Release from the tablet (liberation)": "ปลดปล่อยจากยาเม็ด (liberation)",
  "The tablet breaks apart and the active drug dissolves in digestive fluid. Dissolved drug is available for absorption. Release can occur in the stomach or intestine.": "ยาเม็ดแตกตัวและตัวยาละลายในน้ำย่อย ยาที่ละลายพร้อมให้ดูดซึม การปลดปล่อยเกิดในกระเพาะหรือลำไส้ได้",
  "From the gut into blood": "จากลำไส้เข้าสู่เลือด",
  "Dissolved drug crosses the gut wall, mainly in the small intestine, and enters portal blood. It travels to the liver before reaching the wider circulation.": "ยาที่ละลายผ่านผนังทางเดินอาหาร โดยมากที่ลำไส้เล็ก เข้าสู่เลือดพอร์ทัล แล้วไปตับก่อนการไหลเวียนทั่วร่างกาย",
  "Unchanged drug moves between systemic blood and body tissues. It does not know where to go; blood flow and the drug’s properties influence where it reaches.": "ยาที่ไม่เปลี่ยนรูปเคลื่อนระหว่างเลือดกับเนื้อเยื่อ ยาไม่รู้ว่าต้องไปที่ใด การไหลเวียนเลือดและคุณสมบัติยามีผลต่อบริเวณที่เข้าถึง",
  "The body changes the drug": "ร่างกายเปลี่ยนแปลงยา",
  "Enzymes, often in the liver, chemically change drug into metabolites. Some change happens on the first pass, before systemic circulation; more can happen later. Metabolites can circulate in blood and enter tissues; some remain active. This model combines their blood and tissue amounts in one pool.": "เอนไซม์ซึ่งมักอยู่ที่ตับเปลี่ยนโครงสร้างยาเป็นเมแทบอไลต์ บางส่วนเปลี่ยนเมื่อผ่านครั้งแรกก่อนเข้าเลือดทั่วร่างกาย และเปลี่ยนต่อภายหลังได้ เมแทบอไลต์ไหลเวียนในเลือดและเข้าเนื้อเยื่อได้ บางชนิดยังมีฤทธิ์ แบบจำลองรวมปริมาณในเลือดและเนื้อเยื่อเป็นแหล่งเดียว",
  "Drug-related material leaves": "สารที่เกี่ยวกับยาออกจากร่างกาย",
  "Kidneys can remove unchanged drug and metabolites into urine. This model shows that route. In real life, some drugs or metabolites also leave in bile and feces.": "ไตขับยาที่ไม่เปลี่ยนรูปและเมแทบอไลต์เข้าปัสสาวะได้ แบบจำลองแสดงเส้นทางนี้ ในความจริงยาหรือเมแทบอไลต์บางชนิดออกทางน้ำดีและอุจจาระด้วย",
  "No solid-release step": "ไม่มีขั้นปลดปล่อยจากของแข็ง",
  "Bypassed by IV bolus": "IV bolus ข้ามขั้นนี้",
  "From the SC depot into blood": "จากแหล่ง SC เข้าสู่เลือด",
  "Hypothetical compound · illustrative model": "สารสมมติ · แบบจำลองประกอบการเรียน",
  "IV solution is already available: there is no tablet liberation step.": "สารละลาย IV พร้อมใช้แล้ว จึงไม่มีขั้นปลดปล่อยจากยาเม็ด",
  "Each IV bolus enters blood directly at its scheduled time. There is no absorption phase or gut/liver first-pass step.": "IV bolus แต่ละครั้งเข้าเลือดโดยตรงตามเวลาที่กำหนด ไม่มีช่วงดูดซึมหรือผ่านลำไส้/ตับครั้งแรก",
  "Drug moves from blood into tissues and can return to blood.": "ยาเคลื่อนจากเลือดเข้าเนื้อเยื่อและกลับเข้าเลือดได้",
  "IV bypasses initial first pass, but circulating drug can still be metabolised by the liver.": "IV ข้ามการผ่านครั้งแรก แต่ยาที่ไหลเวียนยังเปลี่ยนแปลงที่ตับได้",
  "Unchanged drug and metabolites can leave through the kidneys.": "ยาที่ไม่เปลี่ยนรูปและเมแทบอไลต์ออกทางไตได้",
  "This SC example begins as a dissolved solution under the skin, so tablet liberation is skipped.": "ตัวอย่าง SC เริ่มเป็นสารละลายใต้ผิวหนัง จึงข้ามการปลดปล่อยจากยาเม็ด",
  "Drug leaves the subcutaneous depot and enters systemic blood gradually. The model assumes complete uptake and bypasses gut/liver first pass.": "ยาออกจากแหล่งใต้ผิวหนังเข้าสู่เลือดทั่วร่างกายทีละน้อย สมมติรับเข้าได้ครบและข้ามการผ่านลำไส้/ตับครั้งแรก",
  "After absorption, drug exchanges between systemic blood and body tissues.": "หลังดูดซึม ยาแลกเปลี่ยนระหว่างเลือดทั่วร่างกายกับเนื้อเยื่อ",
  "SC bypasses gut/liver first pass. After entering circulation, drug can still undergo liver metabolism.": "SC ข้ามการผ่านลำไส้/ตับครั้งแรก หลังเข้าสู่การไหลเวียนแล้วยังเปลี่ยนแปลงที่ตับได้",
  "The kidneys remove drug and metabolites after they reach circulation.": "ไตขับยาและเมแทบอไลต์หลังเข้าสู่การไหลเวียน",
  "Generic teaching example; not a validated injectable medicine model.": "ตัวอย่างทั่วไปเพื่อการสอน ไม่ใช่แบบจำลองยาฉีดที่ผ่านการตรวจสอบกับข้อมูลจริง",
  "Enter a finite rate constant greater than zero.": "ใส่ค่าคงที่อัตราที่เป็นจำนวนจำกัดและมากกว่าศูนย์",
  "Active · changes affect the oral simulation": "เปิดใช้ · การปรับมีผลต่อแบบจำลองยากิน",
  "Not applicable · ": "ไม่เกี่ยวข้อง · ",
  "SC begins as a dissolved solution": "SC เริ่มเป็นสารละลาย",
  "IV begins directly in blood": "IV เริ่มในเลือดโดยตรง",
  "% of dose / h": "% ของยาหนึ่งครั้ง / ชั่วโมง",
  "No liberation calculation for this route.": "ไม่มีการคำนวณการปลดปล่อยสำหรับเส้นทางนี้",
  "Released fraction = min(1, r × max(0, t − lag) / 100)": "สัดส่วนที่ปลดปล่อย = min(1, r × max(0, t − lag) / 100)",
  "Released fraction = 1 − exp[−kL × max(0, t − lag)]": "สัดส่วนที่ปลดปล่อย = 1 − exp[−kL × max(0, t − lag)]",
  "Time to 50% release: ": "เวลาถึงการปลดปล่อย 50%: ",
  " h from administration": " ชั่วโมงหลังให้ยา",
  " · Release half-time after the delay: ": " · เวลาปลดปล่อยครึ่งหนึ่งหลังพ้นช่วงหน่วง: ",
  " · Not an elimination half-life": " · ไม่ใช่ครึ่งชีวิตการกำจัด",
  "Central elimination k₁₀ (h⁻¹)": "การกำจัดจากส่วนกลาง k₁₀ (h⁻¹)",
  "Blood → tissue k₁₂ (h⁻¹)": "เลือด → เนื้อเยื่อ k₁₂ (h⁻¹)",
  "Tissue → blood k₂₁ (h⁻¹)": "เนื้อเยื่อ → เลือด k₂₁ (h⁻¹)",
  "ln(2) / k₁₀, ignoring tissue exchange": "ln(2) / k₁₀ โดยไม่คิดการแลกเปลี่ยนเนื้อเยื่อ",
  "Terminal disposition β (h⁻¹)": "ค่า β ช่วงปลาย (h⁻¹)",
  "Terminal disposition half-life": "ครึ่งชีวิตการกระจาย/กำจัดช่วงปลาย",
  "Absorption half-time": "เวลาครึ่งหนึ่งของการดูดซึม",
  "Published reference half-life": "ครึ่งชีวิตอ้างอิงที่ตีพิมพ์",
  "Not applicable — hypothetical compound": "ไม่เกี่ยวข้อง — สารสมมติ",
  "Using these model parameters: t½,β = 0.693147 / ": "ใช้พารามิเตอร์นี้: t½,β = 0.693147 / ",
  " hours. This differs from simply dividing by k₁₀.": " ชั่วโมง ซึ่งต่างจากการหารด้วย k₁₀ เพียงอย่างเดียว",
  "Slow-input warning: release or absorption is slower than disposition. The final blood-level decline may reflect ongoing input (flip-flop kinetics), not β alone. ": "ข้อสังเกตเมื่อยาเข้าช้า: การปลดปล่อยหรือดูดซึมช้ากว่าการกระจาย/กำจัด การลดลงช่วงท้ายในเลือดอาจสะท้อนยาที่ยังเข้าอยู่ (flip-flop kinetics) ไม่ใช่ β อย่างเดียว ",
  "β describes disposition after input has ended or become negligible. ": "β อธิบายการกระจาย/กำจัดเมื่อยาเลิกเข้าหรือเข้าจนเหลือน้อยมากแล้ว ",
  "Zero-order input ends at ": "การเข้าของยาแบบอันดับศูนย์สิ้นสุดที่ ",
  " h; an earlier curve segment cannot be assumed to be a terminal decline. ": " ชั่วโมง ส่วนของกราฟก่อนหน้านั้นยังสรุปว่าเป็นการลดลงช่วงปลายไม่ได้ ",
  "The time for blood amount to halve after its peak is not necessarily the terminal half-life. These calculations describe the hypothetical compound.": "เวลาที่ปริมาณในเลือดลดครึ่งหนึ่งหลังจุดสูงสุดไม่จำเป็นต้องเป็นครึ่งชีวิตช่วงปลาย การคำนวณเหล่านี้ใช้กับสารสมมติ",
  " units released across doses given so far. The release graph shows one dose.": " หน่วยถูกปลดปล่อยรวมจากทุกครั้งที่ให้แล้ว กราฟปลดปล่อยแสดงหนึ่งครั้ง",
  "Liberation skipped for this route.": "ข้ามการปลดปล่อยสำหรับเส้นทางนี้",
  "Hypothetical experiment": "การทดลองสมมติ",
  "Hypothetical liberation experiment": "การทดลองปลดปล่อยยาสมมติ",
  "┄ Standard removal · same doses and inputs": "┄ กำจัดมาตรฐาน · ปริมาณและการเข้าเหมือนกัน",
  "┄ Standard distribution · same inputs": "┄ กระจายมาตรฐาน · การเข้าเหมือนกัน",
  "Slow removal: more parent drug remains when the next dose arrives. Compare the grey curve with standard removal and identical doses. Rates and target limits are invented for teaching.": "กำจัดช้า: ยาต้นแบบเหลือมากขึ้นเมื่อให้ครั้งถัดไป เทียบกับเส้นสีเทาซึ่งกำจัดมาตรฐานและให้ยาเหมือนกัน อัตราและขีดจำกัดเป้าหมายสมมติขึ้นเพื่อการสอน",
  "Hydrophilic means water-loving. This experiment reduces movement from blood into the tissue pool. Compare with the grey curve: input, metabolism and renal rates are identical. Tissue still receives some drug. These are invented rates, not measured NAC kinetics.": "Hydrophilic หมายถึงชอบน้ำ การทดลองนี้ลดยาที่เคลื่อนจากเลือดเข้าเนื้อเยื่อ เทียบกับเส้นสีเทาซึ่งมีการเข้า การเปลี่ยนแปลงยา และอัตราทางไตเท่ากัน เนื้อเยื่อยังรับยาบางส่วน อัตรานี้สมมติขึ้น ไม่ใช่จลนศาสตร์ NAC ที่วัดจริง",
  "Standard hypothetical distribution. Choose the hydrophilic profile to explore reduced entry into the tissue pool.": "การกระจายสมมติแบบมาตรฐาน เลือกแบบชอบน้ำเพื่อสำรวจการเข้าเนื้อเยื่อที่ลดลง",
  "Oral preset (eventual F = 80%)": "ค่าตั้งต้นยากิน (F ในที่สุด = 80%)",
  "SC preset (ka = ": "ค่าตั้งต้น SC (ka = ",
  " h⁻¹; eventual F = 100%)": " h⁻¹; F ในที่สุด = 100%)",
  "IV bolus preset (F = 100%)": "ค่าตั้งต้น IV bolus (F = 100%)",
  "At 24 h: ": "ที่ 24 ชั่วโมง: ",
  " units have entered systemic blood unchanged; ": " หน่วยเข้าสู่เลือดทั่วร่างกายโดยไม่เปลี่ยนรูป; ",
  " units remain in the formulation or absorption depot. Eventual F per dose is ": " หน่วยยังอยู่ในรูปแบบยาหรือแหล่งรอดูดซึม F ในที่สุดต่อครั้งคือ ",
  "Input is unfinished: the 24-hour AUC ratio can substantially underestimate eventual F.": "ยายังเข้าไม่ครบ: อัตราส่วน AUC 24 ชั่วโมงอาจต่ำกว่า F ในที่สุดมาก",
  "Even with little input remaining, blood and tissue drug after 24 h contribute additional exposure.": "แม้ยายังรอเข้าเหลือน้อย แต่ยาในเลือดและเนื้อเยื่อหลัง 24 ชั่วโมงยังเพิ่มการสัมผัสยาได้",
  "Solid green: your ": "เส้นทึบเขียว: ค่าของคุณทาง ",
  " settings. Dashed: original route settings. Every curve uses the same dose times and 100 units per dose.": "เส้นประ: ค่าตั้งต้นของเส้นทาง ทุกเส้นใช้เวลาให้ยาเดียวกันและ 100 หน่วยต่อครั้ง",
  "24-hour preview · blood peak after each dose: ": "ภาพรวม 24 ชั่วโมง · ค่าสูงสุดในเลือดหลังยาแต่ละครั้ง: ",
  "Parent drug in blood + tissue just before later doses: ": "ยาต้นแบบในเลือด + เนื้อเยื่อ ก่อนครั้งถัดไป: ",
  "One dose only: no new dose is added to the remaining drug.": "ให้ครั้งเดียว: ไม่มีการเพิ่มยาครั้งใหม่เข้ากับยาที่เหลือ",
  " doses given · ": " ครั้งที่ให้แล้ว · ",
  " units administered": " หน่วยที่ให้แล้ว",
  ". Each dose adds 100 teaching units.": " แต่ละครั้งเพิ่ม 100 หน่วยสมมติ",
  " The 20:00 dose is skipped in this example.": " ตัวอย่างนี้ข้ามครั้ง 20:00",
  " the hypothetical target range (10–50 units)": " ช่วงเป้าหมายสมมติ (10–50 หน่วย)",
  "Most active now": "เด่นที่สุดขณะนี้",
  "Exchange continues": "ยังแลกเปลี่ยนอยู่",
  "Also active": "ทำงานร่วมด้วย",
  "Little / no activity": "กิจกรรมน้อย / ไม่มี",
  " net; gross exchange ": " สุทธิ; การแลกเปลี่ยนรวม ",
  "Drug is being released from the formulation into digestive fluid.": "ยากำลังปลดปล่อยจากรูปแบบยาเข้าสู่น้ำย่อย",
  "Drug is moving from ": "ยากำลังเคลื่อนจาก ",
  "the injection site": "บริเวณฉีด",
  " into blood.": " เข้าสู่เลือด",
  "Net drug movement is ": "การเคลื่อนสุทธิของยา ",
  "from blood into tissues.": "จากเลือดเข้าเนื้อเยื่อ",
  "from tissues back into blood.": "จากเนื้อเยื่อกลับเข้าเลือด",
  "Drug is being chemically changed into metabolites. They can circulate and enter tissues before excretion.": "ยากำลังเปลี่ยนทางเคมีเป็นเมแทบอไลต์ ซึ่งไหลเวียนและเข้าเนื้อเยื่อได้ก่อนขับออก",
  "Unchanged drug and metabolites are leaving in urine.": "ยาที่ไม่เปลี่ยนรูปและเมแทบอไลต์กำลังออกทางปัสสาวะ",
  "Waiting for release to begin": "รอเริ่มปลดปล่อยยา",
  "Very little transfer at this time": "ถ่ายโอนน้อยมากขณะนี้",
  " is most active now": " เด่นที่สุดขณะนี้",
  "The formulation delay has not ended yet.": "ยังไม่พ้นช่วงหน่วงของรูปแบบยา",
  "Small amounts can remain even when transfer rates are very low.": "อาจยังมียาปริมาณน้อย แม้อัตราถ่ายโอนต่ำมาก",
  " At the same time: ": " ในเวลาเดียวกัน: ",
  " Blood–tissue exchange continues in both directions.": " การแลกเปลี่ยนเลือด–เนื้อเยื่อยังเกิดทั้งสองทิศ",
  " The IV bolus has already entered the blood.": " IV bolus เข้าสู่เลือดแล้ว",
  "% first-pass change = ": "% ที่เปลี่ยนเมื่อผ่านครั้งแรก = ",
  "F = 100% · the IV bolus enters circulating blood directly.": "F = 100% · IV bolus เข้าสู่เลือดที่ไหลเวียนโดยตรง",
  "F = 100% · complete eventual uptake from the SC depot is assumed.": "F = 100% · สมมติว่ารับยาจากแหล่ง SC ได้ครบในที่สุด",
  "This model assumes complete eventual uptake from the gut. Only the first-pass fraction reduces F; slower release or absorption changes timing. Real oral bioavailability also depends on incomplete absorption and drug changes in the gut wall.": "แบบจำลองสมมติรับยาจากลำไส้ได้ครบในที่สุด มีเฉพาะสัดส่วนผ่านครั้งแรกที่ลด F การปลดปล่อยหรือดูดซึมช้าเปลี่ยนเวลา ในความจริง F ของยากินยังขึ้นกับการดูดซึมไม่ครบและการเปลี่ยนยาที่ผนังลำไส้",
  "Real SC bioavailability can be less than 100%. This simplified example assumes complete uptake and no loss before reaching circulating blood.": "F ของ SC จริงอาจต่ำกว่า 100% ตัวอย่างอย่างง่ายสมมติรับเข้าได้ครบและไม่สูญเสียก่อนถึงเลือดที่ไหลเวียน",
  "IV bioavailability is 100% by definition. Distribution and elimination can reduce the amount remaining in blood after the bolus.": "F ของ IV เท่ากับ 100% ตามนิยาม การกระจายและกำจัดทำให้ยาเหลือในเลือดน้อยลงหลัง bolus ได้",
  "Enter finite values: oral AUC may be zero; IV AUC and both doses must be greater than zero.": "ใส่ค่าที่เป็นจำนวนจำกัด: AUC ยากินเป็นศูนย์ได้ แต่ AUC IV และปริมาณยาทั้งสองต้องมากกว่าศูนย์",
  "This apparent value exceeds 100%. Check the units, inputs and comparison assumptions; it should not be interpreted as a true fraction above 100%.": "ค่าที่คำนวณเกิน 100% ตรวจหน่วย ข้อมูล และข้อสมมติในการเปรียบเทียบ ไม่ควรตีความว่าเป็นสัดส่วนจริงเกิน 100%",
  "With these example values, ": "จากค่าตัวอย่างนี้ ",
  "% of the oral dose reaches circulating blood unchanged.": "% ของยากินเข้าสู่เลือดที่ไหลเวียนโดยไม่เปลี่ยนรูป",
  " simulated hours": " ชั่วโมงจำลอง",
  "Why can repeated doses raise toxicity risk when removal is slow?": "ทำไมการให้ซ้ำเพิ่มความเสี่ยงพิษเมื่อกำจัดช้า?",
  "New doses add to drug still in the body": "ยาครั้งใหม่เพิ่มจากยาที่ยังเหลือในร่างกาย",
  "Each dose clears the previous dose": "ยาแต่ละครั้งล้างยาครั้งก่อนออก",
  "Correct. Remaining drug plus each new dose can raise exposure and toxicity risk; the model’s upper limit is only a teaching boundary.": "ถูกต้อง ยาที่เหลือรวมกับครั้งใหม่เพิ่มการสัมผัสยาและความเสี่ยงพิษได้ ขีดจำกัดในแบบจำลองเป็นเพียงเกณฑ์เพื่อการสอน",
  "Try again. A new dose does not clear the previous dose, so slow removal allows drug to build up.": "ลองอีกครั้ง ยาครั้งใหม่ไม่ล้างยาครั้งก่อน การกำจัดช้าจึงทำให้สะสมได้",
  "In the hydrophilic experiment, what changes when movement from blood into tissues is reduced?": "ในการทดลองสารชอบน้ำ เมื่อยาจากเลือดเข้าเนื้อเยื่อน้อยลง อะไรเปลี่ยน?",
  "Less drug enters the tissue pool initially": "ยาที่เข้าเนื้อเยื่อในช่วงแรกน้อยลง",
  "No drug can ever reach any tissue": "ยาไม่มีทางเข้าเนื้อเยื่อใดได้เลย",
  "Correct. Reduced entry lowers early tissue uptake in this experiment; it does not prevent all tissue access.": "ถูกต้อง การเข้าที่ลดลงทำให้เนื้อเยื่อรับยาช่วงแรกน้อยลง แต่ไม่ได้ปิดกั้นการเข้าถึงเนื้อเยื่อทั้งหมด",
  "Try again. Water-loving properties do not make every tissue inaccessible; the model still allows entry and return.": "ลองอีกครั้ง ความชอบน้ำไม่ได้ทำให้เข้าเนื้อเยื่อทุกชนิดไม่ได้ แบบจำลองยังให้ยาเข้าและกลับได้",
  "When an evening dose is given, what happens to drug already in the body?": "เมื่อให้ยาครั้งเย็น ยาที่มีอยู่ในร่างกายเป็นอย่างไร?",
  "It can overlap with the new dose": "ซ้อนกับยาครั้งใหม่ได้",
  "The body resets to zero": "ร่างกายกลับเป็นศูนย์",
  "Correct. The new dose joins any drug still in the blood, tissues or other compartments. The body does not reset between doses.": "ถูกต้อง ครั้งใหม่รวมกับยาที่ยังอยู่ในเลือด เนื้อเยื่อ หรือส่วนอื่น ร่างกายไม่ได้กลับเป็นศูนย์ระหว่างครั้ง",
  "Try again. Drug from an earlier dose can still be present when a later dose arrives.": "ลองอีกครั้ง ยาครั้งก่อนอาจยังอยู่เมื่อให้ครั้งถัดไป",
  "Does the green band prove that a real medicine is effective or safe?": "แถบเขียวพิสูจน์ว่ายาจริงได้ผลหรือปลอดภัยหรือไม่?",
  "No — it is an invented teaching target": "ไม่ใช่ — เป็นเป้าหมายสมมติเพื่อการสอน",
  "Yes — it proves the medicine works": "ใช่ — พิสูจน์ว่ายาได้ผล",
  "Correct. The band is a hypothetical amount range. Real therapeutic targets depend on the medicine, measured concentrations, patient and response.": "ถูกต้อง แถบนี้คือช่วงปริมาณสมมติ เป้าหมายการรักษาจริงขึ้นกับยา ความเข้มข้นที่วัด ผู้ป่วย และการตอบสนอง",
  "Try again. These units and the target band are invented for this lesson.": "ลองอีกครั้ง หน่วยและช่วงเป้าหมายสมมติขึ้นสำหรับบทเรียนนี้",
  "If bioavailability is 60%, does that mean 60% of the dose is in blood at every moment?": "ถ้า F = 60% แปลว่ามี 60% ของยาอยู่ในเลือดตลอดเวลาหรือไม่?",
  "No — it is the fraction that reaches blood unchanged": "ไม่ใช่ — เป็นสัดส่วนที่เข้าถึงเลือดโดยไม่เปลี่ยนรูป",
  "Yes — that amount stays in blood": "ใช่ — ปริมาณนั้นคงอยู่ในเลือด",
  "Correct. Bioavailability describes entry into circulating blood. Distribution, metabolism and excretion change how much is in blood at a particular time.": "ถูกต้อง F อธิบายการเข้าสู่เลือดที่ไหลเวียน การกระจาย เปลี่ยนแปลงยา และขับออกเปลี่ยนปริมาณที่อยู่ในเลือดแต่ละขณะ",
  "Try again. Reaching blood and remaining in blood are different. Follow the amounts as time passes.": "ลองอีกครั้ง การเข้าถึงเลือดกับการเหลืออยู่ในเลือดต่างกัน ติดตามปริมาณเมื่อเวลาผ่านไป",
  "If more drug is changed during the first pass, what happens to the peak amount of unchanged drug in blood?": "ถ้ายาเปลี่ยนรูปมากขึ้นเมื่อผ่านครั้งแรก ปริมาณสูงสุดของยาที่ไม่เปลี่ยนรูปในเลือดเป็นอย่างไร?",
  "It decreases": "ลดลง",
  "It increases": "เพิ่มขึ้น",
  "It stays the same": "เท่าเดิม",
  "Correct. A larger first-pass fraction removes more drug before it reaches systemic blood, so the peak of unchanged drug falls.": "ถูกต้อง สัดส่วนผ่านครั้งแรกที่มากขึ้นลดรูปเดิมก่อนถึงเลือดทั่วร่างกาย ค่าสูงสุดของยาที่ไม่เปลี่ยนรูปจึงลดลง",
  "Try again. First-pass metabolism occurs before the drug reaches the systemic circulation.": "ลองอีกครั้ง การเปลี่ยนยาเมื่อผ่านครั้งแรกเกิดก่อนยาถึงการไหลเวียนทั่วร่างกาย",
  "If you slow tablet dissolution / erosion, what usually happens to the peak amount in blood?": "ถ้าทำให้ยาเม็ดละลาย / กร่อนช้าลง ปริมาณสูงสุดในเลือดมักเป็นอย่างไร?",
  "Correct. Slower liberation spreads the dose over time, lowering and usually delaying the peak.": "ถูกต้อง การปลดปล่อยช้ากระจายการเข้าไปตามเวลา ทำให้ค่าสูงสุดลดและมักมาช้าลง",
  "Try again. Slower release typically reduces the peak amount and delays the peak.": "ลองอีกครั้ง การปลดปล่อยช้ามักลดค่าสูงสุดและทำให้มาช้าลง",
  "Does changing release or absorption change the disposition half-life set by this model’s distribution and elimination rates?": "การเปลี่ยนอัตราปลดปล่อยหรือดูดซึมเปลี่ยนครึ่งชีวิตที่กำหนดโดยการกระจายและกำจัดในแบบจำลองนี้หรือไม่?",
  "No — disposition half-life stays the same": "ไม่ — ครึ่งชีวิตการกระจาย/กำจัดเท่าเดิม",
  "Yes — disposition half-life changes": "ใช่ — ครึ่งชีวิตการกระจาย/กำจัดเปลี่ยน",
  "Only for IV": "เฉพาะ IV",
  "Correct. Disposition half-life is set by distribution and elimination. Slow ongoing input can still change the final slope you observe in blood (flip-flop kinetics).": "ถูกต้อง ครึ่งชีวิตนี้กำหนดโดยการกระจายและกำจัด แต่ยาที่ยังเข้าช้าอาจเปลี่ยนความชันช่วงท้ายที่สังเกตในเลือด (flip-flop kinetics)",
  "Try again. In this model the terminal disposition half-life does not depend on ka or release rate under usual conditions.": "ลองอีกครั้ง ในแบบจำลองนี้ครึ่งชีวิตการกระจาย/กำจัดช่วงปลายไม่ขึ้นกับ ka หรืออัตราปลดปล่อยภายใต้เงื่อนไขปกติ",
  "Which route starts with all of the input already in systemic blood at time zero?": "เส้นทางใดเริ่มโดยยาทั้งหมดอยู่ในเลือดทั่วร่างกายแล้วที่เวลาเป็นศูนย์?",
  "SC solution": "สารละลาย SC",
  "Correct. An IV bolus places 100% in systemic blood at t = 0. SC and oral must still absorb.": "ถูกต้อง IV bolus นำ 100% เข้าเลือดทั่วร่างกายที่ t = 0 ส่วน SC และยากินยังต้องดูดซึม",
  "Try again. Only the IV bolus starts fully in systemic blood.": "ลองอีกครั้ง มีเฉพาะ IV bolus ที่เริ่มอยู่ในเลือดทั่วร่างกายครบแล้ว",
  "Can metabolism and excretion still be active while absorption is continuing?": "การเปลี่ยนแปลงยาและการขับออกเกิดขณะยังดูดซึมอยู่ได้หรือไม่?",
  "Yes — processes overlap": "ได้ — กระบวนการซ้อนกัน",
  "No — they wait until absorption finishes": "ไม่ได้ — ต้องรอดูดซึมเสร็จ",
  "Correct. LADME processes overlap in time. The activity bands show several processes running together.": "ถูกต้อง กระบวนการ LADME ซ้อนกันในเวลา แถบกิจกรรมแสดงหลายกระบวนการทำงานร่วมกัน",
  "Try again. Look at the activity bands: several processes can be active at the same moment.": "ลองอีกครั้ง ดูแถบกิจกรรม หลายกระบวนการทำงานในเวลาเดียวกันได้",
  "With zero-order release at 20% of the starting dose per hour and no delay, when is all the drug released?": "ถ้าปลดปล่อยอันดับศูนย์ที่ 20% ของยาเริ่มต้นต่อชั่วโมง โดยไม่หน่วง จะปลดปล่อยหมดเมื่อใด?",
  "After 5 hours": "หลัง 5 ชั่วโมง",
  "After 2 hours": "หลัง 2 ชั่วโมง",
  "It never finishes": "ไม่มีวันหมด",
  "Correct. 100% ÷ 20% per hour = 5 hours. The blood curve also depends on absorption, distribution and elimination.": "ถูกต้อง 100% ÷ 20% ต่อชั่วโมง = 5 ชั่วโมง กราฟเลือดยังขึ้นกับการดูดซึม กระจาย และกำจัด",
  "Try again. Divide 100% of the starting dose by 20% per hour.": "ลองอีกครั้ง นำ 100% ของยาเริ่มต้นหารด้วย 20% ต่อชั่วโมง",
  "Why does drug that has entered tissues later return to blood?": "ทำไมยาที่เข้าเนื้อเยื่อจึงกลับเข้าเลือดภายหลัง?",
  "Blood–tissue exchange is reversible": "การแลกเปลี่ยนเลือด–เนื้อเยื่อย้อนกลับได้",
  "Tissues only take drug up, never release it": "เนื้อเยื่อรับยาเท่านั้น ไม่เคยปล่อย",
  "Only the kidneys move drug back": "มีเฉพาะไตที่นำยากลับ",
  "Correct. The model uses reversible first-order exchange (k12 and k21). Net movement in this model depends on the amounts in blood and tissue and their exchange rates.": "ถูกต้อง แบบจำลองใช้การแลกเปลี่ยนอันดับหนึ่งที่ย้อนกลับได้ (k12 และ k21) การเคลื่อนสุทธิขึ้นกับปริมาณในเลือด เนื้อเยื่อ และอัตราแลกเปลี่ยน",
  "Try again. Distribution between blood and tissue is modelled as reversible.": "ลองอีกครั้ง แบบจำลองให้การกระจายระหว่างเลือดกับเนื้อเยื่อย้อนกลับได้",
  "In the SC model, where is the drug at time zero?": "ในแบบจำลอง SC ยาอยู่ที่ไหนเมื่อเวลาเป็นศูนย์?",
  "In the subcutaneous depot": "ในแหล่งยาใต้ผิวหนัง",
  "Already in systemic blood": "อยู่ในเลือดทั่วร่างกายแล้ว",
  "In the gut lumen": "ในช่องลำไส้",
  "Correct. SC starts as a dissolved depot under the skin that absorbs into blood over time.": "ถูกต้อง SC เริ่มเป็นแหล่งสารละลายใต้ผิวหนังที่ค่อย ๆ ดูดซึมเข้าเลือด",
  "Try again. SC begins in the injection-site depot, not in blood.": "ลองอีกครั้ง SC เริ่มที่แหล่งฉีด ไม่ใช่ในเลือด",
  "Accumulation comparison · one dose": "เปรียบเทียบการสะสม · ครั้งเดียว",
  "Give one oral dose of the same slow-removal compound. Compare with three doses to see what repeated dosing adds.": "ให้สารสมมติที่กำจัดช้าชนิดเดิมทางกินหนึ่งครั้ง เทียบกับสามครั้งเพื่อดูผลของการให้ซ้ำ",
  "The grey line still represents standard removal with the same single dose. Switch to Three doses · slow removal for the accumulation experiment. Total administered amount changes from 100 to 300 units; this is not a dose-normalized comparison.": "เส้นเทายังคงแทนการกำจัดมาตรฐานโดยให้ครั้งเดียวเหมือนกัน เลือกสามครั้ง · กำจัดช้าเพื่อทดลองการสะสม ปริมาณรวมเปลี่ยนจาก 100 เป็น 300 หน่วย การเปรียบเทียบนี้ไม่ได้ปรับให้ปริมาณยาเท่ากัน",
  "Accumulation · slower removal": "การสะสม · กำจัดช้าลง",
  "Give three oral doses, 8 hours apart. Watch later peaks rise as new drug joins what remains. Compare with standard removal (grey).": "ให้ทางกินสามครั้ง ห่างกัน 8 ชั่วโมง ดูยอดครั้งหลังสูงขึ้นเมื่อยาใหม่รวมกับยาที่เหลือ เทียบกับการกำจัดมาตรฐาน (สีเทา)",
  "The red area above 50 units marks the hypothetical upper limit. Higher exposure can increase toxicity risk, but crossing this invented boundary does not diagnose toxicity. This 24-hour view shows early accumulation, not steady state.": "บริเวณแดงเหนือ 50 หน่วยคือขีดจำกัดบนสมมติ การสัมผัสมากขึ้นอาจเพิ่มความเสี่ยงพิษ แต่การเกินเส้นสมมตินี้ไม่ใช่การวินิจฉัยพิษ ภาพ 24 ชั่วโมงแสดงการสะสมช่วงแรก ไม่ใช่ภาวะคงตัว",
  "Accumulation comparison · standard removal": "เปรียบเทียบการสะสม · กำจัดมาตรฐาน",
  "Use the same three oral doses with standard removal. Compare remaining drug and later peaks with the slower-removal scenario.": "ให้ทางกินสามครั้งเหมือนเดิมแต่กำจัดมาตรฐาน เทียบยาที่เหลือและยอดครั้งหลังกับสถานการณ์กำจัดช้า",
  "The doses and intervals are identical; removal is faster. Return to Accumulation · slower removal to compare.": "ปริมาณและช่วงห่างเท่ากัน แต่กำจัดเร็วกว่า กลับไปที่การสะสม · กำจัดช้าลงเพื่อเปรียบเทียบ",
  "Water-loving drug · NAC-inspired": "ยาชอบน้ำ · แนวคิดจาก NAC",
  "Explore reduced movement into tissues after a hypothetical IV bolus. Compare the solid blood curve with standard distribution (grey).": "สำรวจการเข้าเนื้อเยื่อน้อยลงหลัง IV bolus สมมติ เทียบกราฟเลือดเส้นทึบกับการกระจายมาตรฐาน (สีเทา)",
  "NAC means N-acetylcysteine. This is a conceptual water-loving compound, not an NAC dosing or concentration model. Solubility alone does not determine protein binding, absorption or removal. IV here isolates distribution; actual NAC injections are infused, not given as this model’s bolus.": "NAC คือ N-acetylcysteine นี่คือสารชอบน้ำในเชิงแนวคิด ไม่ใช่แบบจำลองขนาดยาหรือความเข้มข้น NAC การละลายอย่างเดียวไม่ได้กำหนดการจับโปรตีน ดูดซึม หรือกำจัด ใช้ IV เพื่อแยกดูการกระจาย แต่ NAC ชนิดฉีดจริงให้แบบหยด ไม่ใช่ bolus ตามแบบจำลองนี้",
  "Morning and evening doses": "ให้ยาเช้าและเย็น",
  "Give 100 units at 08:00 and 20:00. Compare the two peaks and watch what remains before the evening dose.": "ให้ 100 หน่วยที่ 08:00 และ 20:00 เทียบสองยอดและดูยาที่เหลือก่อนครั้งเย็น",
  "D1 and D2 mark dose times. A new dose adds to drug still in the body; the green band is an invented target for this lesson.": "D1 และ D2 บอกเวลาให้ยา ครั้งใหม่เพิ่มจากยาที่ยังเหลือ แถบเขียวคือเป้าหมายสมมติของบทเรียน",
  "What if the evening dose is missed?": "ถ้าลืมยาครั้งเย็นจะเป็นอย่างไร?",
  "Skip the 20:00 dose and watch the blood amount compared with the hypothetical target.": "ข้ามครั้ง 20:00 แล้วดูปริมาณในเลือดเทียบช่วงเป้าหมายสมมติ",
  "Compare with Morning and evening doses. This is a learning experiment, not advice on handling missed medicines.": "เทียบกับการให้เช้าและเย็น เป็นการทดลองเพื่อเรียนรู้ ไม่ใช่คำแนะนำเมื่อลืมรับยา",
  "Three doses across the day": "ให้สามครั้งตลอดวัน",
  "Compare 08:00, 16:00 and 00:00 doses with the morning/evening schedule.": "เทียบการให้ 08:00, 16:00 และ 00:00 กับตารางเช้า/เย็น",
  "The interval changes to 8 hours. Total administered amount also changes from 200 to 300 units, so both timing and daily amount influence this comparison.": "ช่วงห่างเปลี่ยนเป็น 8 ชั่วโมง ปริมาณรวมเปลี่ยนจาก 200 เป็น 300 หน่วยด้วย จึงมีผลทั้งจากเวลาและปริมาณรวมต่อวัน",
  "Slow absorption · flip-flop kinetics": "ดูดซึมช้า · flip-flop kinetics",
  "Set absorption to 0.05 h⁻¹, below disposition β ≈ 0.163 h⁻¹. Compare the long input tail with the route preset.": "ตั้งดูดซึม 0.05 h⁻¹ ต่ำกว่า β การกระจาย/กำจัด ≈ 0.163 h⁻¹ เทียบส่วนหางการเข้าที่ยาวกับค่าตั้งต้น",
  "Open the half-life section: absorption half-time is 13.86 h while disposition half-life stays about 4.26 h. Input is still substantial at 24 h; the observed late decline is not a clean estimate of disposition β.": "เปิดส่วนครึ่งชีวิต: เวลาดูดซึมครึ่งหนึ่ง = 13.86 ชั่วโมง แต่ครึ่งชีวิตการกระจาย/กำจัดยังประมาณ 4.26 ชั่วโมง ที่ 24 ชั่วโมงยังมียาเข้ามาก ความชันช่วงท้ายจึงไม่ใช่ค่าประมาณ β ที่ชัดเจน",
  "Fast vs slow release": "ปลดปล่อยเร็วเทียบช้า",
  "Compare fast and slow release from a tablet. Watch the peak amount, time to peak and release band.": "เทียบการปลดปล่อยเร็วและช้าจากยาเม็ด ดูค่าสูงสุด เวลาถึงค่านั้น และแถบปลดปล่อย",
  "Lower the Tablet release slider in Change the journey, then explore the graph.": "ลดตัวเลื่อนการปลดปล่อยจากยาเม็ดในส่วนปรับเส้นทาง แล้วสำรวจกราฟ",
  "Strong first-pass effect": "ผลผ่านครั้งแรกสูง",
  "See how a large first-pass fraction reduces the peak of unchanged drug in blood.": "ดูว่าสัดส่วนผ่านครั้งแรกสูงลดค่าสูงสุดของยาที่ไม่เปลี่ยนรูปในเลือดอย่างไร",
  "Raise or lower the first-pass slider and watch the blood curve.": "เพิ่มหรือลดตัวเลื่อนผ่านครั้งแรก แล้วดูกราฟเลือด",
  "IV bolus vs oral": "IV bolus เทียบกับยากิน",
  "Same compound and elimination, different start. Use route comparison to overlay the curves.": "สารและการกำจัดเหมือนกัน แต่เริ่มต่างกัน ใช้เปรียบเทียบเส้นทางเพื่อซ้อนกราฟ",
  "The three route curves are overlaid. Explore time to compare their beginnings.": "ซ้อนกราฟสามเส้นทางแล้ว สำรวจเวลาเพื่อเทียบช่วงเริ่มต้น",
  "Zero-order release": "ปลดปล่อยอันดับศูนย์",
  "Release 20% of the starting dose each hour, until the tablet is empty.": "ปลดปล่อย 20% ของยาเริ่มต้นทุกชั่วโมงจนหมดเม็ด",
  "The release controls are open below. Change the rate and watch the release graph.": "เปิดตัวควบคุมการปลดปล่อยด้านล่างแล้ว ปรับอัตราและดูกราฟ",
  "Delayed release (lag)": "ปลดปล่อยแบบหน่วงเวลา",
  "A lag before liberation begins. Absorption and the blood curve start later.": "มีเวลาหน่วงก่อนเริ่มปลดปล่อย การดูดซึมและกราฟเลือดจึงเริ่มช้าลง",
  "Scrub the activity bands — liberation stays quiet until the lag ends.": "เลื่อนแถบกิจกรรม การปลดปล่อยยังไม่เริ่มจนพ้นเวลาหน่วง",
  "Linked to scenario: ": "เชื่อมกับสถานการณ์: ",
  "Oral: solid → dissolved drug in gut → portal blood and first-pass liver → systemic blood.": "กิน: ของแข็ง → ยาละลายในลำไส้ → เลือดพอร์ทัลและตับครั้งแรก → เลือดทั่วร่างกาย",
  "IV bolus: each scheduled dose enters systemic blood directly. Release and absorption are bypassed.": "IV bolus: ยาตามตารางแต่ละครั้งเข้าเลือดทั่วร่างกายโดยตรง ข้ามปลดปล่อยและดูดซึม",
  "SC: a dissolved depot under the skin gradually enters systemic blood. No gut/liver first pass.": "SC: แหล่งสารละลายใต้ผิวหนังค่อย ๆ เข้าเลือดทั่วร่างกาย ไม่ผ่านลำไส้/ตับครั้งแรก",
  "Oral pathway": "เส้นทางยากิน",
  "IV bolus pathway": "เส้นทาง IV bolus",
  "Subcutaneous pathway": "เส้นทางใต้ผิวหนัง",
  " Distribution, metabolism and renal excretion follow.": " ตามด้วยการกระจาย เปลี่ยนแปลงยา และขับออกทางไต",
  "SC solution depot": "แหล่งสารละลาย SC",
  "under the skin": "ใต้ผิวหนัง",
  "SC absorption": "การดูดซึม SC",
  "How quickly drug moves from the SC depot into systemic blood.": "ยาเคลื่อนจากแหล่ง SC เข้าเลือดทั่วร่างกายเร็วเพียงใด",
  "Original presets · teal: oral · amber: SC · purple: IV": "ค่าตั้งต้น · เขียวอมฟ้า: กิน · เหลือง: SC · ม่วง: IV",
  "Explore AUC, release models, half-life equations, and model checks.": "สำรวจ AUC แบบปลดปล่อย สมการครึ่งชีวิต และการตรวจสอบแบบจำลอง",
  "absolute net transfer": "ค่าสัมบูรณ์การถ่ายโอนสุทธิ",
  "Illustrative parameters; not clinically calibrated": "พารามิเตอร์เพื่อประกอบการเรียน ไม่ได้เทียบข้อมูลทางคลินิก",
  "Complete uptake assumed for oral and SC; renal-only final removal": "สมมติรับยาเข้าครบทางกินและ SC; ขับออกสุดท้ายทางไตเท่านั้น",
  "IV uses discrete scheduled boluses, not an infusion": "IV ใช้ bolus แยกครั้งตามตาราง ไม่ใช่การหยดต่อเนื่อง",
  "Target band is arbitrary teaching units, not clinical efficacy or toxicity thresholds": "ช่วงเป้าหมายเป็นหน่วยสมมติ ไม่ใช่เกณฑ์ประสิทธิผลหรือพิษทางคลินิก",
  "Calculated terminal disposition half-life (h)": "ครึ่งชีวิตการกระจาย/กำจัดช่วงปลายที่คำนวณ (ชั่วโมง)",
  "Total drug-equivalent amount (units)": "ปริมาณรวมเทียบเท่ายา (หน่วย)",
  "Administered amount (units)": "ปริมาณที่ให้แล้ว (หน่วย)",
  "Dose times (h)": "เวลาให้ยา (ชั่วโมง)",
  "Mass-balance error": "ความคลาดเคลื่อนสมดุลมวล",
  "Arithmetic check": "ตรวจความถูกต้องทางคณิตศาสตร์",
  "Parameters (rates in h⁻¹)": "พารามิเตอร์ (อัตราเป็น h⁻¹)",
  "Events retained": "เหตุการณ์ที่เก็บไว้",
  "Event history cleared.": "ล้างประวัติเหตุการณ์แล้ว",
  "Debug report downloaded. It contains model settings and this session’s events.": "ดาวน์โหลดรายงานตรวจสอบแล้ว มีค่าตั้งแบบจำลองและเหตุการณ์ระหว่างใช้งานนี้",
  "The mouth is in the head; the oesophagus is the tube down the neck and chest to the stomach.": "ปากอยู่ที่ศีรษะ หลอดอาหารเป็นท่อผ่านคอและทรวงอกลงสู่กระเพาะ",
  "The mouth receives food and drink. The oesophagus moves swallowed material to the stomach.": "ปากรับอาหารและเครื่องดื่ม หลอดอาหารส่งสิ่งที่กลืนสู่กระเพาะ",
  "A swallowed tablet travels through the oesophagus toward the stomach.": "ยาเม็ดที่กลืนผ่านหลอดอาหารไปยังกระเพาะ",
  "The stomach sits in the upper abdomen, mostly on the body’s left side.": "กระเพาะอยู่ช่องท้องส่วนบน ค่อนไปทางซ้ายของร่างกาย",
  "It stores and mixes swallowed material with digestive fluid.": "เก็บและผสมสิ่งที่กลืนกับน้ำย่อย",
  "A swallowed formulation may begin releasing drug here before it moves onward.": "รูปแบบยาที่กลืนอาจเริ่มปลดปล่อยยาที่นี่ก่อนเคลื่อนต่อ",
  "The small intestine is a long, folded tube in the abdomen, between the stomach and large intestine.": "ลำไส้เล็กเป็นท่อยาวขดในช่องท้อง อยู่ระหว่างกระเพาะกับลำไส้ใหญ่",
  "It continues digestion and absorbs many nutrients through its lining.": "ย่อยอาหารต่อและดูดซึมสารอาหารหลายชนิดผ่านเยื่อบุ",
  "Most absorption of many swallowed medicines happens through the small intestine.": "ยากินหลายชนิดดูดซึมเป็นหลักผ่านลำไส้เล็ก",
  "The liver is in the upper abdomen, mostly on the body’s right side.": "ตับอยู่ช่องท้องส่วนบน ค่อนไปทางขวาของร่างกาย",
  "It processes substances carried in blood and makes bile to help digestion.": "แปรรูปสารที่มากับเลือดและสร้างน้ำดีช่วยย่อยอาหาร",
  "Drug absorbed from the gut usually reaches the liver through portal blood before wider circulation.": "ยาที่ดูดซึมจากลำไส้มักถึงตับผ่านเลือดพอร์ทัลก่อนกระจายทั่วร่างกาย",
  "The heart is in the chest; blood vessels form a network throughout the body.": "หัวใจอยู่ในทรวงอก หลอดเลือดเป็นเครือข่ายทั่วร่างกาย",
  "Heart circulates blood. Blood vessels carry blood to and from tissues.": "หัวใจสูบฉีดเลือดให้ไหลเวียน หลอดเลือดนำเลือดไปและกลับจากเนื้อเยื่อ",
  "Blood carries medicine around the body rather than delivering it directly to one chosen organ.": "เลือดพายาทั่วร่างกาย ไม่ได้ส่งตรงสู่อวัยวะที่เลือกไว้เพียงแห่งเดียว",
  "The two kidneys are toward the back of the upper abdomen; the bladder is lower down in the pelvis.": "ไตสองข้างอยู่ค่อนไปทางหลังของช่องท้องส่วนบน กระเพาะปัสสาวะอยู่ต่ำลงในอุ้งเชิงกราน",
  "Some unchanged drugs and metabolites pass into urine before it is stored in the bladder.": "ยาที่ไม่เปลี่ยนรูปและเมแทบอไลต์บางชนิดเข้าสู่ปัสสาวะก่อนเก็บในกระเพาะปัสสาวะ",
  "Skin covers the body; subcutaneous tissue lies just beneath it.": "ผิวหนังหุ้มร่างกาย เนื้อเยื่อใต้ผิวหนังอยู่ถัดลงไป",
  "Skin forms a protective barrier, and the tissue underneath contains fat, vessels and other structures.": "ผิวหนังเป็นแนวป้องกัน เนื้อเยื่อข้างใต้มีไขมัน หลอดเลือด และโครงสร้างอื่น",
  "An SC injection places a medicine into tissue beneath the skin for uptake into circulation.": "การฉีด SC วางยาในเนื้อเยื่อใต้ผิวหนังเพื่อให้ดูดซึมเข้าการไหลเวียน",
  "Injected into tissue under the skin": "ฉีดเข้าเนื้อเยื่อใต้ผิวหนัง",
  "Taken up into circulation": "ดูดซึมเข้าสู่การไหลเวียน",
  "Injected directly into a vein": "ฉีดเข้าหลอดเลือดดำโดยตรง",
  "Entry into blood · ": "เข้าสู่เลือด · ",
  " route selected. Simulation paused at 0 hours. Dose schedule, slider values and learning mode preserved.": " ถูกเลือกแล้ว แบบจำลองหยุดที่ 0 ชั่วโมง คงตารางยา ตัวเลื่อน และโหมดการเรียน",
  "Correct — The bladder stores urine until it leaves the body.": "ถูกต้อง — กระเพาะปัสสาวะเก็บปัสสาวะจนออกจากร่างกาย",
  "Not yet — The kidneys form urine, while the bladder stores it.": "ยังไม่ใช่ — ไตสร้างปัสสาวะ ส่วนกระเพาะปัสสาวะเก็บปัสสาวะ",
  "Not yet — The heart circulates blood, while the bladder stores urine.": "ยังไม่ใช่ — หัวใจทำให้เลือดไหลเวียน ส่วนกระเพาะปัสสาวะเก็บปัสสาวะ",
  "Correct — After swallowing, the route passes through the digestive tract, small-intestine absorption and portal blood to the liver before systemic circulation.": "ถูกต้อง — หลังกลืน ผ่านทางเดินอาหาร ดูดซึมที่ลำไส้เล็ก ผ่านเลือดพอร์ทัลสู่ตับ แล้วเข้าสู่การไหลเวียนทั่วร่างกาย",
  "Not yet — Use each step once: swallowed formulation, digestive tract, small-intestine absorption, portal blood to the liver, then systemic circulation.": "ยังไม่ใช่ — ใช้แต่ละขั้นครั้งเดียว: กลืนรูปแบบยา ทางเดินอาหาร ดูดซึมที่ลำไส้เล็ก เลือดพอร์ทัลสู่ตับ แล้วไหลเวียนทั่วร่างกาย",
  " · binding ≠ response": " · การจับ ≠ การตอบสนอง",
  "% of the full system maximum.": "% ของผลสูงสุดของระบบ",
  "Concentration-response graph. ": "กราฟความเข้มข้น–การตอบสนอง ",
  " Partial agonist ceiling: 40%.": " เพดาน partial agonist: 40%",
  "With no agonist, this model has no activation, even when antagonist occupies receptors.": "เมื่อไม่มี agonist แบบจำลองไม่มีการกระตุ้น แม้ antagonist จะจับตัวรับอยู่",
  "The partial agonist has a lower limiting response (40%) in this system.": "Partial agonist ให้ขีดจำกัดผลต่ำกว่า (40%) ในระบบนี้",
  " Competition also shifts its curve right.": " การแข่งขันยังเลื่อนกราฟไปทางขวาด้วย",
  "Competition shifts the curve right: more agonist is needed for the same response. The limiting maximum is still 100%, although the plotted concentrations may not reach it.": "การแข่งขันเลื่อนกราฟไปขวา ต้องใช้ agonist มากขึ้นเพื่อได้ผลเท่าเดิม ขีดจำกัดผลสูงสุดยังเป็น 100% แม้ความเข้มข้นที่แสดงอาจยังไม่ถึง",
  "As agonist concentration increases, the response approaches a maximum; doubling concentration does not always double response.": "เมื่อความเข้มข้น agonist เพิ่ม ผลเข้าใกล้ค่าสูงสุด การเพิ่มความเข้มข้นสองเท่าจึงไม่ได้เพิ่มผลสองเท่าเสมอ",
  "Current Kd = ": "Kd ปัจจุบัน = ",
  "; apparent EC50 = ": "; EC50 ที่ปรากฏ = ",
  "Not yet — Binding alone does not activate these receptors; the antagonist has no activating efficacy.": "ยังไม่ใช่ — การจับอย่างเดียวไม่กระตุ้นตัวรับเหล่านี้ antagonist ไม่มีความสามารถกระตุ้น",
  "Correct — The antagonist binds without activating, so response is zero when no agonist is present in this model.": "ถูกต้อง — antagonist จับโดยไม่กระตุ้น ผลจึงเป็นศูนย์เมื่อไม่มี agonist ในแบบจำลองนี้",
  "You saw activation. The name is full agonist.": "คุณเห็นการกระตุ้น ชื่อคือ full agonist",
  "More agonist raises the response toward a limit because this system cannot respond without limit.": "เพิ่ม agonist แล้วผลเข้าใกล้ขีดจำกัด เพราะระบบนี้ไม่สามารถตอบสนองเพิ่มได้อย่างไม่จำกัด",
  "You saw a lower maximum. The name is partial agonist.": "คุณเห็นผลสูงสุดที่ต่ำกว่า ชื่อคือ partial agonist",
  "The partial agonist has a lower maximum in this system even when its concentration is very high.": "Partial agonist มีผลสูงสุดต่ำกว่าในระบบนี้ แม้ความเข้มข้นสูงมาก",
  "It fits without activating. The name is antagonist.": "จับได้โดยไม่กระตุ้น ชื่อคือ antagonist",
  "The antagonist occupies receptors but produces no activation when no agonist is present in this model.": "Antagonist จับตัวรับแต่ไม่กระตุ้นเมื่อไม่มี agonist ในแบบจำลองนี้",
  "Two molecules compete for a place: competitive antagonism.": "สองโมเลกุลแข่งขันจับตำแหน่งเดียวกัน: การต้านแบบแข่งขัน",
  "The antagonist reduces agonist binding, so the response falls at the same agonist concentration.": "Antagonist ลดการจับของ agonist ผลจึงลดลงแม้ความเข้มข้น agonist เท่าเดิม",
  "More agonist can overcome reversible competition in this model.": "เพิ่ม agonist เพื่อเอาชนะการแข่งขันแบบย้อนกลับได้ในแบบจำลองนี้ได้",
  "With the same antagonist concentration, more agonist competes successfully and raises the response again.": "เมื่อ antagonist เท่าเดิม agonist ที่มากขึ้นแข่งขันจับได้มากขึ้นและเพิ่มผลอีกครั้ง",
  "All five steps": "ทั้งห้าขั้นตอน",
  "Choose a prediction, or select Explore without answering.": "เลือกคำคาดการณ์ หรือเลือกทดลองโดยไม่ตอบ",
  "Your prediction fits. ": "คำคาดการณ์สอดคล้องกับผล ",
  "Notice the difference. ": "สังเกตความแตกต่าง ",
  "Prediction saved. Reveal the result when you are ready.": "เก็บคำคาดการณ์แล้ว ดูผลเมื่อพร้อม",
  "Compare your reasoning — More drug is not always better because responses can reach a limit while unwanted effects may increase, and blood carries medicines to tissues rather than straight to one chosen organ.": "เทียบเหตุผลของคุณ — ยามากขึ้นไม่ดีกว่าเสมอ เพราะผลอาจถึงขีดจำกัดแต่ผลไม่พึงประสงค์เพิ่มได้ และเลือดพายาไปยังเนื้อเยื่อ ไม่ใช่ตรงสู่อวัยวะที่เลือกไว้",
  "Learning sections": "ส่วนการเรียนรู้",
  "Choose an anatomy region": "เลือกบริเวณร่างกาย",
  "Parallel processes, not sequential steps": "กระบวนการคู่ขนาน ไม่ใช่ขั้นตอนตามลำดับ",
  "Use your own words; this answer is not scored.": "เขียนด้วยคำของคุณเอง คำตอบนี้ไม่มีคะแนน",
  "Receptor experiments": "การทดลองตัวรับ",
  "Twenty receptor icons representing free receptors and receptors occupied by agonist or antagonist": "สัญลักษณ์ตัวรับยี่สิบตัว แสดงตัวรับว่างและตัวรับที่ agonist หรือ antagonist จับอยู่",
  "Concentration-response graph: solid purple is the chosen experiment, dashed grey is a full agonist without antagonist, dot is the current concentration": "กราฟความเข้มข้น–การตอบสนอง: เส้นทึบม่วงคือการทดลองที่เลือก เส้นประเทาคือ full agonist ที่ไม่มี antagonist จุดคือความเข้มข้นปัจจุบัน",
  "Learning level": "ระดับการเรียนรู้",
  "LADME stages": "กระบวนการ LADME",
  "Five activity bands showing how LADME processes overlap across 24 hours": "ห้าแถบกิจกรรมแสดงกระบวนการ LADME ที่ซ้อนกันตลอด 24 ชั่วโมง",
  "Gut · release & absorption illustration": "ภาพทางเดินอาหาร · ปลดปล่อยและดูดซึม",
  "Liver · metabolism illustration": "ภาพตับ · เปลี่ยนแปลงยา",
  "Kidneys · excretion illustration": "ภาพไต · ขับออก",
  "Oral drug pathway: tablet to dissolved drug in gut, portal blood and first-pass liver processing, then systemic blood exchanging with tissues. Metabolism creates metabolites, which are carried in blood to the kidneys. Metabolites can also enter tissues; this exchange is conceptual and not separately calculated.": "เส้นทางยากิน: ยาเม็ดเป็นยาละลายในลำไส้ ผ่านเลือดพอร์ทัลและตับครั้งแรก จากนั้นเลือดทั่วร่างกายแลกเปลี่ยนกับเนื้อเยื่อ การเปลี่ยนแปลงยาสร้างเมแทบอไลต์ซึ่งเลือดพาไปไต เมแทบอไลต์เข้าเนื้อเยื่อได้ด้วย การแลกเปลี่ยนนี้เป็นแนวคิด ไม่ได้คำนวณแยก",
  "Metabolites travel in blood before renal excretion": "เมแทบอไลต์เดินทางในเลือดก่อนขับออกทางไต",
  "Possible metabolite tissue exchange, conceptual only": "การแลกเปลี่ยนเมแทบอไลต์กับเนื้อเยื่อที่เป็นไปได้ แสดงเชิงแนวคิดเท่านั้น",
  "Graph of unchanged drug in systemic blood, in teaching units, versus time in illustrative hours": "กราฟยาที่ไม่เปลี่ยนรูปในเลือดทั่วร่างกาย ใช้หน่วยสมมติ เทียบกับเวลาเป็นชั่วโมง",
  "Advanced exposure analysis": "การวิเคราะห์การสัมผัสยาขั้นสูง",
  "Cumulative percent released from one oral dose versus time": "ร้อยละการปลดปล่อยสะสมจากยากินหนึ่งครั้งเทียบกับเวลา",
  "Simulation playback": "การเล่นแบบจำลอง",
  "Ready": "พร้อม",
  "Bypassed": "ข้ามขั้นนี้",
  "Oral": "กิน",
  "oral": "กิน",
  "Below": "ต่ำกว่า",
  "Above": "สูงกว่า",
  "Within": "อยู่ใน",
  "Day": "วันที่",
  "Step": "ขั้นที่",
  "Question": "คำถามที่",
  "of": "จาก",
  "units": "หน่วย",
  "hours": "ชั่วโมง",
  "hour": "ชั่วโมง",
  "Time (h)": "เวลา (ชั่วโมง)",
  "Cumulative release (%)": "ปลดปล่อยสะสม (%)",
  "Amount (units)": "ปริมาณ (หน่วย)",
  "Blood amount (units)": "ปริมาณในเลือด (หน่วย)",
  "Agonist-bound:": "Agonist จับ:",
  "antagonist-bound:": "antagonist จับ:",
  "free:": "ว่าง:",
  "Response:": "การตอบสนอง:",
  "40% ceiling": "เพดาน 40%",
  "Explore.": "ทดลอง:",
  "selected.": "ถูกเลือกแล้ว",
  "Ⅱ Pause": "Ⅱ หยุดชั่วคราว",
  "Pause": "หยุดชั่วคราว",
  "the gut": "ลำไส้",
  "release": "การปลดปล่อย",
  "absorption": "การดูดซึม",
  "distribution": "การกระจายยา",
  "excretion": "การขับออก",
  "Paracetamol": "พาราเซตามอล",
  "At": "ที่",
  "PASS": "ผ่าน",
  "FAIL": "ไม่ผ่าน",
  "Inside": "ภายใน",
  "Outside": "ภายนอก",
  "Hypothetical target": "เป้าหมายสมมติ",
  "Hypothetical upper limit": "ขีดจำกัดบนสมมติ",
  "Above hypothetical limit": "เหนือขีดจำกัดสมมติ",
  "Amount in blood (units)": "ปริมาณในเลือด (หน่วย)",
  "Amount in blood (teaching units)": "ปริมาณในเลือด (หน่วยสมมติ)",
  "Hours since 08:00 · one day": "ชั่วโมงหลัง 08:00 · หนึ่งวัน",
  "Above hypothetical upper limit": "เหนือขีดจำกัดบนสมมติ",
  "Skipped": "ข้ามครั้งนี้",
  "Medicine": "สารที่จำลอง",
  "ORAL": "กิน",
  "Time": "เวลา",
  "Active": "ทำงาน",
  "Rate": "อัตรา",
  "First-order": "อันดับหนึ่ง",
  "Zero-order": "อันดับศูนย์",
  "% changed": "% เปลี่ยนรูป",
  "net": "สุทธิ",
  "Website visit information": "ข้อมูลการเข้าชมเว็บไซต์",
  "Page views: checking availability…": "จำนวนเปิดหน้า: กำลังตรวจสอบ…",
  "If visit tracking is enabled on a PHP host, this page counts page views and records the connecting IP address for site access monitoring. IP logs are private and are deleted after 30 days when the log is next maintained. The total count is retained. Refreshing counts as another view; this is not a count of unique people.": "เมื่อเปิดการติดตามบนโฮสต์ PHP หน้านี้นับการเปิดหน้าและบันทึก IP ที่เชื่อมต่อเพื่อติดตามการเข้าถึง บันทึก IP เป็นข้อมูลส่วนตัวและลบเมื่ออายุเกิน 30 วันในการดูแลบันทึกครั้งถัดไป ยังคงเก็บยอดรวมไว้ การรีเฟรชนับเพิ่มอีกครั้ง จึงไม่ใช่จำนวนคนที่ไม่ซ้ำกัน",
  "Page views:": "จำนวนเปิดหน้า:",
  "Offline — no page view recorded.": "ออฟไลน์ — ไม่บันทึกการเปิดหน้า",
  "Counter unavailable — the page still works.": "ตัวนับไม่พร้อมใช้งาน — ยังใช้บทเรียนได้",
  "Visit tracking is disabled.": "ปิดการติดตามการเข้าชมอยู่",
  "This page counts page views only. It does not record IP addresses. Refreshing counts as another view; this is not a count of unique people.": "หน้านี้นับจำนวนการเปิดหน้าเท่านั้น และไม่บันทึกที่อยู่ IP การรีเฟรชนับเป็นการเปิดอีกครั้ง ไม่ใช่จำนวนผู้เข้าชมที่ไม่ซ้ำกัน",
  "Counter unavailable — this host does not run the PHP counter. The lesson still works.": "ตัวนับไม่พร้อมใช้งาน — โฮสต์นี้ไม่ได้เปิดใช้ตัวนับ PHP ยังใช้บทเรียนได้",
  "Counter unavailable — the server could not create its private log folder. The lesson still works.": "ตัวนับไม่พร้อมใช้งาน — เซิร์ฟเวอร์สร้างโฟลเดอร์บันทึกส่วนตัวไม่ได้ ยังใช้บทเรียนได้",
  "Counter unavailable — the server rejected the request origin. The lesson still works.": "ตัวนับไม่พร้อมใช้งาน — เซิร์ฟเวอร์ปฏิเสธต้นทางของคำขอ ยังใช้บทเรียนได้"
});

// Translate presentation nodes only. Keep controls, answers, identifiers and model data intact.
let uiLanguage='en';
const languageTextState=new WeakMap();
const languageAttributeState=new WeakMap();
const thaiCache=new Map();
const normalizedThai=new Map(Object.entries(THAI_TEXT).map(([en,th])=>[en.trim().replace(/\s+/g,' '),th.trim()]));
const escapeLanguageRegex=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const thaiFragments=new RegExp(Object.keys(THAI_TEXT).sort((a,b)=>b.length-a.length).map(escapeLanguageRegex).join('|'),'g');
function translateThai(value){
  if(!/[A-Za-z]/.test(value))return value;
  if(thaiCache.has(value))return thaiCache.get(value);
  const trimmed=value.trim(),exact=normalizedThai.get(trimmed.replace(/\s+/g,' '));
  let translated;
  if(exact!==undefined)translated=value.slice(0,value.indexOf(trimmed))+exact+value.slice(value.indexOf(trimmed)+trimmed.length);
  else translated=value.replace(thaiFragments,(match,offset)=>{
    // Match whole English words, never pieces of scientific identifiers or URLs.
    if((/[A-Za-z0-9]$/.test(match)&&/[A-Za-z0-9]/.test(value[offset+match.length]||''))||
       (/^[A-Za-z0-9]/.test(match)&&/[A-Za-z0-9]/.test(value[offset-1]||'')))return match;
    return THAI_TEXT[match];
  });
  if(thaiCache.size>=1200)thaiCache.clear();
  thaiCache.set(value,translated);return translated;
}
function languageExcluded(node){
  const element=node.nodeType===1?node:node.parentElement;
  return !!element?.closest('script,style,pre,code,[data-no-translate]') || (node.nodeType===3 && !!element?.closest('textarea,input'));
}
function translateLanguageNode(node){
  if(!node||languageExcluded(node))return;
  if(node.nodeType===3){
    const now=node.nodeValue,previous=languageTextState.get(node);
    const english=previous&&now===previous.displayed?previous.english:now;
    const displayed=uiLanguage==='th'?translateThai(english):english;
    languageTextState.set(node,{english,displayed});
    if(now!==displayed)node.nodeValue=displayed;
    return;
  }
  if(node.nodeType!==1)return;
  // Input values are deliberately excluded, but their accessibility names are translated.
  let saved=languageAttributeState.get(node)||{};
  for(const name of ['aria-label','title','placeholder','alt']){
    if(!node.hasAttribute(name))continue;
    const now=node.getAttribute(name),previous=saved[name];
    const english=previous&&now===previous.displayed?previous.english:now;
    const displayed=uiLanguage==='th'?translateThai(english):english;
    saved[name]={english,displayed};
    if(now!==displayed)node.setAttribute(name,displayed);
  }
  languageAttributeState.set(node,saved);
  // Textareas contain user-authored answers; only translate their placeholder.
  if(['TEXTAREA','INPUT'].includes(node.tagName))return;
  for(const child of Array.from(node.childNodes))translateLanguageNode(child);
}
let languageObserver=null;
function watchThaiUpdates(){
  if(languageObserver&&uiLanguage==='th')languageObserver.observe(document.body,{
    subtree:true,childList:true,characterData:true,attributes:true,
    attributeFilter:['aria-label','title','placeholder','alt']
  });
}
function setInterfaceLanguage(language){
  if(!['en','th'].includes(language))return;
  languageObserver?.disconnect();
  uiLanguage=language;
  document.documentElement.lang=language;
  $('languageEnglish').setAttribute('aria-pressed',String(language==='en'));
  $('languageThai').setAttribute('aria-pressed',String(language==='th'));
  translateLanguageNode(document.body);
  translateLanguageNode(document.querySelector('title'));
  watchThaiUpdates();
}
if(document.body.nodeType===1){
  $('languageEnglish').addEventListener('click',()=>setInterfaceLanguage('en'));
  $('languageThai').addEventListener('click',()=>setInterfaceLanguage('th'));
  if(typeof MutationObserver!=='undefined')languageObserver=new MutationObserver(records=>{
    // Observe only changed subtrees, not an entire page scan for every animation frame.
    languageObserver.disconnect();
    const changed=new Set();
    for(const record of records){
      if(record.type==='childList')for(const node of record.addedNodes)changed.add(node);
      else changed.add(record.target);
    }
    for(const node of changed)if(node.isConnected)translateLanguageNode(node);
    watchThaiUpdates();
  });
}

// Plain-language reason for a failed counter request. Every message starts with
// "Counter unavailable" and states that the lesson is unaffected.
function counterMessage(error){
  const code=error&&error.code,status=error&&error.status;
  if(code==='private_storage_required'||code==='storage_unavailable')return 'Counter unavailable — the server could not create its private log folder. The lesson still works.';
  if(code==='cross_origin'||code==='cross_site')return 'Counter unavailable — the server rejected the request origin. The lesson still works.';
  if(code==='no_php'||status===404||status===405||status===501||(status&&!code))return 'Counter unavailable — this host does not run the PHP counter. The lesson still works.';
  return 'Counter unavailable — the page still works.';
}
// Optional same-origin PHP counter; independent of the lesson and model.
async function recordPageView(){
  const output=$('visitCount');
  if(!['http:','https:'].includes(window.location.protocol)){
    output.textContent='Offline — no page view recorded.';return;
  }
  const abort=new AbortController();
  const timeout=setTimeout(()=>abort.abort(),6000);
  try{
    const response=await fetch('analytics.php',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:'{}',signal:abort.signal});
    if(!response.ok){
      // Read only the short error code the endpoint sends (never paths or addresses).
      let code='';try{code=String((await response.json()).error||'')}catch(e){}
      const failure=new Error('counter unavailable');failure.status=response.status;failure.code=code;throw failure;
    }
    let result;
    try{result=await response.json()}catch(e){const failure=new Error('not json');failure.status=response.status;failure.code='no_php';throw failure}
    if(result.enabled===false){output.textContent='Visit tracking is disabled.';return;}
    if(result.enabled!==true||!Number.isSafeInteger(result.page_views)||result.page_views<0)throw new Error('invalid counter');
    output.textContent='Page views: '+result.page_views.toLocaleString('en-US');
    if(result.logs_ip===false){const note=$('visitNotice');if(note)note.textContent='This page counts page views only. It does not record IP addresses. Refreshing counts as another view; this is not a count of unique people.';}
  }catch(error){output.textContent=counterMessage(error);}
  finally{clearTimeout(timeout);}
}
if(document.body.nodeType===1&&window.location&&typeof fetch==='function')recordPageView();
