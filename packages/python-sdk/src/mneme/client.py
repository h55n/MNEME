import os
import requests
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class Memory(BaseModel):
    id: str
    content: str
    type: str
    tokenCount: int

class RecallResult(BaseModel):
    memories: List[Memory]
    totalTokensUsed: int
    budgetTokens: int
    filteredCount: int

class MnemeClient:
    def __init__(self, api_key: Optional[str] = None, vault_id: Optional[str] = None, base_url: str = "https://api.mneme.dev/v1"):
        self.api_key = api_key or os.environ.get("MNEME_API_KEY")
        self.vault_id = vault_id or os.environ.get("MNEME_VAULT_ID")
        self.base_url = base_url
        
        if not self.api_key:
            raise ValueError("MNEME_API_KEY is required")
        if not self.vault_id:
            raise ValueError("MNEME_VAULT_ID is required")
            
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        })

    def write(self, content: str, hint_type: Optional[str] = None, importance: float = 0.5, tags: Optional[List[str]] = None) -> Dict[str, Any]:
        """Store a memory in MNEME."""
        url = f"{self.base_url}/vaults/{self.vault_id}/memories"
        payload = {
            "content": content,
            "importance": importance
        }
        if hint_type:
            payload["hint_type"] = hint_type
        if tags:
            payload["tags"] = tags
            
        resp = self.session.post(url, json=payload)
        resp.raise_for_status()
        return resp.json()["data"]

    def recall(self, query: str, budget_tokens: int = 1500, task_scope: Optional[str] = None) -> RecallResult:
        """Retrieve relevant memories within a token budget."""
        url = f"{self.base_url}/vaults/{self.vault_id}/memories/recall"
        payload = {
            "query": query,
            "budget_tokens": budget_tokens
        }
        if task_scope:
            payload["task_scope"] = task_scope
            
        resp = self.session.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()["data"]
        
        return RecallResult(
            memories=[Memory(**m) for m in data.get("memories", [])],
            totalTokensUsed=data.get("totalTokensUsed", 0),
            budgetTokens=data.get("budgetTokens", budget_tokens),
            filteredCount=data.get("filteredCount", 0)
        )
