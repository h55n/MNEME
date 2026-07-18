from typing import Optional, Any, Dict
try:
    from langgraph.graph import StateGraph
except ImportError:
    StateGraph = None

from ..client import MnemeClient

class MnemeMemoryPlugin:
    """
    A LangGraph node that automatically fetches relevant context and writes state changes.
    """
    def __init__(self, vault_id: str, api_key: Optional[str] = None, budget_tokens: int = 1500, state_key: str = "messages"):
        if StateGraph is None:
            raise ImportError("langgraph is not installed. Please install it using `pip install langgraph`.")
            
        self.client = MnemeClient(api_key=api_key, vault_id=vault_id)
        self.budget_tokens = budget_tokens
        self.state_key = state_key

    def __call__(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Invoked as a node in the LangGraph execution.
        Reads the latest message, fetches MNEME context, and updates the state.
        """
        messages = state.get(self.state_key, [])
        if not messages:
            return state
            
        latest_message = messages[-1].content if hasattr(messages[-1], 'content') else str(messages[-1])
        
        # 1. Fetch relevant memory context for this turn
        recall = self.client.recall(query=latest_message, budget_tokens=self.budget_tokens)
        
        context_str = "\n".join([f"[{m.type.upper()}] {m.content}" for m in recall.memories])
        
        # 2. Add context to state (depending on agent implementation, usually passed as system prompt or context key)
        state["mneme_context"] = context_str
        
        # 3. Fire-and-forget write to store the latest interaction
        self.client.write(content=latest_message, hint_type="working")
        
        return state
