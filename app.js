/* ============================================================
   Beam Solver — app logic
   ============================================================ */

let currentBeam = null;
let currentCat = 'All';
let lastCalc = null; // {p, result, Vext, Mext, total}

const CATS = ['All','Simple','Cantilever','Propped','Overhang','Fixed-Fixed','Continuous'];

/* ---------------- unit systems (labels only — no conversion) ---------------- */
const UNIT_SYSTEMS = [
  {id:'kNm',   name:'kN, m (SI)',   length:'m',  force:'kN',  load:'kN/m',  moment:'kN·m',  E:'kPa',            I:'m⁴',  defl:'m'},
  {id:'kNmm',  name:'kN, mm',       length:'mm', force:'kN',  load:'kN/mm', moment:'kN·mm', E:'kN/mm² (GPa)',   I:'mm⁴', defl:'mm'},
  {id:'Nmm',   name:'N, mm',        length:'mm', force:'N',   load:'N/mm',  moment:'N·mm',  E:'MPa (N/mm²)',    I:'mm⁴', defl:'mm'},
  {id:'lbin',  name:'lb, in',       length:'in', force:'lb',  load:'lb/in', moment:'lb·in', E:'psi',            I:'in⁴', defl:'in'},
  {id:'lbft',  name:'lb, ft',       length:'ft', force:'lb',  load:'lb/ft', moment:'lb·ft', E:'psf',            I:'ft⁴', defl:'ft'},
  {id:'kipft', name:'kip, ft',      length:'ft', force:'kip', load:'kip/ft',moment:'kip·ft',E:'ksf',            I:'ft⁴', defl:'ft'}
];
let currentUnit = UNIT_SYSTEMS[0];

const LENGTH_KEYS = ['L','L1','L2','a','b','c','ov'];
const LOAD_KEYS = ['w','w1','w2'];
const FORCE_KEYS = ['P','P1','P2','W'];

function inputKind(key){
  if(LENGTH_KEYS.includes(key)) return 'length';
  if(LOAD_KEYS.includes(key)) return 'load';
  if(FORCE_KEYS.includes(key)) return 'force';
  return '';
}
function unitFor(kind){
  if(kind==='length') return currentUnit.length;
  if(kind==='load') return currentUnit.load;
  if(kind==='force') return currentUnit.force;
  return '';
}

function buildUnitSelect(){
  const sel=document.getElementById('unitSelect');
  sel.innerHTML='';
  UNIT_SYSTEMS.forEach(u=>{
    const o=document.createElement('option');
    o.value=u.id; o.textContent=u.name;
    sel.appendChild(o);
  });
  sel.value=currentUnit.id;
  sel.addEventListener('change', function(){
    currentUnit = UNIT_SYSTEMS.find(u=>u.id===this.value);
    if(currentBeam) buildInputs();
    updateEILabels();
    if(lastCalc) renderResults(lastCalc.p, lastCalc.result, lastCalc.Vext, lastCalc.Mext, lastCalc.total);
  });
}

function updateEILabels(){
  document.getElementById('labelE').textContent = `E — Modulus of elasticity (${currentUnit.E})`;
  document.getElementById('labelI').textContent = `I — Moment of inertia (${currentUnit.I})`;
}

/* ---------------- number formatting ---------------- */
function fmt(v){
  if(v===undefined||v===null||isNaN(v)) return '—';
  if(Math.abs(v) < 1e-9) return '0';
  const av=Math.abs(v);
  let s;
  if(av>=1e6 || av<1e-3){ s=v.toExponential(3); }
  else { s=v.toPrecision(4); }
  if(s.indexOf('e')===-1 && s.indexOf('.')!==-1){
    s=s.replace(/0+$/,'').replace(/\.$/,'');
  }
  return s;
}
function fmtU(v,unit){ return `${fmt(v)}${unit? ' '+unit : ''}`; }

/* ---------------- category / beam list with thumbnails ---------------- */
function buildCats(){
  const el=document.getElementById('cats');
  el.innerHTML='';
  CATS.forEach(c=>{
    const b=document.createElement('button');
    b.className='cat-btn'+(c===currentCat?' active':'');
    b.textContent=c;
    b.onclick=()=>{ currentCat=c; buildCats(); buildBeamList(); };
    el.appendChild(b);
  });
}

