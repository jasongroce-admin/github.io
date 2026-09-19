(function () {
  const ARTWORK_SRC = "Pages/Frog.webp";
  const BOARD = { x: 0, y: 0, width: 1254, height: 1093 };
  const LINE_THRESHOLD = 210;
  const BORDER_GROW = 1;
  const TAP_SLOP = 18;

  const colors = [
    { id: 1, name: "Frog", hex: "#61d72a" },
    { id: 2, name: "Belly", hex: "#a8dc74" },
    { id: 3, name: "Spots", hex: "#2f8a42" },
    { id: 4, name: "Pads", hex: "#6fa955" },
    { id: 5, name: "Water", hex: "#b9e6fb" },
    { id: 6, name: "Flower", hex: "#ee83ca" },
    { id: 7, name: "Reeds", hex: "#aa7658" },
    { id: 8, name: "Leaves", hex: "#91a85a" },
    { id: 9, name: "Bark", hex: "#6d4429" },
    { id: 10, name: "Sun", hex: "#fff0ba" },
  ];

  const regionSeeds = [
    [1, 522, 321], [1, 624, 360], [1, 738, 322],
    [2, 627, 529], [2, 625, 654],
    [3, 398, 616], [3, 486, 618], [3, 491, 681], [3, 767, 618], [3, 846, 617], [3, 842, 681], [3, 763, 681],
    [4, 290, 771], [4, 520, 850], [4, 585, 862], [4, 817, 863], [4, 1073, 1005], [4, 193, 1035], [4, 338, 1036],
    [5, 80, 552], [5, 244, 610], [5, 244, 685], [5, 509, 1000], [5, 816, 1015], [5, 1036, 876], [5, 1088, 682], [5, 1182, 721],
    [6, 76, 908], [6, 174, 877], [6, 174, 930], [6, 242, 940], [6, 318, 912], [6, 217, 1007], [6, 124, 999],
    [7, 145, 136], [7, 244, 184],
    [8, 77, 350], [8, 123, 446], [8, 207, 464], [8, 276, 419], [8, 548, 132], [8, 629, 126], [8, 823, 201], [8, 884, 242],
    [9, 740, 70], [9, 1054, 101], [9, 1071, 348], [9, 1136, 431], [9, 969, 557], [9, 1101, 558],
    [10, 254, 75], [10, 455, 217], [10, 802, 80], [10, 691, 185], [10, 953, 342], [10, 340, 377],
  ].map(([id, x, y]) => ({ id, x, y, index: y * BOARD.width + x }));

  const canvas = document.getElementById("colorCanvas");
  const viewport = document.getElementById("stageViewport");
  const palette = document.getElementById("palette");
  const resetButton = document.getElementById("resetButton");
  const statusLine = document.getElementById("statusLine");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  let selectedColor = colors[0];
  let originalData = null;
  let paintData = null;
  let barrier = null;
  let visitedStamp = null;
  let stamp = 1;
  let view = { scale: 1, x: 0, y: 0 };
  let pointers = new Map();
  let gesture = null;
  let handledPointerTap = false;

  function buildPalette() {
    palette.innerHTML = "";
    colors.forEach((color) => {
      const button = document.createElement("button");
      button.className = "color-button";
      button.type = "button";
      button.dataset.color = color.id;
      button.setAttribute("aria-label", `Color ${color.id}: ${color.name}`);
      button.innerHTML = `<span class="swatch" style="background:${color.hex}">${color.id}</span><span class="color-name">${color.name}</span>`;
      button.addEventListener("click", () => selectColor(color.id));
      palette.appendChild(button);
    });
    selectColor(selectedColor.id);
  }

  function selectColor(id) {
    selectedColor = colors.find((color) => color.id === Number(id)) || colors[0];
    palette.querySelectorAll(".color-button").forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.color) === selectedColor.id);
    });
    setStatus(`Color ${selectedColor.id} selected. Tap the ${selectedColor.id} areas.`);
  }

  function setStatus(message) {
    statusLine.textContent = message;
  }

  function loadArtwork() {
    const img = new Image();
    img.onload = () => {
      canvas.width = BOARD.width;
      canvas.height = BOARD.height;
      ctx.drawImage(img, BOARD.x, BOARD.y, BOARD.width, BOARD.height, 0, 0, BOARD.width, BOARD.height);
      originalData = ctx.getImageData(0, 0, BOARD.width, BOARD.height);
      paintData = ctx.getImageData(0, 0, BOARD.width, BOARD.height);
      buildBarrierMap();
      visitedStamp = new Uint16Array(BOARD.width * BOARD.height);
      fitToScreen();
      setStatus("Pick a color, then tap matching numbered areas.");
    };
    img.src = ARTWORK_SRC;
  }

  function buildBarrierMap() {
    const pixels = originalData.data;
    const rawBarrier = new Uint8Array(BOARD.width * BOARD.height);
    barrier = new Uint8Array(BOARD.width * BOARD.height);
    for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      rawBarrier[p] = (r + g + b) / 3 < LINE_THRESHOLD ? 1 : 0;
    }

    for (let y = 0; y < BOARD.height; y += 1) {
      for (let x = 0; x < BOARD.width; x += 1) {
        const index = y * BOARD.width + x;
        if (!rawBarrier[index]) continue;
        for (let yy = Math.max(0, y - BORDER_GROW); yy <= Math.min(BOARD.height - 1, y + BORDER_GROW); yy += 1) {
          for (let xx = Math.max(0, x - BORDER_GROW); xx <= Math.min(BOARD.width - 1, x + BORDER_GROW); xx += 1) {
            barrier[yy * BOARD.width + xx] = 1;
          }
        }
      }
    }

    regionSeeds.forEach((seed) => {
      if (!barrier[seed.index]) return;
      const adjusted = findNearestOpenPixel(seed.x, seed.y);
      seed.x = adjusted.x;
      seed.y = adjusted.y;
      seed.index = adjusted.y * BOARD.width + adjusted.x;
    });
  }

  function findNearestOpenPixel(x, y, maxRadius = 30) {
    if (x >= 0 && y >= 0 && x < BOARD.width && y < BOARD.height && !barrier[y * BOARD.width + x]) {
      return { x, y };
    }

    for (let radius = 1; radius <= maxRadius; radius += 1) {
      for (let yy = y - radius; yy <= y + radius; yy += 1) {
        for (let xx = x - radius; xx <= x + radius; xx += 1) {
          if (xx < 0 || yy < 0 || xx >= BOARD.width || yy >= BOARD.height) continue;
          if (!barrier[yy * BOARD.width + xx]) return { x: xx, y: yy };
        }
      }
    }
    return { x, y };
  }

  function fitToScreen() {
    const bounds = viewport.getBoundingClientRect();
    const scale = Math.min(bounds.width / BOARD.width, bounds.height / BOARD.height);
    view.scale = scale;
    view.x = (bounds.width - BOARD.width * scale) / 2;
    view.y = (bounds.height - BOARD.height * scale) / 2;
    applyTransform();
  }

  function applyTransform() {
    const bounds = viewport.getBoundingClientRect();
    const minScale = Math.min(bounds.width / BOARD.width, bounds.height / BOARD.height);
    view.scale = Math.max(minScale, Math.min(view.scale, minScale * 5));

    const drawWidth = BOARD.width * view.scale;
    const drawHeight = BOARD.height * view.scale;
    const minX = Math.min(0, bounds.width - drawWidth);
    const minY = Math.min(0, bounds.height - drawHeight);
    view.x = drawWidth <= bounds.width ? (bounds.width - drawWidth) / 2 : Math.max(minX, Math.min(0, view.x));
    view.y = drawHeight <= bounds.height ? (bounds.height - drawHeight) / 2 : Math.max(minY, Math.min(0, view.y));

    canvas.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
  }

  function canvasPoint(clientX, clientY) {
    const bounds = viewport.getBoundingClientRect();
    return {
      x: Math.floor((clientX - bounds.left - view.x) / view.scale),
      y: Math.floor((clientY - bounds.top - view.y) / view.scale),
    };
  }

  function fillAt(point) {
    if (!paintData || point.x < 0 || point.y < 0 || point.x >= BOARD.width || point.y >= BOARD.height) return;
    const requestedStart = point.y * BOARD.width + point.x;
    const candidates = barrier[requestedStart]
      ? findNearbyOpenPixels(point.x, point.y, 34)
      : [requestedStart];

    if (!candidates.length) {
      setStatus("Tap inside the bordered area.");
      return;
    }

    let chosenRegion = null;
    for (let i = 0; i < candidates.length; i += 1) {
      const region = collectRegion(candidates[i]);
      if (region.matched) {
        chosenRegion = region;
        break;
      }
      if (!barrier[requestedStart]) {
        chosenRegion = region;
        break;
      }
    }

    if (!chosenRegion || !chosenRegion.matched) {
      setStatus(`That area is not color ${selectedColor.id}.`);
      return;
    }

    paintRegion(chosenRegion.touched, chosenRegion.touchedCount);
    setStatus(`Nice. Filled a ${selectedColor.id} area.`);
  }

  function findNearbyOpenPixels(x, y, maxRadius) {
    const candidates = [];
    const seen = new Set();
    for (let radius = 0; radius <= maxRadius; radius += 1) {
      for (let yy = y - radius; yy <= y + radius; yy += 1) {
        for (let xx = x - radius; xx <= x + radius; xx += 1) {
          if (xx < 0 || yy < 0 || xx >= BOARD.width || yy >= BOARD.height) continue;
          if (radius > 0 && xx !== x - radius && xx !== x + radius && yy !== y - radius && yy !== y + radius) continue;
          const index = yy * BOARD.width + xx;
          if (barrier[index] || seen.has(index)) continue;
          seen.add(index);
          candidates.push(index);
        }
      }
    }
    return candidates;
  }

  function collectRegion(start) {
    const queue = new Int32Array(BOARD.width * BOARD.height);
    const touched = new Int32Array(BOARD.width * BOARD.height);
    let head = 0;
    let tail = 0;
    let touchedCount = 0;
    let matched = false;
    stamp = stamp === 65535 ? 1 : stamp + 1;
    if (stamp === 1) visitedStamp.fill(0);

    queue[tail++] = start;
    visitedStamp[start] = stamp;

    while (head < tail) {
      const index = queue[head++];
      touched[touchedCount++] = index;

      for (let i = 0; i < regionSeeds.length; i += 1) {
        const seed = regionSeeds[i];
        if (seed.id === selectedColor.id && seed.index === index) matched = true;
      }

      const x = index % BOARD.width;
      const neighbors = [index - 1, index + 1, index - BOARD.width, index + BOARD.width];
      for (let i = 0; i < neighbors.length; i += 1) {
        const next = neighbors[i];
        if (next < 0 || next >= barrier.length || visitedStamp[next] === stamp || barrier[next]) continue;
        if ((i === 0 && x === 0) || (i === 1 && x === BOARD.width - 1)) continue;
        visitedStamp[next] = stamp;
        queue[tail++] = next;
      }
    }

    return { matched, touched, touchedCount };
  }

  function paintRegion(touched, touchedCount) {
    const rgb = hexToRgb(selectedColor.hex);
    const pixels = paintData.data;
    const original = originalData.data;
    for (let i = 0; i < touchedCount; i += 1) {
      const pixelIndex = touched[i] * 4;
      const shade = Math.max(original[pixelIndex], original[pixelIndex + 1], original[pixelIndex + 2]) / 255;
      pixels[pixelIndex] = Math.round(rgb.r * 0.82 + 255 * 0.18 * shade);
      pixels[pixelIndex + 1] = Math.round(rgb.g * 0.82 + 255 * 0.18 * shade);
      pixels[pixelIndex + 2] = Math.round(rgb.b * 0.82 + 255 * 0.18 * shade);
      pixels[pixelIndex + 3] = 255;
    }
    ctx.putImageData(paintData, 0, 0);
  }

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }

  function pointerDistance(a, b) {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function pointerCenter(a, b) {
    return {
      clientX: (a.clientX + b.clientX) / 2,
      clientY: (a.clientY + b.clientY) / 2,
    };
  }

  viewport.addEventListener("pointerdown", (event) => {
    viewport.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, event);
    if (pointers.size === 1) {
      gesture = {
        type: "tap-or-pan",
        startX: event.clientX,
        startY: event.clientY,
        viewX: view.x,
        viewY: view.y,
      };
    } else if (pointers.size === 2) {
      const [first, second] = Array.from(pointers.values());
      const center = pointerCenter(first, second);
      gesture = {
        type: "pinch",
        distance: pointerDistance(first, second),
        scale: view.scale,
        center,
        boardPoint: canvasPoint(center.clientX, center.clientY),
      };
    }
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, event);

    if (pointers.size === 2 && gesture?.type === "pinch") {
      const [first, second] = Array.from(pointers.values());
      const center = pointerCenter(first, second);
      const nextScale = gesture.scale * (pointerDistance(first, second) / gesture.distance);
      const bounds = viewport.getBoundingClientRect();
      view.scale = nextScale;
      view.x = center.clientX - bounds.left - gesture.boardPoint.x * view.scale;
      view.y = center.clientY - bounds.top - gesture.boardPoint.y * view.scale;
      applyTransform();
      return;
    }

    if (pointers.size === 1 && gesture?.type === "tap-or-pan") {
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      if (view.scale > Math.min(viewport.clientWidth / BOARD.width, viewport.clientHeight / BOARD.height) * 1.02) {
        view.x = gesture.viewX + dx;
        view.y = gesture.viewY + dy;
        applyTransform();
      }
    }
  });

  function finishPointer(event) {
    const activeGesture = gesture;
    pointers.delete(event.pointerId);
    if (pointers.size === 0 && activeGesture?.type === "tap-or-pan") {
      const dx = event.clientX - activeGesture.startX;
      const dy = event.clientY - activeGesture.startY;
      if (Math.hypot(dx, dy) <= TAP_SLOP) {
        handledPointerTap = true;
        fillAt(canvasPoint(event.clientX, event.clientY));
      }
    }
    if (pointers.size < 2) gesture = null;
  }

  viewport.addEventListener("pointerup", finishPointer);
  viewport.addEventListener("pointercancel", finishPointer);

  viewport.addEventListener("click", (event) => {
    if (handledPointerTap) {
      handledPointerTap = false;
      return;
    }
    fillAt(canvasPoint(event.clientX, event.clientY));
  });

  resetButton.addEventListener("click", () => {
    if (!originalData) return;
    paintData = new ImageData(new Uint8ClampedArray(originalData.data), BOARD.width, BOARD.height);
    ctx.putImageData(paintData, 0, 0);
    setStatus("Reset complete. Pick a color and start again.");
  });

  window.addEventListener("resize", fitToScreen);

  buildPalette();
  loadArtwork();
})();
