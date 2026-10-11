import {Box3,Matrix4,Mesh,Object3D,Vector3} from 'three';
import {ConvexHull} from 'three/addons/math/ConvexHull.js';
/** Read-only hull of the original visible physical body in its normalized reference pose.
 * Particle helpers and hidden skins never determine the overhead label position. */
export function bodyOutline(root:Object3D,normalization:Matrix4){
 root.updateMatrixWorld(true);const points:Vector3[]=[];
 root.traverse(node=>{if(!(node instanceof Mesh)||node.userData.sc2Role!=='body'||!(Array.isArray(node.material)?node.material:[node.material]).some(m=>m.visible))return;
  for(let parent:Object3D|null=node;parent;parent=parent.parent){if(!parent.visible)return;if(parent===root)break;}
  for(let i=0;i<node.geometry.attributes.position.count;i++)points.push(node.getVertexPosition(i,new Vector3()).applyMatrix4(node.matrixWorld).applyMatrix4(normalization));
 });
 if(points.length<4)return points;
 const hull=new ConvexHull().setFromPoints(points),vertices=new Set<Vector3>();for(const face of hull.faces){let edge=face.edge;do{vertices.add(edge.head().point);edge=edge.next;}while(edge!==face.edge);}
 if(vertices.size)return [...vertices];
 const box=new Box3().setFromPoints(points);return [box.min,box.max];
}
