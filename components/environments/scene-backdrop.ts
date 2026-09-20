import * as THREE from "three";
import type { StudyEnvironment } from "@/lib/environments/registry";

/** A photograph projected onto a sand floor and a distant scenery plane.
 * The arrival camera is the projector. During Study both surfaces stay fixed,
 * giving the moving camera real foreground parallax without a heavy island mesh.
 */
export class SceneBackdrop {
  private texture:THREE.Texture;
  private material:THREE.ShaderMaterial;
  private meshes:THREE.Mesh[]=[];
  private boat?:THREE.Sprite;
  private elapsed=0;
  private projector=new THREE.PerspectiveCamera();
  constructor(scene:THREE.Scene,private environment:StudyEnvironment,onLoad:()=>void){
    this.texture=new THREE.TextureLoader().load(environment.image,onLoad);
    this.texture.colorSpace=THREE.SRGBColorSpace;
    this.material=new THREE.ShaderMaterial({
      uniforms:{image:{value:this.texture},projector:{value:new THREE.Matrix4()},aspect:{value:1},imageAspect:{value:environment.imageAspect},time:{value:0}},
      vertexShader:`varying vec4 photo; varying vec3 world; uniform mat4 projector;
        void main(){vec4 point=modelMatrix*vec4(position,1.);world=point.xyz;photo=projector*point;gl_Position=projectionMatrix*viewMatrix*point;}`,
      fragmentShader:`uniform sampler2D image;uniform float aspect;uniform float imageAspect;uniform float time;varying vec4 photo;varying vec3 world;
        float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
        void main(){
          vec2 uv=photo.xy/photo.w*.5+.5;
          if(aspect>imageAspect)uv.y=(uv.y-.5)*imageAspect/aspect+.5;
          else uv.x=(uv.x-.5)*aspect/imageAspect+(aspect<1.?.42:.5);
          float y=1.-uv.y;
          float shore=.52+.13*uv.x;
          float water=smoothstep(.372,.401,y)*(1.-smoothstep(shore-.024,shore+.012,y));
          water*=smoothstep(.39,.44,uv.x);
          uv.y+=water*(sin(y*190.-time*.65+sin(uv.x*17.))* .0014);
          uv.x+=water*sin(y*110.+time*.4)*.001;
          float leaves=(1.-smoothstep(.10,.32,y));
          uv.x+=leaves*sin(time*.27+uv.y*7.)*.001;
          vec3 color=texture2D(image,clamp(uv,0.,1.)).rgb;
          float edge=smoothstep(0.,.04,uv.x)*smoothstep(0.,.04,uv.y)*smoothstep(0.,.04,1.-uv.x)*smoothstep(0.,.04,1.-uv.y)*step(0.,photo.w);
          vec3 sand=vec3(.60,.50,.37)+noise(world.xz*75.)*.065;
          color=mix(sand,color,edge);
          gl_FragColor=vec4(color,1.);
          #include <colorspace_fragment>
        }`,
      side:THREE.DoubleSide,depthWrite:true,toneMapped:false,
    });
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(280,280),this.material);
    floor.rotation.x=-Math.PI/2;floor.position.y=-4.95;floor.renderOrder=-100;
    const distance=new THREE.Mesh(new THREE.PlaneGeometry(320,170),this.material);
    distance.position.set(0,80,-55);distance.renderOrder=-100;
    this.meshes=[floor,distance];scene.add(...this.meshes);
    const event=environment.ambientEvent;
    if(event){
      const map=new THREE.TextureLoader().load(event.image,onLoad);map.colorSpace=THREE.SRGBColorSpace;
      this.boat=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
      this.boat.center.set(.5,.2);scene.add(this.boat);
    }
  }
  calibrate(camera:THREE.PerspectiveCamera){
    this.projector.copy(camera);this.projector.updateMatrixWorld();
    this.material.uniforms.projector.value.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    this.material.uniforms.aspect.value=camera.aspect;
  }
  update(dt:number,paused:boolean,active:boolean){
    if(!paused)this.material.uniforms.time.value+=dt;
    if(!this.boat||!this.environment.ambientEvent)return;
    if(!paused&&active)this.elapsed+=dt;
    const event=this.environment.ambientEvent,p=(this.elapsed%event.intervalSeconds-event.delaySeconds)/event.durationSeconds;
    this.boat.visible=active&&p>=0&&p<=1;
    if(!this.boat.visible)return;
    // Place the tiny craft in the photographed water using the same world projection.
    const aspect=this.projector.aspect,imageAspect=this.environment.imageAspect;
    let x=.64+p*.27,y=.412;
    if(aspect>imageAspect)y=(y-.5)*aspect/imageAspect+.5;
    else x=(x-(aspect<1?.42:.5))*imageAspect/aspect+.5;
    const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(x*2-1,1-y*2),this.projector);
    const point=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),54.8),new THREE.Vector3());
    if(point)this.boat.position.copy(point);
    this.boat.position.y+=Math.sin(p*Math.PI*12)*.022;
    this.boat.scale.set(3.3,1.12,1);
    this.boat.material.opacity=Math.min(p*12,(1-p)*12,1)*.72;
  }
  dispose(){
    this.texture.dispose();this.material.dispose();this.meshes.forEach(mesh=>{mesh.geometry.dispose();mesh.removeFromParent();});
    if(this.boat){this.boat.material.map?.dispose();this.boat.material.dispose();this.boat.removeFromParent();}
  }
}