const THUMB_DEFAULTS = {L:120,L1:120,L2:90,a:36,b:44,c:24,w:1,w1:1,w2:1,P:1,P1:1,P2:1,W:1,ov:24};

function thumbSVG(beam){
  const p={};
  beam.inputs.forEach(inp=> p[inp.k]=THUMB_DEFAULTS[inp.k]);
  let total, supports, loads;
  try{
    total = beam.totalLength(p);
    supports = beam.supports(p);
    loads = beam.loads(p);
  }catch(e){ return ''; }
  const W=140,H=54, m=10, y=30;
  const xs=x=> m + (x/total)*(W-2*m);
  let s=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  s+=`<rect x="${xs(0)}" y="${y-3}" width="${xs(total)-xs(0)}" height="6" rx="1" fill="#8FCBEF"/>`;
  loads.forEach(ld=>{
    if(ld.type==='udl'){
      const x1=xs(ld.x1),x2=xs(ld.x2);
      s+=`<line x1="${x1}" y1="${y-14}" x2="${x2}" y2="${y-14}" stroke="#E8A33D" stroke-width="1"/>`;
      const n=Math.max(2,Math.round((x2-x1)/12));
      for(let i=0;i<=n;i++){ const x=x1+(x2-x1)*i/n; s+=arrowSm(x,y-14,y-4); }
    } else if(ld.type==='tri'){
      const x1=xs(ld.x1),x2=xs(ld.x2);
      const n=Math.max(3,Math.round((x2-x1)/10));
      for(let i=0;i<=n;i++){ const t=i/n; const x=x1+(x2-x1)*t; const frac= ld.dir==='up'? t : 1-t; s+=arrowSm(x,y-4-frac*13,y-4); }
    } else if(ld.type==='point'){
      const x=xs(ld.x); s+=arrowSm(x,y-18,y-4);
    }
  });
  supports.forEach(sp=>{
    const x=xs(sp.x);
    if(sp.type==='pin'){
      s+=`<path d="M ${x-6} ${y+9} L ${x+6} ${y+9} L ${x} ${y+2} Z" fill="none" stroke="#8FB4CE" stroke-width="1.3"/>`;
      s+=`<line x1="${x-9}" y1="${y+9}" x2="${x+9}" y2="${y+9}" stroke="#8FB4CE" stroke-width="1"/>`;
    } else {
      s+=`<rect x="${x-7}" y="${y-6}" width="14" height="4" fill="none" stroke="#8FB4CE" stroke-width="1.2"/>`;
      for(let i=-6;i<=6;i+=3){ s+=`<line x1="${x+i}" y1="${y-2}" x2="${x+i-3}" y2="${y+4}" stroke="#8FB4CE" stroke-width="0.9"/>`; }
    }
  });
  s+=`</svg>`;
  return s;
}
function arrowSm(x,y1,y2){
  return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#E8A33D" stroke-width="1"/><path d="M ${x-2} ${y2-3} L ${x+2} ${y2-3} L ${x} ${y2} Z" fill="#E8A33D"/>`;
}

function buildBeamList(){
  const el=document.getElementById('beamList');
  el.innerHTML='';
  const list = BEAMS.filter(b=> currentCat==='All' || b.group===currentCat);
  list.forEach(b=>{
    const num=b.id.replace('f','');
    const item=document.createElement('div');
    item.className='beam-item'+(currentBeam&&currentBeam.id===b.id?' active':'');
    item.innerHTML=`<span class="fig-no">FIG ${num}</span><span class="icon">${thumbSVG(b)}</span><span class="name">${b.name}</span>`;
    item.onclick=()=> selectBeam(b.id);
    el.appendChild(item);
  });
}

function selectBeam(id){
  currentBeam = BEAMS.find(b=>b.id===id);
  lastCalc=null;
  buildBeamList();
  buildInputs();
  document.getElementById('input-section').style.display='block';
  document.getElementById('results').classList.remove('show');
  document.getElementById('errorBox').classList.remove('show');
  document.getElementById('input-section').scrollIntoView({behavior:'smooth', block:'start'});
}

