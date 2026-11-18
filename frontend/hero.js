// Kyverin Studio hero: a raymarched "lens" (core + interlocking aperture rings)
// rendered in a single WebGL fragment shader. No libraries, no downloads.
const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `
precision highp float;
uniform vec2 u_res; uniform float u_time; uniform vec2 u_mouse; uniform float u_scroll;
#define TEAL vec3(0.176,0.831,0.749)
#define AMBER vec3(0.984,0.749,0.141)
#define VIOLET vec3(0.545,0.361,0.965)
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float sdTorus(vec3 p, vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}
float glowT=0., glowA=0.;
vec2 map(vec3 p){
  float t=u_time*.35+u_scroll*3.;
  vec3 q=p; q.yz*=rot(1.15+u_mouse.y*.4); q.xz*=rot(t*.6+u_mouse.x*.6);
  float r1=sdTorus(q,vec2(1.05,.075));
  vec3 w=p; w.xy*=rot(.9); w.yz*=rot(-t*.8); w.xz*=rot(.4+u_mouse.x*.3);
  float r2=sdTorus(w,vec2(1.32,.045));
  vec3 o=p; o.yz*=rot(1.45); o.xy*=rot(t*.25);
  float r3=sdTorus(o,vec2(1.95,.012));
  float core=length(p)-.5-.012*sin(t*3.+p.y*6.);
  glowT+= .012/(.015+r1*r1) + .006/(.01+r3*r3);
  glowA+= .010/(.012+r2*r2) + .02/(.05+core*core);
  vec2 res=vec2(core,0.);
  if(r1<res.x)res=vec2(r1,1.);
  if(r2<res.x)res=vec2(r2,2.);
  if(r3<res.x)res=vec2(r3,3.);
  return res;
}
vec3 normal(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x,map(p+e.yxy).x-map(p-e.yxy).x,map(p+e.yyx).x-map(p-e.yyx).x));}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*u_res)/min(u_res.x,u_res.y);
  bool wide=u_res.x>u_res.y; uv.x-=wide?.42:0.; uv.y-=wide?0.:.62;
  vec3 ro=vec3(0.,0.,(wide?5.6:5.9)-u_scroll*1.2), rd=normalize(vec3(uv,-1.55));
  float d=0.; vec2 h; bool hit=false;
  for(int i=0;i<72;i++){h=map(ro+rd*d); if(h.x<.001){hit=true;break;} d+=h.x*.9; if(d>9.)break;}
  vec3 bg=vec3(.012,.016,.035);
  bg+=VIOLET*.10*exp(-3.*length(uv+vec2(.3,-.2)));
  bg+=TEAL*.06*exp(-2.5*length(uv-vec2(.5,.3)));
  vec3 col=bg;
  if(hit){
    vec3 p=ro+rd*d, n=normal(p);
    float fres=pow(1.-max(dot(n,-rd),0.),3.);
    vec3 L=normalize(vec3(.6,.8,.7));
    float dif=max(dot(n,L),0.), spec=pow(max(dot(reflect(-L,n),-rd),0.),48.);
    vec3 base= h.y<.5 ? vec3(.02,.03,.06) : h.y<1.5 ? TEAL*.35 : h.y<2.5 ? AMBER*.4 : vec3(.6);
    col=base*(.25+dif*.6)+spec*vec3(1.)+fres*(h.y<.5?mix(TEAL,VIOLET,.5+.5*n.y):(h.y<1.5?TEAL:AMBER))*1.2;
    if(h.y<.5){ // lens core: inner iris lines
      float a=atan(n.y,n.x); col+=TEAL*.25*smoothstep(.9,1.,sin(a*24.+u_time))*fres;
    }
  }
  col+=(TEAL*glowT*.012+AMBER*glowA*.010)*(wide?1.:1.7);
  col*=1.-.35*dot(uv*.6,uv*.6);
  col=pow(col,vec3(.8));
  gl_FragColor=vec4(col,1.);
}`;

export function mountHero(canvas) {
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
  if (!gl) { canvas.classList.add("nogl"); return () => {}; }
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  try { gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); }
  catch (e) { console.warn("hero shader", e); canvas.classList.add("nogl"); return () => {}; }
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uRes = U("u_res"), uTime = U("u_time"), uMouse = U("u_mouse"), uScroll = U("u_scroll");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let mx = 0, my = 0, tx = 0, ty = 0, raf = 0, visible = true; const t0 = performance.now();
  const onMove = (e) => { const p = e.touches?.[0] || e; tx = (p.clientX / innerWidth - .5) * 2; ty = (p.clientY / innerHeight - .5) * 2; };
  addEventListener("pointermove", onMove, { passive: true });
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); });
  io.observe(canvas);
  function resize() {
    const scale = Math.min(devicePixelRatio || 1, 1.5) * (innerWidth > 1400 ? .7 : .85);
    canvas.width = Math.round(canvas.clientWidth * scale); canvas.height = Math.round(canvas.clientHeight * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  addEventListener("resize", resize); resize();
  function frame(now) {
    raf = 0; if (!visible || !canvas.isConnected) return;
    mx += (tx - mx) * .05; my += (ty - my) * .05;
    const s = Math.min(1, scrollY / Math.max(1, canvas.clientHeight));
    gl.uniform2f(uRes, canvas.width, canvas.height); gl.uniform1f(uTime, reduce ? 4 : (now - t0) / 1000);
    gl.uniform2f(uMouse, mx, -my); gl.uniform1f(uScroll, s);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); io.disconnect(); removeEventListener("pointermove", onMove); removeEventListener("resize", resize); };
}
