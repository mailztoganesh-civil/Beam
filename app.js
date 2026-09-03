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
    if(currentBeam) renderInputFigure(currentBeam, true);
    updateEILabels();
    if(lastCalc) renderResults(lastCalc.p, lastCalc.result, lastCalc.Vext, lastCalc.Mext, lastCalc.total);
  });
}

function updateEILabels(){
  document.getElementById('labelE').textContent = `E — Modulus of elasticity (${currentUnit.E})`;
  document.getElementById('labelI').textContent = `I — Moment of inertia (${currentUnit.I})`;
}

/* ---------------- page navigation ---------------- */
function showPage(name){
  ['page-select','page-input','page-results'].forEach(id=>{
    document.getElementById(id).classList.toggle('active', id===name);
  });
  window.scrollTo({top:0, behavior:'smooth'});
}
document.getElementById('backToSelect').addEventListener('click', ()=> showPage('page-select'));
document.getElementById('backToInput').addEventListener('click', ()=> showPage('page-input'));

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

/* ---------------- category / beam list with preview figures ---------------- */
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

/* Generic layout defaults used ONLY to draw a clear, evenly-proportioned
   schematic (not to scale) for beam previews and the input figure. */
const THUMB_DEFAULTS = {L:120,L1:120,L2:96,a:40,b:44,c:32,w:1,w1:1,w2:1,P:1,P1:1,P2:1,W:1,ov:28};

function schematicSVG(beam, width, height, big){
  const p={};
  beam.inputs.forEach(inp=> p[inp.k]=THUMB_DEFAULTS[inp.k]);
  let total, supports, loads;
  try{
    total = beam.totalLength(p);
    supports = beam.supports(p);
    loads = beam.loads(p);
  }catch(e){ return {svg:'', total:0, supports:[], loads:[], p}; }
  const m = big? 34 : 10;
  const y = big? Math.round(height*0.42) : Math.round(height*0.55);
  const xs = x=> m + (x/total)*(width-2*m);
  let s=`<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
  s+=`<rect x="${xs(0)}" y="${y-4}" width="${xs(total)-xs(0)}" height="8" rx="1.5" fill="#8FCBEF" stroke="#3E7CA6" stroke-width="1"/>`;
  loads.forEach(ld=>{
    if(ld.type==='udl'){
      const x1=xs(ld.x1),x2=xs(ld.x2);
      const topY=y-(big?26:14);
      s+=`<line x1="${x1}" y1="${topY}" x2="${x2}" y2="${topY}" stroke="#E8A33D" stroke-width="1.2"/>`;
      const n=Math.max(2,Math.round((x2-x1)/(big?18:12)));
      for(let i=0;i<=n;i++){ const x=x1+(x2-x1)*i/n; s+=arrowSm(x,topY,y-5,big); }
    } else if(ld.type==='tri'){
      const x1=xs(ld.x1),x2=xs(ld.x2);
      const n=Math.max(3,Math.round((x2-x1)/(big?14:10)));
      const tall=big?22:13;
      for(let i=0;i<=n;i++){ const t=i/n; const x=x1+(x2-x1)*t; const frac= ld.dir==='up'? t : 1-t; s+=arrowSm(x,y-5-frac*tall,y-5,big); }
    } else if(ld.type==='point'){
      const x=xs(ld.x); s+=arrowSm(x,y-(big?32:18),y-5,big,true);
    }
  });
  supports.forEach(sp=>{
    const x=xs(sp.x);
    const r1=big?10:6, r2=big?16:9;
    if(sp.type==='pin'){
      s+=`<path d="M ${x-r1} ${y+r2} L ${x+r1} ${y+r2} L ${x} ${y+2} Z" fill="#264A63" stroke="#8FB4CE" stroke-width="1.2"/>`;
      s+=`<line x1="${x-r2}" y1="${y+r2}" x2="${x+r2}" y2="${y+r2}" stroke="#8FB4CE" stroke-width="1"/>`;
      const step=big?6:3;
      for(let i=-r2+2;i<=r2-2;i+=step){ s+=`<line x1="${x+i}" y1="${y+r2}" x2="${x+i-step}" y2="${y+r2+step}" stroke="#8FB4CE" stroke-width="0.9"/>`; }
    } else {
      const wallX = sp.x<=1e-9 ? x-(big?9:7) : x+(big?9:7);
      s+=`<line x1="${wallX}" y1="${y-r2}" x2="${wallX}" y2="${y+r2}" stroke="#8FB4CE" stroke-width="1.4"/>`;
      const dx = sp.x<=1e-9 ? -(big?7:5) : (big?7:5);
      const step=big?7:4;
      for(let i=-r2+2;i<=r2-2;i+=step){ s+=`<line x1="${wallX}" y1="${y+i}" x2="${wallX+dx}" y2="${y+i-step}" stroke="#8FB4CE" stroke-width="0.9"/>`; }
    }
  });
  s+=`</svg>`;
  return {svg:s, total, supports, loads, p, xs, y, m};
}
function arrowSm(x,y1,y2,big,bold){
  const w = bold ? (big?1.8:1.2) : (big?1.4:1);
  const s = bold ? (big?4.5:3) : (big?3.4:2);
  return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#E8A33D" stroke-width="${w}"/><path d="M ${x-s} ${y2-s*1.6} L ${x+s} ${y2-s*1.6} L ${x} ${y2} Z" fill="#E8A33D"/>`;
}

