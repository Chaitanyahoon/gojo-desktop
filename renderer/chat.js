(() => {
  const input = document.getElementById("chatInput");

  // Focus input automatically
  input.focus();
  window.addEventListener("blur", () => {
    // If user clicks away without submitting, optionally close or just hide
    // For now we'll keep it open until they hit Esc or Enter empty
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.electronAPI.closeChat();
    } else if (e.key === "Enter") {
      const text = input.value.trim();
      if (text) {
        window.electronAPI.submitChat(text);
        input.value = "";
      } else {
        window.electronAPI.closeChat();
      }
    }
  });

})();
