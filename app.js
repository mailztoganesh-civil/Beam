/* ============================================================
   Beam Solver — app logic
   ============================================================ */

let currentBeam = null;
let currentCat = 'All';

const CATS = ['All','Simple','Cantilever','Propped','Overhang','Fixed-Fixed','Continuous'];

function fmt(v){
  if(v===undefined||v===null||isNaN(v)) return '—';
  if(Math.abs(v) < 1e-9) return '0';
  const av=Math.abs(v);
  let s;
  if(av>=1e6 || av<1e-3){ s=v.toExponential(3); }
  else { s=v.toPrecision(4); }
  // trim redundant trailing zeros for fixed notation
  if(s.indexOf('e')===-1 && s.indexOf('.')!==-1){
    s=s.replace(/0+$/,'').replace(/\.$/,'');
  }
  return s;
}

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

function buildBeamList(){
  const el=document.getElementById('beamList');
  el.innerHTML='';
  const list = BEAMS.filter(b=> currentCat==='All' || b.group===currentCat);
  list.forEach(b=>{
    const num=b.id.replace('f','');
    const item=document.createElement('div');
    item.className='beam-item'+(currentBeam&&currentBeam.id===b.id?' active':'');
    item.innerHTML=`<span class="fig-no">FIG ${num}</span><span class="name">${b.name}</span>`;
    item.onclick=()=> selectBeam(b.id);
    el.appendChild(item);
  });
}

function selectBeam(id){
  currentBeam = BEAMS.find(b=>b.id===id);
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
    const f=document.createElement('div');
    f.className='field';
    f.innerHTML=`<label>${inp.l}</label><input type="number" step="any" data-key="${inp.k}" placeholder="value">`;
    grid.appendChild(f);
  });
  document.getElementById('eiToggle').checked=false;
  document.getElementById('eiFields').classList.remove('show');
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
  // basic geometric sanity
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

  renderResults(p, result, Vext, Mext, total);
});

function renderResults(p, result, Vext, Mext, total){
  const grid=document.getElementById('resultGrid');
  grid.innerHTML='';

  result.R.forEach(r=>{
    const c=document.createElement('div');
    c.className='result-card';
    c.innerHTML=`<div class="k">${r.l}</div><div class="v">${fmt(r.v)}</div>`;
    grid.appendChild(c);
  });

  const vCard=document.createElement('div');
  vCard.className='result-card highlight';
  vCard.innerHTML=`<div class="k">V max</div><div class="v">${fmt(Vext.val)}<span class="at">at x = ${fmt(Vext.at)}</span></div>`;
  grid.appendChild(vCard);

  const mCard=document.createElement('div');
  mCard.className='result-card highlight';
  mCard.innerHTML=`<div class="k">M max</div><div class="v">${fmt(Mext.val)}<span class="at">at x = ${fmt(Mext.at)}</span></div>`;
  grid.appendChild(mCard);

  if(result.Dmax){
    const dCard=document.createElement('div');
    dCard.className='result-card';
    dCard.innerHTML=`<div class="k">Δ max (deflection)</div><div class="v">${fmt(result.Dmax.v)}<span class="at">at x = ${fmt(result.Dmax.at)}</span></div>`;
    grid.appendChild(dCard);
  } else if(document.getElementById('eiToggle').checked){
    const dCard=document.createElement('div');
    dCard.className='result-card';
    dCard.innerHTML=`<div class="k">Δ max</div><div class="v" style="font-size:0.75rem;font-weight:400;color:var(--ink-soft)">Not tabulated for this configuration in Design Aid No. 6</div>`;
    grid.appendChild(dCard);
  }

  document.getElementById('lengthLabel').textContent = `Total length = ${fmt(total)}`;
  document.getElementById('vmaxLabel').textContent = `Vmax = ${fmt(Vext.val)}`;
  document.getElementById('mmaxLabel').textContent = `Mmax = ${fmt(Mext.val)}`;

  drawLoadDiagram(currentBeam.supports(p), currentBeam.loads(p), total);
  drawCurve('svgShear', result.Vx, total, result.breakpoints, Vext);
  drawCurve('svgMoment', result.Mx, total, result.breakpoints, Mext);

  document.getElementById('results').classList.add('show');
  document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
}

/* ---------------- SVG rendering ---------------- */
const SVG_NS='http://www.w3.org/2000/svg';
const MARGIN=26, W=600;

function xScale(x,total){ return MARGIN + (x/total)*(W-2*MARGIN); }

