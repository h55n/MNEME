document.addEventListener('DOMContentLoaded', () => {
  const fields = Object.fromEntries(['apiUrl', 'apiKey', 'vaultId', 'budgetTokens']
    .map(id => [id, document.getElementById(id)]));
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');
  function show(message, error = false) {
    status.textContent = message;
    status.className = error ? 'status-error' : 'status-visible';
  }
  chrome.storage.local.get(Object.keys(fields), items => {
    for (const [key, value] of Object.entries(items)) if (fields[key]) fields[key].value = value;
  });
  saveBtn.addEventListener('click', async () => {
    try {
      const apiUrl = fields.apiUrl.value.trim();
      const apiKey = fields.apiKey.value.trim();
      const vaultId = fields.vaultId.value.trim();
      const budgetTokens = Number(fields.budgetTokens.value);
      const url = new URL(apiUrl);
      const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (url.username || url.password || url.search || url.hash ||
          (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))) {
        throw new Error('Use HTTPS, or HTTP on localhost.');
      }
      if (!apiKey || !vaultId) throw new Error('API key and vault ID are required.');
      if (!Number.isInteger(budgetTokens) || budgetTokens < 1 || budgetTokens > 100000) {
        throw new Error('Budget must be 1 to 100000 tokens.');
      }
      const granted = await chrome.permissions.request({ origins: [`${url.origin}/*`] });
      if (!granted) throw new Error('API host permission was not granted.');
      await chrome.storage.local.set({ apiUrl: url.href.replace(/\/$/, ''), apiKey, vaultId, budgetTokens });
      // Old releases synced keys across browsers. Remove any legacy synced config.
      await chrome.storage.sync.remove(Object.keys(fields));
      show('Saved on this device.');
    } catch (error) {
      show(error.message, true);
    }
  });
});
