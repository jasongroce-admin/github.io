window.MONSTERS_UNLIMITED_ASSETS = {
  buildings: [
    { id: 'tbrickmain-tall', name: 'Main Sheet Tall Tower', src: 'MUimages/generated/tbrickmain-tall.png' },
    { id: 'tbrickmain-slim-a', name: 'Main Sheet Slim A', src: 'MUimages/generated/tbrickmain-slim-a.png' },
    { id: 'tbrickmain-slim-b', name: 'Main Sheet Slim B', src: 'MUimages/generated/tbrickmain-slim-b.png' },
    { id: 'tbrickmain-mid', name: 'Main Sheet Mid Tower', src: 'MUimages/generated/tbrickmain-mid.png' },
    { id: 'tbrickmain-damaged', name: 'Main Sheet Damaged Tower', src: 'MUimages/generated/tbrickmain-damaged.png' },
    { id: 'tbrick-tall', name: 'Red Brick Tall Tower', src: 'MUimages/generated/tbrick-tall.png' },
    { id: 'tbrick-mid-a', name: 'Red Brick Mid A', src: 'MUimages/generated/tbrick-mid-a.png' },
    { id: 'tbrick-mid-b', name: 'Red Brick Mid B', src: 'MUimages/generated/tbrick-mid-b.png' },
    { id: 'tbrick-short-a', name: 'Red Brick Short A', src: 'MUimages/generated/tbrick-short-a.png' },
    { id: 'tbrick-short-b', name: 'Red Brick Short B', src: 'MUimages/generated/tbrick-short-b.png' },
    { id: 'tbrick2-wide-tall', name: 'Wide Brick Tall Tower', src: 'MUimages/generated/tbrick2-wide-tall.png' },
    { id: 'tbrick2-mid-a', name: 'Wide Brick Mid A', src: 'MUimages/generated/tbrick2-mid-a.png' },
    { id: 'tbrick2-mid-b', name: 'Wide Brick Mid B', src: 'MUimages/generated/tbrick2-mid-b.png' },
    { id: 'tbrick2-short-a', name: 'Wide Brick Short A', src: 'MUimages/generated/tbrick2-short-a.png' },
    { id: 'tbrick2-short-b', name: 'Wide Brick Short B', src: 'MUimages/generated/tbrick2-short-b.png' },
    { id: 'tbrick3-tall', name: 'Office Brick Tall Tower', src: 'MUimages/generated/tbrick3-tall.png' },
    { id: 'tbrick3-mid-a', name: 'Office Brick Mid A', src: 'MUimages/generated/tbrick3-mid-a.png' },
    { id: 'tbrick3-mid-b', name: 'Office Brick Mid B', src: 'MUimages/generated/tbrick3-mid-b.png' },
    { id: 'tbrick3-short-a', name: 'Office Brick Short A', src: 'MUimages/generated/tbrick3-short-a.png' },
    { id: 'tbrick3-short-b', name: 'Office Brick Short B', src: 'MUimages/generated/tbrick3-short-b.png' },
    { id: 'three-left', name: 'Three Sheet Left Tower', src: 'MUimages/generated/three-left.png' },
    { id: 'three-center', name: 'Three Sheet Center Tower', src: 'MUimages/generated/three-center.png' },
    { id: 'three-right', name: 'Three Sheet Right Tower', src: 'MUimages/generated/three-right.png' },
    { id: 'three-mid', name: 'Three Sheet Mid Tower', src: 'MUimages/generated/three-mid.png' },
    { id: 'three-narrow', name: 'Three Sheet Narrow Tower', src: 'MUimages/generated/three-narrow.png' }
  ],
  monsters: [
    { id: 'grokkon', name: 'Grokkon', src: 'MUimages/generated/grokkon.png', humanSrc: 'MUimages/generated/grokkon-human.png', morphSrcs: ['MUimages/generated/grokkon-morph-1.png', 'MUimages/generated/grokkon-morph-2.png'], climbSrc: 'MUimages/generated/grokkon-climb.png', attackSrc: 'MUimages/generated/grokkon-attack.png' },
    {
      id: 'lizork',
      name: 'Lizork',
      src: 'MUimages/generated/lizork.png',
      humanSrc: 'MUimages/generated/lizork-human.png',
      morphSrcs: ['MUimages/generated/lizork-morph-1.png', 'MUimages/generated/lizork-morph-2.png'],
      climbSrc: 'MUimages/generated/lizork-climb.png',
      attackSrc: 'MUimages/generated/lizork-attack.png',
      rig: {
        type: 'lizork',
        parts: {
          torsoSide: 'MUimages/generated/lizork3-rig/torso-side.png',
          torsoThree: 'MUimages/generated/lizork3-rig/torso-three.png',
          torsoLean: 'MUimages/generated/lizork3-rig/torso-center.png',
          head: 'MUimages/generated/lizork3-rig/head-side.png',
          headOpen: 'MUimages/generated/lizork3-rig/head-open.png',
          headLookUp: 'MUimages/generated/lizork3-rig/head-front.png',
          headLookDown: 'MUimages/generated/lizork3-rig/head-front.png',
          legsSide: 'MUimages/generated/lizork3-rig/legs-side.png',
          legsThree: 'MUimages/generated/lizork3-rig/legs-run.png',
          legsStep: 'MUimages/generated/lizork3-rig/legs-step.png',
          armNeutral: 'MUimages/generated/lizork3-rig/arm-up.png',
          armNeutralB: 'MUimages/generated/lizork3-rig/arm-climb-side.png',
          armPunch: 'MUimages/generated/lizork3-rig/arm-punch-side.png',
          armPunchMounted: 'MUimages/generated/lizork3-rig/arm-punch-long.png',
          armGrab: 'MUimages/generated/lizork3-rig/arm-climb-reach.png',
          armGrip: 'MUimages/generated/lizork3-rig/arm-climb-bent.png',
          armClimb: 'MUimages/generated/lizork3-rig/arm-climb-bent.png',
          armHang: 'MUimages/generated/lizork3-rig/arm-climb-side.png',
          armReach: 'MUimages/generated/lizork3-rig/arm-punch-mid.png'
        }
      }
    },
    { id: 'thorvak', name: 'Thorvak', src: 'MUimages/generated/thorvak.png', humanSrc: 'MUimages/generated/thorvak-human.png', morphSrcs: ['MUimages/generated/thorvak-morph-1.png', 'MUimages/generated/thorvak-morph-2.png'], climbSrc: 'MUimages/generated/thorvak-climb.png', attackSrc: 'MUimages/generated/thorvak-attack.png' },
    { id: 'kragmor', name: 'Kragmor', src: 'MUimages/generated/kragmor-stand.png', humanSrc: 'MUimages/generated/kragmor-human.png', morphSrcs: ['MUimages/generated/kragmor-morph-1.png', 'MUimages/generated/kragmor-morph-2.png'], climbSrc: 'MUimages/generated/kragmor-climb.png', attackSrc: 'MUimages/generated/kragmor-stand.png' },
    { id: 'vorgath', name: 'Vorgath', src: 'MUimages/generated/vorgath-stand.png', humanSrc: 'MUimages/generated/vorgath-human.png', morphSrcs: ['MUimages/generated/vorgath-morph-1.png', 'MUimages/generated/vorgath-morph-2.png'], climbSrc: 'MUimages/generated/vorgath-climb.png', attackSrc: 'MUimages/generated/vorgath-stand.png' },
    { id: 'skorath', name: 'Skorath', src: 'MUimages/generated/skorath-stand.png', humanSrc: 'MUimages/generated/skorath-human.png', morphSrcs: ['MUimages/generated/skorath-morph-1.png', 'MUimages/generated/skorath-morph-2.png'], climbSrc: 'MUimages/generated/skorath-climb.png', attackSrc: 'MUimages/generated/skorath-stand.png' }
  ],
  humans: [
    { id: 'human-a', name: 'Civilian Blue', src: 'MUimages/generated/human-a.png', kind: 'window' },
    { id: 'human-b', name: 'Civilian Red', src: 'MUimages/generated/human-b.png', kind: 'window' },
    { id: 'human-c', name: 'Civilian Yellow', src: 'MUimages/generated/human-c.png', kind: 'window' },
    { id: 'human-d', name: 'Civilian Green', src: 'MUimages/generated/human-d.png', kind: 'window' },
    { id: 'ground-runner-a', name: 'Runner A', src: 'MUimages/generated/ground-runner-a.png', kind: 'ground' },
    { id: 'ground-runner-b', name: 'Runner B', src: 'MUimages/generated/ground-runner-b.png', kind: 'ground' },
    { id: 'ground-runner-c', name: 'Runner C', src: 'MUimages/generated/ground-runner-c.png', kind: 'ground' }
  ],
  vehicles: [
    { id: 'vehicle-a', name: 'Street Car', src: 'MUimages/generated/vehicle-a.png', damageSrcs: ['MUimages/generated/vehicle-a-d1.png', 'MUimages/generated/vehicle-a-d2.png', 'MUimages/generated/vehicle-a-d3.png'] },
    { id: 'vehicle-b', name: 'Armored Van', src: 'MUimages/generated/vehicle-b.png', damageSrcs: ['MUimages/generated/vehicle-b-d1.png', 'MUimages/generated/vehicle-b-d2.png', 'MUimages/generated/vehicle-b-d3.png'] },
    { id: 'vehicle-c', name: 'Patrol Truck', src: 'MUimages/generated/vehicle-c.png', damageSrcs: ['MUimages/generated/vehicle-c-d1.png', 'MUimages/generated/vehicle-c-d2.png', 'MUimages/generated/vehicle-c-d3.png'] }
  ]
};

