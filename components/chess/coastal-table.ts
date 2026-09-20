import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { TableAppearance } from "@/lib/chess/presentation";

// Fixed world geometry. Camera movement never changes the table's transform.
export function coastalTable(appearance:TableAppearance, grain:THREE.Texture, software:boolean) {
  const table=new THREE.Group();
  const timber=new THREE.MeshStandardMaterial({color:appearance.timber,map:grain,roughness:appearance.roughness});
  const box=(size:[number,number,number],at:[number,number,number],material:THREE.Material,order=-35)=>{
    const part=new THREE.Mesh(new RoundedBoxGeometry(...size,software?1:3,.055),material);
    part.position.set(...at);part.castShadow=true;part.receiveShadow=true;part.renderOrder=order;table.add(part);return part;
  };
  // Long, individually weathered planks and exposed end grain, like the canoe.
  for(let i=0;i<7;i++){
    const color=new THREE.Color(appearance.top).multiplyScalar([.96,1.03,.99,1.05,.97,1.01,.94][i]);
    const material=new THREE.MeshStandardMaterial({color,map:grain,bumpMap:grain,bumpScale:.035,roughness:appearance.roughness});
    box([1.7,.43,10.7],[(i-3)*1.725,-.34,0],material,-30);
  }
  for(const z of [-4.22,4.22])box([11.35,.63,.44],[0,-.85,z],timber);
  // Two substantial trestles, splayed feet, and a pegged central stretcher.
  for(const z of [-3.55,3.55]){
    box([10.35,.5,.9],[0,-1.02,z],timber);
    for(const side of [-1,1]){
      const leg=box([.68,3.65,.85],[side*3.45,-2.83,z],timber,-40);
      leg.rotation.z=side*.18;
    }
    box([9.05,.36,1.18],[0,-4.72,z],timber,-40);
    box([7.5,.4,.48],[0,-3.60,z],timber,-39);
  }
  box([.65,.64,8.55],[0,-3.58,0],timber,-39);
  const pegMaterial=new THREE.MeshStandardMaterial({color:"#655039",roughness:1});
  for(const x of [-4.45,4.45])for(const z of [-4.22,4.22]){
    const peg=new THREE.Mesh(new THREE.CylinderGeometry(.067,.067,.018,8),pegMaterial);
    peg.position.set(x,-.117,z);peg.renderOrder=-29;table.add(peg);
  }
  // Layered contact shadow also works on devices without WebGL.
  for(let i=0;i<5;i++){
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,software?24:48),new THREE.MeshBasicMaterial({color:"#332c20",transparent:true,opacity:.022+i*.009,depthWrite:false}));
    shadow.rotation.x=-Math.PI/2;shadow.scale.set(7-i*.5,5.6-i*.38,1);
    shadow.position.set(.25,-4.925+i*.001,.35);shadow.renderOrder=-60+i;table.add(shadow);
  }
  return table;
}
