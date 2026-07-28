"""The agent loop: model ⇄ tools, bounded iterations, abstention on exhaustion."""
from __future__ import annotations

from dataclasses import dataclass, field

import os

from mizan.llm import assistant_message_from, tool_result_message
from mizan.prompts import SYSTEM_PROMPT, VERIFY_PROMPT
from mizan.tools import Tool

ABSTAIN = "I can't answer this reliably — this needs a tax professional."


def is_abstention(answer: str | None) -> bool:
    """Robust abstention detection. Exact string equality fails in production:
    models emit typographic apostrophes (can’t vs can't) and append Sources
    lines. Match on a punctuation-free fragment instead. (Found in live QA by
    Anushree, 28 Jul — see HANDOVER item 1.)"""
    return "answer this reliably" in (answer or "").lower()


def _maybe_verify(llm, answer: str, retrieved_texts: list[str]):
    """Optional second-model-pass: check the drafted answer against the FULL
    retrieved law text (evaluator pattern). Enabled with env MIZAN_VERIFY=1.
    Returns (final_answer, verified_flag)."""
    retrieved = "\n---\n".join(retrieved_texts)
    if not retrieved.strip():
        return answer, None  # nothing was retrieved; nothing to verify against
    resp = llm.chat_with_tools(
        [{"role": "system", "content": VERIFY_PROMPT},
         {"role": "user", "content": f"RETRIEVED TEXT:\n{retrieved}\n\nDRAFTED ANSWER:\n{answer}"}],
        [])
    verdict = (resp.content or "").strip()
    if verdict == "VERIFIED" or not verdict:
        return answer, True
    return verdict, False  # verifier issued a correction or an abstention


@dataclass
class AgentResult:
    answer: str
    abstained: bool
    iterations: int
    tool_trace: list[dict] = field(default_factory=list)
    retrieved: list[str] = field(default_factory=list)  # full law text shown to the model


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
    retrieved_texts: list[str] = []  # FULL search results, for the verifier
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
                if tc.name == "search_regulations" and not str(result).startswith("ERROR"):
                    retrieved_texts.append(str(result))
                trace.append({"tool": tc.name, "args": tc.arguments,
                              "result_preview": str(result)[:200]})
                messages.append(tool_result_message(tc.id, str(result)))
            continue
        answer = resp.content or ABSTAIN
        verified = None
        if os.getenv("MIZAN_VERIFY") == "1" and not is_abstention(answer):
            yield {"type": "status", "tool": "verify_citations", "args": {}}
            try:
                answer, verified = _maybe_verify(llm, answer, retrieved_texts)
            except Exception:
                verified = None  # verification is best-effort; never break the answer
            trace.append({"tool": "verify_citations", "args": {},
                          "result_preview": "VERIFIED" if verified else "REVISED" if verified is False else "SKIPPED"})
        yield {"type": "final", "answer": answer, "abstained": is_abstention(answer),
               "iterations": i, "tool_trace": trace, "verified": verified,
               "retrieved": retrieved_texts}
        return
    yield {"type": "final", "answer": ABSTAIN, "abstained": True,
           "iterations": max_iters, "tool_trace": trace, "retrieved": retrieved_texts}


def run_agent(question: str, llm, tools: list[Tool], max_iters: int = 6,
              history: list[dict] | None = None) -> AgentResult:
    """Blocking wrapper over run_agent_events — drains the generator, returns the final."""
    final = None
    for ev in run_agent_events(question, llm, tools, max_iters=max_iters, history=history):
        if ev["type"] == "final":
            final = ev
    return AgentResult(answer=final["answer"], abstained=final["abstained"],
                       iterations=final["iterations"], tool_trace=final["tool_trace"],
                       retrieved=final.get("retrieved", []))
