from unittest.mock import Mock

from mneme import Memory, RecallResult
from mneme.plugins.autogen import MnemeConversableAgent
from mneme.plugins.crewai import MnemeMemory
from mneme.plugins.langgraph import MnemeMemoryPlugin


def result():
    return RecallResult(
        memories=[Memory(id="m", content="Pune", type="semantic", tokenCount=2)],
        totalTokensUsed=2,
        budgetTokens=100,
        filteredCount=0,
    )


def test_real_langgraph_node_does_not_duplicate_messages():
    from operator import add
    from typing import Annotated, TypedDict

    from langgraph.graph import END, START, StateGraph

    class State(TypedDict):
        messages: Annotated[list, add]
        mneme_context: str

    plugin = MnemeMemoryPlugin("v", "k")
    plugin.client = Mock()
    plugin.client.recall.return_value = result()
    graph = StateGraph(State)
    graph.add_node("memory", plugin)
    graph.add_edge(START, "memory")
    graph.add_edge("memory", END)
    initial = {"messages": [{"role": "user", "content": "home?"}], "mneme_context": ""}
    output = graph.compile().invoke(initial)
    assert len(output["messages"]) == 1
    assert output["mneme_context"] == "[SEMANTIC] Pune"
    assert initial["mneme_context"] == ""
    plugin.client.recall.assert_called_once_with(query="home?", budget_tokens=1500)
    plugin.client.write.assert_called_once_with(content="home?", hint_type="working")


def test_langgraph_empty_input():
    p = MnemeMemoryPlugin("v", "k")
    p.client = Mock()
    assert p({"messages": []}) == {}
    assert p({"messages": [{"content": []}]}) == {}
    p.client.recall.assert_not_called()


def test_real_autogen_hook_runs_before_reply_without_accumulation():
    a = MnemeConversableAgent(
        "memory", "v", "k", llm_config=False, code_execution_config=False, human_input_mode="NEVER"
    )
    a.mneme = Mock()
    a.mneme.recall.return_value = result()
    original = a.system_message
    seen = []

    def reply(recipient, messages=None, sender=None, config=None):
        seen.append(messages)
        return True, "reply"

    a.register_reply([None], reply, position=0)
    for text in ["home?", "city?"]:
        messages = [{"role": "user", "content": text}]
        assert a.generate_reply(messages=messages) == "reply"
        assert len(messages) == 1
        assert a.system_message == original
    assert all(len(m) == 2 for m in seen)
    assert a.mneme.recall.call_count == 2
    a.mneme.write.assert_not_called()


def test_crewai_adapter_signature_and_limit():
    a = MnemeMemory("v", "k")
    a.client = Mock()
    a.client.recall.return_value = result()
    a.save("hello", metadata={"task": "t"}, agent="researcher")
    a.client.write.assert_called_once_with(content="hello", hint_type="episodic")
    assert a.search("home", score_threshold=0.35)[0]["context"] == "Pune"
    assert a.search("home", limit=0) == []


def test_crewai_context_builder_consumes_adapter():
    from crewai.memory.contextual.contextual_memory import ContextualMemory

    memory = MnemeMemory("v", "k")
    memory.client = Mock()
    memory.client.recall.return_value = result()
    other = Mock()
    other.search.return_value = []
    task = Mock(description="home city")
    context = ContextualMemory(memory, other, other).build_context_for_task(task, "travel")
    assert context == "Recent Insights:\n- Pune"
