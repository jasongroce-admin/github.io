/* Connected monster poses. Coordinates below are sockets in a 154 x 218 body,
 * never independent world offsets. A torso turn carries its neck and shoulder
 * with it; every limb rotates at its attachment point. */
(() => {
  'use strict';
  const boundsCache = new WeakMap();
  const atlasCache = new WeakMap();
  const walkCache = new WeakMap();
  const BODY = { w: 154, h: 218 };
  const HIP = { x: 95, y: 158 };
  const TORSO = { scale: 0.76, anchor: [0.49, 0.96], neck: [0.37, 0.055], shoulder: [0.20, 0.37] };
  const ATTACK_SECONDS = 0.22;

  function imageFor(images, src) {
    return src && (typeof images?.get === 'function' ? images.get(src) : images?.[src]);
  }

  // Pink-keyed images arrive from the existing loader. Cache alpha bounds once
  // so transparent sheet margins cannot move a joint or resize a pose.
  function bounds(img) {
    if (boundsCache.has(img)) return boundsCache.get(img);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    let box = { x: 0, y: 0, w, h };
    try {
      const scratch = document.createElement('canvas');
      scratch.width = w;
      scratch.height = h;
      const context = scratch.getContext('2d', { willReadFrequently: true });
      context.drawImage(img, 0, 0);
      const pixels = context.getImageData(0, 0, w, h).data;
      // Some supplied pieces contain isolated yellow registration marks below
      // the feet. The connected silhouette defines bounds, not those marks.
      const seen = new Uint8Array(w * h);
      const components = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const start = y * w + x;
          if (seen[start] || pixels[start * 4 + 3] < 32) continue;
          const pending = [start];
          seen[start] = 1;
          const component = { count: 0, left: x, top: y, right: x, bottom: y };
          while (pending.length) {
            const index = pending.pop(), px = index % w, py = Math.floor(index / w);
            component.count++;
            component.left = Math.min(component.left, px); component.right = Math.max(component.right, px);
            component.top = Math.min(component.top, py); component.bottom = Math.max(component.bottom, py);
            const adjacent = [];
            if (px > 0) adjacent.push(index - 1);
            if (px < w - 1) adjacent.push(index + 1);
            if (py > 0) adjacent.push(index - w);
            if (py < h - 1) adjacent.push(index + w);
            for (const next of adjacent) {
              if (seen[next] || pixels[next * 4 + 3] < 32) continue;
              seen[next] = 1;
              pending.push(next);
            }
          }
          components.push(component);
        }
      }
      const largest = Math.max(0, ...components.map(component => component.count));
      const silhouettes = components.filter(component => component.count >= Math.max(4, largest * 0.03));
      if (silhouettes.length) {
        const left = Math.min(...silhouettes.map(component => component.left));
        const top = Math.min(...silhouettes.map(component => component.top));
        const right = Math.max(...silhouettes.map(component => component.right));
        const bottom = Math.max(...silhouettes.map(component => component.bottom));
        box = { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
      }
    } catch {
      // Cross-origin images still have a usable full-image fallback.
    }
    boundsCache.set(img, box);
    return box;
  }

  function rotate(point, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { x: point.x * c - point.y * s, y: point.x * s + point.y * c };
  }

  function socket(box, fraction, angle) {
    const offset = rotate({
      x: (fraction[0] - TORSO.anchor[0]) * box.w * TORSO.scale,
      y: (fraction[1] - TORSO.anchor[1]) * box.h * TORSO.scale
    }, angle);
    return { x: HIP.x + offset.x, y: HIP.y + offset.y };
  }

  function part(ctx, img, at, anchor, scale, angle = 0, stretch = 1) {
    if (!img) return;
    const box = bounds(img);
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(angle);
    ctx.scale(stretch, 1);
    ctx.drawImage(img, box.x, box.y, box.w, box.h,
      -box.w * anchor[0] * scale, -box.h * anchor[1] * scale,
      box.w * scale, box.h * scale);
    ctx.restore();
  }

  function motion(player, time) {
    const walking = player.onGround && Math.abs(player.vx || 0) > 10;
    const climbing = !!player.climbing;
    const airborne = !player.onGround && !climbing;
    const phase = time * (climbing ? 8 : walking ? 11 : 3);
    const stride = Math.sin(phase);
    return {
      walking, climbing, airborne, stride,
      bob: climbing ? Math.sin(phase) * 1.5 : walking ? -Math.abs(stride) * 2 : -Math.sin(phase) * 0.8,
      torsoAngle: climbing ? -0.055 : airborne ? -0.025 : walking ? stride * 0.012 : 0
    };
  }

  function aim(player) {
    const facing = player.facing < 0 ? -1 : 1;
    const vector = player.attackAim || { x: facing, y: 0 };
    const x = Number.isFinite(vector.x) ? vector.x : facing;
    const y = Number.isFinite(vector.y) ? vector.y : 0;
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }

  function atlasFrames(img) {
    if (atlasCache.has(img)) return atlasCache.get(img);
    const width = img.naturalWidth || img.width, height = img.naturalHeight || img.height;
    const frames = Array.from({ length: 12 }, (_, index) => {
      const col = index % 4, row = Math.floor(index / 4);
      const x = Math.floor(col * width / 4), y = Math.floor(row * height / 3);
      const w = Math.floor((col + 1) * width / 4) - x, h = Math.floor((row + 1) * height / 3) - y;
      const scratch = document.createElement('canvas');
      scratch.width = w; scratch.height = h;
      scratch.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
      // Keep this cell's primary connected piece. Detached neighbor pixels and
      // registration fragments must never become flying parts of a monster.
      const context = scratch.getContext('2d', { willReadFrequently: true });
      const pixels = context.getImageData(0, 0, w, h), labels = new Int32Array(w * h);
      const pending = new Int32Array(w * h);
      let component = 0, largest = 0, largestCount = 0, crop = { x: 0, y: 0, w, h };
      for (let start = 0; start < labels.length; start++) {
        if (labels[start] || pixels.data[start * 4 + 3] < 20) continue;
        component++; let length = 1, cursor = 0, left = w, top = h, right = 0, bottom = 0;
        pending[0] = start; labels[start] = component;
        while (cursor < length) {
          const index = pending[cursor++], px = index % w, py = Math.floor(index / w);
          left = Math.min(left, px); top = Math.min(top, py); right = Math.max(right, px); bottom = Math.max(bottom, py);
          const next = [px > 0 ? index - 1 : -1, px < w - 1 ? index + 1 : -1, py > 0 ? index - w : -1, py < h - 1 ? index + w : -1];
          for (const adjacent of next) if (adjacent >= 0 && !labels[adjacent] && pixels.data[adjacent * 4 + 3] >= 20) {
            labels[adjacent] = component; pending[length++] = adjacent;
          }
        }
        if (length > largestCount) {
          largest = component; largestCount = length;
          crop = { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
        }
      }
      for (let index = 0; index < labels.length; index++) if (labels[index] !== largest) pixels.data[index * 4 + 3] = 0;
      context.putImageData(pixels, 0, 0);
      return { img: scratch, x: crop.x, y: crop.y, w: crop.w, h: crop.h };
    });
    atlasCache.set(img, frames);
    return frames;
  }

  const DEFAULT_CAPS = {
    3: [[.38, .075], [.66, .93]], 4: [[.28, .075], [.72, .925]],
    5: [[.50, .055], [.50, .95]], 6: [[.40, .055], [.50, .95]],
    7: [[.40, .055], [.57, .94]], 8: [[.30, .055], [.60, .94]],
    9: [[.44, .055], [.48, .945]]
  };
  const SOCKETS = {
    grokkon: { shoulders: [[.12, .25], [.88, .245]], hips: [[.27, .89], [.72, .89]], feet: [.39, .64], head: [.34, .935] },
    thorvak: { shoulders: [[.14, .225], [.92, .235]], hips: [[.24, .89], [.74, .89]], feet: [.39, .65], head: [.34, .935] },
    lizork: { shoulders: [[.115, .305], [.935, .32]], hips: [[.105, .82], [.955, .82]], feet: [.29, .73], head: [.35, .935] },
    kragmor: { shoulders: [[.12, .225], [.91, .245]], hips: [[.19, .85], [.88, .85]], feet: [.35, .70], head: [.36, .935] },
    vorgath: { shoulders: [[.145, .285], [.92, .265]], hips: [[.13, .895], [.89, .895]], feet: [.33, .70], head: [.41, .935] },
    skorath: { shoulders: [[.115, .295], [.91, .27]], hips: [[.15, .85], [.89, .85]], feet: [.33, .70], head: [.34, .935] }
  };

  // The generated limb pieces have diagonal cap centers. Map those actual
  // centers to the solved joints instead of attaching bounding-box corners.
  function caps(asset, index) {
    const overrides = asset.rig?.anchors;
    return overrides?.[index] || DEFAULT_CAPS[index] || [[.5, 0], [.5, 1]];
  }

  function drawFrame(ctx, frame, at, width, height, anchor = [.5, .5], angle = 0) {
    ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(angle);
    ctx.drawImage(frame.img, frame.x, frame.y, frame.w, frame.h,
      -width * anchor[0], -height * anchor[1], width, height);
    ctx.restore();
  }

  function drawBone(ctx, frame, from, to, width, cap) {
    const a = { x: cap[0][0] * frame.w, y: cap[0][1] * frame.h };
    const b = { x: cap[1][0] * frame.w, y: cap[1][1] * frame.h };
    const sourceAngle = Math.atan2(b.y - a.y, b.x - a.x);
    const targetAngle = Math.atan2(to.y - from.y, to.x - from.x);
    const sourceLength = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const targetLength = Math.hypot(to.x - from.x, to.y - from.y);
    ctx.save(); ctx.translate(from.x, from.y); ctx.rotate(targetAngle);
    ctx.scale(targetLength / sourceLength, width / frame.w);
    ctx.rotate(-sourceAngle);
    ctx.drawImage(frame.img, frame.x, frame.y, frame.w, frame.h, -a.x, -a.y, frame.w, frame.h);
    ctx.restore();
  }

  function coverJoint(ctx, frame, point, radius, sample = [.52, .50]) {
    // Cover the generated flat cut caps with matching interior tissue/armor.
    // This is an overlapping textured joint, attached to the same solved point.
    const sw = frame.w * .25, sh = frame.h * .18;
    ctx.save(); ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(frame.img, frame.x + frame.w * sample[0] - sw / 2, frame.y + frame.h * sample[1] - sh / 2,
      sw, sh, point.x - radius, point.y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  function solveIK(start, target, upper, lower, bend = 1, extend = false) {
    const dx = target.x - start.x, dy = target.y - start.y;
    const distance = Math.hypot(dx, dy) || .001;
    if (extend && distance > upper + lower - .5) {
      const growth = (distance + .5) / (upper + lower);
      upper *= growth; lower *= growth;
    }
    const reach = Math.min(upper + lower - .001, Math.max(Math.abs(upper - lower) + .001, distance));
    const ux = dx / distance, uy = dy / distance;
    const along = (upper * upper - lower * lower + reach * reach) / (2 * reach);
    const height = Math.sqrt(Math.max(0, upper * upper - along * along));
    return {
      joint: { x: start.x + ux * along - uy * height * bend, y: start.y + uy * along + ux * height * bend },
      end: { x: start.x + ux * reach, y: start.y + uy * reach },
      error: Math.max(0, distance - reach)
    };
  }

  function skeletalPose(options) {
    const { player, spec, asset, time = 0 } = options;
    const face = player.facing < 0 ? -1 : 1;
    const moving = !!player.onGround && Math.abs(player.vx || 0) > 10;
    const travel = moving ? Math.sign(player.vx) * face : 1;
    const climbing = !!player.climbing, airborne = !player.onGround && !climbing;
    let gait = null;
    if (moving) {
      const frequency = Math.PI * Math.abs(player.vx) / 48;
      gait = walkCache.get(player);
      if (!gait || gait.face !== face || gait.travel !== travel || time < gait.time || Math.abs(player.x - gait.x) > spec.w * .5 || Math.abs(player.y - gait.y) > 4) {
        gait = { phase: time * frequency, time, x: player.x, y: player.y, face, travel, feet: [] };
        walkCache.set(player, gait);
      } else gait.phase += Math.min(.10, Math.max(0, time - gait.time)) * frequency;
      gait.time = time; gait.x = player.x; gait.y = player.y;
    } else walkCache.delete(player);
    const gaitPhase = gait?.phase ?? time * (climbing ? 8 : 10);
    const stride = Math.sin(gaitPhase);
    const bob = climbing ? stride * 1.2 : moving ? -Math.abs(stride) * 3 : Math.sin(time * 3) * 1.1;
    const hit = player.hurtTimer > 0 || player.hitTimer > 0;
    const lean = hit ? -.08 : climbing ? .025 : airborne ? ((player.vy || 0) < 0 ? .065 : -.035) : moving ? stride * .04 : 0;
    const hip = { x: BODY.w * .50, y: BODY.h * .625 };
    const torsoW = BODY.w * (asset.rig.species === 'insect' ? .55 : .62), torsoH = BODY.h * .48;
    const torsoAnchor = [.50, .91];
    const socketAt = fraction => {
      const offset = rotate({ x: (fraction[0] - torsoAnchor[0]) * torsoW, y: (fraction[1] - torsoAnchor[1]) * torsoH }, lean);
      return { x: hip.x + offset.x, y: hip.y + offset.y };
    };
    const rootX = player.x + (face < 0 ? spec.w : 0);
    const scaleX = face * spec.w / BODY.w, scaleY = spec.h / BODY.h;
    const local = point => ({ x: (point.x - rootX) / scaleX, y: (point.y - player.y) / scaleY - bob });
    const footH = BODY.h * .085;
    const thin = asset.rig.species === 'insect' ? .75 : asset.rig.species === 'alien' ? .86 : 1;
    const anatomy = asset.rig.sockets || SOCKETS[asset.id] || SOCKETS.grokkon;
    const shoulders = anatomy.shoulders.map(socketAt);
    const hips = anatomy.hips.map(socketAt);
    const arms = [], legs = [];
    for (let index = 0; index < 2; index++) {
      const phase = gaitPhase + index * Math.PI;
      let ankle = { x: BODY.w * anatomy.feet[index], y: BODY.h - footH * .90 - bob };
      if (moving) {
        const cycle = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), swinging = cycle < Math.PI;
        const base = BODY.w * anatomy.feet[index];
        let foot = gait.feet[index];
        if (!foot) {
          const stanceProgress = Math.max(0, (cycle - Math.PI) / Math.PI);
          const x = rootX + (base + (18 - stanceProgress * 48) * travel) * scaleX;
          foot = gait.feet[index] = { swinging, plant: x, fromLocal: base - 30 * travel, current: x };
        }
        let footX;
        if (swinging) {
          if (!foot.swinging) foot.fromLocal = (foot.plant - rootX) / scaleX;
          const t = cycle / Math.PI, smooth = t * t * (3 - 2 * t);
          // Raised foot moves back -> front relative to the moving torso.
          // The planted half stays fixed in world space and travels front ->
          // back relative to that same torso. Never reverse gameplay velocity.
          const forward = base + 18 * travel;
          footX = rootX + (foot.fromLocal + (forward - foot.fromLocal) * smooth) * scaleX;
        } else {
          if (foot.swinging) foot.plant = foot.current;
          footX = foot.plant;
        }
        foot.current = footX; foot.swinging = swinging;
        ankle = local({ x: footX, y: player.y + spec.h - footH * .90 * scaleY - Math.max(0, Math.sin(phase)) * 16 * scaleY });
      } else if (climbing) {
        ankle = { x: BODY.w * .645, y: BODY.h * (index ? .76 : .91) + Math.sin(phase) * 8 };
      } else if (airborne) {
        ankle = { x: BODY.w * (index ? .67 : .40), y: BODY.h * ((player.vy || 0) < 0 ? .81 : .91) + (index ? -3 : 3) };
      }
      const knee = solveIK(hips[index], ankle, BODY.h * .225, BODY.h * .19, moving ? -travel : -1);
      legs.push({ hip: hips[index], knee: knee.joint, ankle: knee.end, width: BODY.w * .185 * thin, footH, toeDirection: travel,
        swinging: moving && gait.feet[index].swinging });

      let wrist = { x: BODY.w * (index ? .79 : .22), y: BODY.h * .615 };
      let handIndex = 6, handDirection = { x: 0, y: 1 }, handLength = BODY.h * .105;
      if (moving) { wrist.x += Math.sin(phase) * 5; wrist.y += Math.cos(phase) * 3; }
      if (climbing) {
        // Existing wall snaps put the face at .68w. These palms contact that
        // face in the same .18-.30h grip band used by gameplay.
        wrist = { x: BODY.w * .645, y: BODY.h * (index ? .165 : .205) + Math.sin(phase) * 3 };
        handIndex = 7; handLength = BODY.h * .10;
      } else if (airborne) {
        wrist = (player.vy || 0) < 0 ? { x: BODY.w * (index ? .85 : .15), y: BODY.h * .35 } :
          { x: BODY.w * (index ? .90 : .10), y: BODY.h * .53 };
      }
      const attacking = player.attackTimer > 0 && index === (player.attackKind === 'backhand' ? 0 : 1);
      if (attacking) {
        const fullEnd = local(attackHand(options));
        const direction = aim(player);
        const localDirection = { x: direction.x / scaleX, y: direction.y / scaleY };
        const length = Math.hypot(localDirection.x, localDirection.y) || 1;
        handDirection = { x: localDirection.x / length, y: localDirection.y / length };
        const progress = Math.min(1, Math.max(0, 1 - player.attackTimer / ATTACK_SECONDS));
        const extension = 1 - progress * progress;
        const returned = { x: shoulders[index].x + (index ? 25 : -25), y: shoulders[index].y + 34 };
        const end = { x: returned.x + (fullEnd.x - returned.x) * extension, y: returned.y + (fullEnd.y - returned.y) * extension };
        handIndex = player.attackKind === 'backhand' ? 6 : 5;
        handLength = BODY.h * .115;
        wrist = { x: end.x - handDirection.x * handLength, y: end.y - handDirection.y * handLength };
      } else if (index === 1 && (player.eatTimer > 0 || player.eating)) {
        wrist = { x: BODY.w * .75, y: BODY.h * .18 };
        handIndex = 7; handDirection = { x: .7, y: -.7 };
      }
      const elbow = solveIK(shoulders[index], wrist, BODY.h * .19, BODY.h * .19, index ? 1 : -1, attacking);
      arms.push({ shoulder: shoulders[index], elbow: elbow.joint, wrist: elbow.end, handIndex, handDirection, handLength,
        width: BODY.w * .15 * thin, attacking, error: elbow.error });
    }
    return { face, rootX, scaleX, scaleY, bob, lean, hip, torsoW, torsoH, torsoAnchor,
      neck: socketAt([.55, .065]), headAnchor: anatomy.head, arms, legs, climbing, airborne, moving, stride, thin };
  }

  function drawSkeletal(ctx, options) {
    const { asset, player, images, time = 0 } = options;
    if (asset.rig?.type !== 'skeletal') return false;
    const atlas = imageFor(images, asset.rig.atlas);
    if (!atlas) return false;
    const frames = atlasFrames(atlas), pose = skeletalPose(options);
    const drawArm = index => {
      const arm = pose.arms[index];
      drawBone(ctx, frames[3], arm.shoulder, arm.elbow, arm.width, caps(asset, 3));
      drawBone(ctx, frames[4], arm.elbow, arm.wrist, arm.width * .92, caps(asset, 4));
      const direction = arm.handDirection;
      const end = { x: arm.wrist.x + direction.x * arm.handLength, y: arm.wrist.y + direction.y * arm.handLength };
      drawBone(ctx, frames[arm.handIndex], arm.wrist, end, BODY.w * .205 * pose.thin, caps(asset, arm.handIndex));
      coverJoint(ctx, frames[3], arm.elbow, arm.width * .39);
      coverJoint(ctx, frames[4], arm.wrist, arm.width * .33);
    };
    const drawLeg = index => {
      const leg = pose.legs[index];
      drawBone(ctx, frames[8], leg.hip, leg.knee, leg.width, caps(asset, 8));
      drawBone(ctx, frames[9], leg.knee, leg.ankle, leg.width * .80, caps(asset, 9));
      ctx.save(); ctx.translate(leg.ankle.x, leg.ankle.y); ctx.scale(leg.toeDirection, 1);
      drawFrame(ctx, frames[10], {x: 0, y: 0}, BODY.w * .29 * pose.thin, leg.footH, [.30, .10], pose.climbing ? -.08 : 0);
      ctx.restore();
      coverJoint(ctx, frames[8], leg.knee, leg.width * .40);
      coverJoint(ctx, frames[9], leg.ankle, leg.width * .30);
    };
    ctx.save(); ctx.translate(pose.rootX, player.y); ctx.scale(pose.scaleX, pose.scaleY); ctx.translate(0, pose.bob);
    if (!options.paused && player.invulnerable > 0 && Math.floor(time * 16) % 2) ctx.globalAlpha *= .58;
    const tailAnchor = asset.rig.tailAnchor || ({thorvak: [.25, .065], lizork: [.20, .06], kragmor: [.23, .065], vorgath: [.20, .055], skorath: [.18, .06]}[asset.id]) || [.25, .06];
    if (asset.rig.tail) drawFrame(ctx, frames[11], { x: pose.hip.x - BODY.w * .12, y: pose.hip.y - 2 },
      BODY.w * .44, BODY.h * .36, tailAnchor, .35 + Math.sin(time * 4) * .05);
    ctx.save(); ctx.globalAlpha *= .80; drawLeg(0); drawArm(0); ctx.restore();
    drawFrame(ctx, frames[0], pose.hip, pose.torsoW, pose.torsoH, pose.torsoAnchor, pose.lean);
    ctx.save(); ctx.globalAlpha *= .88;
    drawBone(ctx, frames[3], pose.arms[0].shoulder, pose.arms[0].elbow, pose.arms[0].width, caps(asset, 3));
    drawBone(ctx, frames[8], pose.legs[0].hip, pose.legs[0].knee, pose.legs[0].width, caps(asset, 8));
    coverJoint(ctx, frames[3], pose.arms[0].shoulder, pose.arms[0].width * .54);
    coverJoint(ctx, frames[8], pose.legs[0].hip, pose.legs[0].width * .48);
    ctx.restore();
    drawLeg(1);
    coverJoint(ctx, frames[8], pose.legs[1].hip, pose.legs[1].width * .48);
    const roaring = player.attackTimer > 0 || player.eatTimer > 0 || player.eating;
    const headIndex = roaring ? 2 : !asset.rig.tail && pose.climbing ? 11 : 1;
    drawFrame(ctx, frames[headIndex], pose.neck, BODY.w * .56, BODY.h * .245, pose.headAnchor, pose.lean + pose.stride * .008);
    coverJoint(ctx, frames[0], pose.neck, BODY.w * .064, [.55, .20]);
    drawArm(1);
    coverJoint(ctx, frames[3], pose.arms[1].shoulder, pose.arms[1].width * .54);
    // A rear strike is always foreground at impact so its open palm remains
    // visible instead of disappearing behind the torso.
    if (pose.arms[0].attacking) drawArm(0);
    ctx.restore();
    return true;
  }

  function drawLizork(ctx, options) {
    const { asset, player, spec, images, time = 0, pulse = 0 } = options;
    const parts = asset.rig?.parts;
    if (asset.rig?.type !== 'lizork' || !parts) return false;
    const torso = imageFor(images, parts.torsoSide);
    const legs = imageFor(images, parts.legsSide);
    const head = imageFor(images, parts.head);
    const neutral = imageFor(images, parts.armNeutralB || parts.armHang);
    if (!torso || !legs || !head || !neutral) return false;
    const pose = motion(player, time);
    const torsoBox = bounds(torso);
    const neck = socket(torsoBox, TORSO.neck, pose.torsoAngle);
    const shoulder = socket(torsoBox, TORSO.shoulder, pose.torsoAngle);
    const attacking = player.attackTimer > 0;
    const face = attacking ? imageFor(images, parts.headOpen) || head : head;
    const facing = player.facing < 0 ? -1 : 1;
    const strike = aim(player);
    // Combat resolves on the button press. Show its fully extended fist on
    // that same frame (including hit stop), then ease back to the shoulder.
    const attackProgress = Math.min(1, Math.max(0, 1 - player.attackTimer / ATTACK_SECONDS));
    const extension = attacking ? 1 - attackProgress * attackProgress : 0;

    ctx.save();
    ctx.translate(player.x + (facing > 0 ? spec.w : 0), player.y);
    ctx.scale((facing > 0 ? -1 : 1) * spec.w / BODY.w, (spec.h + pulse) / BODY.h);
    ctx.translate(0, pose.bob - pulse);
    if (!options.paused && player.invulnerable > 0 && Math.floor(time * 16) % 2) ctx.globalAlpha *= 0.48;

    // The far limbs sit behind the torso; overlapping caps hide the sockets.
    ctx.save();
    ctx.globalAlpha *= 0.78;
    part(ctx, legs, { x: HIP.x - 19, y: HIP.y - 1 }, [0.57, 0.11], 0.79,
      pose.climbing ? 0.17 + pose.stride * 0.06 : pose.airborne ? -0.18 : -pose.stride * (pose.walking ? 0.07 : 0));
    if (pose.climbing) {
      const raised = imageFor(images, parts.armNeutral || parts.armGrab) || neutral;
      part(ctx, raised, { x: shoulder.x + 8, y: shoulder.y + 3 }, [0.27, 0.91], 0.56, -0.72 + pose.stride * 0.06);
    } else {
      part(ctx, neutral, { x: shoulder.x + 9, y: shoulder.y + 4 }, [0.67, 0.19], 0.56, -pose.stride * (pose.walking ? 0.08 : 0));
    }
    ctx.restore();

    part(ctx, torso, HIP, TORSO.anchor, TORSO.scale, pose.torsoAngle);
    part(ctx, legs, HIP, [0.57, 0.11], 0.79,
      pose.climbing ? -0.14 - pose.stride * 0.05 : pose.airborne ? 0.12 : pose.stride * (pose.walking ? 0.07 : 0));
    part(ctx, face, neck, [0.69, 0.90], 0.58, pose.torsoAngle + (attacking ? -0.025 : pose.stride * 0.01));

    if (attacking) {
      const punch = imageFor(images, parts.armPunchMounted || parts.armPunch) || neutral;
      // Native artwork points left. Mirroring the common root also mirrors aim.
      const angle = Math.atan2(-strike.y, strike.x * facing);
      // Calibrate against the actual cropped fist artwork. Its source sheet
      // includes a disconnected registration fragment beyond the shoulder.
      const artReach = bounds(punch).w * 0.94 * 0.66;
      const standardReachScale = BODY.w * 0.55 / Math.max(1, artReach);
      const reachScale = standardReachScale * attackReach({ player, spec }) / (spec.w * 0.55);
      part(ctx, punch, shoulder, [0.94, 0.50], 0.66, angle, (0.74 + extension * 0.26) * reachScale);
    } else if (pose.climbing) {
      const raised = imageFor(images, parts.armNeutral || parts.armGrab) || neutral;
      part(ctx, raised, shoulder, [0.27, 0.91], 0.58, -0.72 - pose.stride * 0.06);
    } else {
      part(ctx, neutral, shoulder, [0.67, 0.19], 0.61, pose.stride * (pose.walking ? 0.09 : 0.018));
    }
    ctx.restore();
    return true;
  }

  function drawWholeSprite(ctx, options) {
    const { asset, player, spec, images, time = 0, pulse = 0 } = options;
    const src = player.attackTimer > 0 ? asset.attackSrc : player.climbing ? asset.climbSrc : asset.src;
    const img = imageFor(images, src) || imageFor(images, asset.src);
    if (!img) return false;
    const box = bounds(img);
    const pose = motion(player, time);
    // Whole sprites keep their feet/root stable through pose changes. Scaling
    // stays subtle so the fallback also reads as one connected character.
    const squash = pose.airborne ? 1.015 : 1 + Math.abs(pose.stride) * (pose.walking ? 0.009 : 0.004);
    const h = (spec.h + pulse) / squash, w = (spec.w + pulse) * squash;
    ctx.save();
    ctx.translate(player.x + spec.w / 2, player.y + spec.h + pose.bob);
    if (player.facing < 0) ctx.scale(-1, 1);
    if (!options.paused && player.invulnerable > 0 && Math.floor(time * 16) % 2) ctx.globalAlpha *= 0.48;
    ctx.drawImage(img, box.x, box.y, box.w, box.h, -w / 2, -h, w, h);
    ctx.restore();
    return true;
  }

  function punchOrigin({ player, spec }) {
    // This is the rendered shoulder socket in world coordinates, rounded to a
    // stable combat origin so breathing/walking cannot change hit detection.
    const facing = player.facing < 0 ? -1 : 1;
    const direction = player.attackKind === 'backhand' ? -facing : facing;
    return { x: player.x + spec.w * (direction > 0 ? 0.57 : 0.43), y: player.y + spec.h * 0.43 };
  }

  function attackReach({ player, spec }) {
    // A roof strike must pass the feet to reach the supporting floor. The
    // shoulder remains the common socket; only the extended arm grows.
    return player.onRoof && aim(player).y > 0.5 ? spec.h * 0.64 : spec.w * 0.55;
  }

  function attackHand(options) {
    const origin = punchOrigin(options), direction = aim(options.player), reach = attackReach(options);
    return { x: origin.x + direction.x * reach, y: origin.y + direction.y * reach };
  }

  window.MonstersUnlimitedRenderer = Object.freeze({
    frame(img) {
      if (!img) return null;
      const box = bounds(img);
      return { x: box.x, y: box.y, w: box.w, h: box.h };
    },
    draw(ctx, options) {
      if (!ctx || !options?.asset || !options?.spec || !options?.player) return false;
      return drawSkeletal(ctx, options) || drawLizork(ctx, options) || drawWholeSprite(ctx, options);
    },
    prepare(asset, images) {
      const atlas = imageFor(images, asset.rig?.atlas);
      if (!atlas || asset.rig?.type !== 'skeletal') return false;
      atlasFrames(atlas);
      return true;
    },
    geometry(options) {
      const pose = skeletalPose(options);
      const world = point => ({ x: pose.rootX + point.x * pose.scaleX, y: options.player.y + (point.y + pose.bob) * pose.scaleY });
      return {
        arms: pose.arms.map(arm => ({ shoulder: world(arm.shoulder), elbow: world(arm.elbow), wrist: world(arm.wrist),
          hand: world({ x: arm.wrist.x + arm.handDirection.x * arm.handLength, y: arm.wrist.y + arm.handDirection.y * arm.handLength }), attacking: arm.attacking, error: arm.error })),
        legs: pose.legs.map(leg => ({ hip: world(leg.hip), knee: world(leg.knee), ankle: world(leg.ankle),
          sole: world({ x: leg.ankle.x, y: leg.ankle.y + leg.footH * .90 }),
          swinging: leg.swinging, toeDirection: leg.toeDirection * pose.face }))
      };
    },
    punchOrigin,
    attackReach,
    attackHand
  });
})();
