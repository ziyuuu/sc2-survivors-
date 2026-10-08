/** Clockwise, with detection at the centre and the roster fold below it. */
export function commandPositions(ids:readonly string[]){
 const ring=[[50,0],[100,0],[100,50],[100,100],[0,100],[0,50],[0,0]];
 let next=0;return ids.map(id=>({id,point:id==='detection'?[50,50]:ring[next++]}));
}