function buildBeamList(){
  const el=document.getElementById('beamList');
  el.innerHTML='';
  const list = BEAMS.filter(b=> currentCat==='All' || b.group===currentCat);
  list.forEach(b=>{
    const num=b.id.replace('f','');
    const item=document.createElement('div');
    item.className='beam-item'+(currentBeam&&currentBeam.id===b.id?' active':'');
    const thumb = schematicSVG(b, 280, 92, false);
    item.innerHTML=`<div class="row1"><span class="fig-no">FIG ${num}</span><span class="name">${b.name}</span></div><div class="icon">${thumb.svg}</div>`;
    item.onclick=()=> selectBeam(b.id);
    el.appendChild(item);
  });
}

function selectBeam(id){
  currentBeam = BEAMS.find(b=>b.id===id);
  lastCalc=null;
  buildBeamList();
  showPage('page-input');
  renderInputFigure(currentBeam, false);
}

/* ---------------- interactive input figure ---------------- */
function renderInputFigure(beam, preserveValues){
  // preserve previously typed values if re-rendering (e.g. on unit change)
  const prevValues={};
  if(preserveValues){
    document.querySelectorAll('#figureWrap input[data-key]').forEach(inp=>{
      prevValues[inp.getAttribute('data-key')] = inp.value;
    });
  }

  document.getElementById('figTitle').textContent = `Fig. ${beam.id.replace('f','')} — ${beam.name}`;
  document.getElementById('figSub').textContent = `${beam.group} beam — enter the values marked on the figure below.`;

  const W=600, H=260;
  const layout = schematicSVG(beam, W, H, true);
  const {total, supports, loads, p, xs, y} = layout;
  const svg = document.getElementById('svgInput');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = layout.svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');

  // dimension lines (visual only — the numeric values come from the overlaid inputs)
  const dims = beam.dims(p);
  const row0Y = y+52, row1Y = y+82;
  dims.forEach(d=>{
    const rowY = d.row===1 ? row1Y : row0Y;
    const x1=xs(d.x1), x2=xs(d.x2);
    svg.innerHTML += `<line x1="${x1}" y1="${y+20}" x2="${x1}" y2="${rowY}" stroke="#3E5A72" stroke-width="0.8"/>`;
    svg.innerHTML += `<line x1="${x2}" y1="${y+20}" x2="${x2}" y2="${rowY}" stroke="#3E5A72" stroke-width="0.8"/>`;
    svg.innerHTML += `<line x1="${x1}" y1="${rowY}" x2="${x2}" y2="${rowY}" stroke="#5B7A91" stroke-width="1"/>`;
  });

  // build overlay input boxes
  const wrap = document.getElementById('figureWrap');
  wrap.querySelectorAll('.fig-input-box').forEach(n=>n.remove());

  const placed = new Set();
  beam.inputs.forEach(inp=>{
    if(placed.has(inp.k)) return;
    const kind = inputKind(inp.k);
    let px, py;
    if(kind==='length'){
      const d = dims.find(dd=>dd.k===inp.k);
      if(!d) return;
      px = (xs(d.x1)+xs(d.x2))/2;
      py = d.row===1 ? row1Y : row0Y;
    } else {
      // find the matching load entry for this key
      const ld = loads.find(l=> l.key===inp.k);
      if(!ld) return;
      if(ld.type==='point'){ px=xs(ld.x); py=y-(38); }
      else { px=(xs(ld.x1)+xs(ld.x2))/2; py=y-(ld.type==='udl'?30:26); }
    }
    placed.add(inp.k);
    const box=document.createElement('div');
    box.className='fig-input-box';
    box.style.left=(px/W*100)+'%';
    box.style.top=(py/H*100)+'%';
    const unit=unitFor(kind);
    box.innerHTML=`<span class="sym">${inp.k}${unit?' ('+unit+')':''}</span><input type="number" step="any" data-key="${inp.k}" placeholder="${inp.k}">`;
    wrap.appendChild(box);
    const inputEl = box.querySelector('input');
    if(prevValues[inp.k]!==undefined) inputEl.value = prevValues[inp.k];
    inputEl.addEventListener('input', function(){
      box.classList.toggle('filled', this.value!=='');
    });
    if(inputEl.value) box.classList.add('filled');
  });

  document.getElementById('eiToggle').checked=false;
  document.getElementById('eiFields').classList.remove('show');
  updateEILabels();
  document.getElementById('errorBox').classList.remove('show');
}

