from typing import Any, Dict, Optional

try:
    from langgraph.graph import StateGraph
except ImportError:
    StateGraph = None

from ..client import MnemeClient


class MnemeMemoryPlugin:
    """
    A LangGraph node that automatically fetches relevant context and writes state changes.
    """

    def __init__(
        self,
        vault_id: str,
        api_key: Optional[str] = None,
        budget_tokens: int = 1500,
        state_key: str = "messages",
        base_url: str = "https://api.mneme.dev/v1",
    ):
        if StateGraph is None:
            raise ImportError(
                "langgraph is not installed. Please install it using `pip install langgraph`."
            )

        self.client = MnemeClient(api_key=api_key, vault_id=vault_id, base_url=base_url)
        self.budget_tokens = budget_tokens
        self.state_key = state_key

    def __call__(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Invoked as a node in the LangGraph execution.
        Reads the latest message, fetches MNEME context, and updates the state.
        """
        messages = state.get(self.state_key, [])
        if not messages:
            return {}

        latest = messages[-1]
        if isinstance(latest, dict):
            latest_message = latest.get("content", "")
        else:
            latest_message = getattr(latest, "content", latest)
        if not isinstance(latest_message, str) or not latest_message.strip():
            return {}

        # 1. Fetch relevant memory context for this turn
        recall = self.client.recall(query=latest_message, budget_tokens=self.budget_tokens)

        context_str = "\n".join([f"[{m.type.upper()}] {m.content}" for m in recall.memories])

        # 3. Store the latest interaction synchronously; surface failures to the caller
        self.client.write(content=latest_message, hint_type="working")

        return {"mneme_context": context_str}
