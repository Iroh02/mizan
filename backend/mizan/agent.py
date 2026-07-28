"""The agent loop: model ⇄ tools, bounded iterations, abstention on exhaustion."""
from __future__ import annotations

from dataclasses import dataclass, field

from mizan.llm import assistant_message_from, tool_result_message
from mizan.prompts import SYSTEM_PROMPT
from mizan.tools import Tool

ABSTAIN = "I can't answer this reliably — this needs a tax professional."


@dataclass
class AgentResult:
    answer: str
    abstained: bool
    iterations: int
    tool_trace: list[dict] = field(default_factory=list)


def run_agent_events(question: str, llm, tools: list[Tool], max_iters: int = 6,
                     history: list[dict] | None = None):
    """Generator form of the agent loop: yields {"type":"status",...} for each
    tool call AS IT HAPPENS, then one final {"type":"final", ...} event.
    Powers both the blocking API (/ask) and the streaming API (/ask/stream)."""
    by_name = {t.name: t for t in tools}
    past = [m for m in (history or [])
            if m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str)]
    messages = [{"role": "system", "content": SYSTEM_PROMPT},
                *past[-8:],
                {"role": "user", "content": question}]
    trace: list[dict] = []
    for i in range(1, max_iters + 1):
        resp = llm.chat_with_tools(messages, [t.schema() for t in tools])
        if resp.tool_calls:
            messages.append(assistant_message_from(resp))
            for tc in resp.tool_calls:
                yield {"type": "status", "tool": tc.name, "args": tc.arguments}
                tool = by_name.get(tc.name)
                if tool is None:
                    result = f"ERROR: unknown tool {tc.name}"
                else:
                    try:
                        result = tool.fn(**tc.arguments)
                    except Exception as e:  # error goes back to the MODEL, not the user
                        result = f"ERROR: {e}"
                trace.append({"tool": tc.name, "args": tc.arguments,
                              "result_preview": str(result)[:200]})
                messages.append(tool_result_message(tc.id, str(result)))
            continue
        answer = resp.content or ABSTAIN
        yield {"type": "final", "answer": answer, "abstained": answer == ABSTAIN,
               "iterations": i, "tool_trace": trace}
        return
    yield {"type": "final", "answer": ABSTAIN, "abstained": True,
           "iterations": max_iters, "tool_trace": trace}


def run_agent(question: str, llm, tools: list[Tool], max_iters: int = 6,
              history: list[dict] | None = None) -> AgentResult:
    """Blocking wrapper over run_agent_events — drains the generator, returns the final."""
    final = None
    for ev in run_agent_events(question, llm, tools, max_iters=max_iters, history=history):
        if ev["type"] == "final":
            final = ev
    return AgentResult(answer=final["answer"], abstained=final["abstained"],
                       iterations=final["iterations"], tool_trace=final["tool_trace"])