function buildInputs(){
  const grid=document.getElementById('fieldGrid');
  grid.innerHTML='';
  currentBeam.inputs.forEach(inp=>{
    const unit=unitFor(inputKind(inp.k));
    const f=document.createElement('div');
    f.className='field';
    f.innerHTML=`<label>${inp.l}${unit? ' ('+unit+')':''}</label><input type="number" step="any" data-key="${inp.k}" placeholder="value">`;
    grid.appendChild(f);
  });
  document.getElementById('eiToggle').checked=false;
  document.getElementById('eiFields').classList.remove('show');
  updateEILabels();
}

document.getElementById('eiToggle').addEventListener('change', function(){
  document.getElementById('eiFields').classList.toggle('show', this.checked);
});

function readParams(){
  const p={};
  document.querySelectorAll('#fieldGrid input').forEach(inp=>{
    const key=inp.getAttribute('data-key');
    const v=parseFloat(inp.value);
    p[key]= isNaN(v)? undefined : v;
  });
  if(document.getElementById('eiToggle').checked){
    const e=parseFloat(document.getElementById('inpE').value);
    const i=parseFloat(document.getElementById('inpI').value);
    if(!isNaN(e)) p.E=e;
    if(!isNaN(i)) p.I=i;
  }
  return p;
}

function validate(p){
  for(const inp of currentBeam.inputs){
    if(p[inp.k]===undefined) return `Enter a value for "${inp.l}".`;
  }
  const L = currentBeam.totalLength(p);
  if(!(L>0)) return 'Check span/length values — total length must be positive.';
  return null;
}

/* --- numeric extreme finder over a piecewise fn --- */
function findExtreme(fn, total, breakpoints){
  let maxAbs=-1, maxAt=0, maxVal=0;
  const eps = total*1e-6;
  const pts=[];
  breakpoints.forEach(bp=>{
    pts.push(Math.max(0,bp-eps));
    pts.push(bp);
    pts.push(Math.min(total,bp+eps));
  });
  const N=400;
  for(let i=0;i<=N;i++) pts.push(total*i/N);
  pts.forEach(x=>{
    let v;
    try{ v=fn(x); }catch(e){ return; }
    if(v===undefined||isNaN(v)) return;
    if(Math.abs(v)>maxAbs){ maxAbs=Math.abs(v); maxAt=x; maxVal=v; }
  });
  return {val:maxVal, at:maxAt};
}

/* --- reaction value at each support, read directly off the shear jump --- */
function reactionsFromShear(Vx, supports, total){
  const eps = Math.max(total*1e-5, 1e-6);
  return supports.map(s=>{
    const left = s.x<=eps ? 0 : Vx(s.x-eps);
    const right = s.x>=total-eps ? 0 : Vx(s.x+eps);
    return right-left;
  });
}

document.getElementById('calcBtn').addEventListener('click', function(){
  const errBox=document.getElementById('errorBox');
  errBox.classList.remove('show');
  const p=readParams();
  const err=validate(p);
  if(err){ errBox.textContent=err; errBox.classList.add('show'); return; }

  let result;
  try{
    result = currentBeam.calc(p);
  }catch(e){
    errBox.textContent='Could not calculate with these values — check inputs (e.g. load positions must lie within the span).';
    errBox.classList.add('show');
    return;
  }

  const total = currentBeam.totalLength(p);
  const Vext = findExtreme(result.Vx, total, result.breakpoints);
  const Mext = findExtreme(result.Mx, total, result.breakpoints);

  lastCalc = {p, result, Vext, Mext, total};
  renderResults(p, result, Vext, Mext, total);
});

