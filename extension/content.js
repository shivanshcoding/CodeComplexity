// Content script: detect selected code-like text and notify background
(function () {
  let lastSent = '';

  function isCodeLike(text) {
    if (!text || text.length < 20) return false;
    const hasSymbols = /[{}()\[\]=;<>]/.test(text);
    return hasSymbols;
  }

  function getSelectionText() {
    try {
      const sel = window.getSelection();
      return sel ? String(sel.toString()) : '';
    } catch (e) {
      return '';
    }
  }

  function handleMouseUp() {
    const text = getSelectionText().trim();
    if (!isCodeLike(text)) return;
    if (text === lastSent) return;
    lastSent = text;
    chrome.runtime.sendMessage({ action: 'code-selected', code: text });
  }

  window.addEventListener('mouseup', handleMouseUp, { passive: true });
})();
