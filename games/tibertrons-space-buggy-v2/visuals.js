import * as THREE from './vendor/three.module.js';
import { terrainBaseHeight, terrainHeight, terrainSlope } from './terrain.js';

// Purely visual layer: gameplay owns all positions, collision, and UI.
const WORLDS = [
  { sky: 0x07111c, fog: 0x17202a, land: 0x6b4036, rock: 0xa05c49, glow: 0xff9a5b, planet: 0xdc6e45 },
  { sky: 0x10091d, fog: 0x251639, land: 0x4d355e, rock: 0x8759a7, glow: 0xea93ff, planet: 0x9d67cc },
  { sky: 0x031a20, fog: 0x10383e, land: 0x18555b, rock: 0x258b8c, glow: 0x69ffe1, planet: 0x56c9bd },
  { sky: 0x061229, fog: 0x102d52, land: 0x214a75, rock: 0x3e7eb6, glow: 0x74bdff, planet: 0x4f8fe3 },
];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const key = (o, i) => o?.id ?? o?.x ?? i;
function atlasMaterial(map, column, row, columns, rows, opacity = 1) {
  return new THREE.ShaderMaterial({ uniforms: { map: { value: map }, cell: { value: new THREE.Vector2(column, row) }, grid: { value: new THREE.Vector2(columns, rows) }, opacity: { value: opacity } }, vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'uniform sampler2D map;uniform vec2 cell,grid;uniform float opacity;varying vec2 vUv;void main(){vec2 uv=vec2((vUv.x+cell.x)/grid.x,(vUv.y+grid.y-1.0-cell.y)/grid.y);vec4 c=texture2D(map,uv);gl_FragColor=vec4(c.rgb,c.a*opacity);if(gl_FragColor.a<0.03)discard;}', transparent: true, depthWrite: false, side: THREE.DoubleSide });
}
function tiledAtlasMaterial(map, column, row, columns, rows, craters = [], pathTint = 0x704735) {
  const data = craters.map(c => new THREE.Vector3(c.x, (c.width || 3) * .5, 2.7)); while (data.length < 3) data.push(new THREE.Vector3(-999, 0, 0));
  return new THREE.ShaderMaterial({ uniforms: { map: { value: map }, cell: { value: new THREE.Vector2(column, row) }, grid: { value: new THREE.Vector2(columns, rows) }, craterA: { value: data[0] }, craterB: { value: data[1] }, craterC: { value: data[2] }, pathTint: { value: new THREE.Color(pathTint) } }, vertexShader: 'varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'uniform sampler2D map;uniform vec2 cell,grid;uniform vec3 craterA,craterB,craterC;uniform vec3 pathTint;varying vec2 vUv;varying vec3 vWorld;bool inCrater(vec3 c){return abs(vWorld.x-c.x)<c.y&&abs(vWorld.z+.5)<c.z;}void main(){if(inCrater(craterA)||inCrater(craterB)||inCrater(craterC))discard;vec2 tiled=abs(fract(vUv*vec2(6.5,2.5))*2.0-1.0);vec2 uv=vec2((tiled.x+cell.x)/grid.x,(tiled.y+grid.y-1.0-cell.y)/grid.y);vec4 soil=texture2D(map,uv);float center=-.5+sin(vWorld.x*.075)*.42+sin(vWorld.x*.021+1.7)*.23;float lane=1.0-smoothstep(1.55,3.1,abs(vWorld.z-center));float grain=.78+.22*sin(vWorld.x*2.7+vWorld.z*4.1);soil.rgb=mix(soil.rgb,pathTint, lane*grain*.36);gl_FragColor=soil;}', side: THREE.DoubleSide });
}

function dispose(node) {
  node.traverse(o => {
    o.geometry?.dispose();
    const m = o.material;
    (Array.isArray(m) ? m : [m]).forEach(v => v?.dispose?.());
  });
}
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .62, metalness: .15, ...opts });
}
function glow(color, intensity = 2) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: .25 });
}

