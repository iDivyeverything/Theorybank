import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { SVGRenderer, SVGObject } from "three/addons/renderers/SVGRenderer.js";
import { BOARD_FRAME, CAMERA_TRAVEL_MS, STONE_PIECE_FEEL, type TableAppearance } from "@/lib/chess/presentation";
import { coastalTable } from "./coastal-table";
import { SceneBackdrop } from "@/components/environments/scene-backdrop";
import type { StudyEnvironment } from "@/lib/environments/registry";

export type BoardPiece = { square: string; type: string; color: "w" | "b" };
export type BoardPosition = {
  pieces: BoardPiece[]; selected: string | null; destinations: string[];
  lastMove?: { from?: string; to?: string }; checkSquare?: string; focusType?: string;
  motion?: {id:number;pieceType:string};
};
export type BoardLighting = { sunlight: string; ambient: string; intensity: number };

const squarePoint = (square: string) => new THREE.Vector3(square.charCodeAt(0) - 100.5, .252, 3.5 - (Number(square[1]) - 1));

function makeLathe(profile: number[][], material: THREE.Material, segments=48) {
  return new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r,y]) => new THREE.Vector2(r,y)), segments), material);
}

function pieceModel(type: string, color: "w" | "b", material: THREE.Material, accent: THREE.Material, lowDetail=false) {
  const lathe=(profile:number[][],mat:THREE.Material)=>makeLathe(profile,mat,lowDetail?16:48);
  const group = new THREE.Group();
  const mesh = (geometry: THREE.BufferGeometry, y: number, x = 0, z = 0, mat = material) => {
    const part = new THREE.Mesh(geometry, mat); part.position.set(x,y,z); group.add(part); return part;
  };
  group.add(lathe([[0,0],[.28,0],[.335,.035],[.34,.075],[.32,.115],[.30,.14],[.28,.165],[.275,.20],[.24,.225],[.215,.24]], material));
  mesh(new THREE.TorusGeometry(.292,.012,lowDetail?4:8,lowDetail?16:48),.13,0,0,accent).rotation.x=Math.PI/2;
  if (type === "p") {
    group.add(lathe([[.23,.22],[.21,.27],[.155,.34],[.12,.47],[.13,.51],[.20,.54],[.205,.59],[.16,.625]],material));
    mesh(new THREE.SphereGeometry(.205,lowDetail?12:32,lowDetail?8:24),.80);
  } else if (type === "r") {
    group.add(lathe([[.24,.22],[.23,.30],[.20,.35],[.20,.77],[.25,.82],[.28,.87],[.28,.97],[0,.97]],material));
    for(let i=0;i<6;i++){ const t=i*Math.PI/3; const block=mesh(new THREE.BoxGeometry(.145,.17,.15),1.015,Math.cos(t)*.20,Math.sin(t)*.20); block.rotation.y=-t; }
  } else if (type === "n") {
    group.add(lathe([[.24,.22],[.235,.29],[.21,.33],[.20,.4],[0,.4]],material));
    const horse=new THREE.Shape();
    horse.moveTo(-.22,.37); horse.bezierCurveTo(-.25,.61,-.18,.87,-.10,1.02); horse.lineTo(-.13,1.23); horse.lineTo(.00,1.16);
    horse.lineTo(.11,1.24); horse.lineTo(.13,1.08); horse.bezierCurveTo(.24,1.01,.22,.90,.38,.82); horse.lineTo(.34,.66); horse.lineTo(.19,.66); horse.lineTo(.08,.77); horse.bezierCurveTo(.10,.62,.25,.49,.24,.37); horse.closePath();
    const head = new THREE.Mesh(new THREE.ExtrudeGeometry(horse,{depth:.21,bevelEnabled:true,bevelThickness:.04,bevelSize:.045,bevelSegments:lowDetail?1:3,steps:1,curveSegments:lowDetail?5:14}),material);
    head.position.z=-.105; group.add(head);
    const eyeMat=new THREE.MeshStandardMaterial({color:color==="w"?"#635e4c":"#b8b395",roughness:.25});
    mesh(new THREE.SphereGeometry(.025,lowDetail?6:16,lowDetail?4:12),.965,.15,.147,eyeMat);
    mesh(new THREE.SphereGeometry(.025,lowDetail?6:16,lowDetail?4:12),.965,.15,-.147,eyeMat);
    group.rotation.y=color==="w"?Math.PI/2:-Math.PI/2;
  } else {
    const height=type==="k"?1.05:type==="q"?1:.91;
    group.add(lathe([[.235,.22],[.22,.30],[.18,.37],[.145,.51],[.13,.68],[.155,height-.13],[.235,height-.07],[.24,height],[.18,height+.04]],material));
    if(type==="b") {
      const top=mesh(new THREE.SphereGeometry(.205,lowDetail?12:32,lowDetail?8:24),1.10); top.scale.set(.81,1.36,.81);
      mesh(new THREE.SphereGeometry(.046,lowDetail?8:20,lowDetail?6:12),1.38);
      const slit=mesh(new THREE.BoxGeometry(.027,.15,.345),1.13,0,0,accent); slit.rotation.z=-.48;
    } else if(type==="q") {
      group.add(lathe([[.16,1.02],[.19,1.12],[.245,1.27],[.23,1.3],[0,1.3]],material));
      for(let i=0;i<8;i++){const t=i*Math.PI/4; mesh(new THREE.SphereGeometry(.047,lowDetail?6:16,lowDetail?4:12),1.31,Math.cos(t)*.214,Math.sin(t)*.214);}
      mesh(new THREE.SphereGeometry(.072,lowDetail?8:24,lowDetail?6:16),1.42);
    } else {
      group.add(lathe([[.175,1.06],[.20,1.14],[.205,1.2],[.14,1.26],[0,1.26]],material));
      mesh(new RoundedBoxGeometry(.105,.38,.105,2,.012),1.43);
      mesh(new RoundedBoxGeometry(.32,.10,.10,2,.012),1.48);
    }
  }
  // Fine mineral color and a very shallow surface variation preserve the familiar
  // silhouette. Vertex color also gives the software renderer a stone surface.
  group.traverse(object=>{ if(object instanceof THREE.Mesh){
    object.castShadow=true;object.receiveShadow=true;
    const positions=object.geometry.getAttribute("position"),colors=[];
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      const grain=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;
      const shade=.90+(grain-Math.floor(grain))*.10;
      colors.push(shade,shade,shade);
    }
    object.geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
  } });
  return group;
}

