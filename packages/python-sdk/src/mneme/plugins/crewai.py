from typing import Any, Dict, List, Optional

try:
    from crewai.memory.short_term.short_term_memory import ShortTermMemory
except ImportError:
    ShortTermMemory = object

from ..client import MnemeClient


class MnemeMemory(ShortTermMemory):
    """
    Replaces CrewAI's built-in memory component to use MNEME.
    """

    def __init__(
        self,
        vault_id: str,
        api_key: Optional[str] = None,
        budget_tokens: int = 1500,
        base_url: str = "http://localhost:3001/v1",
    ):
        if ShortTermMemory is object:
            raise ImportError(
                "crewai is not installed. Please install it using `pip install crewai`."
            )

        self.client = MnemeClient(api_key=api_key, vault_id=vault_id, base_url=base_url)
        self.budget_tokens = budget_tokens

    def save(
        self, value: str, metadata: Optional[Dict[str, Any]] = None, agent: Optional[str] = None
    ) -> None:
        """Override to save memory in MNEME"""
        # We classify agent outputs generally as 'working' or 'episodic' depending on the crewai context
        self.client.write(content=value, hint_type="episodic")

    def search(self, query: str, score_threshold: float = 0.35, limit: int = 3) -> List[Any]:
        """Return ranked context. MNEME does not expose similarity thresholds.

        ``score_threshold`` is accepted for CrewAI signature compatibility,
        but ranking and filtering are owned by the MNEME recall engine.
        No fabricated similarity score is returned.
        """
        result = self.client.recall(query=query, budget_tokens=self.budget_tokens)

        # CrewAI expects a list of dictionaries with 'context' keys usually
        return [
            {"context": m.content, "metadata": {"type": m.type}}
            for m in result.memories[: max(0, limit)]
        ]
