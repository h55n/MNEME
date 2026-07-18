from typing import Optional, List, Dict, Any
try:
    from crewai.memory.short_term.short_term_memory import ShortTermMemory
except ImportError:
    ShortTermMemory = object

from ..client import MnemeClient

class MnemeMemory(ShortTermMemory):
    """
    Replaces CrewAI's built-in memory component to use MNEME.
    """
    def __init__(self, vault_id: str, api_key: Optional[str] = None, budget_tokens: int = 1500):
        if ShortTermMemory is object:
            raise ImportError("crewai is not installed. Please install it using `pip install crewai`.")
            
        self.client = MnemeClient(api_key=api_key, vault_id=vault_id)
        self.budget_tokens = budget_tokens
        
    def save(self, value: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Override to save memory in MNEME"""
        # We classify agent outputs generally as 'working' or 'episodic' depending on the crewai context
        self.client.write(content=value, hint_type="episodic")

    def search(self, query: str, limit: int = 3) -> List[Any]:
        """Override to retrieve context from MNEME"""
        result = self.client.recall(query=query, budget_tokens=self.budget_tokens)
        
        # CrewAI expects a list of dictionaries with 'context' keys usually
        return [{"context": m.content, "score": 1.0, "metadata": {"type": m.type}} for m in result.memories]
