// Seeded perfect mazes: every cell is reachable, with one solution and dead ends.
export type Maze = { cols:number; rows:number; cell:number; width:number; length:number; links:number[][]; route:number[]; seed:number };
const cache=new Map<string,Maze>();
export function createMaze(width:number,length:number,seed=1):Maze{
 const key=`${width}:${length}:${seed}`;const saved=cache.get(key);if(saved)return saved;
 const cols=Math.max(3,Math.round(width/6)),rows=Math.max(5,Math.round(length/6)),cell=Math.min(width/cols,length/rows);
 let state=seed>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const links:number[][]=Array.from({length:cols*rows},()=>[]),seen=new Set<number>(),stack=[Math.floor(cols/2)];seen.add(stack[0]);
 while(stack.length){const a=stack[stack.length-1],x=a%cols,z=Math.floor(a/cols);const options=[x>0?a-1:-1,x<cols-1?a+1:-1,z>0?a-cols:-1,z<rows-1?a+cols:-1].filter(b=>b>=0&&!seen.has(b));if(!options.length){stack.pop();continue;}const b=options[Math.floor(random()*options.length)];links[a].push(b);links[b].push(a);seen.add(b);stack.push(b);}
 const maze:Maze={cols,rows,cell,width,length,links,route:[],seed};maze.route=mazePath(maze,Math.floor(cols/2),(rows-1)*cols+Math.floor(cols/2));
 if(cache.size>32)cache.clear();cache.set(key,maze);return maze;
}
export function mazePoint(m:Maze,id:number){return {x:(id%m.cols+.5)*m.cell-m.cols*m.cell/2,z:m.rows*m.cell/2-(Math.floor(id/m.cols)+.5)*m.cell};}
export function mazeCell(m:Maze,x:number,z:number){const c=Math.max(0,Math.min(m.cols-1,Math.floor((x+m.cols*m.cell/2)/m.cell))),r=Math.max(0,Math.min(m.rows-1,Math.floor((m.rows*m.cell/2-z)/m.cell)));return r*m.cols+c;}
export function mazePath(m:Maze,from:number,to:number):number[]{const parent=new Map<number,number>([[from,-1]]),q=[from];for(let i=0;i<q.length&&!parent.has(to);i++)for(const b of m.links[q[i]])if(!parent.has(b)){parent.set(b,q[i]);q.push(b);}if(!parent.has(to))return [];const route=[to];while(route[route.length-1]!==from)route.push(parent.get(route[route.length-1])!);return route.reverse();}
export function mazeWalls(m:Maze){const walls:{x:number;z:number;w:number;d:number}[]=[];for(let a=0;a<m.links.length;a++){const p=mazePoint(m,a),c=a%m.cols,r=Math.floor(a/m.cols);if(c<m.cols-1&&!m.links[a].includes(a+1))walls.push({x:p.x+m.cell/2,z:p.z,w:.55,d:m.cell+.55});if(r<m.rows-1&&!m.links[a].includes(a+m.cols))walls.push({x:p.x,z:p.z-m.cell/2,w:m.cell+.55,d:.55});}return walls;}
export function blobMazeRoom(room:number,chase:{start:number;type:string}|null){return room===27&&chase?.type==='blob'&&chase.start===25;}
