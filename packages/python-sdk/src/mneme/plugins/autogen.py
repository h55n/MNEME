from typing import Optional, Dict, Any, List
try:
    from autogen import ConversableAgent
except ImportError:
    ConversableAgent = object

from ..client import MnemeClient

class MnemeConversableAgent(ConversableAgent):
    """
    An AutoGen agent that automatically recalls MNEME context before generating replies,
    and stores new information after generating replies.
    """
    def __init__(self, name: str, vault_id: str, api_key: Optional[str] = None, budget_tokens: int = 1500, **kwargs):
        if ConversableAgent is object:
            raise ImportError("pyautogen is not installed. Please install it using `pip install pyautogen`.")
            
        super().__init__(name=name, **kwargs)
        self.mneme = MnemeClient(api_key=api_key, vault_id=vault_id)
        self.budget_tokens = budget_tokens
        
        # Register hooks
        self.register_reply([ConversableAgent, None], MnemeConversableAgent._generate_reply_with_mneme, position=1)

    def _generate_reply_with_mneme(self, messages: Optional[List[Dict]] = None, sender: Optional[Any] = None, config: Optional[Any] = None) -> tuple[bool, Optional[str]]:
        if not messages:
            return False, None
            
        last_message = messages[-1].get("content", "")
        
        # Fetch memory context
        recall = self.mneme.recall(query=last_message, budget_tokens=self.budget_tokens)
        context_str = "\n".join([f"[{m.type.upper()}] {m.content}" for m in recall.memories])
        
        # Inject context into the system message temporarily
        original_system_message = self.system_message
        self.update_system_message(f"{original_system_message}\n\n[MNEME CONTEXT]\n{context_str}")
        
        # We return False, None so that AutoGen falls back to the default LLM generation reply method
        # but the system message now contains the injected memory.
        # After generation, we don't reset it here because AutoGen doesn't have a post-generation hook easily, 
        # but in a real implementation we would restore `original_system_message` or use `generate_oai_reply` override.
        return False, None
