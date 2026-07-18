document.addEventListener('DOMContentLoaded', () => {
  const apiUrlInput = document.getElementById('apiUrl');
  const apiKeyInput = document.getElementById('apiKey');
  const vaultIdInput = document.getElementById('vaultId');
  const budgetTokensInput = document.getElementById('budgetTokens');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');

  // Load saved settings
  chrome.storage.sync.get(['apiUrl', 'apiKey', 'vaultId', 'budgetTokens'], (items) => {
    if (items.apiUrl) apiUrlInput.value = items.apiUrl;
    if (items.apiKey) apiKeyInput.value = items.apiKey;
    if (items.vaultId) vaultIdInput.value = items.vaultId;
    if (items.budgetTokens) budgetTokensInput.value = items.budgetTokens;
  });

  saveBtn.addEventListener('click', () => {
    const apiUrl = apiUrlInput.value.trim() || 'https://mneme-five.vercel.app/api/v1';
    const apiKey = apiKeyInput.value.trim();
    const vaultId = vaultIdInput.value.trim();
    const budgetTokens = parseInt(budgetTokensInput.value, 10) || 1000;

    chrome.storage.sync.set({
      apiUrl,
      apiKey,
      vaultId,
      budgetTokens
    }, () => {
      statusEl.className = 'status-visible';
      setTimeout(() => {
        statusEl.className = 'status-hidden';
      }, 2000);
    });
  });
});