function stoneTexture(){
  const size=256,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const noise=Math.sin(x*12.9898+y*78.233)*43758.5453;
    const cloud=Math.sin(x*.093+Math.sin(y*.042)*2)*Math.sin(y*.068+x*.021);
    const value=Math.round(220+cloud*13+(noise-Math.floor(noise))*22),i=(y*size+x)*4;
    data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size);texture.needsUpdate=true;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2,2);
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;
  return texture;
}

function woodTexture() {
  const canvas=document.createElement("canvas"); canvas.width=256; canvas.height=512;
  const context=canvas.getContext("2d")!;
  context.fillStyle="#ddd6c8"; context.fillRect(0,0,256,512);
  for(let i=0;i<1600;i++) {
    const x=(Math.sin(i*12.9898)*43758.5453%1+1)%1*256;
    const v=(Math.sin(i*5.71)*12951.77%1+1)%1;
    context.strokeStyle=`rgba(${v>.5?"61,36,22":"220,185,143"},${.03+v*.07})`;
    context.lineWidth=.4+v; context.beginPath(); context.moveTo(x,0);
    context.bezierCurveTo(x+Math.sin(i)*7,150,x-Math.sin(i*.3)*5,350,x+Math.cos(i)*3,512);context.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping; texture.repeat.set(2,2); texture.anisotropy=8; return texture;
}

export class BoardRenderer {
  private renderer: THREE.WebGLRenderer | SVGRenderer;
  readonly software: boolean;
  private needsRender=true;
  private scene=new THREE.Scene();
  private camera=new THREE.PerspectiveCamera(BOARD_FRAME.cameraFov,1,.1,400);
  private controls: OrbitControls;
  private frame=0;
  private observer: ResizeObserver;
  private pieces=new Map<string,{piece:BoardPiece;object:THREE.Group}>();
  private templates=new Map<string,THREE.Group>();
  private squares=new Map<string,THREE.Mesh<THREE.BoxGeometry,THREE.MeshStandardMaterial>>();
  private dots=new THREE.Group();
  private raycaster=new THREE.Raycaster();
  private onSquare:(square:string)=>void;
  private flipped=false;
  private topView=false;
  private distant=true;
  private viewInitialized=false;
  private cameraOffset=new THREE.Vector2();
  private cameraProgress=0;
  private backdrop?:SceneBackdrop;
  private scenePaused=false;
  private eventsActive=false;
  private cameraMotion?:{from:THREE.Vector3;to:THREE.Vector3;targetFrom:THREE.Vector3;targetTo:THREE.Vector3;offsetFrom:THREE.Vector2;offsetTo:THREE.Vector2;progressFrom:number;progressTo:number;start:number};
  private animations:{object:THREE.Group;from:THREE.Vector3;to:THREE.Vector3;start:number;duration:number;lift:number}[]=[];
  private lastMotionId=0;
  private pendingImpact?:{at:number;pieceType:string};
  private lastPosition:BoardPosition={pieces:[],selected:null,destinations:[]};
  private disposeEvents:()=>void;
  private environmentTarget?:THREE.WebGLRenderTarget;
  private reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(private host: HTMLElement, lighting:BoardLighting, onSquare:(square:string)=>void, tableAppearance:TableAppearance, private onLand:(pieceType:string)=>void, environment:StudyEnvironment, private onCameraFrame:(progress:number)=>void, onBackend:(gpu:boolean)=>void) {
    this.onSquare=onSquare;
    let gpu:THREE.WebGLRenderer|undefined;
    try { gpu=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"high-performance"}); } catch { /* Keep the same 3D geometry interactive without GPU support. */ }
    this.software=!gpu;
    this.renderer=gpu||new SVGRenderer();
    if(gpu){
      gpu.setPixelRatio(Math.min(window.devicePixelRatio,2));
      gpu.shadowMap.enabled=true;gpu.shadowMap.type=THREE.PCFSoftShadowMap;
      gpu.toneMapping=THREE.ACESFilmicToneMapping;gpu.toneMappingExposure=1.04;
    }else{(this.renderer as SVGRenderer).setQuality("high");(this.renderer as SVGRenderer).setPrecision(2);}
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute("class","chess-canvas");
    this.renderer.domElement.setAttribute("aria-hidden","true");
    host.appendChild(this.renderer.domElement);
    if(gpu){
      this.scene.background=new THREE.Color("#bddbdc");
      this.backdrop=new SceneBackdrop(this.scene,environment,()=>{this.needsRender=true;});
    }
    onBackend(!!gpu);
    if(gpu){
      const pmrem=new THREE.PMREMGenerator(gpu);
      const room=new RoomEnvironment();
      this.environmentTarget=pmrem.fromScene(room,.04);this.scene.environment=this.environmentTarget.texture;this.scene.environmentIntensity=.52;
      room.dispose();pmrem.dispose();
    }else{this.scene.add(new THREE.AmbientLight("#868a7f"));}
    this.scene.add(new THREE.HemisphereLight(lighting.ambient,"#66513d",2.1));
    const sunlight=new THREE.DirectionalLight(lighting.sunlight,this.software?.82:lighting.intensity);
    sunlight.position.set(-4,10,5);sunlight.castShadow=true;sunlight.shadow.mapSize.set(2048,2048);
    sunlight.shadow.camera.left=-8;sunlight.shadow.camera.right=8;sunlight.shadow.camera.top=8;sunlight.shadow.camera.bottom=-8;
    sunlight.shadow.normalBias=.025;sunlight.shadow.bias=-.0001;sunlight.shadow.radius=4;this.scene.add(sunlight);
    const fill=new THREE.DirectionalLight("#d6ebe7",this.software?.24:1.5);fill.position.set(7,5,-6);this.scene.add(fill);
    const wood=woodTexture();
    const base=new THREE.Mesh(new RoundedBoxGeometry(9.05,.32,9.05,3,.075),new THREE.MeshStandardMaterial({color:"#56432f",map:wood,roughness:.37,metalness:.05}));
    base.position.y=.04;base.renderOrder=-20;base.castShadow=true;base.receiveShadow=true;this.scene.add(base);
    const inlay=new THREE.Mesh(new RoundedBoxGeometry(8.39,.05,8.39,2,.015),new THREE.MeshStandardMaterial({color:"#b9a77d",roughness:.32,metalness:.48}));
    inlay.position.y=.195;inlay.renderOrder=-10;this.scene.add(inlay);
    for(let rank=0;rank<8;rank++)for(let file=0;file<8;file++){
      const square=String.fromCharCode(97+file)+(rank+1);
      const dark=(file+rank)%2===0;
      const tile=new THREE.Mesh(new THREE.BoxGeometry(1,.055,1),new THREE.MeshStandardMaterial({color:dark?"#5a7360":"#e7d8b9",roughness:.48,metalness:.03}));
      tile.position.set(file-3.5,.222,3.5-rank);tile.receiveShadow=true;tile.userData.square=square;
      this.scene.add(tile);this.squares.set(square,tile);
    }
    this.scene.add(coastalTable(tableAppearance,wood,this.software));
    if(gpu){const ground=new THREE.Mesh(new THREE.PlaneGeometry(23,21),new THREE.ShadowMaterial({opacity:.26}));ground.rotation.x=-Math.PI/2;ground.position.y=-4.91;ground.receiveShadow=true;this.scene.add(ground);}
    // Lettering is part of the board, so it follows the board's 3D perspective.
    for(let i=0;i<8;i++) {
      this.label(String.fromCharCode(97+i),i-3.5,4.27,0);
      this.label(String.fromCharCode(97+i),i-3.5,-4.27,Math.PI);
      this.label(String(i+1),-4.27,3.5-i,0);
      this.label(String(i+1),4.27,3.5-i,Math.PI);
    }
    const mineral=stoneTexture();
    const white=new THREE.MeshPhysicalMaterial({color:"#e3ddcb",map:mineral,bumpMap:mineral,bumpScale:.018,roughness:.66,metalness:0,clearcoat:.09,clearcoatRoughness:.65,vertexColors:true});
    const black=new THREE.MeshPhysicalMaterial({color:"#424b49",map:mineral,bumpMap:mineral,bumpScale:.022,roughness:.72,metalness:0,clearcoat:.06,clearcoatRoughness:.7,vertexColors:true});
    const whiteAccent=new THREE.MeshStandardMaterial({color:"#bbb5a3",map:mineral,roughness:.74,vertexColors:true});
    const blackAccent=new THREE.MeshStandardMaterial({color:"#626b64",map:mineral,roughness:.8,vertexColors:true});
    for(const type of ["p","r","n","b","q","k"])for(const color of ["w","b"] as const){
      const model=pieceModel(type,color,color==="w"?white:black,color==="w"?whiteAccent:blackAccent,this.software);
      const copies=new Map<THREE.Material,THREE.Material>();
      model.traverse(object=>{object.renderOrder=10;if(object instanceof THREE.Mesh){
        const original=object.material as THREE.Material;if(!copies.has(original))copies.set(original,original.clone());object.material=copies.get(original)!;
      }});
      if(this.software){const shadow=new THREE.Mesh(new THREE.CircleGeometry(.37,32),new THREE.MeshBasicMaterial({color:"#102018",transparent:true,opacity:.15,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(.04,.001,.04);shadow.renderOrder=2;model.add(shadow);}
      this.templates.set(color+type,model);
    }
    this.scene.add(this.dots);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement as unknown as HTMLElement);
    this.controls.addEventListener("change",()=>{this.needsRender=true;});
    this.controls.enableDamping=true;this.controls.dampingFactor=.12;this.controls.enablePan=false;this.controls.enableZoom=false;
    this.controls.minPolarAngle=.3;this.controls.maxPolarAngle=1.08;
    this.controls.mouseButtons={LEFT:undefined,MIDDLE:undefined,RIGHT:THREE.MOUSE.ROTATE};
    this.controls.touches={ONE:undefined,TWO:THREE.TOUCH.DOLLY_ROTATE};
    this.controls.target.set(0,0,0);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
    let start:{x:number;y:number}|null=null;
    const pointerDown=(event:PointerEvent)=>{if(event.button===0)start={x:event.clientX,y:event.clientY};};
    const pointerUp=(event:PointerEvent)=>{if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<7){const square=this.hit(event);if(square)this.onSquare(square);}start=null;};
    const pointerMove=(event:PointerEvent)=>{this.renderer.domElement.style.cursor=this.hit(event)?"pointer":"default";};
    const contextMenu=(event:Event)=>event.preventDefault();
    const surface=this.renderer.domElement as unknown as HTMLElement;
    surface.addEventListener("pointerdown",pointerDown);
    surface.addEventListener("pointerup",pointerUp);
    surface.addEventListener("pointermove",pointerMove);
    surface.addEventListener("contextmenu",contextMenu);
    this.disposeEvents=()=>{surface.removeEventListener("pointerdown",pointerDown);surface.removeEventListener("pointerup",pointerUp);surface.removeEventListener("pointermove",pointerMove);surface.removeEventListener("contextmenu",contextMenu);};
    let lastRender=0,lastTime=performance.now();
    const render=(now:number)=>{
      this.frame=requestAnimationFrame(render);const dt=Math.min((now-lastTime)/1000,.1);lastTime=now;if(document.hidden)return;
      this.backdrop?.update(dt,this.scenePaused||this.reducedMotion,this.eventsActive);
      if(this.cameraMotion){
        const motion=this.cameraMotion,t=Math.min((now-motion.start)/CAMERA_TRAVEL_MS,1),eased=t*t*t*(t*(t*6-15)+10);
        this.camera.position.lerpVectors(motion.from,motion.to,eased);this.controls.target.lerpVectors(motion.targetFrom,motion.targetTo,eased);
        this.cameraOffset.lerpVectors(motion.offsetFrom,motion.offsetTo,eased);this.applyOffset();
        this.cameraProgress=THREE.MathUtils.lerp(motion.progressFrom,motion.progressTo,eased);this.onCameraFrame(this.cameraProgress);
        this.needsRender=true;if(t===1){this.cameraMotion=undefined;this.controls.enabled=!this.distant;}
      }
      this.controls.update();
      if(now-lastRender<(this.software?80:33))return;
      if(!this.needsRender&&!this.animations.length&&!this.pendingImpact&&(!this.backdrop||this.scenePaused||this.reducedMotion))return;
      lastRender=now;this.needsRender=false;
      this.animations=this.animations.filter(animation=>{
        const progress=Math.min((now-animation.start)/animation.duration,1), eased=progress*progress*(3-2*progress);
        animation.object.position.lerpVectors(animation.from,animation.to,eased);
        animation.object.position.y+=Math.sin(progress*Math.PI)*animation.lift;
        return progress<1;
      });
      // SVG labels and triangles must project from the same, current camera.
      this.camera.updateMatrixWorld();this.renderer.render(this.scene,this.camera);
      if(this.pendingImpact&&now>=this.pendingImpact.at){const impact=this.pendingImpact;this.pendingImpact=undefined;this.onLand(impact.pieceType);}
      if(this.software)this.renderer.domElement.style.backgroundColor="transparent";
    };this.frame=requestAnimationFrame(render);
  }

  private label(text:string,x:number,z:number,rotation:number){
    if(this.software){
      const node=document.createElementNS("http://www.w3.org/2000/svg","text");
      node.textContent=text;node.setAttribute("fill","#e2d4af");node.setAttribute("font-size","11");node.setAttribute("text-anchor","middle");node.setAttribute("dominant-baseline","central");
      const label=new SVGObject(node);label.renderOrder=20;label.position.set(x,.22,z);this.scene.add(label);return;
    }
    const canvas=document.createElement("canvas");canvas.width=128;canvas.height=128;
    const ctx=canvas.getContext("2d")!;ctx.fillStyle="#e2d4af";ctx.font="500 68px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,64,64);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const label=new THREE.Mesh(new THREE.PlaneGeometry(.33,.33),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
    label.rotation.set(-Math.PI/2,0,rotation);label.position.set(x,.21,z);this.scene.add(label);
  }

  private hit(event:PointerEvent):string|null{
    const rect=this.renderer.domElement.getBoundingClientRect();
    const pointer=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    this.raycaster.setFromCamera(pointer,this.camera);
    const objects:THREE.Object3D[]=[...this.squares.values(),...[...this.pieces.values()].map(x=>x.object)];
    for(const hit of this.raycaster.intersectObjects(objects,true)){
      let object:THREE.Object3D|null=hit.object;
      while(object){if(object.userData.square)return object.userData.square;object=object.parent;}
    }return null;
  }

  private resize(){
    const width=this.host.clientWidth,height=this.host.clientHeight;
    if(!width||!height)return;
    this.renderer.setSize(width,height);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
    const arrival=this.pose(true),projector=this.camera.clone();
    projector.position.copy(arrival.position);projector.lookAt(arrival.target);
    projector.setViewOffset(width,height,arrival.offset.x*width,arrival.offset.y*height,width,height);projector.updateMatrixWorld();
    this.backdrop?.calibrate(projector);this.resetCamera();
  }

  private pose(distant:boolean){
    let distance=19.5;
    const target=new THREE.Vector3(...BOARD_FRAME.center);if(distant)target.y-=1.65;
    const direction=distant?new THREE.Vector3(4.5,8.8,17).normalize():this.topView?new THREE.Vector3(.01,1,.005):new THREE.Vector3(.45,15,12.6).normalize();
    if(this.flipped&&!distant){direction.x*=-1;direction.z*=-1;}
    const probe=this.camera.clone();probe.clearViewOffset();
    const edge=distant?6.1:BOARD_FRAME.halfExtent,low=distant?-4.95:0;
    const verticalMargin=distant?.9:Math.max(.35,Math.min(.76,(this.host.clientHeight-295)/this.host.clientHeight));
    for(let step=0;step<64;step++){
      probe.position.copy(direction.clone().multiplyScalar(distance).add(target));probe.lookAt(target);probe.updateMatrixWorld();
      let extent=0;
      for(const x of [-edge,edge])for(const y of [low,BOARD_FRAME.tallestPiece])for(const z of [-edge,edge]){
        const point=new THREE.Vector3(x,y,z).project(probe);extent=Math.max(extent,Math.abs(point.x)/.86,Math.abs(point.y)/verticalMargin);
      }
      if(extent<1)break;distance*=1.045;
    }
    if(distant)distance*=this.camera.aspect<1?1.45:1.8;
    const offset=distant?new THREE.Vector2(this.camera.aspect<1?-.055:-.16,-.23):new THREE.Vector2(0,.015);
    return {position:direction.multiplyScalar(distance).add(target),target,offset};
  }
  private applyOffset(){
    const width=this.host.clientWidth,height=this.host.clientHeight;
    this.camera.setViewOffset(width,height,this.cameraOffset.x*width,this.cameraOffset.y*height,width,height);
  }
  resetCamera(animate=false){
    const {position:to,target,offset}=this.pose(this.distant);
    if(animate&&!this.reducedMotion){
      this.cameraMotion={from:this.camera.position.clone(),to,targetFrom:this.controls.target.clone(),targetTo:target,offsetFrom:this.cameraOffset.clone(),offsetTo:offset,progressFrom:this.cameraProgress,progressTo:this.distant?0:1,start:performance.now()};
      this.controls.enabled=false;
    }else{this.cameraMotion=undefined;this.camera.position.copy(to);this.controls.target.copy(target);this.cameraOffset.copy(offset);this.applyOffset();this.cameraProgress=this.distant?0:1;this.onCameraFrame(this.cameraProgress);this.controls.enabled=!this.distant;}
    this.controls.update();this.needsRender=true;
  }
  setSceneState(paused:boolean,active:boolean){this.scenePaused=paused;this.eventsActive=active;this.needsRender=true;}
  setView(flipped:boolean,topView:boolean,distant=false){
    const animate=this.viewInitialized;this.flipped=flipped;this.topView=topView;this.distant=distant;
    if(this.software)this.scene.traverse(object=>{if(object instanceof SVGObject)object.visible=!distant;});
    this.resetCamera(animate);this.viewInitialized=true;
  }

  update(position:BoardPosition){
    this.needsRender=true;
    this.lastPosition=position;
    const feel=STONE_PIECE_FEEL[position.motion?.pieceType||"p"]||STONE_PIECE_FEEL.p;
    const duration=position.motion?feel.durationMs*(.97+Math.random()*.06):260;
    if(!position.motion)this.pendingImpact=undefined;
    if(position.motion&&position.motion.id!==this.lastMotionId){
      this.lastMotionId=position.motion.id;
      this.pendingImpact={at:performance.now()+(this.software||this.reducedMotion?0:duration),pieceType:position.motion.pieceType};
    }
    for(const [key,template] of this.templates){
      const opacity=position.focusType&&key[1]!==position.focusType? .16:1;
      template.traverse(object=>{if(object instanceof THREE.Mesh){
        if(object.geometry instanceof THREE.CircleGeometry)return;
        const material=object.material as THREE.Material;material.transparent=opacity<1;material.opacity=opacity;material.depthWrite=opacity===1;
        object.castShadow=opacity===1;
      }});
    }
    const next=new Map<string,{piece:BoardPiece;object:THREE.Group}>();
    const targetBySquare=new Map(position.pieces.map(p=>[p.square,p]));
    const available=[...this.pieces.values()].filter(old=>{
      const same=targetBySquare.get(old.piece.square);return !same||same.type!==old.piece.type||same.color!==old.piece.color;
    });
    for(const piece of position.pieces){
      const old=this.pieces.get(piece.square);
      if(old&&old.piece.type===piece.type&&old.piece.color===piece.color){next.set(piece.square,old);continue;}
      const movedIndex=available.findIndex(old=>old.piece.type===piece.type&&old.piece.color===piece.color);
      const moved=movedIndex<0?undefined:available.splice(movedIndex,1)[0];
      const object=moved?.object||this.templates.get(piece.color+piece.type)!.clone(true);
      const target=squarePoint(piece.square);
      if(moved&&!this.reducedMotion&&!this.software){this.animations=this.animations.filter(a=>a.object!==object);this.animations.push({object,from:object.position.clone(),to:target,start:performance.now(),duration,lift:position.motion?feel.lift:.12});}
      else object.position.copy(target);
      object.userData.square=piece.square;this.scene.add(object);next.set(piece.square,{piece,object});
    }
    for(const old of this.pieces.values())if(![...next.values()].some(p=>p.object===old.object)){this.scene.remove(old.object);this.animations=this.animations.filter(a=>a.object!==old.object);}
    this.pieces=next;
    for(const {piece,object} of next.values())object.traverse(part=>{if(part instanceof THREE.Mesh)part.castShadow=!position.focusType||piece.type===position.focusType;});
    for(const [square,tile] of this.squares){
      const selected=square===position.selected,last=square===position.lastMove?.from||square===position.lastMove?.to;
      const check=square===position.checkSquare;
      tile.material.emissive.set(check?"#ba583c":selected?"#c8bb59":last?"#b7bd76":"#000000");
      tile.material.emissiveIntensity=selected?.43:check?.3:last?.17:0;
    }
    for(const child of [...this.dots.children]){this.dots.remove(child);if(child instanceof THREE.Mesh){child.geometry.dispose();(child.material as THREE.Material).dispose();}}
    for(const square of position.destinations){
      const capture=targetBySquare.has(square);
      const geometry=capture?new THREE.RingGeometry(.36,.41,48):new THREE.CircleGeometry(.115,32);
      const dot=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:"#d5db97",transparent:true,opacity:capture?.85:.8,depthWrite:false}));
      dot.rotation.x=-Math.PI/2;dot.position.copy(squarePoint(square));dot.position.y=.255;dot.renderOrder=3;this.dots.add(dot);
    }
  }

  dispose(){
    cancelAnimationFrame(this.frame);this.observer.disconnect();this.disposeEvents();this.controls.dispose();
    this.backdrop?.dispose();
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
    const collect=(object:THREE.Object3D)=>{if(object instanceof THREE.Mesh){geometries.add(object.geometry);for(const m of Array.isArray(object.material)?object.material:[object.material])materials.add(m);}};
    this.scene.traverse(collect);for(const template of this.templates.values())template.traverse(collect);
    for(const material of materials){for(const v of Object.values(material))if(v instanceof THREE.Texture)textures.add(v);material.dispose();}
    geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());this.environmentTarget?.dispose();if(this.renderer instanceof THREE.WebGLRenderer)this.renderer.dispose();this.renderer.domElement.remove();
  }
}
