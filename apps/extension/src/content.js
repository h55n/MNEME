// Very simple content script that looks for textareas and injects a "MNEME" button next to them

function createMnemeButton(textarea) {
  // Prevent duplicate buttons
  if (textarea.dataset.mnemeAttached) return;
  textarea.dataset.mnemeAttached = "true";

  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.display = 'inline-block';
  wrapper.style.width = '100%';
  
  const btn = document.createElement('button');
  btn.innerText = '🧠 MNEME';
  btn.style.position = 'absolute';
  btn.style.right = '10px';
  btn.style.bottom = '10px';
  btn.style.zIndex = '9999';
  btn.style.background = '#171717';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.borderRadius = '4px';
  btn.style.padding = '4px 8px';
  btn.style.fontSize = '12px';
  btn.style.cursor = 'pointer';
  btn.title = 'Fetch Context from MNEME';

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const query = textarea.value || "General context for this session";
    
    btn.innerText = '🧠 Fetching...';
    btn.disabled = true;

    chrome.runtime.sendMessage({ action: 'fetchMnemeContext', query }, (response) => {
      if (chrome.runtime.lastError) {
        alert('MNEME Error: ' + chrome.runtime.lastError.message);
        btn.innerText = '🧠 MNEME';
        btn.disabled = false;
        return;
      }

      if (response && response.success) {
        const contextBlock = `\n\n[MNEME CONTEXT]\n${response.context}\n[/MNEME CONTEXT]\n`;
        
        // For React textareas, we must use a native setter to trigger events
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        nativeInputValueSetter.call(textarea, textarea.value + contextBlock);
        
        const event = new Event('input', { bubbles: true });
        textarea.dispatchEvent(event);
      } else {
        alert('MNEME Failed: ' + (response?.error || 'Unknown error'));
      }

      btn.innerText = '🧠 MNEME';
      btn.disabled = false;
    });
  });

  textarea.parentNode.insertBefore(wrapper, textarea);
  wrapper.appendChild(textarea);
  wrapper.appendChild(btn);
}

// Observe DOM for newly added textareas (SPAs like ChatGPT/Claude)
const observer = new MutationObserver((mutations) => {
  const textareas = document.querySelectorAll('textarea');
  textareas.forEach(createMnemeButton);
});

observer.observe(document.body, { childList: true, subtree: true });

// Run once on load
document.querySelectorAll('textarea').forEach(createMnemeButton);
