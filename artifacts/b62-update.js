const B62_UPDATE={
  links:{probe:[],triangle:[],wander:[]},
  vortices:[],
  released:[],
  groups:[],
  derived:[],
  last:performance.now(),
  decisionAt:0,
  chain:null
};

function b62Len(v){return Math.hypot(v[0],v[1],v[2])||0}
function b62Nrm(v){const l=b62Len(v)||1;return [v[0]/l,v[1]/l,v[2]/l]}
function b62Dot3(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function b62WaveOf(dot){
  try{
    if(typeof waveTypeForDataType==='function'){
      return waveTypeForDataType(dot?.dataTypeIndex||1, dot?.label||dot?.dataType||'');
    }
  }catch(e){}
  return 4;
}
function b62CatOf(dot){
  try{
    const raw=getRejectedColorGroupName(dot);
    return typeof normalizeRejectedArrowCategory==='function'
      ? normalizeRejectedArrowCategory(raw)
      : raw;
  }catch(e){return 'Neutral'}
}
function b62ReleaseMs(wave, rejected){
  const ms=wave<=2?4000:wave<=5?2000:wave<=8?1000:250;
  return rejected?ms*2:ms;
}
function b62TravelMs(wave){
  return wave<=2?4000:wave<=5?2200:wave<=8?1200:600;
}
function b62CategoryCenter(name){
  const key=name==='AI / Scenario'?'AI':name;
  const idx=typeof REJECTED_COLOR_GROUPS==='undefined'?-1:REJECTED_COLOR_GROUPS.indexOf(key);
  const canonical=getRejectedColorGroupCenter(idx<0?4:idx);
  return typeof outerWorldPoint==='function'?outerWorldPoint(canonical):canonical;
}
function b62SphereCenter(){
  try{return scaledParentCenter(depth)}catch(e){return [SIZE/2,SIZE/2,depth/2]}
}

function b62AllowedVortexPairs(){
  const pairs=[];
  const seen=new Set();
  Object.values(typeof TETRAD_REJECTED_ARROW_RULES==='undefined'?{}:TETRAD_REJECTED_ARROW_RULES).forEach(rule=>{
    const allowed=rule.allowed||[];
    for(let i=0;i<allowed.length;i++){
      for(let j=i+1;j<allowed.length;j++){
        const key=[allowed[i],allowed[j]].sort().join('|');
        if(seen.has(key))continue;
        seen.add(key);
        pairs.push([allowed[i],allowed[j]]);
      }
    }
  });
  return pairs;
}

function b62EnsureVortices(){
  b62AllowedVortexPairs().forEach(([a,b])=>{
    const id=`${a}->${b}`;
    if(B62_UPDATE.vortices.some(v=>v.id===id))return;
    B62_UPDATE.vortices.push({
      id, from:a, to:b, kind:'category',
      spin:Math.random(), clocks:{}
    });
  });
}

function b62ArcPoint(O, PC, dest, u){
  const radial=b62Nrm(V.sub(PC, O));
  const R=Math.max(SIZE*.12, b62Len(V.sub(PC, O)));
  let to=V.sub(dest, O);
  const toLen=b62Len(to)||1;
  to=V.mul(to, 1/toLen);
  let side=V.sub(to, V.mul(radial, b62Dot3(to, radial)));
  if(b62Len(side)<.001){
    const arbitrary=Math.abs(radial[1])<.85?[0,1,0]:[1,0,0];
    side=V.sub(arbitrary, V.mul(radial, b62Dot3(arbitrary, radial)));
  }
  side=b62Nrm(side);
  const I=Math.acos(Math.max(-1, Math.min(1, b62Dot3(radial, to))))||.8;
  const ang=u*I;
  const dir=V.add(V.mul(radial, Math.cos(ang)), V.mul(side, Math.sin(ang)));
  return V.add(O, V.mul(dir, R));
}

function b62VortexMouth(v){
  const from=v.fromCenter||b62CategoryCenter(v.from);
  const to=v.toCenter||b62CategoryCenter(v.to);
  const mid=V.mul(V.add(from, to), .5);
  const axis=b62Nrm(V.sub(to, from));
  let side=Math.abs(axis[1])<.85?[0,1,0]:[1,0,0];
  side=b62Nrm(V.sub(side, V.mul(axis, b62Dot3(side, axis))));
  const bitan=b62Nrm([
    axis[1]*side[2]-axis[2]*side[1],
    axis[2]*side[0]-axis[0]*side[2],
    axis[0]*side[1]-axis[1]*side[0]
  ]);
  const radius=SIZE*.07;
  const a=(v.spin||0)*Math.PI*2;
  return V.add(mid, V.add(V.mul(side, Math.cos(a)*radius), V.mul(bitan, Math.sin(a)*radius)));
}

function b62WriteVortexRecord(v, stats){
  const src=stats[v.from]||{agreement:.5,count:0};
  const dst=stats[v.to]||{agreement:.5,count:0};
  const fromC=v.fromCenter||[0,0,0];
  const toC=v.toCenter||[0,0,0];
  const rec={
    type:'DERIVED',
    derivedType:'VORTEX',
    bridge:`${v.from}→${v.to}`,
    flow:(src.agreement??.5)-(dst.agreement??.5),
    agreement:Math.min(src.agreement??.5, dst.agreement??.5),
    tension:b62Len(V.sub(fromC, toC))/Math.max(1, SIZE),
    parents:[v.from, v.to],
    at:new Date().toISOString()
  };
  B62_UPDATE.derived.unshift(rec);
  if(B62_UPDATE.derived.length>40)B62_UPDATE.derived.length=40;
  try{
    if(typeof B62_DATA_SYSTEM!=='undefined' && B62_DATA_SYSTEM){
      if(!Array.isArray(B62_DATA_SYSTEM.derivedSignals))B62_DATA_SYSTEM.derivedSignals=[];
      B62_DATA_SYSTEM.derivedSignals.unshift(rec);
      if(B62_DATA_SYSTEM.derivedSignals.length>80)B62_DATA_SYSTEM.derivedSignals.length=80;
    }
  }catch(e){}
}

function b62CategoryStats(){
  const stats={};
  (typeof REJECTED_COLOR_GROUPS==='undefined'?[]:REJECTED_COLOR_GROUPS).forEach(name=>{
    stats[name]={count:0,agreement:.5,sum:0,members:[]};
  });
  (typeof decisionSphereDotState==='undefined'?[]:decisionSphereDotState).forEach(dot=>{
    if(!dot||dot.mode==='VORTEX_RELEASE')return;
    const cat=b62CatOf(dot);
    const row=stats[cat];
    if(!row)return;
    row.count++;
    row.sum+=Number(dot.confidence??.5);
    if(row.members.length<10)row.members.push(dot);
  });
  Object.values(stats).forEach(row=>{row.agreement=row.count?row.sum/row.count:.5});
  return stats;
}

function b62InFlight(vortexId){
  return B62_UPDATE.released.filter(c=>c.vortexId===vortexId&&c.u<1&&!c.parked);
}

function b62ReleaseCopy(v, dot, now){
  const wave=b62WaveOf(dot);
  B62_UPDATE.released.push({
    id:`rel-${Math.round(now)}-${B62_UPDATE.released.length}`,
    vortexId:v.id,
    from:v.from,
    to:v.to,
    wave,
    rejected:dot.mode==='FILTER_REJECTED',
    parentId:dot.id||dot.sourceId||null,
    O:b62SphereCenter(),
    PC:b62VortexMouth(v),
    dest:v.toCenter||b62CategoryCenter(v.to),
    u:0,
    travel:b62TravelMs(wave),
    parked:false,
    groupId:null,
    pos:null,
    mode:'VORTEX_RELEASE'
  });
}

function b62TryRelease(v, stats, now){
  const members=(stats[v.from]&&stats[v.from].members)||[];
  if(!members.length)return;
  const flying=b62InFlight(v.id);
  if(flying.length>=14)return;
  const fastCount=flying.filter(c=>c.wave>=9).length;
  const due=members.filter(dot=>{
    const wave=b62WaveOf(dot);
    const key=wave<=5?'slow':wave<=8?'mid':'fast';
    const at=v.clocks[key]||0;
    return now-at>=b62ReleaseMs(wave, dot.mode==='FILTER_REJECTED');
  });
  if(!due.length)return;
  due.sort((a,b)=>b62WaveOf(a)-b62WaveOf(b));
  let pick=due[0];
  if(fastCount>=6){
    const slow=due.find(dot=>b62WaveOf(dot)<=5);
    if(!slow)return;
    pick=slow;
  }
  const wave=b62WaveOf(pick);
  const key=wave<=5?'slow':wave<=8?'mid':'fast';
  if(key==='slow' && flying.length>=12){
    v.clocks.slow=(v.clocks.slow||now)+b62ReleaseMs(wave, false);
    return;
  }
  v.clocks[key]=now;
  b62ReleaseCopy(v, pick, now);
}

function b62AdvanceReleased(dt){
  const O=b62SphereCenter();
  B62_UPDATE.released.forEach(copy=>{
    copy.O=O;
    if(!copy.parked)copy.u=Math.min(1, copy.u+dt/Math.max(200, copy.travel));
    copy.pos=b62ArcPoint(copy.O, copy.PC, copy.dest, copy.u);
  });
  if(B62_UPDATE.released.length>180){
    B62_UPDATE.released=B62_UPDATE.released.filter(c=>c.groupId||c.u<1).slice(-160);
  }
}

function b62SyncNewGroups(){
  const radius=SIZE*.12;
  const O=b62SphereCenter();
  const places=[];
  B62_UPDATE.vortices.forEach(v=>{
    if(!v.fromCenter||!v.toCenter||v.kind==='group')return;
    const PC=b62VortexMouth(v);
    places.push({key:`${v.from}→${v.to} · M`, at:b62ArcPoint(O, PC, v.toCenter, .5), parents:[v.from, v.to]});
    places.push({key:`${v.from}→${v.to} · PT`, at:b62ArcPoint(O, PC, v.toCenter, 1), parents:[v.from, v.to]});
  });
  const extra=[];
  for(let i=0;i<places.length;i++){
    for(let j=i+1;j<places.length;j++){
      if(b62Len(V.sub(places[i].at, places[j].at))>radius)continue;
      extra.push({
        key:`${places[i].key} × ${places[j].key}`,
        at:V.mul(V.add(places[i].at, places[j].at), .5),
        parents:[...new Set([...places[i].parents, ...places[j].parents])]
      });
    }
  }
  places.push(...extra);
  const claimed=new Set();
  places.forEach(place=>{
    const near=B62_UPDATE.released.filter(copy=>{
      if(!copy.pos||claimed.has(copy.id))return false;
      if(copy.groupId && copy.groupId!==place.key)return false;
      return b62Len(V.sub(copy.pos, place.at))<=radius;
    });
    let group=B62_UPDATE.groups.find(g=>g.id===place.key);
    if(!group && near.length>=8){
      group={id:place.key, name:place.key, parents:place.parents, count:0, center:place.at.slice(), wave:4};
      B62_UPDATE.groups.push(group);
    }
    if(!group)return;
    if(near.length<5){
      B62_UPDATE.released.forEach(copy=>{
        if(copy.groupId===group.id){copy.parked=false;copy.groupId=null}
      });
      B62_UPDATE.groups=B62_UPDATE.groups.filter(g=>g!==group);
      B62_UPDATE.vortices=B62_UPDATE.vortices.filter(v=>v.sourceGroupId!==group.id);
      return;
    }
    const center=[0,0,0];
    let wave=0;
    near.forEach(copy=>{
      claimed.add(copy.id);
      copy.parked=true;
      copy.groupId=group.id;
      center[0]+=copy.pos[0];center[1]+=copy.pos[1];center[2]+=copy.pos[2];
      wave+=copy.wave||4;
    });
    const n=Math.max(1, near.length);
    group.count=near.length;
    group.center=[center[0]/n, center[1]/n, center[2]/n];
    group.wave=wave/n;
    const destName=place.parents[1]||'Pattern';
    const vortexId=`ng:${group.id}`;
    const found=B62_UPDATE.vortices.find(v=>v.id===vortexId);
    if(!found){
      B62_UPDATE.vortices.push({
        id:vortexId, from:group.name, to:destName, kind:'group',
        sourceGroupId:group.id, spin:0, clocks:{},
        fromCenter:group.center.slice(),
        toCenter:b62CategoryCenter(destName)
      });
    }else{
      found.fromCenter=group.center.slice();
    }
  });
}

function b62UpdateBotLinks(){
  const person=typeof personObjectWorldPos==='undefined'?[0,0,0]:[...personObjectWorldPos];
  const probe=[];
  try{
    const current=B62_PROBE_BOT&&B62_PROBE_BOT.groupTourCurrent;
    if(current&&current.dotWorld){
      probe.push({
        bot:'probe', from:person, to:current.dotWorld,
        why:B62_PROBE_BOT.groupTourPhase==='RETURN'?'home':'arrow-ball',
        strength:Number(current.dot&&current.dot.confidence||.6)
      });
    }else if(B62_PROBE_BOT&&B62_PROBE_BOT.groupTourHome){
      probe.push({bot:'probe', from:person, to:B62_PROBE_BOT.groupTourHome, why:'home', strength:.4});
    }
  }catch(e){}
  const triangle=[];
  try{
    const dots=(typeof Z_TRI_BOT!=='undefined'&&Z_TRI_BOT.selectedDots)||[];
    if(dots.length>=3 && typeof dotWorldPoint==='function'){
      const worlds=dots.slice(0,3).map(dotWorldPoint);
      [[0,1],[1,2],[2,0]].forEach(([a,b])=>{
        if(worlds[a]&&worlds[b])triangle.push({bot:'triangle', from:worlds[a], to:worlds[b], why:'triangle', strength:Z_TRI_BOT.triangleScore||.5});
      });
    }
  }catch(e){}
  const wander=[];
  if(typeof B62_WANDER!=='undefined'&&B62_WANDER.on){
    let best=null, bestD=SIZE*.45;
    (decisionSphereDotState||[]).forEach(dot=>{
      if(!dot||!dot.p||dot.mode==='VORTEX_RELEASE')return;
      const world=typeof outerWorldPoint==='function'?outerWorldPoint(dot.p):dot.p;
      const d=b62Len(V.sub(world, person));
      if(d<bestD){bestD=d;best=world}
    });
    if(best)wander.push({bot:'wander', from:person, to:best, why:'nearest', strength:1-bestD/(SIZE*.45)});
  }
  B62_UPDATE.links={probe, triangle, wander};
}

function b62MissingPiece(decision){
  if(!decision||decision.decisionStatus!=='WAIT_FOR_DATA')return null;
  const defense=decision.defense61&&decision.defense61.status;
  if(!defense||defense==='NOT_EVALUATED')return 'bits';
  if(decision.engineConsensus==null && decision.probability==null)return 'consensus';
  if(decision.estimatedEdge==null)return 'edge';
  return 'consensus';
}

function b62RunDecisionChain(){
  let decision=null;
  try{decision=b62ReadyDecision()}catch(e){return}
  const defense=(decision.defense61&&decision.defense61.status)||'NOT_EVALUATED';
  const chain={
    bits:defense,
    review:decision.estimatedEdge==null?'no edge':`edge ${Number(decision.estimatedEdge).toFixed(3)}`,
    filters:`${decision.support?decision.support.activeDots:0} live / ${decision.resistance?decision.resistance.rejectedDots:0} rejected`,
    bet:decision.decisionStatus,
    missing:b62MissingPiece(decision),
    stoppedBeforeEdge:defense==='FAIL'
  };
  B62_UPDATE.chain=chain;
  try{
    const plan=typeof activePlan==='function'?activePlan():null;
    if(plan && plan.state==='active'){
      plan.decisionChain=chain;
      plan.decisionStatus=decision.decisionStatus;
      plan.decisionMissing=chain.missing;
      plan.decisionAt=decision.generatedAt;
    }
  }catch(e){}
}

function b62PaintUpdate(){
  const el=document.getElementById('b62UpdateReadout');
  if(!el)return;
  const chain=B62_UPDATE.chain;
  const lines=[];
  if(chain){
    lines.push(`BITS     ${chain.bits}${chain.stoppedBeforeEdge?'  · stopped before edge':''}`);
    lines.push(`REVIEW   ${chain.review}`);
    lines.push(`FILTERS  ${chain.filters}`);
    lines.push(`BET      ${chain.bet}`);
    if(chain.missing)lines.push(`MISSING  ${chain.missing}`);
  }else lines.push('DECISION  waiting');
  lines.push('');
  lines.push(`PROBE LINKS  ${B62_UPDATE.links.probe.length}`);
  lines.push(`TRIANGLE     ${B62_UPDATE.links.triangle.length}`);
  lines.push(`WANDER       ${B62_UPDATE.links.wander.length}`);
  lines.push(`VORTICES     ${B62_UPDATE.vortices.length}`);
  lines.push(`RELEASED     ${B62_UPDATE.released.length}`);
  lines.push(`NEW GROUPS   ${B62_UPDATE.groups.length}`);
  if(B62_UPDATE.groups[0])lines.push(B62_UPDATE.groups[0].name);
  if(B62_UPDATE.derived[0])lines.push(`LAST BRIDGE  ${B62_UPDATE.derived[0].bridge}`);
  el.textContent=lines.join('\n');
}

function b62SimUpdateSystems(){
  const now=performance.now();
  const dt=Math.min(48, now-(B62_UPDATE.last||now));
  B62_UPDATE.last=now;
  b62EnsureVortices();
  const stats=b62CategoryStats();
  B62_UPDATE.vortices.forEach(v=>{
    if(v.kind!=='group'){
      v.fromCenter=b62CategoryCenter(v.from);
      v.toCenter=b62CategoryCenter(v.to);
    }
    v.spin=(v.spin||0)+dt/2400;
    if(v.spin>=1){
      v.spin-=1;
      b62WriteVortexRecord(v, stats);
    }
    if(v.kind!=='group')b62TryRelease(v, stats, now);
  });
  b62AdvanceReleased(dt);
  if((B62_UPDATE.groupAt||0)+400<now){
    B62_UPDATE.groupAt=now;
    b62SyncNewGroups();
  }
  b62UpdateBotLinks();
  if((B62_UPDATE.decisionAt||0)+700<now){
    B62_UPDATE.decisionAt=now;
    b62RunDecisionChain();
    b62PaintUpdate();
  }
}

function b62DrawUpdateSystems(){
  if(typeof line!=='function'||typeof project!=='function')return;
  const O=b62SphereCenter();
  B62_UPDATE.vortices.forEach(v=>{
    if(!v.fromCenter||!v.toCenter)return;
    const PC=b62VortexMouth(v);
    let prev=null;
    for(let i=0;i<=12;i++){
      const p=project(b62ArcPoint(O, PC, v.toCenter, i/12));
      if(prev)line(prev, p, v.kind==='group'?'#9dffcf':'#ff7a00', 1.2);
      prev=p;
    }
  });
  B62_UPDATE.released.forEach(copy=>{
    if(!copy.pos)return;
    const p=project(copy.pos);
    dot(p, copy.parked?3.5:2.4, copy.wave>=9?'#ff5252':copy.wave<=2?'#6ec8ff':'#ffe66d');
  });
  B62_UPDATE.groups.forEach(group=>{
    const p=project(group.center);
    dot(p, 6, '#9dffcf');
    label(group.name, p.x+8, p.y-8, '#9dffcf', 10);
  });
  const paint=list=>(list||[]).forEach(link=>{
    if(!link.from||!link.to)return;
    line(project(link.from), project(link.to), link.bot==='probe'?'#ffe66d':link.bot==='triangle'?'#b38cff':'#9dffcf', 1.4);
  });
  paint(B62_UPDATE.links.probe);
  paint(B62_UPDATE.links.triangle);
  paint(B62_UPDATE.links.wander);
}
