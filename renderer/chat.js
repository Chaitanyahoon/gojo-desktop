(() => {
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");

  input.focus();

  function submit() {
    const text = input.value.trim();
    if (text) {
      window.electronAPI.submitChat(text);
      input.value = "";
    } else {
      // Shake the wrap to signal "nothing to send"
      const wrap = document.querySelector(".wrap");
      wrap.style.transition = "transform 0.06s ease";
      const shakes = ["-4px", "4px", "-3px", "3px", "0px"];
      let i = 0;
      const shake = () => {
        if (i < shakes.length) {
          wrap.style.transform = `translateX(${shakes[i++]})`;
          setTimeout(shake, 60);
        } else {
          wrap.style.transform = "";
        }
      };
      shake();
      window.electronAPI.closeChat();
    }
  }

  sendBtn.addEventListener("click", submit);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.electronAPI.closeChat();
    } else if (e.key === "Enter") {
      submit();
    }
  });
})();
