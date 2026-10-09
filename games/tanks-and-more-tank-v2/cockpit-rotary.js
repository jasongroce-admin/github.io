(function (global) {
  "use strict";

  function attach(input, options) {
    if (!input || typeof input.addEventListener !== "function") {
      throw new TypeError("TankCockpitRotary.attach requires an input element");
    }

    const settings = options || {};
    const target = settings.target || input;
    const enabled = () => !input.disabled &&
      (typeof settings.enabled !== "function" || settings.enabled());
    const center = typeof settings.center === "function"
      ? settings.center
      : () => {
          const rect = target.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        };
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const sensitivity = Number.isFinite(Number(settings.sensitivity))
      ? Number(settings.sensitivity)
      : (max - min) / 240;
    const deadZone = Math.max(0, Number.isFinite(Number(settings.deadZone))
      ? Number(settings.deadZone)
      : 7);
    let gesture = null;
    let destroyed = false;

    function angleAt(event) {
      const point = center();
      return Math.atan2(event.clientY - point.y, event.clientX - point.x) * 180 / Math.PI;
    }

    function inDeadZone(event) {
      const point = center();
      return Math.hypot(event.clientX - point.x, event.clientY - point.y) < deadZone;
    }

    function quantize(value) {
      const stepText = input.step || "1";
      if (stepText === "any") return value;
      const step = Number(stepText);
      if (!(step > 0)) return value;
      const base = Number.isFinite(min) ? min : 0;
      const rounded = base + Math.round((value - base) / step) * step;
      const decimals = Math.min(12, (stepText.split(".")[1] || "").length);
      return Number(rounded.toFixed(decimals));
    }

    function finish(reason) {
      if (!gesture) return;
      const active = gesture;
      gesture = null;
      try {
        if (target.hasPointerCapture && target.hasPointerCapture(active.pointerId)) {
          target.releasePointerCapture(active.pointerId);
        }
      } catch (_) {}
      if (typeof settings.onEnd === "function") settings.onEnd(reason);
    }

    function onDown(event) {
      if (destroyed || gesture || !enabled() || event.isPrimary === false) return;
      if (event.button !== 0) return;

      // Cancel the range's native pointer jump while preserving its normal keyboard behavior.
      event.preventDefault();
      const startAngle = inDeadZone(event) ? null : angleAt(event);
      gesture = {
        pointerId: event.pointerId,
        value: Number(input.value),
        lastAngle: startAngle
      };
      try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
      try { if (target.setPointerCapture) target.setPointerCapture(event.pointerId); } catch (_) {}
      if (typeof settings.onStart === "function") settings.onStart();
    }

    function onMove(event) {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      if (!enabled()) {
        finish("disabled");
        return;
      }
      event.preventDefault();
      if (inDeadZone(event)) {
        gesture.lastAngle = null;
        return;
      }

      const angle = angleAt(event);
      if (gesture.lastAngle === null) {
        gesture.lastAngle = angle;
        return;
      }
      let delta = angle - gesture.lastAngle;
      if (delta > 180) delta -= 360;
      else if (delta < -180) delta += 360;
      gesture.lastAngle = angle;

      // Clamp every update so reversing at an endpoint responds immediately.
      const bounded = Math.max(min, Math.min(max, gesture.value + delta * sensitivity));
      gesture.value = bounded;
      const next = Math.max(min, Math.min(max, quantize(bounded)));
      if (next === Number(input.value)) return;
      input.value = String(next);
      input.dispatchEvent(new global.Event("input", { bubbles: true }));
    }

    function onUp(event) {
      if (gesture && event.pointerId === gesture.pointerId) finish("up");
    }

    function onCancel(event) {
      if (!gesture || event.pointerId === undefined || event.pointerId === gesture.pointerId) {
        finish(event.type);
      }
    }

    target.addEventListener("pointerdown", onDown);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onCancel);
    target.addEventListener("lostpointercapture", onCancel);
    input.addEventListener("blur", onCancel);
    global.addEventListener("blur", onCancel);

    return {
      cancel() { finish("cancel"); },
      destroy() {
        if (destroyed) return;
        finish("destroy");
        destroyed = true;
        target.removeEventListener("pointerdown", onDown);
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
        target.removeEventListener("pointercancel", onCancel);
        target.removeEventListener("lostpointercapture", onCancel);
        input.removeEventListener("blur", onCancel);
        global.removeEventListener("blur", onCancel);
      }
    };
  }

  global.TankCockpitRotary = { attach };
})(window);
