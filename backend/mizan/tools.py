"""Agent tools: deterministic VAT calculator, regulation retriever, invoice extractor."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Callable

from pydantic import BaseModel, ValidationError

from mizan.prompts import INVOICE_PROMPT


@dataclass
class Tool:
    name: str
    description: str
    parameters: dict
    fn: Callable[..., str]

    def schema(self) -> dict:
        return {"type": "function",
                "function": {"name": self.name, "description": self.description,
                             "parameters": self.parameters}}


# ---------------------------------------------------------------- calculator
def _vat_calculator(amount: float, direction: str = "add", rate_percent: float = 5.0) -> str:
    if amount < 0:
        return "ERROR: amount must be non-negative."
    if direction not in ("add", "extract"):
        return "ERROR: direction must be 'add' (net→gross) or 'extract' (gross→net)."
    if direction == "add":
        vat = round(amount * rate_percent / 100, 2)
        return f"net={amount:.2f} AED, vat={vat:.2f} AED, gross={amount + vat:.2f} AED (rate {rate_percent}%)"
    net = round(amount / (1 + rate_percent / 100), 2)
    return f"gross={amount:.2f} AED, net={net:.2f} AED, vat={round(amount - net, 2):.2f} AED (rate {rate_percent}%)"


vat_calculator = Tool(
    name="vat_calculator",
    description="Compute VAT deterministically. direction='add' adds VAT to a net amount; 'extract' backs VAT out of a gross amount. Default UAE standard rate 5%.",
    parameters={"type": "object",
                "properties": {"amount": {"type": "number"},
                               "direction": {"type": "string", "enum": ["add", "extract"]},
                               "rate_percent": {"type": "number"}},
                "required": ["amount"]},
    fn=_vat_calculator,
)


# ---------------------------------------------------------------- retriever
def make_retriever_tool(retriever, top_k: int = 5) -> Tool:
    def _search(query: str) -> str:
        hits = retriever.search(query, top_k=top_k)
        if not hits:
            return "NO RESULTS. Try different terms, or abstain if the law does not cover this."
        return "\n---\n".join(c.text for c in hits)

    return Tool(
        name="search_regulations",
        description="Search the UAE Corporate Tax and VAT laws and FTA guides. Returns the most relevant passages labeled [doc | Article N]. Call this before making any factual claim about tax rules.",
        parameters={"type": "object",
                    "properties": {"query": {"type": "string"}},
                    "required": ["query"]},
        fn=_search,
    )


# ---------------------------------------------------------------- invoice extraction
class LineItem(BaseModel):
    description: str
    qty: float
    unit_price: float
    amount: float


class Invoice(BaseModel):
    supplier: str
    trn: str | None = None
    date: str | None = None
    currency: str = "AED"
    line_items: list[LineItem] = []
    subtotal: float
    vat: float
    total: float


def _strip_fences(s: str) -> str:
    s = s.strip()
    # some vision models (e.g. Groq's qwen3.6-27b) prefix replies with a reasoning block
    s = re.sub(r"^<think>.*?</think>", "", s, flags=re.DOTALL).strip()
    if s.startswith("```"):
        s = s.split("\n", 1)[1] if "\n" in s else s
        s = s.rsplit("```", 1)[0]
    return s.strip()


def extract_invoice(llm, image_b64: str, mime: str) -> dict:
    """VLM extraction with schema validation and one retry on bad JSON."""
    raw = llm.vision_json(INVOICE_PROMPT, image_b64, mime)
    for attempt in range(2):
        try:
            inv = Invoice(**json.loads(_strip_fences(raw)))
            consistent = abs(inv.subtotal + inv.vat - inv.total) < 0.05
            return {"invoice": inv.model_dump(), "consistent": consistent,
                    "warning": None if consistent else
                    f"subtotal ({inv.subtotal}) + VAT ({inv.vat}) != total ({inv.total}) — flag for manual review"}
        except (json.JSONDecodeError, ValidationError) as e:
            if attempt == 1:
                return {"invoice": None, "consistent": False,
                        "warning": f"Extraction failed validation: {e}"}
            raw = llm.vision_json(
                INVOICE_PROMPT + f"\n\nYour previous reply was invalid ({e}). Reply with ONLY valid JSON.",
                image_b64, mime)
