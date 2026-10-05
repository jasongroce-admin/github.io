/* Connected monster poses. Coordinates below are sockets in a 154 x 218 body,
 * never independent world offsets. A torso turn carries its neck and shoulder
 * with it; every limb rotates at its attachment point. */
(() => {
  'use strict';
  const boundsCache = new WeakMap();
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
    return { x: player.x + spec.w * (facing > 0 ? 0.57 : 0.43), y: player.y + spec.h * 0.43 };
  }

  function attackReach({ player, spec }) {
    // A roof strike must pass the feet to reach the supporting floor. The
    // shoulder remains the common socket; only the extended arm grows.
    return player.onRoof && aim(player).y > 0.5 ? spec.h * 0.64 : spec.w * 0.55;
  }

  window.MonstersUnlimitedRenderer = Object.freeze({
    frame(img) {
      if (!img) return null;
      const box = bounds(img);
      return { x: box.x, y: box.y, w: box.w, h: box.h };
    },
    draw(ctx, options) {
      if (!ctx || !options?.asset || !options?.spec || !options?.player) return false;
      return drawLizork(ctx, options) || drawWholeSprite(ctx, options);
    },
    punchOrigin,
    attackReach,
    attackHand(options) {
      const origin = punchOrigin(options);
      const direction = aim(options.player);
      const reach = attackReach(options);
      return { x: origin.x + direction.x * reach, y: origin.y + direction.y * reach };
    }
  });
})();
