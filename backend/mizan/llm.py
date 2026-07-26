"""Thin LLM wrapper over any OpenAI-compatible API (Gemini free tier by default)."""
from __future__ import annotations

import json
from dataclasses import dataclass, field

from openai import OpenAI

from mizan.config import CHAT_MODEL, OPENAI_API_KEY, OPENAI_BASE_URL, VISION_MODEL


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict


@dataclass
class LLMResponse:
    content: str | None = None
    tool_calls: list[ToolCall] = field(default_factory=list)


class LLM:
    def __init__(self) -> None:
        if not OPENAI_API_KEY:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. Get a free Gemini key at "
                "https://aistudio.google.com/apikey and set it as an env var."
            )
        self._client = OpenAI(base_url=OPENAI_BASE_URL, api_key=OPENAI_API_KEY)

    def chat_with_tools(self, messages: list[dict], tool_schemas: list[dict]) -> LLMResponse:
        resp = self._client.chat.completions.create(
            model=CHAT_MODEL, messages=messages, tools=tool_schemas or None,
        )
        msg = resp.choices[0].message
        calls = []
        for tc in (msg.tool_calls or []):
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            calls.append(ToolCall(id=tc.id, name=tc.function.name, arguments=args))
        return LLMResponse(content=msg.content, tool_calls=calls)

    def vision_json(self, prompt: str, image_b64: str, mime: str) -> str:
        """Send an image + prompt, return the raw text reply (expected JSON)."""
        resp = self._client.chat.completions.create(
            model=VISION_MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url",
                     "image_url": {"url": f"data:{mime};base64,{image_b64}"}},
                ],
            }],
        )
        return resp.choices[0].message.content or ""


def assistant_message_from(resp: LLMResponse) -> dict:
    msg: dict = {"role": "assistant", "content": resp.content}
    if resp.tool_calls:
        msg["tool_calls"] = [
            {"id": tc.id, "type": "function",
             "function": {"name": tc.name, "arguments": json.dumps(tc.arguments)}}
            for tc in resp.tool_calls
        ]
    return msg


def tool_result_message(tool_call_id: str, content: str) -> dict:
    return {"role": "tool", "tool_call_id": tool_call_id, "content": content}
