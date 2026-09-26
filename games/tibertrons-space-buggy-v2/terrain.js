// Shared world surface: state.y remains jump offset above this baseline.
export function terrainBaseHeight(world, x) {
  return Math.sin(x * .105 + world * 1.7) * .55 + Math.sin(x * .31 + world) * .10;
}

export function terrainHeight(world, x, rocks = []) {
  const grade = terrainBaseHeight(world, x);
  const rubble = rocks.reduce((height, rock) => {
    if ((rock.hp ?? 1) > 0) return height;
    const d = Math.abs(x - rock.x), radius = rock.size === 'large' ? 1.25 : .85;
    return d < radius ? Math.max(height, .18 * (1 - d / radius)) : height;
  }, 0);
  return grade + rubble;
}

export function terrainSlope(world, x, rocks) {
  return (terrainHeight(world, x + .08, rocks) - terrainHeight(world, x - .08, rocks)) / .16;
}