window.MONSTERS_UNLIMITED_LEVELS = [
  {
    id: 'peoria-first-bite',
    title: 'Day 1: First Bite',
    city: 'Peoria',
    world: { width: 1440, height: 760, groundY: 650, sky: '#8fb6d9', dusk: '#f6a15f' },
    player: {
      monsterId: 'lizork',
      x: 150,
      health: 100,
      score: 0,
      monster: { w: 154, h: 218, speed: 245, climbSpeed: 215, jump: 585, punchDamage: 1 },
      human: { w: 34, h: 62, speed: 150 }
    },
    buildings: [
      { id: 'hotel', assetId: 'tbrickmain-tall', x: 250, y: 170, w: 180, h: 480, cols: 3, rows: 8, hp: 2, points: 80, structuralLimit: 0.5, fallBias: 'auto' },
      { id: 'bank', assetId: 'tbrick-tall', x: 485, y: 250, w: 150, h: 400, cols: 3, rows: 7, hp: 2, points: 70, structuralLimit: 0.5, fallBias: 'auto' },
      { id: 'tower', assetId: 'tbrick3-tall', x: 700, y: 105, w: 210, h: 545, cols: 3, rows: 9, hp: 3, points: 110, structuralLimit: 0.5, fallBias: 'auto' },
      { id: 'office', assetId: 'tbrick2-wide-tall', x: 980, y: 215, w: 190, h: 435, cols: 3, rows: 7, hp: 2, points: 75, structuralLimit: 0.5, fallBias: 'auto' }
    ],
    humans: [
      { id: 'w1', assetId: 'human-b', kind: 'window', x: 394, y: 488, w: 22, h: 31 },
      { id: 'w2', assetId: 'human-c', kind: 'window', x: 805, y: 463, w: 21, h: 30 },
      { id: 'w3', assetId: 'human-d', kind: 'window', x: 1141, y: 484, w: 20, h: 29 },
      { id: 'g1', assetId: 'ground-runner-a', kind: 'ground', x: 610, y: 596, w: 46, h: 54, dir: -1 },
      { id: 'g2', assetId: 'ground-runner-b', kind: 'ground', x: 930, y: 596, w: 40, h: 54, dir: 1 }
    ],
    vehicles: [
      { id: 'v1', assetId: 'vehicle-a', x: 1210, y: 606, dir: -1, speed: 72, health: 3 },
      { id: 'v2', assetId: 'vehicle-b', x: 80, y: 610, dir: 1, speed: 58, health: 3 }
    ]
  }
];