function el(tag, attrs){
  const e=document.createElementNS(SVG_NS,tag);
  for(const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

function clearSvg(id){
  const svg=document.getElementById(id);
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  return svg;
}

function drawLoadDiagram(supports, loads, total){
  const svg=clearSvg('svgLoad');
  const midY=45;
  // beam line
  svg.appendChild(el('line',{x1:xScale(0,total),y1:midY,x2:xScale(total,total),y2:midY,stroke:'#DCE6EE','stroke-width':3}));

  // loads (drawn above beam line as arrows)
  loads.forEach(ld=>{
    if(ld.type==='udl'){
      const x1=xScale(ld.x1,total), x2=xScale(ld.x2,total);
      svg.appendChild(el('line',{x1,y1:midY-16,x2,y2:midY-16,stroke:'#E8A33D','stroke-width':1.4}));
      svg.appendChild(el('line',{x1:x2,y1:midY-16,x2,y2:midY-16,stroke:'#E8A33D','stroke-width':1.4}));
      const n=Math.max(2,Math.round((x2-x1)/22));
      for(let i=0;i<=n;i++){
        const x=x1+(x2-x1)*i/n;
        svg.appendChild(arrowDown(svg,x,midY-16,midY-4));
      }
    } else if(ld.type==='tri'){
      const x1=xScale(ld.x1,total), x2=xScale(ld.x2,total);
      const tall = ld.dir==='up' ? x2 : x1; // taller end
      const n=Math.max(3,Math.round((x2-x1)/18));
      for(let i=0;i<=n;i++){
        const t=i/n;
        const x=x1+(x2-x1)*t;
        const frac = ld.dir==='up' ? t : (1-t);
        const topY = midY-4-frac*16;
        svg.appendChild(arrowDown(svg,x,topY,midY-4));
      }
    } else if(ld.type==='point'){
      const x=xScale(ld.x,total);
      svg.appendChild(arrowDown(svg,x,midY-22,midY-4));
      svg.appendChild(el('text',{x, y:midY-26, fill:'#E8A33D','font-size':'9','text-anchor':'middle','font-family':'IBM Plex Mono, monospace'})).textContent='P';
    }
  });

  // supports
  supports.forEach(s=>{
    const x=xScale(s.x,total);
    if(s.type==='pin'){
      const tri=el('path',{d:`M ${x-7} ${midY+13} L ${x+7} ${midY+13} L ${x} ${midY+2} Z`, fill:'none', stroke:'#8FB4CE','stroke-width':1.6});
      svg.appendChild(tri);
    } else {
      svg.appendChild(el('rect',{x:x-9,y:midY,width:18,height:6,fill:'none',stroke:'#8FB4CE','stroke-width':1.6}));
      for(let i=-8;i<=8;i+=4){
        svg.appendChild(el('line',{x1:x+i,y1:midY+6,x2:x+i-4,y2:midY+13,stroke:'#8FB4CE','stroke-width':1.2}));
      }
    }
  });
}

function arrowDown(svg,x,y1,y2){
  const g=el('g',{});
  g.appendChild(el('line',{x1:x,y1:y1,x2:x,y2:y2,stroke:'#E8A33D','stroke-width':1.3}));
  g.appendChild(el('path',{d:`M ${x-3} ${y2-5} L ${x+3} ${y2-5} L ${x} ${y2} Z`, fill:'#E8A33D'}));
  return g;
}

function drawCurve(svgId, fn, total, breakpoints, ext){
  const svg=clearSvg(svgId);
  const H=120, top=8, bottom=H-8, mid=(top+bottom)/2, halfH=(bottom-top)/2;
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);

  // sample densely, including both sides of breakpoints (to render jumps)
  const xs=[];
  const N=300;
  for(let i=0;i<=N;i++) xs.push(total*i/N);
  const eps=total*1e-5;
  breakpoints.forEach(bp=>{ xs.push(Math.max(0,bp-eps)); xs.push(Math.min(total,bp+eps)); });
  xs.sort((a,b)=>a-b);

  const vals = xs.map(x=>{ try{return fn(x);}catch(e){return 0;} });
  const maxAbs = Math.max(1e-9, ...vals.map(v=>Math.abs(v)));

  // baseline
  svg.appendChild(el('line',{x1:MARGIN,y1:mid,x2:W-MARGIN,y2:mid,stroke:'#3E5A72','stroke-width':1}));

  // build polyline points, splitting into segments at discontinuities (large jump)
  let segs=[[]];
  for(let i=0;i<xs.length;i++){
    const x=xScale(xs[i],total), y=mid-(vals[i]/maxAbs)*halfH*0.86;
    if(i>0 && Math.abs(xs[i]-xs[i-1])<1e-9){
      segs.push([]); // discontinuity marker -> new segment
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

  // extreme marker
  if(ext){
    const mx=xScale(ext.at,total), my=mid-(ext.val/maxAbs)*halfH*0.86;
    svg.appendChild(el('circle',{cx:mx,cy:my,r:3.2,fill:'#E8A33D'}));
  }
}

/* init */
buildCats();
buildBeamList();