function renderResults(p, result, Vext, Mext, total){
  const grid=document.getElementById('resultGrid');
  grid.innerHTML='';

  result.R.forEach(r=>{
    const c=document.createElement('div');
    c.className='result-card';
    c.innerHTML=`<div class="k">${r.l}</div><div class="v">${fmtU(r.v,currentUnit.force)}</div>`;
    grid.appendChild(c);
  });

  const vCard=document.createElement('div');
  vCard.className='result-card highlight';
  vCard.innerHTML=`<div class="k">V max</div><div class="v">${fmtU(Vext.val,currentUnit.force)}<span class="at">at x = ${fmtU(Vext.at,currentUnit.length)}</span></div>`;
  grid.appendChild(vCard);

  const mCard=document.createElement('div');
  mCard.className='result-card highlight';
  mCard.innerHTML=`<div class="k">M max</div><div class="v">${fmtU(Mext.val,currentUnit.moment)}<span class="at">at x = ${fmtU(Mext.at,currentUnit.length)}</span></div>`;
  grid.appendChild(mCard);

  if(result.Dmax){
    const dCard=document.createElement('div');
    dCard.className='result-card';
    dCard.innerHTML=`<div class="k">Δ max (deflection)</div><div class="v">${fmtU(result.Dmax.v,currentUnit.defl)}<span class="at">at x = ${fmtU(result.Dmax.at,currentUnit.length)}</span></div>`;
    grid.appendChild(dCard);
  } else if(document.getElementById('eiToggle').checked){
    const dCard=document.createElement('div');
    dCard.className='result-card';
    dCard.innerHTML=`<div class="k">Δ max</div><div class="v" style="font-size:0.75rem;font-weight:400;color:var(--ink-soft)">Not tabulated for this configuration in Design Aid No. 6</div>`;
    grid.appendChild(dCard);
  }

  document.getElementById('lengthLabel').textContent = `Total length = ${fmtU(total,currentUnit.length)}`;
  document.getElementById('vmaxLabel').textContent = `Vmax = ${fmtU(Vext.val,currentUnit.force)}`;
  document.getElementById('mmaxLabel').textContent = `Mmax = ${fmtU(Mext.val,currentUnit.moment)}`;

  const supports = currentBeam.supports(p);
  const loads = currentBeam.loads(p);
  const reactions = reactionsFromShear(result.Vx, supports, total);

  drawLoadDiagram(supports, loads, total, reactions, result.breakpoints);
  drawCurve('svgShear', result.Vx, total, result.breakpoints, Vext);
  drawCurve('svgMoment', result.Mx, total, result.breakpoints, Mext);

  document.getElementById('results').classList.add('show');
  document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
}

/* ---------------- SVG rendering ---------------- */
const SVG_NS='http://www.w3.org/2000/svg';
const MARGIN=30, W=600;

function xScale(x,total){ return MARGIN + (x/total)*(W-2*MARGIN); }

