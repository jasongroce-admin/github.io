(() => {
  "use strict";

  const BUILTIN_RECIPES = [
    { key: "ink", name: "Ink", brush: "Pen", values: { Size: 4, Opacity: 100, Flow: 90, Hardness: 100, Smoothing: 52, Spacing: 6, Scatter: 0, Jitter: 0 } },
    { key: "wash", name: "Soft wash", brush: "Airbrush", values: { Size: 72, Opacity: 48, Flow: 34, Hardness: 10, Smoothing: 38, Spacing: 12, Scatter: 4, Jitter: 3 } },
    { key: "marker", name: "Marker", brush: "Marker", values: { Size: 24, Opacity: 78, Flow: 88, Hardness: 58, Smoothing: 28, Spacing: 9, Scatter: 0, Jitter: 0 } },
    { key: "dry", name: "Dry texture", brush: "Chalk", values: { Size: 28, Opacity: 84, Flow: 58, Hardness: 72, Smoothing: 22, Spacing: 16, Scatter: 8, Jitter: 14 } },
  ];
  const RECIPE_STORAGE_KEY = "magic-screen-2.custom-brush-recipes.v1";
  const LAST_RECIPE_KEY = "magic-screen-2.last-brush-recipe";
  const SETTING_NAMES = ["Size", "Opacity", "Flow", "Hardness", "Smoothing", "Spacing", "Scatter", "Jitter"];
  const BRUSH_NAMES = ["Pencil", "Pen", "Marker", "Airbrush", "Chalk", "Crayon", "Watercolor", "Ink brush", "Spray", "Charcoal", "Oil", "Calligraphy"];

  function readCustomRecipes() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECIPE_STORAGE_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((recipe) => recipe && typeof recipe === "object"
        && typeof recipe.key === "string" && recipe.key.startsWith("custom-")
        && typeof recipe.name === "string" && recipe.name.trim().length > 0 && recipe.name.length <= 28
        && BRUSH_NAMES.includes(recipe.brush)
        && recipe.values && SETTING_NAMES.every((setting) => Number.isFinite(Number(recipe.values[setting]))))
        .map((recipe) => ({ ...recipe, name: recipe.name.trim(), custom: true }));
    } catch {
      return [];
    }
  }

  const customRecipes = readCustomRecipes();
  const recipes = [...BUILTIN_RECIPES, ...customRecipes];

  function persistCustomRecipes() {
    try {
      localStorage.setItem(RECIPE_STORAGE_KEY, JSON.stringify(customRecipes));
      return true;
    } catch {
      return false;
    }
  }

  const inputByLabel = (label) => [...document.querySelectorAll("input[aria-label]")]
    .filter((input) => input.getAttribute("aria-label") === label && input.type === "range");

  function setControl(label, value) {
    const input = inputByLabel(label)[0];
    if (!input) return;
    const min = Number(input.min);
    const max = Number(input.max);
    const clamped = Math.max(Number.isFinite(min) ? min : -Infinity, Math.min(Number.isFinite(max) ? max : Infinity, Number(value)));
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, String(clamped));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function brushControls() {
    const heading = [...document.querySelectorAll("p")].find((node) => node.textContent.trim() === "Brushes");
    return heading?.parentElement?.querySelector("div.grid");
  }

  function apply(recipe) {
    const selectedBrush = [...(brushControls()?.querySelectorAll("button") || [])]
      .find((button) => button.textContent.trim() === recipe.brush);
    selectedBrush?.click();
    for (const [label, value] of Object.entries(recipe.values)) setControl(label, value);
    try { localStorage.setItem(LAST_RECIPE_KEY, recipe.key); } catch { /* The recipe still applies if storage is disabled. */ }

    document.querySelectorAll("[data-brush-recipe]").forEach((button) => {
      const active = button.dataset.brushRecipe === recipe.key;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("bg-accent", active);
      button.classList.toggle("text-accent-ink", active);
      button.classList.toggle("font-semibold", active);
    });
    document.querySelectorAll("[data-brush-recipe-status]").forEach((status) => {
      status.textContent = `${recipe.name} recipe applied`;
    });
    document.dispatchEvent(new CustomEvent("magic-screen:recipe", { detail: { name: recipe.name } }));
  }

  function previewCanvas(recipe, compact) {
    const canvas = document.createElement("canvas");
    canvas.width = compact ? 28 : 42;
    canvas.height = 18;
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = compact ? "h-4 w-7 shrink-0" : "h-5 w-10 shrink-0";
    const context = canvas.getContext("2d");
    if (!context) return canvas;

    const size = Math.max(1, Number(recipe.values.Size) || 1);
    const opacity = Math.max(0.05, Math.min(1, (Number(recipe.values.Opacity) || 0) / 100));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.globalAlpha = opacity;
    context.strokeStyle = "#271c18";
    context.fillStyle = "#271c18";
    context.lineWidth = Math.max(1.4, Math.min(5.5, 1.2 + Math.sqrt(size) * 0.48));
    context.lineCap = recipe.brush === "Marker" || recipe.brush === "Calligraphy" ? "square" : "round";
    if (recipe.brush === "Airbrush" || recipe.brush === "Watercolor") {
      context.shadowColor = "rgba(39,28,24,.65)";
      context.shadowBlur = recipe.brush === "Airbrush" ? 5 : 2;
    }
    if (["Chalk", "Crayon", "Spray", "Charcoal"].includes(recipe.brush)) {
      context.setLineDash([1.2, 1.5]);
    }
    context.beginPath();
    context.moveTo(2, canvas.height * 0.68);
    context.bezierCurveTo(canvas.width * 0.32, 1, canvas.width * 0.63, canvas.height - 1, canvas.width - 2, canvas.height * 0.34);
    context.stroke();
    return canvas;
  }

  function makeRecipeControl(recipe, compact = false) {
    const wrap = document.createElement("div");
    wrap.dataset.brushRecipeControl = "";
    wrap.className = compact ? "flex shrink-0 items-center gap-1" : "flex min-w-0 items-center gap-1";
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.brushRecipe = recipe.key;
    button.append(previewCanvas(recipe, compact));
    const label = document.createElement("span");
    label.className = "truncate";
    label.textContent = recipe.name;
    button.append(label);
    const shortcut = recipes.indexOf(recipe) < BUILTIN_RECIPES.length ? ` (Alt+${recipes.indexOf(recipe) + 1})` : "";
    button.title = `Apply ${recipe.name} · ${recipe.brush}${shortcut}`;
    button.setAttribute("aria-label", `${recipe.name} brush recipe${shortcut}`);
    button.setAttribute("aria-pressed", String(safeLastRecipe() === recipe.key));
    if (shortcut) button.setAttribute("aria-keyshortcuts", shortcut.trim().slice(1));
    button.className = compact
      ? "flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 text-xs text-fg hover:bg-accent hover:text-accent-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      : "flex min-w-0 items-center gap-2 rounded-md bg-surface-2 px-2 py-1 text-left text-xs text-fg hover:bg-accent hover:text-accent-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";
    button.addEventListener("click", () => apply(recipe));
    wrap.append(button);

    if (recipe.custom) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.brushRecipeRemove = "";
      remove.textContent = "×";
      remove.title = `Remove ${recipe.name}`;
      remove.setAttribute("aria-label", `Remove custom recipe ${recipe.name}`);
      remove.className = "grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-red-900/30 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";
      remove.addEventListener("click", () => {
        const index = customRecipes.findIndex((item) => item.key === recipe.key);
        if (index < 0) return;
        const [removed] = customRecipes.splice(index, 1);
        const recipeIndex = recipes.findIndex((item) => item.key === recipe.key);
        if (recipeIndex >= 0) recipes.splice(recipeIndex, 1);
        if (!persistCustomRecipes()) {
          customRecipes.splice(index, 0, removed);
          if (recipeIndex >= 0) recipes.splice(recipeIndex, 0, removed);
          document.querySelectorAll("[data-brush-recipe-status]").forEach((status) => {
            status.textContent = "Browser storage is unavailable; the recipe was not removed";
          });
          return;
        }
        if (safeLastRecipe() === recipe.key) {
          try { localStorage.removeItem(LAST_RECIPE_KEY); } catch { /* Selection feedback is optional. */ }
        }
        renderRecipeLists();
      });
      wrap.append(remove);
    }
    return wrap;
  }

  function safeLastRecipe() {
    try { return localStorage.getItem(LAST_RECIPE_KEY); } catch { return null; }
  }

  function captureCurrentRecipe(name) {
    const brush = [...(brushControls()?.querySelectorAll("button") || [])]
      .find((button) => button.getAttribute("aria-pressed") === "true")?.textContent.trim();
    if (!BRUSH_NAMES.includes(brush)) return null;
    const values = {};
    for (const setting of SETTING_NAMES) {
      const control = inputByLabel(setting)[0];
      if (!control) return null;
      values[setting] = Number(control.value);
    }
    return { key: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, brush, values, custom: true };
  }

  function showSaveForm(panel) {
    if (panel.querySelector("[data-brush-recipe-form]")) return;
    const form = document.createElement("form");
    form.dataset.brushRecipeForm = "";
    form.className = "mt-2 flex items-center gap-1";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 28;
    input.required = true;
    input.placeholder = "Recipe name";
    input.setAttribute("aria-label", "New brush recipe name");
    input.className = "h-8 min-w-0 flex-1 rounded border border-line bg-bg px-2 text-xs text-fg outline-none focus:border-accent";
    input.addEventListener("input", () => input.setCustomValidity(""));
    const save = document.createElement("button");
    save.type = "submit";
    save.textContent = "Save";
    save.className = "h-8 rounded bg-accent px-2 text-xs font-semibold text-accent-ink";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.className = "h-8 rounded bg-surface-2 px-2 text-xs text-fg";
    cancel.addEventListener("click", () => form.remove());
    form.append(input, save, cancel);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = input.value.trim();
      if (!name) return input.focus();
      const recipe = captureCurrentRecipe(name);
      if (!recipe) return input.setCustomValidity("Choose a brush and wait for the controls to finish loading.");
      customRecipes.push(recipe);
      if (!persistCustomRecipes()) {
        customRecipes.pop();
        input.setCustomValidity("Browser storage is unavailable; this recipe could not be saved.");
        input.reportValidity();
        return;
      }
      recipes.push(recipe);
      form.remove();
      renderRecipeLists();
      document.querySelectorAll("[data-brush-recipe-status]").forEach((status) => {
        status.textContent = `${name} recipe saved`;
      });
    });
    panel.append(form);
    input.focus();
  }

  function addSaveButton(panel, compact = false) {
    const save = document.createElement("button");
    save.type = "button";
    save.dataset.brushRecipeSave = "";
    save.textContent = "Save current brush…";
    save.className = compact
      ? "shrink-0 rounded-md border border-line px-2 py-1 text-xs text-muted hover:bg-bg hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      : "mt-2 w-full rounded-md border border-line px-2 py-1 text-left text-xs text-muted hover:bg-bg hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";
    save.addEventListener("click", () => showSaveForm(panel));
    panel.append(save);
  }

  function renderRecipeLists() {
    document.querySelectorAll("[data-brush-recipe-list]").forEach((list) => {
      list.replaceChildren(...recipes.map((recipe) => makeRecipeControl(recipe, list.dataset.brushRecipeList === "mobile")));
    });
  }

  function ensureRecipes() {
    const brushGrid = brushControls();
    if (brushGrid && !brushGrid.parentElement.querySelector("[data-brush-recipes=desktop]")) {
      const panel = document.createElement("div");
      panel.dataset.brushRecipes = "desktop";
      panel.className = "mt-3 border-t border-line pt-3";
      const title = document.createElement("p");
      title.dataset.brushRecipeTitle = "";
      title.className = "mb-2 text-xs font-semibold tracking-wide text-muted";
      title.textContent = "Quick recipes · Alt+1–4";
      const row = document.createElement("div");
      row.dataset.brushRecipeList = "desktop";
      row.className = "grid grid-cols-1 gap-1";
      panel.append(title, row);
      const status = document.createElement("p");
      status.dataset.brushRecipeStatus = "";
      status.className = "sr-only";
      status.setAttribute("aria-live", "polite");
      status.textContent = "Choose a quick brush recipe";
      panel.append(status);
      addSaveButton(panel);
      brushGrid.parentElement.append(panel);
      renderRecipeLists();
    }

    const footer = document.querySelector("footer.lg\\:hidden");
    if (footer && !footer.querySelector("[data-brush-recipes=mobile]")) {
      const panel = document.createElement("div");
      panel.dataset.brushRecipes = "mobile";
      panel.className = "flex items-center gap-1 overflow-x-auto border-t border-line px-2 py-1";
      panel.setAttribute("aria-label", "Quick brush recipes");
      const row = document.createElement("div");
      row.dataset.brushRecipeList = "mobile";
      row.className = "flex min-w-0 items-center gap-1";
      const status = document.createElement("span");
      status.dataset.brushRecipeStatus = "";
      status.className = "sr-only";
      status.setAttribute("aria-live", "polite");
      status.textContent = "Choose a quick brush recipe";
      panel.append(row, status);
      addSaveButton(panel, true);
      footer.insertBefore(panel, footer.children[1] || null);
      renderRecipeLists();
    }
  }

  document.addEventListener("keydown", (event) => {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    const index = Number(event.key) - 1;
    if (index < 0 || index >= BUILTIN_RECIPES.length) return;
    event.preventDefault();
    apply(BUILTIN_RECIPES[index]);
  });

  const observer = new MutationObserver(ensureRecipes);
  const start = () => window.setTimeout(() => {
    observer.observe(document.documentElement, { childList: true, subtree: true });
    ensureRecipes();
  }, 250);
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();
