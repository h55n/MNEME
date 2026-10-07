from typing import Any, Dict, List, Optional

try:
    from autogen import ConversableAgent
except ImportError:
    ConversableAgent = object

from ..client import MnemeClient


class MnemeConversableAgent(ConversableAgent):
    """Recall context for each turn without changing persistent system messages.

    Uses the pyautogen 0.2 message-processing hook. This adapter recalls only;
    callers explicitly store useful replies through ``agent.mneme.write``.
    """

    def __init__(
        self,
        name: str,
        vault_id: str,
        api_key: Optional[str] = None,
        budget_tokens: int = 1500,
        base_url: str = "http://localhost:3001/v1",
        **kwargs,
    ):
        if ConversableAgent is object:
            raise ImportError("Install the AutoGen adapter with `pip install mneme[autogen]`.")
        super().__init__(name=name, **kwargs)
        self.mneme = MnemeClient(api_key=api_key, vault_id=vault_id, base_url=base_url)
        self.budget_tokens = budget_tokens
        self.register_hook("process_all_messages_before_reply", self._with_mneme_context)

    def _with_mneme_context(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not messages:
            return messages
        query = messages[-1].get("content", "")
        if not isinstance(query, str) or not query.strip():
            return messages
        recall = self.mneme.recall(query=query, budget_tokens=self.budget_tokens)
        if not recall.memories:
            return messages
        context = "\n".join(f"[{m.type.upper()}] {m.content}" for m in recall.memories)
        # The hook gets a copy for this reply. Never mutate the conversation log.
        return [{"role": "system", "content": f"[MNEME CONTEXT]\n{context}"}, *messages]
