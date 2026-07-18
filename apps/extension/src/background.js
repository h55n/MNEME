chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchMnemeContext') {
    handleFetchContext(request.query)
      .then(context => sendResponse({ success: true, context }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});

async function handleFetchContext(query) {
  const config = await chrome.storage.sync.get(['apiUrl', 'apiKey', 'vaultId', 'budgetTokens']);
  
  if (!config.apiKey) {
    throw new Error('MNEME API Key not configured. Please click the extension icon to set it up.');
  }

  const baseUrl = config.apiUrl || 'https://mneme-five.vercel.app/api/v1';
  let endpoint = '';
  
  if (config.vaultId) {
    endpoint = `${baseUrl}/vaults/${config.vaultId}/memories/recall`;
  } else {
    // If no vaultId is specified, the GPT action endpoint handles it via API key
    endpoint = `${baseUrl}/gpt/recall`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      query,
      budget_tokens: config.budgetTokens || 1000,
      task_scope: 'chat_session'
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`MNEME API Error: ${response.status} ${errText}`);
  }

  const result = await response.json();
  
  // Handle both standard recall and GPT action formats
  const memories = result.data.memories;
  if (!memories || memories.length === 0) {
    return 'No relevant memories found.';
  }

  if (typeof memories[0] === 'string') {
    return memories.join('\n');
  }

  // Standard recall format mapping
  return memories.map(m => `[${m.type.toUpperCase()}] ${m.content}`).join('\n');
}
