/** Shoelace area for a closed polygon; the final point is connected to the first. Units must already be calibrated. */
export function polygonArea(points:number[][]):number {
 return Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1]},0))/2;
}
