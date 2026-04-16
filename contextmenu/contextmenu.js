(() => {
  const api = window.menuAPI;

  function buildStatsBar(stats) {
    const bar = document.getElementById("statsBar");
    const defs = [
      { icon: stats.mood >= 80 ? "😎" : stats.mood >= 40 ? "🙂" : "😐",   label: "MOOD",   cls: "mood",   val: stats.mood },
      { icon: stats.energy >= 80 ? "⚡" : stats.energy >= 40 ? "🔋" : "🪫", label: "ENRGY",  cls: "energy", val: stats.energy },
      { icon: stats.hunger >= 80 ? "🍗" : stats.hunger >= 40 ? "🍱" : "🦴", label: "HUNGER", cls: "hunger", val: stats.hunger },
    ];
    bar.innerHTML = defs.map(d => `
      <div class="stat-pill">
        <span class="s-icon">${d.icon}</span>
        <span class="s-label">${d.label}</span>
        <div class="stat-bar-track"><div class="stat-bar-fill ${d.cls}" style="width:${Math.round(d.val)}%"></div></div>
        <span class="stat-val">${Math.round(d.val)}</span>
      </div>
    `).join("");
  }

  function send(action, payload) { api.action(action, payload); }
  function close() { api.close(); }

  function sep() {
    const el = document.createElement("div");
    el.className = "sep";
    return el;
  }

  // Clickable item
  function item(icon, label, onClick, opts = {}) {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <span class="item-icon">${icon}</span>
      <span class="item-label ${opts.danger ? "danger" : ""}">${label}</span>
      ${opts.shortcut ? `<span style="font-size:10px;color:rgba(255,255,255,0.2)">${opts.shortcut}</span>` : ""}
    `;
    el.addEventListener("click", e => { e.stopPropagation(); onClick(); });
    return el;
  }

  // Accordion group: header + inline children
  function accordion(icon, label, children) {
    const wrapper = document.createElement("div");

    const header = document.createElement("div");
    header.className = "item";
    const arrow = document.createElement("span");
    arrow.className = "item-arrow";
    arrow.textContent = "›";
    header.innerHTML = `<span class="item-icon">${icon}</span><span class="item-label">${label}</span>`;
    header.appendChild(arrow);

    const subContainer = document.createElement("div");
    subContainer.className = "sub-items";

    children.forEach(child => subContainer.appendChild(child));

    let open = false;
    header.addEventListener("click", e => {
      e.stopPropagation();
      open = !open;
      subContainer.classList.toggle("open", open);
      arrow.classList.toggle("open", open);
    });

    wrapper.appendChild(header);
    wrapper.appendChild(subContainer);
    return wrapper;
  }

  // Sub-item (inside accordion)
  function subItem(icon, label, onClick) {
    const el = document.createElement("div");
    el.className = "sub-item";
    el.innerHTML = `<span class="sub-item-icon">${icon}</span><span class="sub-item-label">${label}</span>`;
    el.addEventListener("click", e => { e.stopPropagation(); onClick(); });
    return el;
  }

  // Toggle item
  function toggleItem(icon, label, isOn, onToggle) {
    const el = document.createElement("div");
    el.className = "item";
    const tog = document.createElement("div");
    tog.className = `toggle ${isOn ? "on" : "off"}`;
    tog.innerHTML = `<div class="toggle-knob"></div>`;
    el.innerHTML = `<span class="item-icon">${icon}</span><span class="item-label">${label}</span>`;
    el.appendChild(tog);
    el.addEventListener("click", e => {
      e.stopPropagation();
      const next = !tog.classList.contains("on");
      tog.classList.toggle("on", next);
      tog.classList.toggle("off", !next);
      tog.querySelector(".toggle-knob").style.left = next ? "15px" : "2px";
      onToggle(next);
    });
    return el;
  }

  function buildMenu(data) {
    const { stats, settings, isSleeping } = data;
    const items = document.getElementById("items");
    items.innerHTML = "";

    buildStatsBar(stats);

    // Interact accordion
    items.appendChild(accordion("🤝", "Interact", [
      subItem("🍱", "Feed",      () => { send("feed"); close(); }),
      subItem("✋", "Pet Him",   () => { send("pet"); close(); }),
      subItem("👋", "Say Hello", () => { send("hello"); close(); }),
      subItem("💃", "Dance!",    () => { send("dance"); close(); }),
    ]));

    // Abilities accordion
    items.appendChild(accordion("⚡", "Abilities", [
      subItem("🌀", "Unlimited Void", () => { send("domain"); close(); }),
      subItem("∞",  "Infinity",       () => { send("infinity"); close(); }),
      subItem("💜", "Hollow Purple",  () => { send("challenge"); close(); }),
    ]));

    items.appendChild(sep());

    items.appendChild(toggleItem("🏃", "Run Mode",  settings.runMode,  v => send("toggle-runMode", v)));
    items.appendChild(toggleItem("😏", "Rizz Mode", settings.rizzMode, v => send("toggle-rizzMode", v)));

    items.appendChild(sep());

    items.appendChild(item("💬", "Chat with Gojo", () => { send("chat"); close(); }));

    items.appendChild(sep());

    if (isSleeping) {
      items.appendChild(item("☀️", "Wake Up",       () => { send("wake"); close(); }));
    } else {
      items.appendChild(item("😴", "Sleep",          () => { send("sleep"); close(); }));
    }
    items.appendChild(item("🎂", "Happy Birthday",   () => { send("birthday"); close(); }));

    items.appendChild(sep());

    items.appendChild(item("⚙️", "Settings...",      () => { send("settings"); close(); }));

    items.appendChild(sep());

    items.appendChild(item("🚪", "Quit",             () => { send("quit"); close(); }, { danger: true }));
  }

  api.onData(data => buildMenu(data));

  window.addEventListener("blur", () => setTimeout(close, 80));
})();