function el(tag, attrs){
  const e=document.createElementNS(SVG_NS,tag);
  for(const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
function txt(x,y,str,attrs){
  const t=el('text', Object.assign({x,y,'font-family':'IBM Plex Mono, monospace'}, attrs));
  t.textContent=str;
  return t;
}
function clearSvg(id){
  const svg=document.getElementById(id);
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  return svg;
}

function ensureDefs(svg){
  const defs=el('defs',{});
  const grad=el('linearGradient',{id:'beamGrad',x1:'0',y1:'0',x2:'0',y2:'1'});
  grad.appendChild(el('stop',{offset:'0%','stop-color':'#B9DEF3'}));
  grad.appendChild(el('stop',{offset:'50%','stop-color':'#6FA9CE'}));
  grad.appendChild(el('stop',{offset:'100%','stop-color':'#3E7CA6'}));
  defs.appendChild(grad);
  svg.appendChild(defs);
}

function drawLoadDiagram(supports, loads, total, reactions, breakpoints){
  const svg=clearSvg('svgLoad');
  ensureDefs(svg);
  const beamY=68, beamH=9;
  const lenU=currentUnit.length, forceU=currentUnit.force, loadU=currentUnit.load;

  svg.appendChild(el('rect',{
    x:xScale(0,total), y:beamY-beamH/2, width:xScale(total,total)-xScale(0,total), height:beamH,
    fill:'url(#beamGrad)', stroke:'#1E5478', 'stroke-width':1, rx:1
  }));

  loads.forEach(ld=>{
    if(ld.type==='udl'){
      const x1=xScale(ld.x1,total), x2=xScale(ld.x2,total);
      const topY=beamY-26;
      svg.appendChild(el('line',{x1,y1:topY,x2,y2:topY,stroke:'#E8A33D','stroke-width':1.4}));
      const n=Math.max(3,Math.round((x2-x1)/20));
      for(let i=0;i<=n;i++){ const x=x1+(x2-x1)*i/n; svg.appendChild(arrowDown(x,topY,beamY-beamH/2-1)); }
      const label = ld.val!==undefined ? `w = ${fmtU(ld.val,loadU)}` : 'w';
      svg.appendChild(txt((x1+x2)/2, topY-6, label, {'font-size':'9', fill:'#F3C77E','text-anchor':'middle'}));
    } else if(ld.type==='tri'){
      const x1=xScale(ld.x1,total), x2=xScale(ld.x2,total);
      const n=Math.max(4,Math.round((x2-x1)/14));
      for(let i=0;i<=n;i++){
        const t=i/n; const x=x1+(x2-x1)*t;
        const frac = ld.dir==='up'? t : (1-t);
        const topY = beamY-6-frac*22;
        svg.appendChild(arrowDown(x,topY,beamY-beamH/2-1));
      }
      const label = ld.val!==undefined ? `W = ${fmtU(ld.val,forceU)}` : 'W';
      svg.appendChild(txt((x1+x2)/2, beamY-32, label, {'font-size':'9', fill:'#F3C77E','text-anchor':'middle'}));
    } else if(ld.type==='point'){
      const x=xScale(ld.x,total);
      svg.appendChild(arrowDown(x, beamY-34, beamY-beamH/2-1, true));
      const label = ld.val!==undefined ? `P = ${fmtU(ld.val,forceU)}` : 'P';
      svg.appendChild(txt(x, beamY-38, label, {'font-size':'9', fill:'#F3C77E','text-anchor':'middle'}));
    }
  });

  supports.forEach(s=>{
    const x=xScale(s.x,total);
    if(s.type==='pin'){
      svg.appendChild(el('path',{d:`M ${x-9} ${beamY+18} L ${x+9} ${beamY+18} L ${x} ${beamY+beamH/2+1} Z`, fill:'#264A63', stroke:'#8FB4CE','stroke-width':1.2}));
      svg.appendChild(el('line',{x1:x-13,y1:beamY+18,x2:x+13,y2:beamY+18, stroke:'#8FB4CE','stroke-width':1.3}));
      for(let i=-12;i<=12;i+=4){
        svg.appendChild(el('line',{x1:x+i,y1:beamY+18,x2:x+i-4,y2:beamY+24,stroke:'#8FB4CE','stroke-width':1}));
      }
    } else {
      const wallX = s.x<=1e-9 ? x-6 : x+6;
      svg.appendChild(el('line',{x1:wallX,y1:beamY-20,x2:wallX,y2:beamY+20, stroke:'#8FB4CE','stroke-width':1.6}));
      for(let i=-18;i<=18;i+=6){
        const dx = s.x<=1e-9 ? -6 : 6;
        svg.appendChild(el('line',{x1:wallX,y1:beamY+i,x2:wallX+dx,y2:beamY+i-6,stroke:'#8FB4CE','stroke-width':1}));
      }
    }
  });

  reactions.forEach((rv,i)=>{
    const x=xScale(supports[i].x,total);
    const up = rv>=0;
    const y1 = up? beamY+38 : beamY+18;
    const y2 = up? beamY+19 : beamY+37;
    svg.appendChild(arrowUpOrDown(x,y1,y2,up));
    svg.appendChild(txt(x, beamY+50, `R${i+1}=${fmt(rv)}${rv<0?' \u2193':''}`, {'font-size':'9', fill:'#DCE6EE','text-anchor':'middle'}));
  });

  const dimY=beamY+70;
  const bps=[...breakpoints].sort((a,b)=>a-b).filter((v,i,arr)=> i===0||v-arr[i-1]>total*1e-4);
  svg.appendChild(el('line',{x1:xScale(0,total),y1:dimY,x2:xScale(total,total),y2:dimY, stroke:'#5B7A91','stroke-width':1}));
  bps.forEach(bp=>{
    const x=xScale(bp,total);
    svg.appendChild(el('line',{x1:x,y1:dimY-4,x2:x,y2:dimY+4, stroke:'#5B7A91','stroke-width':1}));
  });
  for(let i=0;i<bps.length-1;i++){
    const x1=xScale(bps[i],total), x2=xScale(bps[i+1],total);
    const segLen=bps[i+1]-bps[i];
    if(x2-x1<14) continue;
    svg.appendChild(txt((x1+x2)/2, dimY+14, fmtU(segLen,lenU), {'font-size':'9', fill:'#9FB6C7','text-anchor':'middle'}));
  }
}

function arrowDown(x,y1,y2,bold){
  const g=el('g',{});
  g.appendChild(el('line',{x1:x,y1:y1,x2:x,y2:y2,stroke:'#E8A33D','stroke-width':bold?2:1.3}));
  const s=bold?4.5:3;
  g.appendChild(el('path',{d:`M ${x-s} ${y2-s*1.7} L ${x+s} ${y2-s*1.7} L ${x} ${y2} Z`, fill:'#E8A33D'}));
  return g;
}
function arrowUpOrDown(x,y1,y2,up){
  const g=el('g',{});
  g.appendChild(el('line',{x1:x,y1:y1,x2:x,y2:y2,stroke:'#7FD08A','stroke-width':1.6}));
  const s=3.2;
  if(up){ g.appendChild(el('path',{d:`M ${x-s} ${y2+s*1.6} L ${x+s} ${y2+s*1.6} L ${x} ${y2} Z`, fill:'#7FD08A'})); }
  else { g.appendChild(el('path',{d:`M ${x-s} ${y2-s*1.6} L ${x+s} ${y2-s*1.6} L ${x} ${y2} Z`, fill:'#7FD08A'})); }
  return g;
}

function drawCurve(svgId, fn, total, breakpoints, ext){
  const svg=clearSvg(svgId);
  const H=120, top=8, bottom=H-8, mid=(top+bottom)/2, halfH=(bottom-top)/2;
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);

  const xs=[];
  const N=300;
  for(let i=0;i<=N;i++) xs.push(total*i/N);
  const eps=total*1e-5;
  breakpoints.forEach(bp=>{ xs.push(Math.max(0,bp-eps)); xs.push(Math.min(total,bp+eps)); });
  xs.sort((a,b)=>a-b);

  const vals = xs.map(x=>{ try{return fn(x);}catch(e){return 0;} });
  const maxAbs = Math.max(1e-9, ...vals.map(v=>Math.abs(v)));

  svg.appendChild(el('line',{x1:MARGIN,y1:mid,x2:W-MARGIN,y2:mid,stroke:'#3E5A72','stroke-width':1}));

  let segs=[[]];
  for(let i=0;i<xs.length;i++){
    const x=xScale(xs[i],total), y=mid-(vals[i]/maxAbs)*halfH*0.86;
    if(i>0 && Math.abs(xs[i]-xs[i-1])<1e-9){
      segs.push([]);
    }
    segs[segs.length-1].push([x,y]);
  }

  segs.forEach(seg=>{
    if(seg.length<2) return;
    const pathTop=seg.map(pt=>pt.join(',')).join(' L ');
    const areaPts = `${seg[0][0]},${mid} L ${pathTop} L ${seg[seg.length-1][0]},${mid} Z`;
    svg.appendChild(el('path',{d:`M ${areaPts}`, fill:'rgba(43,93,130,0.35)', stroke:'none'}));
    svg.appendChild(el('path',{d:`M ${pathTop}`, fill:'none', stroke:'#8FCBEF','stroke-width':1.6}));
  });

  if(ext){
    const mx=xScale(ext.at,total), my=mid-(ext.val/maxAbs)*halfH*0.86;
    svg.appendChild(el('circle',{cx:mx,cy:my,r:3.2,fill:'#E8A33D'}));
  }
}

/* init */
buildUnitSelect();
updateEILabels();
buildCats();
buildBeamList();
