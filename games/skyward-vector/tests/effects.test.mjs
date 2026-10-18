import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../core.js';
import {Effects} from '../effects.js';
const advance=(g,seconds)=>{for(let t=0;t<seconds;t+=.025)g.update(.025);};
test('large visual bombs keep their original precision damage area',()=>{
  const g=new Game();g.start();g.waves=[];g.player.invulnerable=100;
  const target={x:g.reticle.x,y:g.reticle.y};
  const near=g.spawn('turret',target.x,target.y,{fireTimer:100});
  const far=g.spawn('turret',target.x+65,target.y,{fireTimer:100});
  g.dropBomb();advance(g,.5);
  assert.ok(near.hp<=0);assert.equal(far.hp,far.maxHp);
  assert.ok(g.explosions.some(e=>e.kind==='bomb'&&e.r>60));
});
test('visual effects never consume combat randomness and remain bounded',()=>{
  const g=new Game();g.start();const seed=g.seed;
  for(let i=0;i<100;i++)g.explode(i,240,{kind:'air'});
  assert.equal(g.seed,seed);assert.ok(g.explosions.length<=32);
});
test('pause freezes explosions and resume continues them',()=>{
  const g=new Game();g.start();g.explode(240,240);g.pause();
  advance(g,.5);assert.equal(g.explosions[0].age,0);
  g.resume();advance(g,.2);assert.ok(g.explosions[0].age>0);
});
test('fortress destruction continues after victory while combat stays stopped',()=>{
  const g=new Game();g.start(5);const boss=g.spawn('boss',240,145);
  g.damageEnemy(boss,10000);assert.equal(g.state,'victory');
  const before={time:g.time,score:g.score,lives:g.lives,seed:g.seed};
  assert.ok(g.explosions.some(e=>e.kind==='boss'&&e.r>=150));
  advance(g,.5);assert.ok(g.explosions[0].age>.4);
  assert.deepEqual({time:g.time,score:g.score,lives:g.lives,seed:g.seed},before);
  advance(g,4);assert.equal(g.explosions.length,0);
});
test('reduced motion disables screen shake',()=>{
  const g=new Game();g.start();g.explode(240,200,{kind:'boss',r:178});
  const effects=new Effects({reducedMotion:true});
  assert.deepEqual(effects.getShake(g),{x:0,y:0});
});
