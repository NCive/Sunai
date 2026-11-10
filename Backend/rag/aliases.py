"""
Spoken and mis-transcribed alias mapping for Gnani.ai brand and product terms.
Applies deterministic phrase replacement and conservative token fuzzy correction
to STT output before retrieval to ensure high semantic recall.
"""

import re
from typing import Dict, List, Optional
from Backend import config

# Plain editable dictionary of spoken/mis-transcribed variants to canonical terms
ALIASES: Dict[str, str] = {
    # Company names
    "gniai": "Gnani.ai",
    "gnani ai": "Gnani.ai",
    "gyani ai": "Gnani.ai",
    "gyani": "Gnani.ai",
    "ghani.ai": "Gnani.ai",
    "ghani ai": "Gnani.ai",
    "gnani dot ai": "Gnani.ai",
    "gyani dot ai": "Gnani.ai",
    "nani ai": "Gnani.ai",
    "gnani": "Gnani.ai",
    "gyna": "Gnani.ai",
    "gnani innovations": "Gnani Innovations",

    # Founders and leadership
    "ganesh gopalan": "Ganesh Gopalan",
    "ananth nagaraj": "Ananth Nagaraj",

    # Products & platforms
    "armour365": "Armour365",
    "armor365": "Armour365",
    "armour 365": "Armour365",
    "armor 365": "Armour365",
    "inya shield": "Inya Shield",
    "in-ya shield": "Inya Shield",
    "inya workforce": "Inya Workforce",
    "in-ya workforce": "Inya Workforce",
    "automate365": "Inya Workforce",
    "automate 365": "Inya Workforce",
    "assist365": "Inya Assist",
    "assist 365": "Inya Assist",
    "inya assist": "Inya Assist",
    "in-ya assist": "Inya Assist",
    "aura365": "Inya Insights",
    "aura 365": "Inya Insights",
    "inya insights": "Inya Insights",
    "in-ya insights": "Inya Insights",
    "inya diy": "Inya DIY",
    "in-ya diy": "Inya DIY",
    "vachana": "Vachana",
    "prisma": "Prisma",
    "prisma v3": "Prisma v3.0",
    "prisma v3.0": "Prisma v3.0",
    "timbre": "Timbre",
    "timber": "Timbre",

    # Core BFSI partners
    "tvs credit": "TVS Credit",
    "bajaj allianz": "Bajaj Allianz",
    "razorpay": "Razorpay",
}

# Canonical terms for token-level fuzzy correction
CANONICAL_TERMS = [
    "Gnani.ai",
    "Armour365",
    "Workforce",
    "Assist",
    "Insights",
    "Vachana",
    "Prisma",
    "Timbre",
    "Samsung",
    "Aavishkaar",
    "Razorpay",
    "Basavanagudi",
]


def levenshtein_distance(s1: str, s2: str) -> int:
    """Computes basic Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def apply_aliases(text: str, max_edit_distance: Optional[int] = None) -> str:
    """
    Applies exact phrase mapping first (longest phrase first), followed by
    conservative fuzzy correction for tokens of 5 or more characters.
    """
    if not text:
        return ""

    result = text

    # 1. Exact phrase mapping (sorted by length descending)
    sorted_phrases = sorted(ALIASES.keys(), key=lambda p: len(p), reverse=True)
    for phrase in sorted_phrases:
        canonical = ALIASES[phrase]
        # Regex word-boundary match (case-insensitive)
        pattern = rf"(?i)\b{re.escape(phrase)}\b"
        result = re.sub(pattern, canonical, result)

    # 2. Conservative fuzzy correction for tokens with >= 5 letters
    threshold = (
        max_edit_distance
        if max_edit_distance is not None
        else getattr(config, "ALIAS_FUZZY_EDIT_DISTANCE", 1)
    )

    if threshold > 0:
        tokens = result.split()
        modified_tokens: List[str] = []
        for token in tokens:
            clean_token = re.sub(r"^[^\w]+|[^\w]+$", "", token).lower()
            replaced = False
            if len(clean_token) >= 5:
                for canonical in CANONICAL_TERMS:
                    c_lower = canonical.lower()
                    if abs(len(clean_token) - len(c_lower)) <= threshold:
                        dist = levenshtein_distance(clean_token, c_lower)
                        if dist <= threshold:
                            # Preserve surrounding punctuation
                            token = re.sub(re.escape(clean_token), canonical, token, flags=re.IGNORECASE)
                            replaced = True
                            break
            modified_tokens.append(token)
        result = " ".join(modified_tokens)

    return result

