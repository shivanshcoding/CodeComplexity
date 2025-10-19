// Side panel script: render code, call backend, and render Markdown results
(function () {
  const codeEl = document.getElementById('code-block');
  const loadingEl = document.getElementById('loading');
  const analysisEl = document.getElementById('analysis');

  function setLoading(isLoading) {
    loadingEl.style.display = isLoading ? 'block' : 'none';
    loadingEl.classList.toggle('active', isLoading);
  }

  function escapeHtml(str) {
    return str
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  // Very small Markdown-to-HTML converter for headings, paragraphs, and lists
  function simpleMarkdownToHtml(md) {
    const lines = md.split(/\r?\n/);
    const html = [];
    let inList = false;

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (line.startsWith('### ')) {
        if (inList) { html.push('</ul>'); inList = false; }
        html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
      } else if (line.startsWith('## ')) {
        if (inList) { html.push('</ul>'); inList = false; }
        html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      } else if (line.startsWith('# ')) {
        if (inList) { html.push('</ul>'); inList = false; }
        html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
      } else if (/^[-*]\s+/.test(line)) {
        if (!inList) { html.push('<ul>'); inList = true; }
        html.push(`<li>${escapeHtml(line.replace(/^[-*]\s+/, ''))}</li>`);
      } else if (line === '') {
        if (inList) { html.push('</ul>'); inList = false; }
        html.push('<p></p>');
      } else {
        html.push(`<p>${escapeHtml(line)}</p>`);
      }
    }

    if (inList) html.push('</ul>');
    return html.join('\n');
  }

  async function startAnalysis() {
    try {
      const { selectedCode } = await chrome.storage.local.get(['selectedCode']);
      const code = (selectedCode || '').trim();
      if (!code) {
        analysisEl.innerText = 'No code available. Select a code block (50+ chars) to analyze.';
        return;
      }

      // Display original code with highlighting
      codeEl.textContent = code;
      if (window.Prism && typeof window.Prism.highlightAll === 'function') {
        window.Prism.highlightAll();
      }

      setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch('http://127.0.0.1:5000/analyze-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Backend error: ${res.status} ${msg}`);
      }

      const data = await res.json();
      const md = data.analysis || '';
      const html = simpleMarkdownToHtml(md);
      analysisEl.innerHTML = html;
    } catch (e) {
      analysisEl.innerText = String(e);
    } finally {
      setLoading(false);
    }
  }

  // Listen for background instruction to start
  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.action === 'start-analysis') {
      startAnalysis();
    }
  });

  // Notify background when panel is ready
  window.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.sendMessage({ action: 'panel-ready' });
  });
})();
