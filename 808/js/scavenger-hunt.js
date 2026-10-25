(() => {
  "use strict";

  const REQUIRED_PLANTS = 8;
  const plantCards = Array.from(document.querySelectorAll(".plant-card"));
  const countLabel = document.getElementById("selection-count");
  const targetLabel = document.getElementById("selection-target");
  const progressFill = document.getElementById("progress-fill");
  const submitButton = document.getElementById("submit-button");
  const submitHint = document.getElementById("submit-hint");
  const announcement = document.getElementById("announcement");

  const selectedPlants = new Set();

  function updateSelectionUI() {
    const count = selectedPlants.size;
    const remaining = Math.max(0, REQUIRED_PLANTS - count);
    const unlocked = count >= REQUIRED_PLANTS;

    countLabel.textContent = `${count} ${count === 1 ? "plant" : "plants"} selected`;
    targetLabel.textContent = unlocked ? "Ready to continue" : `${remaining} needed`;
    progressFill.style.width = `${Math.min(100, (count / REQUIRED_PLANTS) * 100)}%`;

    submitButton.disabled = !unlocked;
    submitButton.classList.toggle("is-ready", unlocked);
    submitHint.textContent = unlocked
      ? `${count} selected — continue to the record inventory`
      : `Select ${remaining} more ${remaining === 1 ? "plant" : "plants"} to unlock`;

    announcement.textContent = unlocked
      ? `${count} plants selected. Submit is ready.`
      : `${count} plants selected. Select ${remaining} more to unlock submit.`;
  }

  plantCards.forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.plantId;
      if (selectedPlants.has(id)) {
        selectedPlants.delete(id);
        card.classList.remove("is-selected");
        card.setAttribute("aria-pressed", "false");
      } else {
        selectedPlants.add(id);
        card.classList.add("is-selected");
        card.setAttribute("aria-pressed", "true");
        // Restart the sheen animation when the user selects the card.
        card.classList.remove("sheen-restart");
        void card.offsetWidth;
      }
      updateSelectionUI();
    });
  });

  submitButton.addEventListener("click", () => {
    if (selectedPlants.size < REQUIRED_PLANTS) return;
    // Keep the selection count available on the completion page for future use.
    const selected = Array.from(selectedPlants);
    try {
      sessionStorage.setItem("808-selected-plants", JSON.stringify(selected));
    } catch (_) {
      // The completion page still works if browser storage is unavailable.
    }
    window.location.href = "completion.html";
  });

  updateSelectionUI();
})();