export class Visuals {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, .1, 250);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.scene.add(new THREE.HemisphereLight(0xaeefff, 0x101018, 2.0));
    this.sun = new THREE.DirectionalLight(0xffe2c6, 2.6); this.sun.position.set(-16, 22, 14); this.scene.add(this.sun);
    this.fill = new THREE.PointLight(0x74eaff, 4, 28); this.fill.position.set(2, 4, 5); this.scene.add(this.fill);
    this.clock = 0; this.phase = 'cockpit'; this.planetIndex = 0;
    this.loader = new THREE.TextureLoader();
    this.damageAtlas = this.loadTexture('assets/generated/damage-atlas.png');
    this.landscapeAtlas = this.loadTexture('assets/generated/planet-landscape-atlas.png');
    this.groundAtlas = this.loadTexture('assets/generated/planet-ground-atlas.png');
    this.boulderAtlas = this.loadTexture('assets/generated/boulder-damage-atlas.png');
    this.dynamic = { enemies: new Map(), shots: new Map(), particles: new Map() };
    this.resize(); this.cockpit(0);
  }
  loadTexture(url) { const texture = this.loader.load(url); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping; return texture; }

  resize() {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  clear() {
    dispose(this.root); this.root.clear(); this.root.rotation.set(0, 0, 0);
    this.dynamic = { enemies: new Map(), shots: new Map(), particles: new Map() };
  }

  add(g, geo, material, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); g.add(m); return m;
  }

  cockpit(planetIndex = 0) {
    this.clear(); this.phase = 'cockpit'; this.planetIndex = planetIndex % 4;
    const p = WORLDS[this.planetIndex]; this.scene.background = new THREE.Color(0x020611); this.scene.fog = new THREE.Fog(0x020611, 35, 100);
    this.makeStars();
    const planet = this.add(this.root, new THREE.SphereGeometry(8, 42, 28), mat(p.planet, { roughness: .9 }), 8, 3, -24);
    planet.rotation.z = -.28;
    const haze = this.add(this.root, new THREE.SphereGeometry(8.18, 40, 24), new THREE.MeshBasicMaterial({ color: p.glow, transparent: true, opacity: .08, side: THREE.BackSide }), 8, 3, -24);
    haze.scale.set(1, .98, 1);
    const ring = this.add(this.root, new THREE.TorusGeometry(9.8, .12, 8, 64), glow(p.glow, 1.1), 8, 3, -24); ring.rotation.x = Math.PI / 2.32;
    const shell = new THREE.Group(); this.root.add(shell);
    const dark = mat(0x07101b, { metalness: .8, roughness: .28 }), frame = mat(0x25384b, { metalness: .75 });
    this.add(shell, new THREE.BoxGeometry(28, .9, 1), dark, 0, -3.6, 2);
    this.add(shell, new THREE.BoxGeometry(1.1, 15, 1), dark, -10.4, 2.5, 1);
    this.add(shell, new THREE.BoxGeometry(1.1, 15, 1), dark, 10.4, 2.5, 1);
    this.add(shell, new THREE.BoxGeometry(22, .6, 1), dark, 0, 8, 1);
    [-7, 0, 7].forEach(x => { const rib = this.add(shell, new THREE.BoxGeometry(.35, 13, .45), frame, x, 2.4, .5); rib.rotation.z = -x * .035; });
    for (let x = -7.5; x <= 7.5; x += 3) {
      this.add(shell, new THREE.BoxGeometry(2.35, .38, 1.1), mat(0x122331, { metalness: .7 }), x, -2.95, .5);
      this.add(shell, new THREE.BoxGeometry(1.4, .08, .06), glow(p.glow, 2.6), x, -2.72, -.08);
    }
    this.camera.position.set(0, 2.1, 13); this.camera.lookAt(1.2, 2.2, -18);
  }

  makeStars() {
    const a = [], c = [];
    for (let i = 0; i < 340; i++) {
      const x = ((i * 47) % 199) - 99, y = ((i * 71) % 70) - 10, z = -25 - ((i * 113) % 100);
      a.push(x, y, z); const v = .45 + (i % 4) * .16; c.push(v, v, 1);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    this.root.add(new THREE.Points(g, new THREE.PointsMaterial({ size: .17, vertexColors: true, transparent: true, opacity: .9, sizeAttenuation: true })));
  }

  mission(planetIndex = 0, deposits = [], craters = [], rocks = []) {
    this.clear(); this.phase = 'mission'; this.planetIndex = planetIndex % 4;
    const p = WORLDS[this.planetIndex]; this.palette = p;
    this.scene.background = new THREE.Color(p.sky); this.scene.fog = new THREE.Fog(p.fog, 44, 128); this.makeStars();
    this.backdrop = new THREE.Mesh(new THREE.PlaneGeometry(154, 80), atlasMaterial(this.landscapeAtlas, this.planetIndex % 2, Math.floor(this.planetIndex / 2), 2, 2));
    this.backdrop.position.set(3.3, 18, -58); this.backdrop.renderOrder = -2; this.root.add(this.backdrop);
    const sky = new THREE.Group(); this.root.add(sky);
    this.makeGround(p, craters); this.makeRoad(p, craters); this.makeScenery(p, craters); this.makeRover(p); this.makeDeposits(deposits, p); this.makeRocks(rocks, p); this.makeExtraction(p);
    this.camera.position.set(4.3, 2.6, 15); this.camera.lookAt(4, 1.5, -1);
  }

  makeMountains(p) {
    // Two joined, seeded silhouettes read as distant mountain ranges rather
    // than an array of individual floating props.
    const ridge = (z, seed, color, heightScale) => {
      const points = 34, verts = [], indices = [];
      for (let i = 0; i < points; i++) {
        const x = -42 + i * 6.1;
        const wave = Math.sin(i * 1.79 + seed) * 1.6 + Math.sin(i * .51 + seed * 3) * 1.1;
        const h = Math.max(2.2, 5.5 + wave + ((i * 17 + seed * 11) % 5) * .72) * heightScale;
        verts.push(x, -.2, z, x, h, z + Math.sin(i * 2.2) * .7);
        if (i) indices.push((i - 1) * 2, i * 2, i * 2 + 1, (i - 1) * 2, i * 2 + 1, (i - 1) * 2 + 1);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setIndex(indices); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat(color, { roughness: .96, side: THREE.DoubleSide })); this.root.add(m);
    };
    ridge(-19, 3, p.rock, .92); ridge(-33, 9, p.land, 1.38);
  }

  makeGround(p, craters = []) {
    // A gently irregular, vertex-coloured soil sheet replaces the flat box field.
    const width = 180, depth = 66, sx = 144, sz = 132, geo = new THREE.PlaneGeometry(width, depth, sx, sz);
    geo.rotateX(-Math.PI / 2); const pos = geo.attributes.position, colors = [];
    const base = new THREE.Color(p.land), dark = base.clone().offsetHSL(0, -.08, -.13), light = base.clone().offsetHSL(.01, -.1, .07);
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), worldX = x + 50, worldZ = z - 23, crater = craters.some(c => Math.abs(worldX - c.x) < (c.width || 3) * .52 && Math.abs(worldZ + .5) < 2.75); pos.setY(i, crater ? -1.35 : terrainHeight(this.planetIndex, worldX)); const mix = ((Math.sin(x * 1.7 + z * 2.1) + 1) * .5); const c = dark.clone().lerp(light, mix * .46 + .1); colors.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, tiledAtlasMaterial(this.groundAtlas, this.planetIndex % 2, Math.floor(this.planetIndex / 2), 2, 2, craters, dark)); terrain.position.set(50, 0, -23); this.root.add(terrain);
  }

  makeRoad(p, craters) {
    const road = new THREE.Group(); this.root.add(road); this.craterMarkers = craters || [];
    // The travel lane is a feathered tint in the ground shader.  This group only
    // carries crater hazards and markers, so it can never form a raised strip.
    (craters || []).forEach(c => {
      const w = c.width || 4, craterSoil = new THREE.Color(p.rock).offsetHSL(0, -.12, -.16), groundY = terrainHeight(this.planetIndex, c.x), bowl = this.add(road, new THREE.CylinderGeometry(w * .55, w * .76, .09, 32), mat(craterSoil, { roughness: 1 }), c.x, groundY - 1.17, -.5); bowl.scale.z = .57;
      const edge = this.add(road, new THREE.TorusGeometry(w * .6, .075, 8, 32), glow(p.glow, .85), c.x, groundY + .03, -.48); edge.rotation.x = Math.PI / 2; edge.scale.y = .58;
      [-1, 1].forEach(s => { const beaconY = terrainHeight(this.planetIndex, c.x + s * (w * .7)) + .36; const beacon = this.add(road, new THREE.CylinderGeometry(.07, .1, .7, 8), glow(p.glow, 1.05), c.x + s * (w * .7), beaconY, 2.15); this.add(road, new THREE.SphereGeometry(.13, 9, 7), glow(p.glow, 1.45), beacon.position.x, beaconY + .39, 2.15); });
    });
  }

  makeScenery(p, craters = []) {
    const g = new THREE.Group(); this.root.add(g);
    for (let i = -10; i < 55; i++) {
      const x = i * 2.9 + ((i * 17) % 3), side = i % 2 ? -1 : 1, z = side * (3.8 + (i % 4) * .9);
      if (Math.abs(x - 93) < 3.5 || craters.some(c => Math.abs(x - c.x) < (c.width || 3) * .5 + 2)) continue;
      const s = .25 + (i % 5) * .09, ground = terrainHeight(this.planetIndex, x);
      const rock = new THREE.Mesh(new THREE.PlaneGeometry(s * 1.6, s * 1.25), atlasMaterial(this.boulderAtlas, 0, 0, 4, 2)); rock.position.set(x, ground + s * .55, z); g.add(rock);
      if (i % 4 === 0) { [-.18, 0, .18].forEach((dx, n) => { const frondX = x + .38 + dx, frond = this.add(g, new THREE.ConeGeometry(.09 + n * .018, .48 + n * .14, 5), glow(p.glow, .65), frondX, terrainHeight(this.planetIndex, frondX) + .1 + n * .04, z + (n - 1) * .12); frond.rotation.z = (n - 1) * .32; }); }
    }
  }

  makeRover(p) {
    const r = this.rover = new THREE.Group(); this.root.add(r); r.position.y = .03; this.wheels = []; this.roverRide = 0; this.roverTilt = 0; this.roverAccel = 0; this.lastRoverVx = 0;
    const body = this.roverBody = new THREE.Group(); r.add(body);
    const chassis = this.add(body, new THREE.BoxGeometry(2.75, .32, 1.18), mat(0x152534, { metalness: .8, roughness: .32 }), 0, .83, 0); this.roverHull = chassis.material;
    chassis.rotation.z = -.035;
    const wedge = new THREE.Shape(); wedge.moveTo(.55, .78); wedge.lineTo(1.7, .9); wedge.lineTo(1.42, 1.42); wedge.lineTo(.55, 1.36); wedge.closePath();
    const nose = this.add(body, new THREE.ExtrudeGeometry(wedge, { depth: 1, bevelEnabled: true, bevelSegments: 1, bevelSize: .05, bevelThickness: .05 }), mat(0x233c4c, { metalness: .65, roughness: .3 }), 0, 0, -.5);
    const cabin = this.add(body, new THREE.BoxGeometry(1.18, .82, 1.0), new THREE.MeshStandardMaterial({ color: 0x4be8ff, emissive: 0x0b809f, emissiveIntensity: .5, metalness: .75, roughness: .1, transparent: true, opacity: .78 }), -.28, 1.47, 0); this.roverCabin = cabin.material;
    cabin.rotation.z = -.18;
    const roof = this.add(body, new THREE.BoxGeometry(1.42, .12, 1.12), mat(0x142737, { metalness: .8 }), -.3, 1.92, 0);
    [-.85, 0, .85].forEach(x => [-.59, .59].forEach(z => {
      const arm = this.add(body, new THREE.BoxGeometry(.82, .08, .08), mat(0x68879b, { metalness: .8 }), x, .56, z); arm.rotation.z = x < 0 ? -.3 : .28;
    }));
    [-.88, 0, .88].forEach(x => [-.64, .64].forEach(z => {
      const wheel = new THREE.Group(); r.add(wheel); wheel.position.set(x, .43, z); wheel.userData.axleX = x; this.add(wheel, new THREE.CylinderGeometry(.43, .43, .22, 18), mat(0x090d12, { roughness: .8 }), 0, 0, 0).rotation.x = Math.PI / 2;
      for (let n = 0; n < 10; n++) { const a = n * Math.PI * 2 / 10, tread = this.add(wheel, new THREE.BoxGeometry(.13, .055, .245), mat(0x33424b, { roughness: .94 }), Math.cos(a) * .43, Math.sin(a) * .43, 0); tread.rotation.z = a; }
      const rim = this.add(wheel, new THREE.CylinderGeometry(.22, .22, .235, 12), glow(0x5ecfea, .65), 0, 0, 0); rim.rotation.x = Math.PI / 2;
      for (let n = 0; n < 6; n++) { const spoke = this.add(wheel, new THREE.BoxGeometry(.055, .31, .248), mat(0xb2e5eb, { metalness: .85, roughness: .22 }), 0, .12, 0); spoke.rotation.z = n * Math.PI / 3; }
      this.wheels.push(wheel);
    }));
    const mast = this.add(body, new THREE.CylinderGeometry(.06, .08, .65, 8), mat(0x37566a, { metalness: .8 }), -.76, 2.22, 0); mast.rotation.z = -.22;
    const gunBase = this.add(body, new THREE.BoxGeometry(.38, .17, .48), mat(0x1a3343, { metalness: .85 }), .42, 1.54, 0); gunBase.rotation.z = -.08;
    const barrel = this.add(body, new THREE.CylinderGeometry(.09, .12, 1.13, 10), mat(0x334c5b, { metalness: .9 }), .73, 1.68, 0); barrel.rotation.z = Math.PI / 2;
    this.muzzle = this.add(body, new THREE.SphereGeometry(.13, 10, 8), glow(p.glow, 2.5), 1.29, 1.68, 0);
    const up = this.add(body, new THREE.CylinderGeometry(.06, .09, .82, 8), mat(0x334c5b, { metalness: .9 }), .2, 2.16, 0); up.rotation.z = -.52;
    [[1.52, 1.15, .43], [1.52, 1.15, -.43]].forEach(a => this.add(body, new THREE.SphereGeometry(.12, 10, 8), glow(0xf8f3c9, 3), ...a));
    const scars = this.roverScars = new THREE.Group(); body.add(scars); [[-.1, 1.06, .61, -.38], [.18, 1.17, .61, .52], [.36, .98, .61, -.24]].forEach(a => { const crack = this.add(scars, new THREE.BoxGeometry(.42, .035, .025), mat(0x170d10, { roughness: .95 }), a[0], a[1], a[2]); crack.rotation.z = a[3]; }); scars.visible = false;
    this.roverCore = this.add(body, new THREE.SphereGeometry(.115, 10, 8), glow(0xff5637, 3.2), -.22, 1.1, .64); this.roverCore.visible = false;
    this.roverSmoke = this.add(body, new THREE.SphereGeometry(.23, 10, 8), new THREE.MeshBasicMaterial({ color: 0x9eb4bc, transparent: true, opacity: .5 }), -.7, 2.14, .42); this.roverSmoke.visible = false;
    this.roverSpark = this.add(body, new THREE.SphereGeometry(.09, 8, 6), glow(0xffbd4a, 3), .38, 1.12, .74); this.roverSpark.visible = false;
  }

  makeDeposits(deposits, p) {
    this.depositNodes = new Map();
    (deposits || []).forEach((d, i) => { const g = new THREE.Group(); this.root.add(g); g.position.set(d.x + 1.75, terrainHeight(this.planetIndex, d.x + 1.75), -1.3); this.depositNodes.set(key(d, i), g); g.userData = { crystals: new THREE.Group() }; g.add(g.userData.crystals);
      this.add(g, new THREE.CylinderGeometry(.82, 1.02, .12, 24), mat(0x182b38, { metalness: .42, roughness: .7 }), 0, -.05, 0);
      const ring = this.add(g, new THREE.TorusGeometry(1.28, .06, 8, 32), glow(p.glow, 1.4), 0, .03, 0); ring.rotation.x = Math.PI / 2;
      const beacon = this.add(g, new THREE.CylinderGeometry(.05, .09, .82, 8), glow(p.glow, 1.4), 0, .47, .2); g.userData.beacon = beacon;
      for (let n = 0; n < 5; n++) { const c = this.add(g.userData.crystals, new THREE.OctahedronGeometry(.25 + n % 2 * .12), glow(p.glow, 1.3), (n - 2) * .27, .35 + (n % 3) * .2, ((n * 7) % 3 - 1) * .22); c.rotation.z = n * .38; }
    });
  }

  makeRocks(rocks, p) { this.rockNodes = new Map(); (rocks || []).forEach((r, i) => { const g = new THREE.Group(), large = r.size === 'large'; g.position.set(r.x, terrainBaseHeight(this.planetIndex, r.x), -.12); this.root.add(g); const sprite = new THREE.Mesh(new THREE.PlaneGeometry(large ? 2.15 : 1.45, large ? 2.1 : 1.65), atlasMaterial(this.boulderAtlas, 0, large ? 1 : 0, 4, 2)); sprite.position.y = large ? .96 : .72; g.add(sprite); g.userData = { sprite, large }; this.rockNodes.set(key(r, i), g); }); }
  makeExtraction(p) { const g = this.extract = new THREE.Group(); g.position.set(93, terrainHeight(this.planetIndex, 93), -1); this.root.add(g); const pad = this.add(g, new THREE.CylinderGeometry(2.1, 2.35, .18, 32), mat(0x15222f, { metalness: .8 }), 0, -.04, 0); const ring = this.add(g, new THREE.TorusGeometry(1.75, .09, 8, 36), glow(p.glow, 1.7), 0, .1, 0); ring.rotation.x = Math.PI / 2; [-1, 1].forEach(s => this.add(g, new THREE.BoxGeometry(.12, 1.5, .12), glow(p.glow, 1.5), s * 2.1, .72, 0)); this.beam = this.add(g, new THREE.CylinderGeometry(.8, 1.5, 16, 24, 1, true), new THREE.MeshBasicMaterial({ color: p.glow, transparent: true, opacity: .09, side: THREE.DoubleSide }), 0, 8, 0); }

  enemyNode(e) { const g = new THREE.Group(), flyer = e.kind !== 'crawler', drone = e.kind === 'drone'; this.root.add(g); const sprite = new THREE.Mesh(new THREE.PlaneGeometry(drone ? 2.35 : flyer ? 1.6 : 2.05, drone ? 1.55 : flyer ? 1.15 : 1.5), atlasMaterial(this.damageAtlas, 0, flyer ? 1 : 2, 3, 3)); sprite.position.z = .12; g.add(sprite); const ember = this.add(g, new THREE.SphereGeometry(drone ? .1 : .07, 8, 6), glow(drone ? 0x9b75ff : 0xff9a4b, 2.5), -.28, -.22, .16); ember.visible = false; g.userData = { sprite, flyer, drone, ember }; return g; }
  projectileNode(enemy) { return this.add(this.root, new THREE.SphereGeometry(.105, 9, 8), glow(enemy ? 0xff617a : this.palette.glow, 3)); }
  particleNode() { return this.add(this.root, new THREE.OctahedronGeometry(.08), glow(this.palette.glow, 3)); }

  sync(map, items, factory, apply) {
    const seen = new Set(); (items || []).forEach((v, i) => { const k = key(v, i); seen.add(k); let n = map.get(k); if (!n) { n = factory(v); map.set(k, n); } apply(n, v, i); });
    map.forEach((n, k) => { if (!seen.has(k)) { n.parent?.remove(n); dispose(n); map.delete(k); } });
  }

  update(state = {}, dt = .016) {
    this.clock += dt; const mode = String(state.mode || state.phase || this.phase).toLowerCase();
    if (this.phase === 'cockpit') { this.root.rotation.y = Math.sin(this.clock * .09) * .025; return; }
    const x = state.x || 0, y = state.y || 0, vx = state.vx || 0;
    const surface = state.surface ?? terrainHeight(this.planetIndex, x, state.rocks || []);
    const rear = terrainHeight(this.planetIndex, x - .88, state.rocks || []), front = terrainHeight(this.planetIndex, x + .88, state.rocks || []);
    const rideTarget = (rear + front) * .5;
    const settle = Math.min(1, dt * 9);
    this.roverRide += (rideTarget - this.roverRide) * settle;
    this.rover.position.set(x, this.roverRide + y, 0);
    const acceleration = dt > 0 ? (vx - this.lastRoverVx) / dt : 0; this.lastRoverVx = vx;
    this.roverAccel += (clamp(acceleration * .003, -.028, .028) - this.roverAccel) * Math.min(1, dt * 8);
    const tiltTarget = clamp(Math.atan2(front - rear, 1.76) - this.roverAccel, -.26, .26);
    this.roverTilt += (tiltTarget - this.roverTilt) * Math.min(1, dt * 7);
    this.roverBody.rotation.z = this.roverTilt;
    const distance = state.driveDistance || 0;
    this.wheels.forEach(w => { if (y > .01) w.position.y += (.43 - w.position.y) * Math.min(1, dt * 10); else { const wheelGround = terrainHeight(this.planetIndex, x + w.userData.axleX, state.rocks || []); w.position.y = wheelGround - this.roverRide + .43; } w.rotation.z = -distance / .43; });
    this.muzzle.scale.setScalar(1 + Math.sin(this.clock * 11) * .12);
    const inv = (state.invulnerable || 0) > 0; this.rover.visible = !inv || Math.floor(this.clock * 14) % 2 === 0;
    const damaged = state.health < 5;
    this.roverHull.color.setHex(damaged ? 0x543238 : 0x152534); this.roverHull.emissive.setHex(state.health < 3 ? 0x351312 : 0x000000);
    this.roverCabin.emissiveIntensity = state.health < 3 ? .18 : .5;
    this.roverScars.visible = damaged; this.roverCore.visible = state.health < 3; this.roverCore.scale.setScalar(1 + Math.sin(this.clock * 13) * .16);
    this.roverSmoke.visible = state.health < 3; this.roverSmoke.position.y = 2.1 + Math.sin(this.clock * 3) * .18; this.roverSpark.visible = damaged && Math.sin(this.clock * 15) > .25;
    const camX = state.cameraX ?? ((mode === 'extract' || mode === 'evac') ? (state.extractionX ?? x) : x + 3.8);
    this.camera.position.x += (camX + 4.2 - this.camera.position.x) * Math.min(1, dt * 3.2);
    this.camera.position.y += (2.6 + surface + y * .18 - this.camera.position.y) * Math.min(1, dt * 2.3);
    this.camera.lookAt(camX + 3.3, 1.5 + surface + y * .3, -1.2);
    if (this.backdrop) this.backdrop.position.x = camX + 3.3 + (x - camX) * .08;
    this.sync(this.dynamic.enemies, state.enemies, e => this.enemyNode(e), (n, e) => { const flyer = n.userData.flyer, maxHp = e.maxHp || 3, stage = e.hp >= maxHp ? 0 : e.hp > maxHp * .5 ? 1 : 2; n.position.set(e.x, e.y, .1); n.rotation.z = flyer ? Math.sin(this.clock * (n.userData.drone ? 1.5 : 2.4) + (e.phase || 0)) * .08 : Math.sin(this.clock * 5 + e.x) * .035; n.userData.sprite.material.uniforms.cell.value.set(stage, flyer ? 1 : 2); n.userData.ember.visible = stage > 0 && Math.sin(this.clock * 15 + e.x) > .2; });
    this.sync(this.dynamic.shots, state.projectiles, e => this.projectileNode(e.enemy), (n, e) => { n.position.set(e.x, e.y, e.enemy ? .15 : .05); n.scale.setScalar(1 + Math.sin(this.clock * 25) * .22); });
    this.sync(this.dynamic.particles, state.particles, () => this.particleNode(), (n, e) => { n.position.set(e.x, e.y, .1); n.rotation.y += dt * 5; n.scale.setScalar(clamp(e.life ?? 1, .1, 1.6)); });
    (state.deposits || []).forEach((d, i) => { const n = this.depositNodes?.get(key(d, i)); if (n) { const f = d.initial ? clamp((d.remaining ?? d.initial) / d.initial, 0, 1) : 1; n.userData.crystals.scale.setScalar(.25 + f * .75); n.userData.crystals.visible = f > .01; n.userData.beacon.material.emissiveIntensity = d.active ? .35 + f * 1.3 : .08 + f * .18; n.userData.crystals.rotation.y += dt * .5; } });
    (state.rocks || []).forEach((d, i) => { const n = this.rockNodes?.get(key(d, i)); if (n) { const maxHp = d.maxHp || 3, stage = d.hp >= maxHp ? 0 : d.hp > maxHp * .5 ? 1 : d.hp > 0 ? 2 : 3; n.position.y = terrainBaseHeight(this.planetIndex, d.x); n.userData.sprite.material.uniforms.cell.value.set(stage, n.userData.large ? 1 : 0); n.userData.sprite.position.y = stage === 3 ? .09 : n.userData.large ? .96 : .72; n.userData.sprite.scale.y = stage === 3 ? .18 : 1; } });
    if (this.extract) { const active = mode === 'extract' || mode === 'evac' || mode === 'launch'; this.beam.visible = active; this.beam.material.opacity = active ? .075 + Math.sin(this.clock * 6) * .025 : 0; this.beam.scale.y = 1 + (state.launchProgress || 0) * .3; }
    const transitProgress = state.landingProgress ?? state.launchProgress ?? 0;
    if (mode === 'landing') this.rover.position.y += 3 * (1 - clamp(transitProgress, 0, 1));
    if (mode === 'launch') this.rover.position.y += (state.launchProgress ?? 0) * 15;
  }

  render() { this.renderer.render(this.scene, this.camera); }
  dispose() { this.clear(); this.renderer.dispose(); }
}
