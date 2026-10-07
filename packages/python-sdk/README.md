# MNEME Python SDK

The official Python SDK for MNEME, the context-aware memory router for AI agents.

## Installation

```bash
pip install mneme
```

For specific framework integrations:
```bash
pip install mneme[langgraph]
pip install mneme[crewai]
pip install mneme[autogen]
```

## Endpoint and timeout

The default endpoint is `https://api.mneme.dev/v1`. If you run your own API,
pass `base_url` to `MnemeClient` or any adapter. Requests use a 30-second timeout;
pass `timeout` to the client to change it. Call `client.close()` when finished.

```python
from mneme import MnemeClient

client = MnemeClient(api_key="your-key", vault_id="your-vault", base_url="http://localhost:3001/v1")
try:
    client.write("Home city is Pune", hint_type="semantic")
    result = client.recall("Where is home?", budget_tokens=500)
finally:
    client.close()
```

## Framework compatibility

- LangGraph: the node returns only `mneme_context`, not the input messages.
  Include that key in your graph state and pass it to your model explicitly.
  The latest text message is stored synchronously as working memory. Failures
  propagate to the graph caller.
- AutoGen: this adapter uses `pyautogen` 0.2.35 through 0.2.x. It adds context
  to the current reply's message list without changing the system message or
  conversation log. It recalls only. Store useful replies explicitly with
  `agent.mneme.write(...)`. It does not support the newer AutoGen AgentChat API.
- CrewAI: the legacy short-term-memory adapter is tested with CrewAI 0.80.0
  (Python 3.10+). Newer CrewAI versions changed their memory API, so this extra
  pins the tested version. `save` accepts CrewAI's `agent` argument, but agent
  and metadata are not persisted by this adapter. `search` returns ranked
  context with a configurable limit. `score_threshold` is accepted for signature
  compatibility but not applied, as MNEME does not expose similarity scores.

## Development checks

```bash
pip install -e '.[langgraph,autogen,crewai]' pytest ruff mypy types-requests
pytest
ruff check .
ruff format --check .
mypy src --ignore-missing-imports --follow-imports skip
```

Tests use the actual framework classes with mocked recall/write calls, plus a
local HTTP server for the client round trip. They do not call a hosted API or a
paid model, and do not prove end-to-end model quality.
