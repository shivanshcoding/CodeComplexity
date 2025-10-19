// Side panel script: render code, call backend, and render Markdown results
(function () {
  const MIN_CHARS = 20;
  const loadingEl = document.getElementById('loading');
  const analysisEl = document.getElementById('analysis');
  const editorEl = document.getElementById('editor');
  const wrapEl = document.querySelector('.editor-wrap');
  const gutterEl = document.getElementById('gutter');
  const toggleBtn = document.getElementById('toggle-size');
  const clearBtn = document.getElementById('clear-btn');
  const analyzeBtn = document.getElementById('analyze-btn');
  const charHint = document.getElementById('char-hint');

  function safeSendMessage(msg) {
    try {
      chrome.runtime.sendMessage(msg, () => void chrome.runtime.lastError);
    } catch (_) {
      // Extension context could be invalidated; ignore
    }
  }

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

  // Utility: auto-resize textarea so wrapper scrolls instead of textarea
  function autoGrow() {
    editorEl.style.height = 'auto';
    editorEl.style.height = Math.max(120, editorEl.scrollHeight) + 'px';
  }

  function updateLineNumbers() {
    const lines = (editorEl.value || '').split(/\r?\n/).length;
    let out = '';
    for (let i = 1; i <= lines; i++) out += i + '\n';
    gutterEl.textContent = out;
  }

  // Simple language detection for code-like checks
  function detectLang(code) {
    const s = code.slice(0, 1000);
    if (/^\s*#include\b|std::|<iostream>/.test(s)) return 'cpp';
    if (/\bpublic\s+class\b|System\.out|import\s+java\./.test(s)) return 'java';
    if (/\bpackage\b|\bfunc\s+\w+\(|\bfmt\.|\bgo\s+mod\b/.test(s)) return 'go';
    if (/\bdef\s+\w+\(|\bimport\s+\w+|\bself\b|:\s*$/.test(s)) return 'py';
    if (/\bint\s+main\s*\(|printf\s*\(/.test(s)) return 'c';
    if (/\bfunction\b|=>|\bconst\b|\blet\b|console\./.test(s)) return 'js';
    return 'js';
  }

  function isCodeLike(text) {
    if (!text || text.trim().length < MIN_CHARS) return false;
    if (/[{}()\[\]=;<>]/.test(text)) return true;
    // keywords heuristic
    const kw = /(function|def|class|return|if|else|for|while|switch|case|try|catch|import|include|public|private|static|void|int|float|double|bool|struct|enum|package|interface)\b/;
    return kw.test(text);
  }

  // No overlay highlighting anymore (single textarea)

  function setEditor(code) {
    if (typeof code === 'string') {
      editorEl.value = code;
      autoGrow();
      updateLineNumbers();
      updateCharHint();
    }
  }

  function updateEditorMode(collapsed) {
    if (!wrapEl) return;
    if (collapsed) {
      wrapEl.classList.add('collapsed');
      if (toggleBtn) { toggleBtn.textContent = '+'; toggleBtn.title = 'Expand'; toggleBtn.setAttribute('aria-label', 'Expand editor'); }
    } else {
      wrapEl.classList.remove('collapsed');
      if (toggleBtn) { toggleBtn.textContent = '−'; toggleBtn.title = 'Shrink'; toggleBtn.setAttribute('aria-label', 'Shrink editor'); }
    }
  }

  function updateCharHint() {
    const val = editorEl.value || '';
    const len = val.length;
    const lenOk = len >= MIN_CHARS;
    const codeOk = isCodeLike(val);
    if (!lenOk) {
      charHint.textContent = `Min ${MIN_CHARS} chars • Current: ${len}`;
      charHint.style.color = '#ff7e7e';
      analyzeBtn.disabled = true;
    } else if (!codeOk) {
      charHint.textContent = 'This does not look like code. Please paste valid code.';
      charHint.style.color = '#ff7e7e';
      analyzeBtn.disabled = true;
    } else {
      charHint.textContent = `Looks good • ${len} chars`;
      charHint.style.color = '';
      analyzeBtn.disabled = false;
    }
  }

  function handleIndent(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editorEl.selectionStart;
      const end = editorEl.selectionEnd;
      const val = editorEl.value;
      editorEl.value = val.slice(0, start) + '  ' + val.slice(end);
      editorEl.selectionStart = editorEl.selectionEnd = start + 2;
      updateHighlight();
      updateCharHint();
    } else if (e.key === 'Enter') {
      const start = editorEl.selectionStart;
      const val = editorEl.value;
      const before = val.slice(0, start);
      const lineStart = before.lastIndexOf('\n') + 1;
      const line = before.slice(lineStart);
      const indent = (line.match(/^\s+/) || [''])[0];
      const extra = /[{(:\[]\s*$/.test(line) ? '  ' : '';
      e.preventDefault();
      const insertion = '\n' + indent + extra;
      editorEl.value = val.slice(0, start) + insertion + val.slice(start);
      const pos = start + insertion.length;
      editorEl.selectionStart = editorEl.selectionEnd = pos;
      updateHighlight();
      updateCharHint();
    }
  }

  async function startAnalysis(overrideCode) {
    try {
      let code = (overrideCode || '').trim();
      if (!code) {
        const { selectedCode } = await chrome.storage.local.get(['selectedCode']);
        code = (selectedCode || '').trim();
      }
      if (!code) {
        analysisEl.innerText = `No code available. Select a code block (${MIN_CHARS}+ chars) or paste in the editor.`;
        return;
      }
      if (!isCodeLike(code)) {
        analysisEl.innerText = 'This does not look like code. Please paste valid code.';
        setEditor(code);
        return;
      }
      setEditor(code);
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

  // Wire up UI
  toggleBtn.addEventListener('click', () => {
    const isCollapsed = wrapEl.classList.contains('collapsed');
    updateEditorMode(!isCollapsed);
  });

  clearBtn.addEventListener('click', () => {
    editorEl.value = '';
    analysisEl.innerHTML = '';
    autoGrow();
    updateLineNumbers();
    updateCharHint();
  });

  analyzeBtn.addEventListener('click', () => {
    const edited = (editorEl.value || '').trim();
    if (edited.length < MIN_CHARS) {
      updateCharHint();
      return;
    }
    startAnalysis(edited);
  });

  editorEl.addEventListener('input', () => { autoGrow(); updateLineNumbers(); updateCharHint(); });
  editorEl.addEventListener('keydown', handleIndent);
  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.action === 'start-analysis') {
      startAnalysis();
    }
  });

  function init() {
    autoGrow();
    updateLineNumbers();
    updateCharHint();
    // Preload any selected code into editor for immediate visibility
    try {
      chrome.storage.local.get(['selectedCode'], ({ selectedCode }) => {
        if (selectedCode && typeof selectedCode === 'string' && selectedCode.trim().length) {
          setEditor(selectedCode);
        }
      });
    } catch (_) {}
    safeSendMessage({ action: 'panel-ready' });
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => { init(); updateEditorMode(false); });
  } else {
    init();
    updateEditorMode(false);
  }
})();