document.getElementById('eiToggle').addEventListener('change', function(){
  document.getElementById('eiFields').classList.toggle('show', this.checked);
});

function readParams(){
  const p={};
  document.querySelectorAll('#figureWrap input[data-key]').forEach(inp=>{
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
    if(p[inp.k]===undefined) return `Enter a value for "${inp.k}" on the figure.`;
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

/* --- map the declared R[] entries onto each support position.
   Most beams have one R entry per support; a few (equal-span
   symmetric cases) declare "R1 = R3" as a single combined entry —
   expand that back out to one value per physical support. --- */
function expandReactions(R, supports){
  if(R.length===supports.length) return R.map(r=>r.v);
  if(R.length===supports.length-1) return [R[0].v, ...R.slice(1).map(r=>r.v), R[0].v];
  // fallback: shouldn't happen for the 32 known configurations
  return supports.map((s,i)=> R[Math.min(i,R.length-1)].v);
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
  showPage('page-results');
});

function renderResults(p, result, Vext, Mext, total){
  document.getElementById('resTitle').textContent = `Fig. ${currentBeam.id.replace('f','')} — ${currentBeam.name}`;

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
  const reactions = expandReactions(result.R, supports);

  drawLoadDiagram(supports, loads, total, reactions, result.breakpoints);
  drawCurve('svgShear', result.Vx, total, result.breakpoints, Vext);
  drawCurve('svgMoment', result.Mx, total, result.breakpoints, Mext);

  // default the scrubber to the critical (max moment) section, then let the user drag
  updateScrub(Mext.at);
}

/* ---------------- SVG rendering (results page) ---------------- */
const SVG_NS='http://www.w3.org/2000/svg';
const MARGIN=32, W=600;

function xScale(x,total){ return MARGIN + (x/total)*(W-2*MARGIN); }

function el(tag, attrs){
  const e=document.createElementNS(SVG_NS,tag);
  for(const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
function anchorFor(x){
  if(x<52) return 'start';
  if(x>W-52) return 'end';
  return 'middle';
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
  grad.appendChild(el('stop',{offset:'0%','stop-color':'#C7E4F5'}));
  grad.appendChild(el('stop',{offset:'50%','stop-color':'#6FA9CE'}));
  grad.appendChild(el('stop',{offset:'100%','stop-color':'#2F6C93'}));
  defs.appendChild(grad);
  svg.appendChild(defs);
}

function drawLoadDiagram(supports, loads, total, reactions, breakpoints){
  const svg=clearSvg('svgLoad');
  ensureDefs(svg);
  const beamY=66, beamH=10;
  const lenU=currentUnit.length, forceU=currentUnit.force, loadU=currentUnit.load;

  svg.appendChild(el('rect',{
    x:xScale(0,total), y:beamY-beamH/2, width:xScale(total,total)-xScale(0,total), height:beamH,
    fill:'url(#beamGrad)', stroke:'#173A54', 'stroke-width':1.2, rx:1.5
  }));

  loads.forEach(ld=>{
    if(ld.type==='udl'){
      const x1=xScale(ld.x1,total), x2=xScale(ld.x2,total);
      const topY=beamY-28;
      svg.appendChild(el('line',{x1,y1:topY,x2,y2:topY,stroke:'#E8A33D','stroke-width':1.6}));
      const n=Math.max(3,Math.round((x2-x1)/20));
      for(let i=0;i<=n;i++){ const x=x1+(x2-x1)*i/n; svg.appendChild(arrowDown(x,topY,beamY-beamH/2-1)); }
      const label = ld.val!==undefined ? `w = ${fmtU(ld.val,loadU)}` : 'w';
      svg.appendChild(txt((x1+x2)/2, topY-7, label, {'font-size':'10', fill:'#F3C77E','text-anchor':anchorFor((x1+x2)/2),'font-weight':'600'}));
    } else if(ld.type==='tri'){
      const x1=xScale(ld.x1,total), x2=xScale(ld.x2,total);
      const n=Math.max(4,Math.round((x2-x1)/14));
      for(let i=0;i<=n;i++){
        const t=i/n; const x=x1+(x2-x1)*t;
        const frac = ld.dir==='up'? t : (1-t);
        const topY = beamY-6-frac*24;
        svg.appendChild(arrowDown(x,topY,beamY-beamH/2-1));
      }
      const label = ld.val!==undefined ? `W = ${fmtU(ld.val,forceU)}` : 'W';
      svg.appendChild(txt((x1+x2)/2, beamY-34, label, {'font-size':'10', fill:'#F3C77E','text-anchor':'middle','font-weight':'600'}));
    } else if(ld.type==='point'){
      const x=xScale(ld.x,total);
      svg.appendChild(arrowDown(x, beamY-36, beamY-beamH/2-1, true));
      const label = ld.val!==undefined ? `P = ${fmtU(ld.val,forceU)}` : 'P';
      svg.appendChild(txt(x, beamY-40, label, {'font-size':'10', fill:'#F3C77E','text-anchor':anchorFor(x),'font-weight':'600'}));
    }
  });

  supports.forEach(s=>{
    const x=xScale(s.x,total);
    if(s.type==='pin'){
      svg.appendChild(el('path',{d:`M ${x-10} ${beamY+19} L ${x+10} ${beamY+19} L ${x} ${beamY+beamH/2+1} Z`, fill:'#264A63', stroke:'#8FB4CE','stroke-width':1.3}));
      svg.appendChild(el('line',{x1:x-14,y1:beamY+19,x2:x+14,y2:beamY+19, stroke:'#8FB4CE','stroke-width':1.4}));
      for(let i=-13;i<=13;i+=4.5){
        svg.appendChild(el('line',{x1:x+i,y1:beamY+19,x2:x+i-4.5,y2:beamY+25,stroke:'#8FB4CE','stroke-width':1}));
      }
    } else {
      const wallX = s.x<=1e-9 ? x-7 : x+7;
      svg.appendChild(el('line',{x1:wallX,y1:beamY-21,x2:wallX,y2:beamY+21, stroke:'#8FB4CE','stroke-width':1.8}));
      for(let i=-18;i<=18;i+=6){
        const dx = s.x<=1e-9 ? -7 : 7;
        svg.appendChild(el('line',{x1:wallX,y1:beamY+i,x2:wallX+dx,y2:beamY+i-6,stroke:'#8FB4CE','stroke-width':1.1}));
      }
    }
  });

  reactions.forEach((rv,i)=>{
    const x=xScale(supports[i].x,total);
    const up = rv>=0;
    const y1 = up? beamY+40 : beamY+19;
    const y2 = up? beamY+20 : beamY+39;
    svg.appendChild(arrowUpOrDown(x,y1,y2,up));
    const anchor = anchorFor(x);
    svg.appendChild(txt(x, beamY+53, `R${i+1}=${fmt(rv)}${rv<0?' \u2193':''}`, {'font-size':'10', fill:'#DCE6EE','text-anchor':anchor,'font-weight':'600'}));
  });

  const dimY=beamY+74;
  const bps=[...breakpoints].sort((a,b)=>a-b).filter((v,i,arr)=> i===0||v-arr[i-1]>total*1e-4);
  svg.appendChild(el('line',{x1:xScale(0,total),y1:dimY,x2:xScale(total,total),y2:dimY, stroke:'#5B7A91','stroke-width':1.2}));
  bps.forEach(bp=>{
    const x=xScale(bp,total);
    svg.appendChild(el('line',{x1:x,y1:dimY-4,x2:x,y2:dimY+4, stroke:'#5B7A91','stroke-width':1.2}));
  });
  for(let i=0;i<bps.length-1;i++){
    const x1=xScale(bps[i],total), x2=xScale(bps[i+1],total);
    const segLen=bps[i+1]-bps[i];
    if(x2-x1<16) continue;
    const mid=(x1+x2)/2;
    const anchor = anchorFor(mid);
    svg.appendChild(txt(mid, dimY+15, fmtU(segLen,lenU), {'font-size':'9.5', fill:'#9FB6C7','text-anchor':anchor}));
  }
}

function arrowDown(x,y1,y2,bold){
  const g=el('g',{});
  g.appendChild(el('line',{x1:x,y1:y1,x2:x,y2:y2,stroke:'#E8A33D','stroke-width':bold?2.2:1.5}));
  const s=bold?5:3.4;
  g.appendChild(el('path',{d:`M ${x-s} ${y2-s*1.7} L ${x+s} ${y2-s*1.7} L ${x} ${y2} Z`, fill:'#E8A33D'}));
  return g;
}
function arrowUpOrDown(x,y1,y2,up){
  const g=el('g',{});
  g.appendChild(el('line',{x1:x,y1:y1,x2:x,y2:y2,stroke:'#7FD08A','stroke-width':1.8}));
  const s=3.6;
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
    svg.appendChild(el('path',{d:`M ${areaPts}`, fill:'rgba(111,169,206,0.35)', stroke:'none'}));
    svg.appendChild(el('path',{d:`M ${pathTop}`, fill:'none', stroke:'#8FCBEF','stroke-width':1.8}));
  });

  if(ext){
    const mx=xScale(ext.at,total), my=mid-(ext.val/maxAbs)*halfH*0.86;
    svg.appendChild(el('circle',{cx:mx,cy:my,r:3.6,fill:'#E8A33D',stroke:'#0E2A44','stroke-width':1}));
  }

  curveScale[svgId] = {mid, halfH, maxAbs, H, total};
}

/* ---------------- scrub / drag readout across all three diagrams ---------------- */
const curveScale = {};

function drawCursorOn(svgId, beamX){
  const svg=document.getElementById(svgId);
  const old=svg.querySelector('.cursor-grp');
  if(old) old.remove();
  const cs = curveScale[svgId];
  const total = cs ? cs.total : lastCalc.total;
  const x = xScale(beamX, total);
  const H = cs ? cs.H : (svgId==='svgLoad' ? 190 : 120);
  const g = el('g',{class:'cursor-grp'});
  g.appendChild(el('line',{x1:x,y1:2,x2:x,y2:H-2,stroke:'#ffffff','stroke-width':1,'stroke-dasharray':'3,3',opacity:'0.85'}));
  if(cs){
    let fn = null;
    if(svgId==='svgShear') fn = lastCalc.result.Vx;
    if(svgId==='svgMoment') fn = lastCalc.result.Mx;
    if(fn){
      let val=0; try{ val=fn(beamX); }catch(e){}
      const y = cs.mid - (val/cs.maxAbs)*cs.halfH*0.86;
      g.appendChild(el('circle',{cx:x,cy:y,r:4,fill:'#ffffff',stroke:'#0E2A44','stroke-width':1.4}));
    }
  }
  svg.appendChild(g);
}

function updateScrub(beamX){
  if(!lastCalc) return;
  const total = lastCalc.total;
  beamX = Math.max(0, Math.min(total, beamX));
  const V = lastCalc.result.Vx(beamX);
  const M = lastCalc.result.Mx(beamX);
  document.getElementById('scrubX').textContent = fmtU(beamX, currentUnit.length);
  document.getElementById('scrubV').textContent = fmtU(V, currentUnit.force);
  document.getElementById('scrubM').textContent = fmtU(M, currentUnit.moment);
  drawCursorOn('svgLoad', beamX);
  drawCursorOn('svgShear', beamX);
  drawCursorOn('svgMoment', beamX);
}

function beamXFromClientX(clientX){
  const wrap = document.getElementById('scrubWrap');
  const rect = wrap.getBoundingClientRect();
  const frac = (clientX - rect.left) / rect.width;
  const vbX = frac * W;
  const total = lastCalc ? lastCalc.total : 1;
  return ((vbX - MARGIN) / (W - 2*MARGIN)) * total;
}

(function setupScrub(){
  const wrap = document.getElementById('scrubWrap');
  let dragging = false;
  function handleMove(clientX){
    updateScrub(beamXFromClientX(clientX));
  }
  wrap.addEventListener('pointerdown', function(e){
    dragging = true;
    wrap.setPointerCapture(e.pointerId);
    handleMove(e.clientX);
  });
  wrap.addEventListener('pointermove', function(e){
    if(!dragging) return;
    handleMove(e.clientX);
  });
  wrap.addEventListener('pointerup', function(e){
    dragging = false;
    try{ wrap.releasePointerCapture(e.pointerId); }catch(err){}
  });
  wrap.addEventListener('pointercancel', function(){ dragging = false; });
})();

/* init */
buildUnitSelect();
updateEILabels();
buildCats();
buildBeamList();
