"""
Prompt Engineering for Sunai Voice Assistant.
Constructs strict grounding prompts following Plan Sections 9, 11, and 12.
Enforces spoken conversational format: 2-4 short simple sentences, no markdown,
no bullet points, no emojis, no brackets, grounded strictly in provided documents.
"""

from typing import Optional
from Backend.history import ConversationTurn
from Backend.rag.ingest import DocumentChunk


SYSTEM_PROMPT = """You are Sunai, a polite and helpful multilingual voice assistant.
Rules for answering:
1. Grounding: Answer ONLY from the provided DOCUMENT CONTEXT below. If the context does not contain the answer, reply exactly with: "I do not have this information in my documents." Do not speculate or extrapolate.
2. Spoken Voice Style: Answer in 2 to 4 short, simple sentences suitable for speaking out loud.
3. Formatting: Absolutely NO markdown formatting (no asterisks, bold, or italics). NO bullet points or numbered lists. NO emojis. NO brackets or parentheses. Use plain plain English sentences only."""


def build_qwen_prompt(
    question: str,
    chunks: list[DocumentChunk],
    history_turns: Optional[list[ConversationTurn]] = None,
) -> list[dict[str, str]]:
    """
    Constructs the OpenAI-compatible chat messages payload.
    Includes:
    - System prompt instructions
    - Document Context (top 3 chunks)
    - Conversation History (last 3-4 turns, detailing what user heard vs unplayed)
    - User Question
    """
    # 1. Format Context
    context_lines = []
    for i, c in enumerate(chunks, 1):
        context_lines.append(f"[{i}] Document: {c.doc_name}\n{c.text.strip()}")
    context_block = "\n\n".join(context_lines) if context_lines else "No documents provided."

    # 2. Format Turn History
    history_lines = []
    if history_turns:
        for t in history_turns:
            history_lines.append(f"User: {t.user_text}")
            if t.interrupted:
                heard = t.heard_text or "(none)"
                history_lines.append(
                    f"Assistant (User interrupted mid-answer! User heard: \"{heard}\")"
                )
            elif t.refused:
                history_lines.append("Assistant: I do not have this information in my documents.")
            else:
                history_lines.append(f"Assistant: {t.full_assistant_text}")

    history_block = "\n".join(history_lines) if history_lines else "None (first turn)."

    user_content = f"""DOCUMENT CONTEXT:
{context_block}

RECENT CONVERSATION HISTORY:
{history_block}

USER QUESTION:
{question}

Remember: 2 to 4 simple spoken sentences only, strictly from the context, no markdown, no bullets."""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

