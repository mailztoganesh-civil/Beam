/* ============================================================
   Beam Solver — formula database
   Source: American Wood Council, Design Aid No. 6 (2007)
   "Beam Design Formulas with Shear and Moment Diagrams"
   32 standard beam / loading configurations.
   All functions use consistent-unit inputs (see UI note).
   Sign convention: sagging (+) moment plotted below the beam
   axis, hogging (-) plotted above — standard drafting convention.
   ============================================================ */

function pin(x){ return {x:x, type:'pin'}; }
function fix(x){ return {x:x, type:'fixed'}; }
function udl(x1,x2,val){ return {type:'udl', x1:x1, x2:x2, val:val}; }
function pt(x,val){ return {type:'point', x:x, val:val}; }
function tri(x1,x2,dir,val){ return {type:'tri', x1:x1, x2:x2, dir:dir, val:val}; } // dir 'up'|'down' = which end is tall

const BEAMS = [

// ---------------- SIMPLE BEAMS ----------------
{
  id:'f1', group:'Simple', name:'Uniformly distributed load',
  inputs:[{k:'L',l:'Span, L'},{k:'w',l:'Load / length, w'}],
  supports:p=>[pin(0),pin(p.L)],
  loads:p=>[udl(0,p.L,p.w)],
  totalLength:p=>p.L,
  calc(p){
    const {L,w}=p, R=w*L/2;
    const Vx=x=> w*(L/2-x);
    const Mx=x=> (w*x/2)*(L-x);
    const out={ R:[{l:'R1 = R2',v:R}], Vx, Mx, breakpoints:[0,L] };
    if(p.E&&p.I) out.Dmax={v:5*w*Math.pow(L,4)/(384*p.E*p.I), at:L/2};
    return out;
  }
},
{
  id:'f2', group:'Simple', name:'Uniform load, partially distributed',
  inputs:[{k:'a',l:'a (unloaded, left)'},{k:'b',l:'b (loaded length)'},{k:'c',l:'c (unloaded, right)'},{k:'w',l:'Load / length, w'}],
  supports:p=>[pin(0),pin(p.a+p.b+p.c)],
  loads:p=>[udl(p.a,p.a+p.b,p.w)],
  totalLength:p=>p.a+p.b+p.c,
  calc(p){
    const {a,b,c,w}=p, L=a+b+c;
    const R1=w*b*(2*c+b)/(2*L), R2=w*b*(2*a+b)/(2*L);
    const Vx=x=> x<a? R1 : (x<=a+b? R1-w*(x-a) : -R2);
    const Mx=x=> x<=a? R1*x : (x<=a+b? R1*x-(w/2)*Math.pow(x-a,2) : R2*(L-x));
    return { R:[{l:'R1',v:R1},{l:'R2',v:R2}], Vx, Mx, breakpoints:[0,a,a+b,L] };
  }
},
{
  id:'f3', group:'Simple', name:'Uniform load, partially distributed at one end',
  inputs:[{k:'a',l:'a (loaded length)'},{k:'c',l:'c (unloaded, right)'},{k:'w',l:'Load / length, w'}],
  supports:p=>[pin(0),pin(p.a+p.c)],
  loads:p=>[udl(0,p.a,p.w)],
  totalLength:p=>p.a+p.c,
  calc(p){
    const {a,c,w}=p, L=a+c;
    const R1=w*a*(2*L-a)/(2*L), R2=w*a*a/(2*L);
    const Vx=x=> x<a? R1-w*x : -R2;
    const Mx=x=> x<a? R1*x-w*x*x/2 : R2*(L-x);
    return { R:[{l:'R1',v:R1},{l:'R2',v:R2}], Vx, Mx, breakpoints:[0,a,L] };
  }
},
{
  id:'f4', group:'Simple', name:'Uniform load, partially distributed at each end',
  inputs:[{k:'a',l:'a (loaded, left)'},{k:'b',l:'b (unloaded, mid)'},{k:'c',l:'c (loaded, right)'},{k:'w1',l:'Load / length, w1 (left)'},{k:'w2',l:'Load / length, w2 (right)'}],
  supports:p=>[pin(0),pin(p.a+p.b+p.c)],
  loads:p=>[udl(0,p.a,p.w1),udl(p.a+p.b,p.a+p.b+p.c,p.w2)],
  totalLength:p=>p.a+p.b+p.c,
  calc(p){
    const {a,b,c,w1,w2}=p, L=a+b+c;
    const R1=(w1*a*(2*L-a)+w2*c*c)/(2*L), R2=(w2*c*(2*L-c)+w1*a*a)/(2*L);
    const Vx=x=> x<a? R1-w1*x : (x<=a+b? R1-w1*a : R2-w2*(L-x));
    const Mx=x=> x<a? R1*x-w1*x*x/2 : (x<=a+b? R1*x-(w1*a/2)*(2*x-a) : R2*(L-x)-(w2/2)*Math.pow(L-x,2));
    return { R:[{l:'R1',v:R1},{l:'R2',v:R2}], Vx, Mx, breakpoints:[0,a,a+b,L] };
  }
},
{
  id:'f5', group:'Simple', name:'Load increasing uniformly to one end',
  inputs:[{k:'L',l:'Span, L'},{k:'W',l:'Total load, W'}],
  supports:p=>[pin(0),pin(p.L)],
  loads:p=>[tri(0,p.L,'up',p.W)],
  totalLength:p=>p.L,
  calc(p){
    const {L,W}=p, R1=W/3, R2=2*W/3;
    const Vx=x=> W/3 - W*x*x/(L*L);
    const Mx=x=> (W*x/(3*L*L))*(L*L-x*x);
    const out={ R:[{l:'R1',v:R1},{l:'R2',v:R2}], Vx, Mx, breakpoints:[0,L] };
    if(p.E&&p.I) out.Dmax={v:0.01304*W*Math.pow(L,3)/(p.E*p.I), at:0.5193*L};
    return out;
  }
},
{
  id:'f6', group:'Simple', name:'Load increasing uniformly to center',
  inputs:[{k:'L',l:'Span, L'},{k:'W',l:'Total load, W'}],
  supports:p=>[pin(0),pin(p.L)],
  loads:p=>[tri(0,p.L/2,'up',p.W),tri(p.L/2,p.L,'down',p.W)],
  totalLength:p=>p.L,
  calc(p){
    const {L,W}=p, R=W/2;
    const Vx=x=> { const xx=x<=L/2?x:L-x; const v=(W/(2*L*L))*(L*L-4*xx*xx); return x<=L/2? v : -v; };
    const Mx=x=> { const xx=x<=L/2?x:L-x; return W*xx*(0.5-2*xx*xx/(3*L*L)); };
    const out={ R:[{l:'R1 = R2',v:R}], Vx, Mx, breakpoints:[0,L/2,L] };
    if(p.E&&p.I) out.Dmax={v:W*Math.pow(L,3)/(60*p.E*p.I), at:L/2};
    return out;
  }
},
{
  id:'f7', group:'Simple', name:'Concentrated load at center',
  inputs:[{k:'L',l:'Span, L'},{k:'P',l:'Load, P'}],
  supports:p=>[pin(0),pin(p.L)],
  loads:p=>[pt(p.L/2,p.P)],
  totalLength:p=>p.L,
  calc(p){
    const {L,P}=p, R=P/2;
    const Vx=x=> x<L/2? R : -R;
    const Mx=x=> x<=L/2? P*x/2 : P*(L-x)/2;
    const out={ R:[{l:'R1 = R2',v:R}], Vx, Mx, breakpoints:[0,L/2,L] };
    if(p.E&&p.I) out.Dmax={v:P*Math.pow(L,3)/(48*p.E*p.I), at:L/2};
    return out;
  }
},
{
  id:'f8', group:'Simple', name:'Concentrated load at any point',
  inputs:[{k:'L',l:'Span, L'},{k:'a',l:'a (to load, from left)'},{k:'P',l:'Load, P'}],
  supports:p=>[pin(0),pin(p.L)],
  loads:p=>[pt(p.a,p.P)],
  totalLength:p=>p.L,
  calc(p){
    const {L,a,P}=p, b=L-a, R1=P*b/L, R2=P*a/L;
    const Vx=x=> x<a? R1 : -R2;
    const Mx=x=> x<=a? R1*x : R2*(L-x);
    const out={ R:[{l:'R1',v:R1},{l:'R2',v:R2}], Vx, Mx, breakpoints:[0,a,L] };
    if(p.E&&p.I){
      const am=Math.max(a,b), bm=Math.min(a,b);
      const xs=Math.sqrt(am*(am+2*bm)/3);
      out.Dmax={v:P*am*bm*(am+2*bm)*Math.sqrt(3*am*(am+2*bm))/(27*p.E*p.I*L), at:(a>=b? xs : L-xs)};
    }
    return out;
  }
},
{
  id:'f9', group:'Simple', name:'Two equal concentrated loads, symmetrically placed',
  inputs:[{k:'L',l:'Span, L'},{k:'a',l:'a (each load, from nearest support)'},{k:'P',l:'Load, P (each)'}],
  supports:p=>[pin(0),pin(p.L)],
  loads:p=>[pt(p.a,p.P),pt(p.L-p.a,p.P)],
  totalLength:p=>p.L,
  calc(p){
    const {L,a,P}=p;
    const Vx=x=> x<a? P : (x<L-a? 0 : -P);
    const Mx=x=> x<=a? P*x : (x<=L-a? P*a : P*(L-x));
    const out={ R:[{l:'R1 = R2',v:P}], Vx, Mx, breakpoints:[0,a,L-a,L] };
    if(p.E&&p.I) out.Dmax={v:(P*a/(24*p.E*p.I))*(3*L*L-4*a*a), at:L/2};
    return out;
  }
},
{
  id:'f10', group:'Simple', name:'Two equal concentrated loads, unsymmetrically placed',
  inputs:[{k:'L',l:'Span, L'},{k:'a',l:'a (load 1, from left)'},{k:'b',l:'b (load 2, from right)'},{k:'P',l:'Load, P (each)'}],
  supports:p=>[pin(0),pin(p.L)],
  loads:p=>[pt(p.a,p.P),pt(p.L-p.b,p.P)],
  totalLength:p=>p.L,
  calc(p){
    const {L,a,b,P}=p, R1=(P/L)*(L-a+b), R2=(P/L)*(L-b+a);
    const Vx=x=> x<a? R1 : (x<L-b? R1-P : R1-2*P);
    const Mx=x=> x<=a? R1*x : (x<=L-b? R1*x-P*(x-a) : R2*(L-x));
    return { R:[{l:'R1',v:R1},{l:'R2',v:R2}], Vx, Mx, breakpoints:[0,a,L-b,L] };
  }
},
{
  id:'f11', group:'Simple', name:'Two unequal concentrated loads, unsymmetrically placed',
  inputs:[{k:'L',l:'Span, L'},{k:'a',l:'a (P1, from left)'},{k:'b',l:'b (P2, from right)'},{k:'P1',l:'Load, P1'},{k:'P2',l:'Load, P2'}],
  supports:p=>[pin(0),pin(p.L)],
  loads:p=>[pt(p.a,p.P1),pt(p.L-p.b,p.P2)],
  totalLength:p=>p.L,
  calc(p){
    const {L,a,b,P1,P2}=p, R1=(P1*(L-a)+P2*b)/L, R2=(P1*a+P2*(L-b))/L;
    const Vx=x=> x<a? R1 : (x<L-b? R1-P1 : R1-P1-P2);
    const Mx=x=> x<=a? R1*x : (x<=L-b? R1*x-P1*(x-a) : R2*(L-x));
    return { R:[{l:'R1',v:R1},{l:'R2',v:R2}], Vx, Mx, breakpoints:[0,a,L-b,L] };
  }
},

// ---------------- CANTILEVER BEAMS ----------------
{
  id:'f12', group:'Cantilever', name:'Uniformly distributed load',
  inputs:[{k:'L',l:'Length, L'},{k:'w',l:'Load / length, w'}],
  supports:p=>[fix(p.L)],
  loads:p=>[udl(0,p.L,p.w)],
  totalLength:p=>p.L,
  calc(p){
    const {L,w}=p, R=w*L;
    const Vx=x=> w*x;
    const Mx=x=> w*x*x/2;
    const out={ R:[{l:'R (fixed end)',v:R}], Vx, Mx, breakpoints:[0,L] };
    if(p.E&&p.I) out.Dmax={v:w*Math.pow(L,4)/(8*p.E*p.I), at:0};
    return out;
  }
},
{
  id:'f13', group:'Cantilever', name:'Concentrated load at free end',
  inputs:[{k:'L',l:'Length, L'},{k:'P',l:'Load, P'}],
  supports:p=>[fix(p.L)],
  loads:p=>[pt(0,p.P)],
  totalLength:p=>p.L,
  calc(p){
    const {L,P}=p;
    const Vx=x=> P;
    const Mx=x=> P*x;
    const out={ R:[{l:'R (fixed end)',v:P}], Vx, Mx, breakpoints:[0,L] };
    if(p.E&&p.I) out.Dmax={v:P*Math.pow(L,3)/(3*p.E*p.I), at:0};
    return out;
  }
},
{
  id:'f14', group:'Cantilever', name:'Concentrated load at any point',
  inputs:[{k:'L',l:'Length, L'},{k:'a',l:'a (free end to load)'},{k:'P',l:'Load, P'}],
  supports:p=>[fix(p.L)],
  loads:p=>[pt(p.a,p.P)],
  totalLength:p=>p.L,
  calc(p){
    const {L,a,P}=p, b=L-a;
    const Vx=x=> x<a? 0 : P;
    const Mx=x=> x<a? 0 : P*(x-a);
    const out={ R:[{l:'R (fixed end)',v:P}], Vx, Mx, breakpoints:[0,a,L] };
    if(p.E&&p.I) out.Dmax={v:(P*b*b/(6*p.E*p.I))*(3*L-b), at:0};
    return out;
  }
},

// ---------------- PROPPED CANTILEVER (fixed one end, supported other) ----------------
{
  id:'f15', group:'Propped', name:'Fixed one end, supported other — uniformly distributed load',
  inputs:[{k:'L',l:'Span, L'},{k:'w',l:'Load / length, w'}],
  supports:p=>[pin(0),fix(p.L)],
  loads:p=>[udl(0,p.L,p.w)],
  totalLength:p=>p.L,
  calc(p){
    const {L,w}=p, R1=3*w*L/8, R2=5*w*L/8;
    const Vx=x=> R1-w*x;
    const Mx=x=> R1*x-w*x*x/2;
    const out={ R:[{l:'R1 (pinned)',v:R1},{l:'R2 (fixed)',v:R2}], Vx, Mx, breakpoints:[0,3*L/8,L] };
    if(p.E&&p.I) out.Dmax={v:w*Math.pow(L,4)/(185*p.E*p.I), at:0.4215*L};
    return out;
  }
},
{
  id:'f16', group:'Propped', name:'Fixed one end, supported other — concentrated load at center',
  inputs:[{k:'L',l:'Span, L'},{k:'P',l:'Load, P'}],
  supports:p=>[pin(0),fix(p.L)],
  loads:p=>[pt(p.L/2,p.P)],
  totalLength:p=>p.L,
  calc(p){
    const {L,P}=p, R1=5*P/16, R2=11*P/16;
    const Vx=x=> x<L/2? R1 : R1-P;
    const Mx=x=> x<=L/2? 5*P*x/16 : P*(L/2 - 11*x/16);
    const out={ R:[{l:'R1 (pinned)',v:R1},{l:'R2 (fixed)',v:R2}], Vx, Mx, breakpoints:[0,L/2,L] };
    if(p.E&&p.I) out.Dmax={v:0.009317*P*Math.pow(L,3)/(p.E*p.I), at:0.4472*L};
    return out;
  }
},
{
  id:'f17', group:'Propped', name:'Fixed one end, supported other — concentrated load at any point',
  inputs:[{k:'L',l:'Span, L'},{k:'a',l:'a (pinned end to load)'},{k:'P',l:'Load, P'}],
  supports:p=>[pin(0),fix(p.L)],
  loads:p=>[pt(p.a,p.P)],
  totalLength:p=>p.L,
  calc(p){
    const {L,a,P}=p, b=L-a;
    const R1=(P*b*b/(2*Math.pow(L,3)))*(a+2*L);
    const R2=(P*a/(2*Math.pow(L,3)))*(3*L*L-a*a);
    const Vx=x=> x<a? R1 : R1-P;
    const Mx=x=> x<=a? R1*x : R1*x-P*(x-a);
    return { R:[{l:'R1 (pinned)',v:R1},{l:'R2 (fixed)',v:R2}], Vx, Mx, breakpoints:[0,a,L] };
  }
},

// ---------------- OVERHANGING BEAMS ----------------
{
  id:'f18', group:'Overhang', name:'Overhanging one support — uniformly distributed load (full length)',
  inputs:[{k:'L',l:'Span between supports, L'},{k:'a',l:'a (overhang length)'},{k:'w',l:'Load / length, w'}],
  supports:p=>[pin(0),pin(p.L)],
  loads:p=>[udl(0,p.L+p.a,p.w)],
  totalLength:p=>p.L+p.a,
  calc(p){
    const {L,a,w}=p;
    const R1=w*(L*L-a*a)/(2*L), R2=w*Math.pow(L+a,2)/(2*L);
    const Vx=x=> x<=L? R1-w*x : w*(a-(x-L));
    const Mx=x=> x<=L? (w*x/(2*L))*(L*L-a*a-x*L) : -(w/2)*Math.pow(a-(x-L),2);
    return { R:[{l:'R1',v:R1},{l:'R2',v:R2}], Vx, Mx, breakpoints:[0,L,L+a] };
  }
},
{
  id:'f19', group:'Overhang', name:'Overhanging one support — uniformly distributed load on overhang',
  inputs:[{k:'L',l:'Span between supports, L'},{k:'a',l:'a (overhang length)'},{k:'w',l:'Load / length, w'}],
  supports:p=>[pin(0),pin(p.L)],
  loads:p=>[udl(p.L,p.L+p.a,p.w)],
  totalLength:p=>p.L+p.a,
  calc(p){
    const {L,a,w}=p;
    const R1=-w*a*a/(2*L), R2=(w*a/(2*L))*(2*L+a);
    const Vx=x=> x<=L? R1 : w*(a-(x-L));
    const Mx=x=> x<=L? R1*x : -(w/2)*Math.pow(a-(x-L),2);
    return { R:[{l:'R1',v:R1},{l:'R2',v:R2}], Vx, Mx, breakpoints:[0,L,L+a] };
  }
},
{
  id:'f20', group:'Overhang', name:'Overhanging one support — concentrated load at end of overhang',
  inputs:[{k:'L',l:'Span between supports, L'},{k:'a',l:'a (overhang length)'},{k:'P',l:'Load, P'}],
  supports:p=>[pin(0),pin(p.L)],
  loads:p=>[pt(p.L+p.a,p.P)],
  totalLength:p=>p.L+p.a,
  calc(p){
    const {L,a,P}=p;
    const R1=-P*a/L, R2=P*(L+a)/L;
    const Vx=x=> x<=L? R1 : P;
    const Mx=x=> x<=L? R1*x : -P*(a-(x-L));
    return { R:[{l:'R1',v:R1},{l:'R2',v:R2}], Vx, Mx, breakpoints:[0,L,L+a] };
  }
},
{
  id:'f21', group:'Overhang', name:'Overhanging one support — concentrated load between supports',
  inputs:[{k:'L',l:'Span between supports, L'},{k:'a',l:'a (to load, from left support)'},{k:'ov',l:'Overhang length (0 if none)'},{k:'P',l:'Load, P'}],
  supports:p=>[pin(0),pin(p.L)],
  loads:p=>[pt(p.a,p.P)],
  totalLength:p=>p.L+p.ov,
  calc(p){
    const {L,a,P,ov}=p, b=L-a, R1=P*b/L, R2=P*a/L;
    const Vx=x=> x<=L? (x<a? R1 : -R2) : 0;
    const Mx=x=> x<=L? (x<=a? R1*x : R2*(L-x)) : 0;
    return { R:[{l:'R1',v:R1},{l:'R2',v:R2}], Vx, Mx, breakpoints:[0,a,L,L+(ov||0)] };
  }
},
{
  id:'f22', group:'Overhang', name:'Overhanging both supports — unequal overhangs, uniformly distributed load',
  inputs:[{k:'a',l:'a (left overhang)'},{k:'b',l:'b (span between supports)'},{k:'c',l:'c (right overhang)'},{k:'w',l:'Load / length, w'}],
  supports:p=>[pin(p.a),pin(p.a+p.b)],
  loads:p=>[udl(0,p.a+p.b+p.c,p.w)],
  totalLength:p=>p.a+p.b+p.c,
  calc(p){
    const {a,b,c,w}=p, Ltot=a+b+c;
    const R1=w*Ltot*(Ltot-2*c)/(2*b), R2=w*Ltot*(Ltot-2*a)/(2*b);
    const Mat=(s)=> -w*s*s/2; // moment at s<=a (from free left tip)
    const M_a=Mat(a);
    const Vx=x=> x<a? -w*x : (x<=a+b? R1-w*x : R1+R2-w*x);
    const Mx=x=> {
      if(x<=a) return -w*x*x/2;
      if(x<=a+b) return M_a + R1*(x-a) - (w/2)*(x*x-a*a);
      const Mab = M_a + R1*b - (w/2)*(Math.pow(a+b,2)-a*a);
      return Mab + (R1+R2)*(x-(a+b)) - (w/2)*(x*x-Math.pow(a+b,2));
    };
    return { R:[{l:'R1',v:R1},{l:'R2',v:R2}], Vx, Mx, breakpoints:[0,a,a+b,Ltot] };
  }
},

// ---------------- FIXED-FIXED BEAMS ----------------
{
  id:'f23', group:'Fixed-Fixed', name:'Fixed at both ends — uniformly distributed load',
  inputs:[{k:'L',l:'Span, L'},{k:'w',l:'Load / length, w'}],
  supports:p=>[fix(0),fix(p.L)],
  loads:p=>[udl(0,p.L,p.w)],
  totalLength:p=>p.L,
  calc(p){
    const {L,w}=p, R=w*L/2;
    const Vx=x=> w*(L/2-x);
    const Mx=x=> (w/12)*(6*L*x-L*L-6*x*x);
    const out={ R:[{l:'R1 = R2',v:R}], Vx, Mx, breakpoints:[0,L/2,L] };
    if(p.E&&p.I) out.Dmax={v:w*Math.pow(L,4)/(384*p.E*p.I), at:L/2};
    return out;
  }
},
{
  id:'f24', group:'Fixed-Fixed', name:'Fixed at both ends — concentrated load at center',
  inputs:[{k:'L',l:'Span, L'},{k:'P',l:'Load, P'}],
  supports:p=>[fix(0),fix(p.L)],
  loads:p=>[pt(p.L/2,p.P)],
  totalLength:p=>p.L,
  calc(p){
    const {L,P}=p, R=P/2;
    const Vx=x=> x<L/2? R : -R;
    const Mx=x=> x<=L/2? (P/8)*(4*x-L) : (P/8)*(4*(L-x)-L);
    const out={ R:[{l:'R1 = R2',v:R}], Vx, Mx, breakpoints:[0,L/2,L] };
    if(p.E&&p.I) out.Dmax={v:P*Math.pow(L,3)/(192*p.E*p.I), at:L/2};
    return out;
  }
},
{
  id:'f25', group:'Fixed-Fixed', name:'Fixed at both ends — concentrated load at any point',
  inputs:[{k:'L',l:'Span, L'},{k:'a',l:'a (to load, from left)'},{k:'P',l:'Load, P'}],
  supports:p=>[fix(0),fix(p.L)],
  loads:p=>[pt(p.a,p.P)],
  totalLength:p=>p.L,
  calc(p){
    const {L,a,P}=p, b=L-a;
    const R1=(P*b*b/Math.pow(L,3))*(3*a+b), R2=(P*a*a/Math.pow(L,3))*(a+3*b);
    const Vx=x=> x<a? R1 : -R2;
    const Mx=x=> x<=a? R1*x - P*a*b*b/(L*L) : R2*(L-x) - P*a*a*b/(L*L);
    return { R:[{l:'R1',v:R1},{l:'R2',v:R2}], Vx, Mx, breakpoints:[0,a,L] };
  }
},

// ---------------- CONTINUOUS BEAMS ----------------
{
  id:'f26', group:'Continuous', name:'Two equal spans — uniform load on one span',
  inputs:[{k:'L',l:'Each span length, L'},{k:'w',l:'Load / length, w (loaded span)'}],
  supports:p=>[pin(0),pin(p.L),pin(2*p.L)],
  loads:p=>[udl(0,p.L,p.w)],
  totalLength:p=>2*p.L,
  calc(p){
    const {L,w}=p;
    const R1=7*w*L/16, M1=-w*L*L/16, R3=-w*L/16, R2=w*L-R1-R3;
    const Vx=x=> {
      if(x<=L) return R1-w*x;
      const xp=x-L; return w*L/16;
    };
    const Mx=x=> {
      if(x<=L) return (w*x/16)*(7*L-8*x);
      const xp=x-L; return M1*(1-xp/L);
    };
    return { R:[{l:'R1',v:R1},{l:'R2',v:R2},{l:'R3',v:R3}], Vx, Mx, breakpoints:[0,7*L/16,L,2*L] };
  }
},
{
  id:'f27', group:'Continuous', name:'Two equal spans — concentrated load at center of one span',
  inputs:[{k:'L',l:'Each span length, L'},{k:'P',l:'Load, P (loaded span, at center)'}],
  supports:p=>[pin(0),pin(p.L),pin(2*p.L)],
  loads:p=>[pt(p.L/2,p.P)],
  totalLength:p=>2*p.L,
  calc(p){
    const {L,P}=p;
    const R1=13*P/32, M1=-3*P*L/32, R3=-3*P/32, R2=P-R1-R3;
    const Vafter=R1-P;
    const Vx=x=> {
      if(x<=L/2) return R1;
      if(x<=L) return Vafter;
      return -M1/L;
    };
    const Mx=x=> {
      if(x<=L/2) return R1*x;
      if(x<=L) return 13*P*L/64 + Vafter*(x-L/2);
      const xp=x-L; return M1*(1-xp/L);
    };
    return { R:[{l:'R1',v:R1},{l:'R2',v:R2},{l:'R3',v:R3}], Vx, Mx, breakpoints:[0,L/2,L,2*L] };
  }
},
{
  id:'f28', group:'Continuous', name:'Two equal spans — concentrated load at any point',
  inputs:[{k:'L',l:'Each span length, L'},{k:'a',l:'a (to load, from left end of loaded span)'},{k:'P',l:'Load, P'}],
  supports:p=>[pin(0),pin(p.L),pin(2*p.L)],
  loads:p=>[pt(p.a,p.P)],
  totalLength:p=>2*p.L,
  calc(p){
    const {L,a,P}=p, b=L-a;
    const R1=(P*b/(4*Math.pow(L,3)))*(4*L*L-a*(L+a));
    const M1=-(P*a*b/(4*L*L))*(L+a);
    const R3=-(P*a*b/(4*Math.pow(L,3)))*(L+a);
    const R2=P-R1-R3;
    const Mmax=(P*a*b/(4*Math.pow(L,3)))*(4*L*L-a*(L+a));
    const Vafter=R1-P;
    const Vx=x=> {
      if(x<=a) return R1;
      if(x<=L) return Vafter;
      return -M1/L;
    };
    const Mx=x=> {
      if(x<=a) return R1*x;
      if(x<=L) return Mmax + Vafter*(x-a);
      const xp=x-L; return M1*(1-xp/L);
    };
    return { R:[{l:'R1',v:R1},{l:'R2',v:R2},{l:'R3',v:R3}], Vx, Mx, breakpoints:[0,a,L,2*L] };
  }
},
{
  id:'f29', group:'Continuous', name:'Two equal spans — uniformly distributed load (both spans)',
  inputs:[{k:'L',l:'Each span length, L'},{k:'w',l:'Load / length, w'}],
  supports:p=>[pin(0),pin(p.L),pin(2*p.L)],
  loads:p=>[udl(0,2*p.L,p.w)],
  totalLength:p=>2*p.L,
  calc(p){
    const {L,w}=p, R1=3*w*L/8, R2=5*w*L/4;
    const Vx=x=> { const xl = x<=L? x : 2*L-x; const v=R1-w*xl; return x<=L? v : -v; };
    const Mx=x=> { const xl = x<=L? x : 2*L-x; return R1*xl - w*xl*xl/2; };
    const out={ R:[{l:'R1 = R3',v:R1},{l:'R2',v:R2}], Vx, Mx, breakpoints:[0,3*L/8,L,2*L-3*L/8,2*L] };
    if(p.E&&p.I) out.Dmax={v:w*Math.pow(L,4)/(185*p.E*p.I), at:0.4215*L};
    return out;
  }
},
{
  id:'f30', group:'Continuous', name:'Two equal spans — two equal concentrated loads, symmetrically placed',
  inputs:[{k:'L',l:'Each span length, L'},{k:'a',l:'a (each load, from nearest outer support)'},{k:'P',l:'Load, P (each)'}],
  supports:p=>[pin(0),pin(p.L),pin(2*p.L)],
  loads:p=>[pt(p.a,p.P),pt(2*p.L-p.a,p.P)],
  totalLength:p=>2*p.L,
  calc(p){
    const {L,a,P}=p, R1=5*P/16, R2=11*P/8, M1=-3*P*L/16, M2=5*P*L/32, Vafter=R1-P;
    const Vx=x=> { const xl=x<=L?x:2*L-x; const v = xl<a? R1 : Vafter; return x<=L? v : -v; };
    const Mx=x=> { const xl=x<=L?x:2*L-x; return xl<=a? R1*xl : M2+Vafter*(xl-a); };
    return { R:[{l:'R1 = R3',v:R1},{l:'R2',v:R2}], Vx, Mx, breakpoints:[0,a,L,2*L-a,2*L] };
  }
},
{
  id:'f31', group:'Continuous', name:'Two unequal spans — uniformly distributed load',
  inputs:[{k:'L1',l:'Span 1, L1'},{k:'L2',l:'Span 2, L2'},{k:'w',l:'Load / length, w'}],
  supports:p=>[pin(0),pin(p.L1),pin(p.L1+p.L2)],
  loads:p=>[udl(0,p.L1+p.L2,p.w)],
  totalLength:p=>p.L1+p.L2,
  calc(p){
    const {L1,L2,w}=p;
    const M1=-w*(Math.pow(L1,3)+Math.pow(L2,3))/(8*(L1+L2));
    const R1=M1/L1+w*L1/2, R3=M1/L2+w*L2/2, R2=w*L1+w*L2-R1-R3;
    const Vx=x=> x<=L1? R1-w*x : w*(L1+L2-x)-R3;
    const Mx=x=> x<=L1? R1*x-w*x*x/2 : (()=>{const x2=L1+L2-x; return R3*x2-w*x2*x2/2;})();
    return { R:[{l:'R1',v:R1},{l:'R2',v:R2},{l:'R3',v:R3}], Vx, Mx, breakpoints:[0,R1/w,L1,L1+L2-R3/w,L1+L2] };
  }
},
{
  id:'f32', group:'Continuous', name:'Two unequal spans — concentrated load on each span, symmetrically placed',
  inputs:[{k:'L1',l:'Span 1, L1'},{k:'L2',l:'Span 2, L2'},{k:'P1',l:'Load, P1 (at midspan 1)'},{k:'P2',l:'Load, P2 (at midspan 2)'}],
  supports:p=>[pin(0),pin(p.L1),pin(p.L1+p.L2)],
  loads:p=>[pt(p.L1/2,p.P1),pt(p.L1+p.L2/2,p.P2)],
  totalLength:p=>p.L1+p.L2,
  calc(p){
    const {L1,L2,P1,P2}=p, a=L1/2, b=L2/2;
    const M1=-(3/16)*(P1*L1*L1+P2*L2*L2)/(L1+L2);
    const R1=M1/L1+P1/2, R3=M1/L2+P2/2, R2=P1+P2-R1-R3;
    const Mm1=R1*a, Mm2=R3*b, V1after=R1-P1, V3after=R3-P2;
    const Vx=x=> x<=L1? (x<=a? R1 : V1after) : (()=>{const x2=L1+L2-x; return x2<=b? -R3 : -V3after;})();
    const Mx=x=> x<=L1? (x<=a? R1*x : Mm1+V1after*(x-a)) : (()=>{const x2=L1+L2-x; return x2<=b? R3*x2 : Mm2+V3after*(x2-b);})();
    return { R:[{l:'R1',v:R1},{l:'R2',v:R2},{l:'R3',v:R3}], Vx, Mx, breakpoints:[0,a,L1,L1+L2-b,L1+L2] };
  }
}

];
