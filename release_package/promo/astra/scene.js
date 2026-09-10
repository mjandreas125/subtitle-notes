/* Deterministic, self-contained Three.js film. All time values are real seconds.
   Source scene + offline supersampled renderer, no external network dependencies. */
(async () => {
  'use strict';
  const Q = new URLSearchParams(location.search);
  const W = Number(Q.get('w') || 1920), H = W * 9 / 16;
  const T = THREE, ACC = '#46d68f', INK = '#eef3f0', DIM = '#93a49c';
  const FPS = 30, DURATION = 27.45;
  const clamp = x => Math.max(0, Math.min(1, x));
  const smooth = x => { x = clamp(x); return x*x*(3-2*x); };
  const span = (t,a,b) => smooth((t-a)/(b-a));
  const lerp = (a,b,k) => a+(b-a)*k;
  const V = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
  let seed=84621;
  const rand = () => { seed=(1664525*seed+1013904223)>>>0; return seed/4294967296; };
  await document.fonts.ready;
  const renderer = new T.WebGLRenderer({antialias:true, preserveDrawingBuffer:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(1); renderer.setSize(W,H);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  const scene = new T.Scene(); scene.background = new T.Color('#05080a');
  const cam = new T.PerspectiveCamera(38,16/9,.1,180);
  const ambient = new T.HemisphereLight(0xaac7ce,0x111a16,.36); scene.add(ambient);
  const key = new T.DirectionalLight(0xe3efe9,2.2); key.position.set(-8,12,14);
  key.castShadow=true; key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-25,right:25,top:18,bottom:-18,near:.1,far:80});
  key.shadow.bias=-.0003; key.shadow.normalBias=.025; scene.add(key);
  const edge = new T.PointLight(0x46d68f,32,55,2); edge.position.set(9,2,4); scene.add(edge);
  const screenLight = new T.PointLight(0xb0c7dd,40,24,2); screenLight.position.set(0,1,1.5); scene.add(screenLight);
  const trackedText=[];
  function rr(c,x,y,w,h,r) { c.beginPath(); c.roundRect(x,y,w,h,r); }
  function text(c,s,size,x,y,col=INK,weight=400,align='left') {
    c.font=`${weight} ${size}px "Segoe UI",sans-serif`; c.fillStyle=col;
    c.textAlign=align; c.textBaseline='alphabetic'; c.fillText(s,x,y);
  }
  function tex(w,h,paint,scale=2) {
    const c=document.createElement('canvas'); c.width=Math.ceil(w*scale); c.height=Math.ceil(h*scale);
    const ctx=c.getContext('2d'); ctx.scale(scale,scale); paint(ctx,w,h);
    const map=new T.CanvasTexture(c); map.colorSpace=T.SRGBColorSpace;
    map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    return {map,canvas:c,ctx};
  }
  function plane(w,h,map,parent,x=0,y=0,z=0) {
    const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,transparent:true,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
    m.position.set(x,y,z);m.renderOrder=1; parent.add(m); return m;
  }
  function type(s,w,h,size,parent,x,y,z,color=INK,weight=400,align='center') {
    const a=tex(w*100,h*100,(c,pw,ph)=>text(c,s,size,align==='left'?4:pw/2,ph*.7,color,weight,align));
    const m=plane(w,h,a.map,parent,x,y,z); trackedText.push({s,m,w,h}); return m;
  }
  function shape(w,h,r) {
    const s=new T.Shape(); const x=-w/2,y=-h/2;
    s.moveTo(x+r,y); s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
    s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
    s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
  }
  function slab(w,h,d,r,parent,color=0x101b19,x=0,y=0,z=0) {
    const geo=new T.ExtrudeGeometry(shape(w-.06,h-.06,r),{depth:d,bevelEnabled:true,bevelSize:.03,bevelThickness:.025,bevelSegments:3,steps:1,curveSegments:16});
    geo.translate(0,0,-d);
    const m=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:.43,metalness:.32}));
    m.position.set(x,y,z); m.castShadow=true;m.receiveShadow=true; parent.add(m);return m;
  }
  function line(points,color,parent,opacity=1) {
    const m=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color,transparent:true,opacity}));parent.add(m);return m;
  }
  function border(w,h,r,color,parent,z=0) {
    return line(shape(w,h,r).getPoints(96).map(v=>V(v.x,v.y,z)),color,parent,.5);
  }
  const glowMap=tex(128,128,c=>{const g=c.createRadialGradient(64,64,1,64,64,64);g.addColorStop(0,'#fff');g.addColorStop(.13,'rgba(255,255,255,.6)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,128,128);},1).map;
  function glow(parent,x,y,z,size,opacity=.1) {
    const m=new T.Sprite(new T.SpriteMaterial({map:glowMap,color:0x46d68f,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
    m.position.set(x,y,z);m.scale.set(size,size,1);parent.add(m);return m;
  }
  // TV is a physical screen in a real room. The screen image contains no type.
  const room=new T.Group();scene.add(room);
  slab(16.2,9.25,.27,.16,room,0x090d0f);
  const picture=await new T.TextureLoader().loadAsync('assets/night-drama.png');
  picture.colorSpace=T.SRGBColorSpace;picture.anisotropy=8;
  const movie=plane(15.95,8.97,picture,room,0,0,.03);
  movie.material.transparent=false;movie.material.depthWrite=true;movie.renderOrder=0;
  for(const y of [-4.0,4.0]) {
    const m=new T.Mesh(new T.PlaneGeometry(15.96,1.0),new T.MeshBasicMaterial({color:0x020304}));m.position.set(0,y,.055);room.add(m);
  }
  const floor=new T.Mesh(new T.PlaneGeometry(90,90),new T.MeshStandardMaterial({color:0x0b1215,roughness:.63,metalness:.16}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-5.35;floor.receiveShadow=true;room.add(floor);
  slab(17,.24,1.4,.08,room,0x101416,0,-4.92,-.1);
  const viewer=new T.Group(); room.add(viewer); viewer.position.set(-5.25,-3.3,7.0);
  const cloth=new T.MeshStandardMaterial({color:0x050708,roughness:.96});
  function ellipsoid(x,y,z,sx,sy,sz) {
    const m=new T.Mesh(new T.SphereGeometry(1,48,32),cloth);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;viewer.add(m);return m;
  }
  ellipsoid(0,1.2,0,.87,1.1,.87);ellipsoid(0,-1.2,0,2.3,1.9,.95);ellipsoid(0,.18,0,.5,.8,.52);
  // One subtitle surface; selected glyphs transfer ownership to the flying mesh.
  const caption=tex(1200,140,()=>{});const captionMesh=plane(12,1.4,caption.map,room,0,-2.43,.10);
  const metric=document.createElement('canvas').getContext('2d');metric.font='600 52px "Segoe UI"';
  const before='No one wants ',term='a record',after='.';
  const fullWidth=metric.measureText(before+term+after).width;
  const termWidth=metric.measureText(term).width;
  const startX=(1200-fullWidth)/2,termX=startX+metric.measureText(before).width;
  const termWorld=(termX+termWidth/2-600)/100;
  const wrong=type('никто не хочет рекорд',8.4,.75,37,room,0,-3.42,.12,DIM,400);
  metric.font='400 37px "Segoe UI"';const wrongWidth=metric.measureText('никто не хочет рекорд').width/100;
  const strike=line([V(-wrongWidth/2,-3.45,.135),V(wrongWidth/2,-3.45,.135)],0xbd6864,room);
  const player=tex(1500,85,(c,w,h)=>{
    text(c,'S02 · E04',17,28,27,DIM);text(c,'42:10',17,w-28,27,DIM,400,'right');
    c.fillStyle='#27312f';c.fillRect(28,54,w-56,2);c.fillStyle=ACC;c.fillRect(28,54,(w-56)*.66,2);
  });plane(15,.85,player.map,room,0,-4.0,.12);
  const keycap=new T.Group();room.add(keycap);keycap.position.set(-4.7,-3.0,2.1);
  slab(1.8,1.3,.32,.18,keycap,0x1b2725);const keytop=new T.Group();keycap.add(keytop);
  slab(1.6,1.14,.22,.14,keytop,0xc8d3c9,0,.04,.24);type('Ctrl',1.4,.7,37,keytop,0,.08,.275,'#182820',600);
  keycap.rotation.set(-.12,.16,-.06);
  const cursor=plane(.36,.5,tex(72,100,c=>{c.fillStyle=INK;c.strokeStyle='#07140f';c.lineWidth=5;c.beginPath();c.moveTo(8,5);c.lineTo(10,83);c.lineTo(27,65);c.lineTo(42,95);c.lineTo(57,88);c.lineTo(42,59);c.lineTo(66,58);c.closePath();c.stroke();c.fill();}).map,room);
  const flying=new T.Group();scene.add(flying);
  const flyingText=plane(termWidth/100+.18,1.4,tex(termWidth+18,140,(c,w,h)=>text(c,term,52,w/2,86,INK,600,'center')).map,flying);
  const flyEdge=border(termWidth/100+.3,.78,.12,ACC,flying,-.01);flyEdge.position.y=-.03;
  // Three stations share the Z corridor and cast light on physical bases.
  const corridor=new T.Group();scene.add(corridor);
  const centers=[V(-2.8,.65,-7),V(0,.8,-15),V(2.8,.95,-23)];
  const rings=centers.map((p,i)=>{
    const g=new T.Group();g.position.copy(p);corridor.add(g);
    const mat=new T.MeshStandardMaterial({color:0x14332a,metalness:.7,roughness:.25,emissive:0x46d68f,emissiveIntensity:.06});
    const ring=new T.Mesh(new T.TorusGeometry(2.05,.06,12,128),mat);g.add(ring);
    const outer=new T.Mesh(new T.TorusGeometry(2.18,.014,8,128),new T.MeshStandardMaterial({color:0x244237,metalness:.7,roughness:.4}));g.add(outer);
    slab(4.8,.16,1.7,.08,g,0x111e1a,0,-2.5,.2);
    const label=type(['реплика','смысл','дубляж'][i],3.8,.75,40,g,0,-3.12,.1,DIM,500);
    const lamp=new T.PointLight(0x46d68f,0,12,2);lamp.position.z=.5;g.add(lamp);
    const halo=glow(g,0,0,0,6,.03);return {g,mat,lamp,halo,label};
  });
  for(const x of [-5.5,5.5])line([V(x,-2.0,-1),V(x,-2.0,-31)],0x284237,corridor,.35);
  // Answer surface: particles land on its exact coordinates; stochastic reveal
  // uses stable cells, so the panel builds from deposited material.
  const card=new T.Group();scene.add(card);card.position.set(0,.25,2);
  const cardW=11.7,cardH=5.25;
  const cardBody=slab(cardW,cardH,.19,.23,card,0x101c18);
  const cardOutline=border(cardW-.08,cardH-.08,.21,'#49665a',card,.018);
  const face=tex(1170,525,(c,w,h)=>{
    text(c,'No one wants a record. · серия, 27:44',29,56,72,DIM,400);
    c.fillStyle='#2b3b33';c.fillRect(56,101,w-112,1);
    text(c,'Никому не нужна судимость.',57,56,197,INK,600);
    text(c,'a record - судимость',36,56,260,ACC,500);
  });
  const cardFace=plane(cardW,cardH,face.map,card,0,0,.036);
  const chipWords=['криминальное прошлое','привод в полицию','уголовное прошлое'];
  const chips=chipWords.map((s,i)=>{
    metric.font='400 25px "Segoe UI"';const w=metric.measureText(s).width+38;
    const map=tex(w,62,(c,pw,ph)=>{c.fillStyle='#1a3025';rr(c,1,1,pw-2,ph-2,28);c.fill();c.strokeStyle='#345344';c.lineWidth=1;c.stroke();text(c,s,25,pw/2,40,'#bbd4c6',400,'center');}).map;
    const m=plane(w/100,.62,map,card,0,-1.25,.05);trackedText.push({s,m,w:w/100,h:.62});return m;
  });
  const totalChips=chips.reduce((a,c)=>a+c.geometry.parameters.width,0)+.24;
  let chipX=-totalChips/2;chips.forEach(c=>{c.position.x=chipX+c.geometry.parameters.width/2;chipX+=c.geometry.parameters.width+.12;});
  const cardGlow=glow(card,0,0,-.25,16,.024);
  const revealUniform={value:0};
  for(const m of [cardBody,cardFace]) {
    m.material.onBeforeCompile=shader=>{
      shader.uniforms.assembly=revealUniform;
      shader.vertexShader='varying vec3 vLocal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLocal=position;');
      shader.fragmentShader='uniform float assembly;varying vec3 vLocal;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
        vec2 cell=floor(vLocal.xy*32.0);float h=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453);
        if(h>assembly) discard;`);
    };
  }
  const COUNT=1900, positions=new Float32Array(COUNT*3), colors=new Float32Array(COUNT*3);
  const particles=Array.from({length:COUNT},()=>({delay:rand()*.23,phase:rand()*Math.PI*2,amp:.12+rand()*.42,tx:(rand()-.5)*(cardW-.2),ty:(rand()-.5)*(cardH-.2),heat:rand()}));
  const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(positions,3));pg.setAttribute('color',new T.BufferAttribute(colors,3));
  const points=new T.Points(pg,new T.PointsMaterial({size:.12,map:glowMap,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
  points.frustumCulled=false;scene.add(points);
  const pathTimes=[9.8,10.6,11.1,11.6,12.05,12.7];
  const pathPoints=[V(termWorld,-1.7,2.4),...centers,V(4.1,3.25,-10),V(0,.25,2.1)];
  function flight(t) {
    let i=0;while(i<pathTimes.length-2&&t>=pathTimes[i+1])i++;
    const u=clamp((t-pathTimes[i])/(pathTimes[i+1]-pathTimes[i]));
    const p=pathPoints[i].clone().lerp(pathPoints[i+1],smooth(u));
    if(i===3)p.y+=Math.sin(u*Math.PI)*.7;
    return p;
  }
  // Three recognisable physical devices, each presents the same answer.
  const devices=new T.Group();scene.add(devices);
  const deviceDefs=[{name:'браузер',x:-6.5,w:6.8,h:4.75},{name:'телефон',x:0,w:2.8,h:5.35},{name:'компьютер',x:6.5,w:6.65,h:4.65}];
  const languages=['судимость','a criminal record','eine Vorstrafe','antecedentes penales','karistatus'];
  const devs=deviceDefs.map((d,i)=>{
    const g=new T.Group();g.position.set(d.x,0,-2);devices.add(g);
    slab(d.w,d.h,.28,i===1?.32:.18,g,0x182321);
    const maps=languages.map((language,languageIndex)=>tex(d.w*120,d.h*120,(c,w,h)=>{
      c.fillStyle='#101915';rr(c,7,7,w-14,h-14,18);c.fill();
      if(i===1){c.fillStyle='#080d0a';rr(c,w/2-48,16,96,17,9);c.fill();}
      else {c.fillStyle='#25352d';for(let j=0;j<3;j++){c.beginPath();c.arc(29+j*17,27,4,0,7);c.fill();}c.fillRect(87,18,w-130,17);}
      c.strokeStyle='#293e31';c.beginPath();c.moveTo(22,56);c.lineTo(w-22,56);c.stroke();
      text(c,'No one wants a record.',i===1?18:25,25,94,DIM,400);
      text(c,languageIndex===0?'Никому не нужна':'a record',i===1?21:33,25,146,INK,600);
      const languageSize=Math.min(i===1?21:33,(w-48)/(language.length*.55));
      text(c,languageIndex===0?'судимость.':language,languageSize,25,187,INK,600);
      text(c,'a record',i===1?18:23,25,238,ACC,500);
      for(let j=0;j<3;j++){c.fillStyle='#1a2b20';rr(c,24,300+j*61,w-48,43,7);c.fill();c.fillStyle='#365040';c.fillRect(38,316+j*61,(w-85)*[.74,.58,.66][j],4);}
    }).map);const screen=plane(d.w-.1,d.h-.1,maps[0],g,0,0,.038);
    if(i===2){slab(.6,1.0,.25,.08,g,0x25302d,0,-d.h/2-.4,-.05);slab(3.25,.14,1.2,.07,g,0x1d2823,0,-d.h/2-.85,.2);}
    type(d.name,d.w,.65,31,g,0,-d.h/2-(i===2?1.48:.65),.06,DIM,500);
    return {g,screen,maps};
  });
  const syncCards=Array.from({length:5},()=>{
    const g=new T.Group();scene.add(g);slab(.72,.42,.045,.06,g,0x204c33);
    plane(.60,.3,tex(120,60,c=>{c.fillStyle=ACC;c.fillRect(8,12,95,5);c.fillRect(8,29,61,5);}).map,g,0,0,.02);return g;
  });
  const langGroup=new T.Group();scene.add(langGroup);
  const languageMeshes=languages.map(s=>type(s,12.6,1.2,66,langGroup,0,0,0,INK,600));
  const langLine=line([V(-1.3,-.85,0),V(1.3,-.85,0)],0x46d68f,langGroup,.55);
  // The supplied brief explicitly requests a monochrome green subtitle mark.
  const end=new T.Group();scene.add(end);
  const mark=slab(1.55,1.55,.23,.32,end,0x46d68f,0,1.65,0);
  mark.material.metalness=.1;mark.material.roughness=.5;
  plane(1.5,1.5,tex(300,300,c=>{c.fillStyle='#eef3f0';rr(c,58,125,184,26,13);c.fill();rr(c,58,169,118,22,11);c.fill();}).map,end,0,1.65,.035);
  type('Subtitle Notes',12.5,1.5,83,end,0,-.05,.08,INK,600);
  type('Бесплатно, в Chrome Web Store',12,.8,32,end,0,-1.24,.08,DIM);
  type('subtitlenotes.com',10,.7,29,end,0,-2.05,.08,DIM);
  // Optical finishing: real depth of field for the foreground viewer, gentle
  // highlight bloom, vignette and fixed-seed fine film grain. No text blur.
  const target=new T.WebGLRenderTarget(W,H,{type:T.HalfFloatType,depthBuffer:true,samples:renderer.capabilities.isWebGL2?4:0});
  target.depthTexture=new T.DepthTexture(W,H);
  const postScene=new T.Scene(), postCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const post=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,
    uniforms:{colorTex:{value:target.texture},depthTex:{value:target.depthTexture},resolution:{value:new T.Vector2(W,H)},focus:{value:18},aperture:{value:0},time:{value:0},fade:{value:1},endMode:{value:0}},
    vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`precision highp float;varying vec2 uv0;
      uniform sampler2D colorTex,depthTex;uniform vec2 resolution;uniform float focus,aperture,time,fade,endMode;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){float dep=texture2D(depthTex,uv0).x;
        float z=(.1*180.)/(180.-dep*(180.-.1));
        float blur=clamp(abs(z-focus)/max(z,.1)*aperture,0.,17.);
        vec3 c=texture2D(colorTex,uv0).rgb;vec3 sum=c;vec3 bloom=vec3(0.);
        for(int i=0;i<16;i++){float a=float(i)*2.399963;vec2 dir=vec2(cos(a),sin(a));
          float r=sqrt((float(i)+.5)/16.);sum+=texture2D(colorTex,uv0+dir*blur*r/resolution).rgb;
          vec3 b=texture2D(colorTex,uv0+dir*(4.+float(i)*1.2)/resolution).rgb;
          float green=step(b.r*1.55,b.g)*step(b.b*1.3,b.g);
          bloom+=max(b-vec3(.45),vec3(0.))*green;}
        c=sum/17.+bloom*.006;
        vec2 p=(uv0-.5)*vec2(1.,.82);c*=1.-dot(p,p)*.48*(1.-endMode);
        c+=(hash(gl_FragCoord.xy+floor(time*30.)*.73)-.5)*.0018*(1.-endMode);
        gl_FragColor=vec4(max(c,vec3(0.))*fade,1.);
        #include <colorspace_fragment>
      }`});
  postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),post));
  function cameraAt(t){
    let p,look;
    if(t<9.8){const u=span(t,0,8.6);p=V(lerp(1.05,.2,u),lerp(.7,-.5,u),lerp(18.8,13.8,u));look=V(0,lerp(0,-.85,u),0);}
    else if(t<11.75){const u=span(t,9.8,10.55),v=span(t,10.55,11.75);p=V(lerp(.2,6.4,u),lerp(-.5,3.4,u),lerp(13.8,7.5,u)-v*2);look=V(lerp(0,.3,u),.4,lerp(0,-14,u)-v*2);}
    else if(t<13.1){const u=span(t,11.75,12.23);p=V(lerp(6.4,.65,u),lerp(3.4,.65,u),lerp(5.5,18.4,u));look=V(lerp(.3,0,u),.25,lerp(-16,2,u));}
    else if(t<16.65){const u=span(t,13.1,16.65);p=V(lerp(.65,.15,u),.65,lerp(18.4,17.6,u));look=V(0,.25,2);}
    else if(t<20.55){const u=span(t,16.65,18.1);p=V(lerp(.15,.6,u),lerp(.65,1.0,u),lerp(17.6,21.5,u));look=V(0,lerp(.25,-.15,u),lerp(2,-2,u));}
    else {p=V(.6,1,21.5);look=V(0,-.15,-2);}
    if(t>=23.9){p=V(0,0,18);look=V(0,0,0);}
    cam.position.copy(p);cam.lookAt(look);cam.updateMatrixWorld();
    post.uniforms.focus.value=cam.position.distanceTo(look);
    post.uniforms.aperture.value=34*(1-span(t,6.3,6.85));
  }
  function drawCaption(t){
    const c=caption.ctx;c.clearRect(0,0,1200,140);
    if(t<2.2)return;
    const a=span(t,2.2,2.48);c.globalAlpha=a;c.fillStyle='rgba(2,5,4,.78)';rr(c,startX-20,20,fullWidth+40,84,10);c.fill();
    const selected=span(t,7.38,8.3),detached=t>=8.9;
    if(selected>0&&!detached){c.fillStyle='rgba(70,214,143,.34)';rr(c,termX-6,22,(termWidth+12)*selected,80,6);c.fill();}
    text(c,before,52,startX,86,INK,600);text(c,after,52,termX+termWidth,86,INK,600);
    if(!detached)text(c,term,52,termX,86,INK,600);
    else {c.setLineDash([7,6]);c.strokeStyle='#46d68f';c.lineWidth=1.5;rr(c,termX-5,22,termWidth+10,80,6);c.stroke();c.setLineDash([]);}
    c.globalAlpha=1;
  }
  function update(t){
    cameraAt(t);
    scene.background.set(t>=23.9?0x000000:0x05080a);
    room.visible=t<10.55;
    const leave=span(t,9.8,10.55);room.position.set(-leave*33,leave*2,-leave*9);
    ambient.intensity=t<9.8?.16:.48;key.intensity=t<9.8?.65:2.2;
    screenLight.intensity=t<9.8?48:0;edge.intensity=t<9.8?0:32;
    drawCaption(t);caption.map.needsUpdate=true;
    wrong.visible=t>=3.3&&t<6.55;wrong.material.opacity=span(t,3.3,3.65);wrong.position.y=-3.42-span(t,5.85,6.55)*1.8;
    strike.visible=t>=4.5&&t<6.55;const st=span(t,4.5,4.93);
    strike.geometry.setDrawRange(0,st>0?2:0);strike.scale.x=Math.max(.001,st);strike.position.x=-wrongWidth/2*(1-st);strike.position.y=-span(t,5.85,6.55)*1.8;
    keycap.visible=t>=6.65&&t<9.8;keycap.position.y=lerp(-7,-3,span(t,6.65,7.04));
    keytop.position.z=-.16*(span(t,7.1,7.22)-span(t,8.55,8.72));
    cursor.visible=t>=6.95&&t<8.65;
    cursor.position.set(lerp(termWorld-termWidth/200-.2,termWorld+termWidth/200+.12,span(t,7.38,8.3)),-2.65,.3);
    flying.visible=t>=8.9&&t<10.3;
    const lift=span(t,8.9,9.8);flying.position.set(termWorld,-2.43+lift*.73,.1+lift*2.3);
    flying.rotation.set(-lift*.20,lift*.27,lift*.03);
    const gone=span(t,9.8,10.25);flyingText.material.opacity=1-gone;flyEdge.material.opacity=.5*(1-gone);
    if(t>=9.8){flying.position.copy(flight(t));flying.scale.setScalar(1-gone*.25);}else flying.scale.setScalar(1);
    corridor.visible=t>=9.8&&t<12.24;corridor.position.set(0,span(t,11.78,12.24)*22,-span(t,11.78,12.24)*24);
    rings.forEach((r,i)=>{const hit=[10.6,11.1,11.6][i];const on=span(t,hit-.08,hit+.06);const pulse=Math.exp(-Math.max(0,t-hit)*3.5);
      r.mat.emissiveIntensity=.04+on*(.8+pulse*1.6);r.lamp.intensity=on*(10+pulse*35);r.halo.material.opacity=.02+on*.08;r.label.material.color.set(on?INK:DIM);
    });
    card.visible=t>=12.24&&t<18.17;
    const assembly=span(t,12.24,12.7);revealUniform.value=assembly;
    cardOutline.visible=assembly>.96;cardGlow.visible=assembly>.96;
    const dock=span(t,16.9,18.17);card.position.set(lerp(0,-6.5,dock),lerp(.25,.45,dock),lerp(2,-1.8,dock));
    card.scale.setScalar(lerp(1,.42,dock));card.rotation.set(0,lerp(.025,0,dock),0);
    chips.forEach((c,i)=>{const u=span(t,14+i*.13,14.4+i*.13);c.visible=u>0;c.material.opacity=u;c.position.y=-1.25-(1-u)*.25;});
    points.visible=t>=9.8&&t<12.82;
    if(points.visible){particles.forEach((p,i)=>{
      const pt=flight(t-p.delay);const u=span(t,9.8,10.3);const settle=span(t,12.02+p.delay*.35,12.7);
      const targetP=V(p.tx,p.ty+.25,2.05);
      pt.x+=Math.cos(t*6+p.phase)*p.amp*u;pt.y+=Math.sin(t*5+p.phase)*p.amp*u;
      pt.lerp(targetP,settle);positions[i*3]=pt.x;positions[i*3+1]=pt.y;positions[i*3+2]=pt.z;
      const a=span(t,9.8+p.delay,10.12+p.delay)*(1-span(t,12.43+p.heat*.2,12.76));
      const bright=a*(.4+p.heat*.5);colors[i*3]=.17*bright;colors[i*3+1]=.84*bright;colors[i*3+2]=.43*bright;
    });pg.attributes.position.needsUpdate=true;pg.attributes.color.needsUpdate=true;}
    devices.visible=t>=16.9&&t<23.9;
    devs.forEach((d,i)=>{d.g.position.y=lerp(-14,0,span(t,16.9+i*.13,17.9+i*.13))-span(t,23.05,23.9)*16;});
    syncCards.forEach((g,i)=>{const start=18.15+i*.34,endT=start+1.38,u=clamp((t-start)/(endT-start));g.visible=t>=start&&t<endT;
      const a=V(deviceDefs[i%3].x,0,-1.6),b=V(deviceDefs[(i+1)%3].x,0,-1.6);g.position.copy(a.lerp(b,smooth(u)));g.position.y+=Math.sin(u*Math.PI)*2.9;g.position.z+=Math.sin(u*Math.PI)*1.0;g.rotation.y=Math.sin(u*Math.PI)*.15;
    });
    langGroup.visible=t>=20.6&&t<23.65;langGroup.position.set(0,4.7-span(t,23.05,23.65)*15,-1.5);
    const langIndex=Math.min(4,Math.max(0,Math.floor((t-20.6)/.55)));
    devs.forEach(d=>{d.screen.material.map=d.maps[t>=20.6?langIndex:0];});
    languageMeshes.forEach((m,i)=>{m.visible=i===langIndex;const on=span(t,20.6+i*.55,20.6+i*.55+.15);m.material.opacity=on;m.rotation.set(0,0,0);});
    langLine.material.opacity=.55;
    end.visible=t>=23.9;end.position.set(0,0,0);
    post.uniforms.time.value=t;post.uniforms.endMode.value=t>=23.9?1:0;
    post.uniforms.fade.value=t>=23.9?span(t,23.9,24.3):lerp(.45,1,span(t,0,.75));
    scene.updateMatrixWorld(true);
  }
  function audit(t){
    update(t);
    const errors=[];
    if(t>=10.55&&room.visible)errors.push('TV outside scene');
    if(t>=12.85&&t<16.9&&(!card.visible||revealUniform.value<.999))errors.push('answer incomplete');
    if(t>=8.9&&t<10.3&&flying.visible&&t<8.9)errors.push('duplicate selection');
    for(const m of languageMeshes)if(m.rotation.x||m.rotation.y||m.rotation.z)errors.push('rotated language');
    return {t,errors,stage:t<9.8?'room':t<12.7?'flight':t<16.9?'answer':t<23.9?'library':'end',assembly:revealUniform.value};
  }
  function seek(t){update(t);renderer.setRenderTarget(target);renderer.render(scene,cam);renderer.setRenderTarget(null);renderer.render(postScene,postCam);}
  const gl=renderer.getContext(),dbg=gl.getExtension('WEBGL_debug_renderer_info');
  window.FILM={seek,audit,duration:DURATION,fps:FPS,revision:'astra-1',renderer:dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),text:trackedText.map(v=>v.s)};
  seek(Number(Q.get('t')||0));document.documentElement.dataset.ready='1';
  if(!Q.has('t')){const origin=performance.now();function tick(){seek(((performance.now()-origin)/1000)%DURATION);requestAnimationFrame(tick);}requestAnimationFrame(tick);}
})().catch(e=>{window.FILM_ERROR=String(e.stack||e);console.error(e);});
