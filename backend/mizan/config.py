"""Config — everything overridable by environment variables.

Default LLM provider is Google Gemini's OpenAI-compatible endpoint (free tier,
no card). To use OpenAI instead, set:
  OPENAI_BASE_URL=https://api.openai.com/v1
  MIZAN_CHAT_MODEL=gpt-4o-mini   (or any chat model)
"""
import os

OPENAI_BASE_URL = os.getenv(
    "OPENAI_BASE_URL",
    "https://generativelanguage.googleapis.com/v1beta/openai/",
)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
CHAT_MODEL = os.getenv("MIZAN_CHAT_MODEL", "gemini-2.5-flash")
VISION_MODEL = os.getenv("MIZAN_VISION_MODEL", CHAT_MODEL)

MAX_AGENT_ITERS = int(os.getenv("MIZAN_MAX_ITERS", "6"))
TOP_K = int(os.getenv("MIZAN_TOP_K", "5"))
MAX_CHARS = int(os.getenv("MIZAN_MAX_CHARS", "1800"))

CHUNKS_PATH = os.getenv("MIZAN_CHUNKS_PATH", "data/chunks.json")
