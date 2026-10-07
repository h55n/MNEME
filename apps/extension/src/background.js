chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== 'fetchMnemeContext') return false;
  handleFetchContext(request.query)
    .then(context => sendResponse({ success: true, context }))
    .catch(() => sendResponse({ success: false, error: 'Recall failed. Check your endpoint, vault and key.' }));
  return true;
});

async function handleFetchContext(query) {
  const config = await chrome.storage.local.get(['apiUrl', 'apiKey', 'vaultId', 'budgetTokens']);
  if (!config.apiKey || !config.vaultId || !config.apiUrl) {
    throw new Error('Configure an API endpoint, key and vault.');
  }
  if (typeof query !== 'string' || !query.trim() || query.length > 1000) {
    throw new Error('Query must contain 1 to 1000 characters.');
  }
  const url = new URL(config.apiUrl);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))) {
    throw new Error('Use HTTPS or a local development endpoint.');
  }
  const permission = `${url.origin}/*`;
  if (!await chrome.permissions.contains({ origins: [permission] })) {
    throw new Error('API host access is not granted.');
  }
  const budget = Number(config.budgetTokens ?? 1000);
  if (!Number.isInteger(budget) || budget < 1 || budget > 100000) {
    throw new Error('Invalid token budget.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const endpoint = `${url.href.replace(/\/$/, '')}/vaults/${encodeURIComponent(config.vaultId)}/memories/recall`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify({ query, budget_tokens: budget, task_scope: 'chat_session' }),
      signal: controller.signal,
      redirect: 'error'
    });
    if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
    const result = await response.json();
    if (result.success !== true || !Array.isArray(result.data?.memories)) {
      throw new Error('Invalid recall response.');
    }
    const memories = result.data.memories;
    if (!memories.length) return 'No relevant memories found.';
    return memories.map(m => {
      if (typeof m.content !== 'string' || typeof m.type !== 'string') {
        throw new Error('Invalid memory response.');
      }
      return `[${m.type.toUpperCase()}] ${m.content}`;
    }).join('\n');
  } finally {
    clearTimeout(timer);
  }
}
