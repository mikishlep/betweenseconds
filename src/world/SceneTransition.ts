/** Screen fades use real time, including when the game world has stopped. */
export class SceneTransition {
 private mode:'idle'|'in'|'out';private elapsed=0;private finish:(()=>void)|null=null;
 constructor(fadeIn=false){this.mode=fadeIn?'in':'idle';}
 get active():boolean{return this.mode!=='idle';}
 get alpha():number{return this.mode==='idle'?0:this.mode==='in'?1-Math.min(1,this.elapsed/.35):Math.min(1,this.elapsed/.45);}
 start(finish:()=>void):boolean{if(this.mode==='out')return false;this.mode='out';this.elapsed=0;this.finish=finish;return true;}
 update(dt:number):void{
  if(this.mode==='idle')return;this.elapsed+=dt;
  if(this.mode==='in'&&this.elapsed>=.35)this.mode='idle';
  else if(this.mode==='out'&&this.elapsed>=.45){const fn=this.finish;this.finish=null;this.mode='idle';fn?.();}
 }
}
