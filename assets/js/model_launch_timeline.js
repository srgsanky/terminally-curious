(() => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const providers = [
    { name: "OpenAI", label: "OpenAI", color: "var(--launch-openai)" },
    { name: "Anthropic", label: "Anthropic", color: "var(--launch-anthropic)" },
    { name: "Google", label: "Gemini", color: "var(--launch-google)" },
  ];
  const formatDate = (date) => `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;

  function appendSVG(parent, tag, attributes = {}, text) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [name, value] of Object.entries(attributes)) {
      node.setAttribute(name, String(value));
    }
    if (text !== undefined) node.textContent = text;
    parent.append(node);
    return node;
  }

  for (const root of document.querySelectorAll(".model-launch-timeline")) {
    if (root.dataset.ready) continue;
    root.dataset.ready = "true";
    // The build-time table is the accessible, no-JavaScript source of truth.
    const events = Array.from(root.querySelectorAll("tbody tr"), (row) => {
      const link = row.querySelector("a");
      return {
        date: new Date(`${row.dataset.date}T00:00:00Z`),
        company: row.dataset.company,
        label: link.textContent,
        url: link.href,
        detail: row.querySelector(".model-launch-detail").textContent,
      };
    });
    if (!events.length) continue;

    const asOf = new Date(`${root.dataset.asOf}T00:00:00Z`);
    const firstYear = Math.min(...events.map((event) => event.date.getUTCFullYear()));
    const lastYear = asOf.getUTCFullYear();
    const chart = root.querySelector(".model-launch-chart");
    const host = root.querySelector(".model-launch-strips");
    const tooltip = root.querySelector(".model-launch-tooltip");
    let activeTrigger = null;
    let lastWidth = -1;

    function hideTooltip() {
      activeTrigger?.removeAttribute("aria-describedby");
      activeTrigger = null;
      tooltip.hidden = true;
    }

    function showTooltip(trigger) {
      hideTooltip();
      activeTrigger = trigger;
      tooltip.textContent = trigger.dataset.launchInfo;
      tooltip.hidden = false;
      trigger.setAttribute("aria-describedby", tooltip.id);
      const rect = trigger.getBoundingClientRect();
      const width = tooltip.offsetWidth;
      const height = tooltip.offsetHeight;
      const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8));
      const top = rect.top >= height + 8 ? rect.top - height - 8 : rect.bottom + 8;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${Math.max(8, Math.min(top, window.innerHeight - height - 8))}px`;
    }

    function draw() {
      const width = host.getBoundingClientRect().width;
      if (!width || Math.abs(width - lastWidth) < 1) return;
      lastWidth = width;
      hideTooltip();
      host.replaceChildren();
      const left = 76;
      const right = width - 12;

      for (let year = firstYear; year <= lastYear; year++) {
        const section = document.createElement("section");
        section.className = "model-launch-year";
        const heading = document.createElement("h3");
        heading.textContent = year;
        section.append(heading);
        host.append(section);
        const svg = appendSVG(section, "svg", {
          role: "group",
          "aria-label": `${year} model launches by month: OpenAI, Anthropic and Google Gemini`,
        });
        appendSVG(svg, "title", {}, `${year} model launch timeline`);
        const start = Date.UTC(year, 0, 1);
        // Use complete calendar months; extending asOf also extends the final axis.
        const end = year === lastYear
          ? Date.UTC(year, asOf.getUTCMonth() + 1, 1)
          : Date.UTC(year + 1, 0, 1);
        const scale = (date) => left + (Number(date) - start) / (end - start) * (right - left);
        appendSVG(svg, "line", { class: "launch-structure", x1: left, x2: right, y1: 24, y2: 24 });
        months.forEach((month, index) => {
          const tick = Date.UTC(year, index, 1);
          if (tick >= end || (width < 620 && index % 3 !== 0)) return;
          appendSVG(svg, "text", {
            class: "launch-axis", x: scale(tick), y: 13, "text-anchor": "middle",
          }, month);
        });

        let baseline = 66;
        providers.forEach((provider, index) => {
          const lane = events.filter((event) => event.date.getUTCFullYear() === year && event.company === provider.name);
          lane.sort((a, b) => a.date - b.date);
          const levels = [];
          const placed = lane.map((event) => {
            const measure = appendSVG(svg, "text", {}, event.label);
            const textWidth = measure.getComputedTextLength();
            measure.remove();
            const x = scale(event.date);
            const labelX = Math.max(left, Math.min(x - textWidth / 2, right - textWidth));
            let level = levels.findIndex((last) => last + 8 <= labelX);
            if (level < 0) level = levels.length;
            levels[level] = labelX + textWidth;
            return { event, x, labelX, level };
          });
          appendSVG(svg, "text", { x: 0, y: baseline + 4 }, provider.label);
          appendSVG(svg, "line", { class: "launch-structure", x1: left, x2: right, y1: baseline, y2: baseline });

          for (const { event, x, labelX, level } of placed) {
            const y = baseline + 26 + level * 24;
            const info = `${provider.label} ${event.label} · ${formatDate(event.date)} · ${event.detail}`;
            appendSVG(svg, "path", { class: "launch-structure", d: `M${x},${baseline + 6} V${y - 13}` });
            // Markers expose details without navigating, including on touch screens.
            const marker = appendSVG(svg, "g", {
              class: "launch-marker", role: "button", tabindex: 0,
              "aria-label": info, "data-launch-info": info,
            });
            if (index === 0) {
              appendSVG(marker, "rect", { x: x - 4, y: baseline - 4, width: 8, height: 8, fill: provider.color });
            } else if (index === 1) {
              appendSVG(marker, "circle", { cx: x, cy: baseline, r: 4, fill: provider.color });
            } else {
              appendSVG(marker, "path", {
                d: `M${x},${baseline - 5} L${x + 5},${baseline} L${x},${baseline + 5} L${x - 5},${baseline} Z`,
                fill: provider.color,
              });
            }
            appendSVG(marker, "rect", { x: x - 16, y: baseline - 16, width: 32, height: 32, fill: "transparent" });
            const link = appendSVG(svg, "a", {
              href: event.url, target: "_blank", rel: "noopener noreferrer",
              "aria-label": `${info}. Open source.`, "data-launch-info": info,
            });
            appendSVG(link, "text", { x: labelX, y }, event.label);
          }
          baseline += Math.max(1, levels.length) * 24 + 53;
        });
        svg.setAttribute("viewBox", `0 0 ${width} ${baseline - 20}`);
        svg.setAttribute("height", baseline - 20);
      }
    }

    const getTrigger = (event) => event.target.closest?.("[data-launch-info]");
    root.addEventListener("pointerover", (event) => {
      const trigger = getTrigger(event);
      if (trigger && event.pointerType !== "touch") showTooltip(trigger);
    });
    root.addEventListener("pointerout", (event) => {
      if (activeTrigger && event.pointerType !== "touch" && !activeTrigger.contains(event.relatedTarget)) hideTooltip();
    });
    root.addEventListener("focusin", (event) => {
      const trigger = getTrigger(event);
      if (trigger) showTooltip(trigger);
    });
    root.addEventListener("focusout", hideTooltip);
    root.addEventListener("click", (event) => {
      const trigger = getTrigger(event);
      if (trigger?.matches(".launch-marker")) showTooltip(trigger);
    });
    root.addEventListener("keydown", (event) => {
      const trigger = getTrigger(event);
      if (event.key === "Escape") hideTooltip();
      if (trigger?.matches(".launch-marker") && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        showTooltip(trigger);
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (!getTrigger(event)) hideTooltip();
    });
    window.addEventListener("scroll", hideTooltip, true);
    window.addEventListener("resize", hideTooltip);

    chart.hidden = false;
    draw();
    root.querySelector(".model-launch-sources").open = false;
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(draw).observe(host);
    } else {
      window.addEventListener("resize", draw);
    }
  }
})();
