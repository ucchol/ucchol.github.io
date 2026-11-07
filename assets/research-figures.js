(function () {
  "use strict";
  // Reported results: https://github.com/ucchol/network-defense-rl (3 Nov 2026).
  const networkLoss = {
    small: [["QSE", 5.1], ["PPO", 5.4], ["PPO-DR", 5.8], ["DQN", 7.2], ["Greedy value", 7.0]],
    large: [["QSE", 3.9], ["PPO", 15.8], ["PPO-DR", 4.5], ["DQN", 14.7], ["Greedy value", 4.6]]
  };
  // Paired family-level recall: https://github.com/ucchol/nxdomain-sentinel.
  const familyRecall = {
    vawtrak: [0.7017, 0.0147], qadars: [0.9403, 0.3542],
    kraken: [0.6033, 0.2299], pykspa: [0.7592, 0.4170],
    simda: [0.3563, 0.0293], murofet: [0.9685, 0.9687],
    necurs: [0.7576, 0.7931], suppobox: [0.0028, 0.0000]
  };
  function logitProbabilities(utilities, sensitivity) {
    const scaled = utilities.map(u => u * sensitivity);
    const max = Math.max(...scaled);
    const weights = scaled.map(u => Math.exp(u - max));
    const total = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => w / total);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { logitProbabilities, networkLoss, familyRecall };
  }
  if (typeof document === "undefined") return;

  function drawBars(container, rows, maximum, decimals) {
    container.replaceChildren();
    const summary = [];
    rows.forEach((row, i) => {
      const wrapper = document.createElement("div");
      wrapper.className = "bar-row";
      const label = document.createElement("span");
      label.className = "bar-label";
      label.textContent = row[0];
      if (row[2]) {
        const small = document.createElement("small");
        small.textContent = row[2];
        label.append(small);
      }
      const track = document.createElement("span");
      track.className = "bar-track";
      track.setAttribute("aria-hidden", "true");
      const fill = document.createElement("span");
      fill.className = "bar-fill" + (i === 1 ? " secondary" : i === 2 ? " tertiary" : "");
      fill.style.width = Math.max(0, Math.min(100, row[1] / maximum * 100)) + "%";
      track.append(fill);
      const value = document.createElement("span");
      value.className = "bar-value";
      value.textContent = row[1].toFixed(decimals) + "%";
      summary.push(row[0] + ": " + value.textContent);
      wrapper.append(label, track, value);
      container.append(wrapper);
    });
    container.setAttribute("aria-label", summary.join("; "));
  }

  const qse = document.querySelector('[data-figure="qse"]');
  if (qse) {
    const slider = qse.querySelector("#qse-lambda");
    function updateQse() {
      const sensitivity = Number(slider.value);
      const probabilities = logitProbabilities([1, 2, 3], sensitivity);
      qse.querySelector("#qse-lambda-value").textContent = sensitivity.toFixed(2);
      drawBars(qse.querySelector("[data-qse-chart]"),
        probabilities.map((p, i) => ["Target " + "ABC"[i], p * 100, "Utility " + (i + 1)]), 100, 1);
      qse.querySelector("[data-qse-reading]").textContent = sensitivity === 0
        ? "At λ = 0, all three targets are equally likely, regardless of their utilities."
        : "At λ = " + sensitivity.toFixed(2) + ", Target C receives " + (probabilities[2] * 100).toFixed(1) + "% of choices. Higher sensitivity concentrates choices on the target with the highest utility.";
    }
    slider.addEventListener("input", updateQse);
    qse.querySelector("[data-reset-qse]").addEventListener("click", () => { slider.value = "1"; updateQse(); });
    updateQse();
  }

  const choice = document.querySelector('[data-figure="choice"]');
  if (choice) {
    const options = choice.querySelector("#choice-options");
    const attributes = choice.querySelector("#choice-attributes");
    const table = choice.querySelector("[data-choice-table]");
    let selected = null;
    function updateChoice() {
      const count = Number(options.value), width = Number(attributes.value);
      if (selected !== null && selected >= count) selected = null;
      table.innerHTML = '<caption class="visually-hidden">Illustrative target attributes, values from 1 to 9</caption>';
      const head = document.createElement("thead");
      const header = document.createElement("tr");
      ["Target", ...Array.from({ length: width }, (_, i) => "A" + (i + 1))].forEach(text => {
        const cell = document.createElement("th");
        cell.scope = "col";
        cell.textContent = text;
        header.append(cell);
      });
      head.append(header);
      const body = document.createElement("tbody");
      for (let i = 0; i < count; i++) {
        const row = document.createElement("tr");
        row.dataset.selected = String(selected === i);
        const label = document.createElement("th");
        label.scope = "row";
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Target " + (i + 1);
        button.dataset.target = String(i);
        button.setAttribute("aria-pressed", String(selected === i));
        label.append(button);
        row.append(label);
        for (let j = 0; j < width; j++) {
          const value = ((i * 7 + j * 5 + i * j * 3) % 9) + 1;
          const cell = document.createElement("td");
          cell.textContent = value;
          cell.style.backgroundColor = "hsl(140 20% " + (98 - value * 3.4) + "%)";
          row.append(cell);
        }
        body.append(row);
      }
      table.append(head, body);
      updateChoiceReading(count, width);
    }
    function updateChoiceReading(count, width) {
      choice.querySelector("[data-choice-reading]").textContent =
        count + " options × " + width + " attributes = " + count * width + " values to compare." +
        (selected === null ? " Select a target to highlight its information." : " Target " + (selected + 1) + " is selected.");
    }
    // Update selection in place so keyboard focus stays on the chosen target.
    table.addEventListener("click", event => {
      const button = event.target.closest("button[data-target]");
      if (!button) return;
      selected = Number(button.dataset.target);
      table.querySelectorAll("button[data-target]").forEach(item => {
        const active = Number(item.dataset.target) === selected;
        item.setAttribute("aria-pressed", String(active));
        item.closest("tr").dataset.selected = String(active);
      });
      updateChoiceReading(Number(options.value), Number(attributes.value));
    });
    options.addEventListener("change", updateChoice);
    attributes.addEventListener("change", updateChoice);
    updateChoice();
  }

  const rl = document.querySelector('[data-figure="rl"]');
  if (rl) {
    const select = rl.querySelector("#rl-size");
    function updateRl() {
      drawBars(rl.querySelector("[data-rl-chart]"), networkLoss[select.value], 20, 1);
      rl.querySelector("[data-rl-reading]").textContent = select.value === "small"
        ? "On 8–14 nodes, PPO and QSE lose similar amounts of network value."
        : "On 15–20 nodes, PPO loses 15.8% of network value. PPO-DR, trained across the full size range, loses 4.5%.";
    }
    select.addEventListener("change", updateRl);
    updateRl();
  }

  const nx = document.querySelector('[data-figure="nx"]');
  if (nx) {
    const select = nx.querySelector("#nx-family");
    function updateNx() {
      const values = familyRecall[select.value];
      drawBars(nx.querySelector("[data-nx-chart]"), [
        ["In training", values[0] * 100], ["Held out", values[1] * 100]
      ], 100, 2);
      const difference = (values[0] - values[1]) * 100;
      nx.querySelector("[data-nx-reading]").textContent = select.value === "suppobox"
        ? "Suppobox recall is almost zero in both conditions. For this dictionary-based family, the problem persists even when it is represented in training."
        : difference >= 0
          ? "For " + select.value + ", holding the family out reduces recall by " + difference.toFixed(2) + " percentage points."
          : "For " + select.value + ", held-out recall is " + (-difference).toFixed(2) + " percentage points higher. The effect of withholding a family is not uniform.";
    }
    select.addEventListener("change", updateNx);
    updateNx();
  }
})();
