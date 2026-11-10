"""
Table-Driven Test Suite for Sunai Small Talk Detection.
Tests >= 40 utterances across English, Hindi, Marathi, and Hinglish.
Validates:
1. Pure small talk (all 5 intents across all 4 languages) -> matches expected intent
2. Combined intents ('hi how are you', 'namaste kaise ho', etc.) -> matches 'greeting_how_are_you'
3. Greeting + Real Question ('hi, tell me about Gnani', 'namaste, pricing kya hai') -> MUST return None (route to RAG)
4. Near misses ('how are you planning to price this', 'who are the authors of the document') -> MUST return None
5. Devanagari with and without danda (।, ॥) and punctuation (!, ?, .)
Prints an ASCII pass/fail table.
"""

import sys
from pathlib import Path

# Ensure Sunai root in path
sunai_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(sunai_root))

from Backend.smalltalk import detect_smalltalk

# (id, utterance, input_lang, expected_intent_or_none, description)
TEST_CASES = [
    # ---------------- English Pure Small Talk ----------------
    (1, "hi", "en-IN", "greeting", "EN: Short greeting"),
    (2, "hello!", "en-IN", "greeting", "EN: Greeting with exclamation"),
    (3, "good morning sunai", "en-IN", "greeting", "EN: Greeting with assistant name"),
    (4, "how are you", "en-IN", "how_are_you", "EN: How are you"),
    (5, "how is it going today", "en-IN", "how_are_you", "EN: How is it going with filler"),
    (6, "thanks", "en-IN", "thanks", "EN: Thanks"),
    (7, "thank you so much", "en-IN", "thanks", "EN: Thank you so much"),
    (8, "bye", "en-IN", "goodbye", "EN: Bye"),
    (9, "goodbye see you later", "en-IN", "goodbye", "EN: Goodbye see you later"),
    (10, "who are you", "en-IN", "who_are_you", "EN: Who are you"),
    (11, "what is your name", "en-IN", "who_are_you", "EN: What is your name"),
    (12, "what can you do", "en-IN", "who_are_you", "EN: What can you do"),

    # ---------------- Hindi Devanagari Pure Small Talk ----------------
    (13, "नमस्ते", "hi-IN", "greeting", "HI: Namaste"),
    (14, "नमस्कार सुनाई जी", "hi-IN", "greeting", "HI: Namaskar with honorific"),
    (15, "प्रणाम", "hi-IN", "greeting", "HI: Pranam"),
    (16, "आप कैसे हैं", "hi-IN", "how_are_you", "HI: Aap kaise hain"),
    (17, "क्या हाल है भाई", "hi-IN", "how_are_you", "HI: Kya haal hai with filler"),
    (18, "सब ठीक है", "hi-IN", "how_are_you", "HI: Sab theek hai"),
    (19, "धन्यवाद", "hi-IN", "thanks", "HI: Dhanyavad"),
    (20, "बहुत बहुत धन्यवाद", "hi-IN", "thanks", "HI: Bahut bahut dhanyavad"),
    (21, "शुक्रिया", "hi-IN", "thanks", "HI: Shukriya"),
    (22, "अलविदा", "hi-IN", "goodbye", "HI: Alvida"),
    (23, "फिर मिलेंगे", "hi-IN", "goodbye", "HI: Phir milenge"),
    (24, "आप कौन हैं", "hi-IN", "who_are_you", "HI: Aap kaun hain"),
    (25, "तुम्हारा नाम क्या है", "hi-IN", "who_are_you", "HI: Tumhara naam kya hai"),
    (26, "आप क्या कर सकते हैं", "hi-IN", "who_are_you", "HI: Aap kya kar sakte hain"),

    # ---------------- Marathi Devanagari Pure Small Talk ----------------
    (27, "नमस्कार", "mr-IN", "greeting", "MR: Namaskar"),
    (28, "कसे आहात तुम्ही", "mr-IN", "how_are_you", "MR: Kase ahat tumhi"),
    (29, "कसं काय दादा", "mr-IN", "how_are_you", "MR: Kas kay dada"),
    (30, "धन्यवाद", "mr-IN", "thanks", "MR: Dhanyavad"),
    (31, "आभारी आहे", "mr-IN", "thanks", "MR: Aabhari aahe"),
    (32, "पुन्हा भेटू", "mr-IN", "goodbye", "MR: Punha bhetu"),
    (33, "काळजी घ्या", "mr-IN", "goodbye", "MR: Kalji ghya"),
    (34, "तू कोण आहेस", "mr-IN", "who_are_you", "MR: Tu kon aahes"),
    (35, "तुमचे नाव काय आहे", "mr-IN", "who_are_you", "MR: Tumche naav kay aahe"),
    (36, "तुम्ही काय करू शकता", "mr-IN", "who_are_you", "MR: Tumhi kay karu shakta"),

    # ---------------- Hinglish Roman Pure Small Talk ----------------
    (37, "namaste sunai", "hi-IN", "greeting", "Hinglish: Namaste with bot name"),
    (38, "kaise ho bhai", "hi-IN", "how_are_you", "Hinglish: Kaise ho bhai"),
    (39, "kya haal hai", "hi-IN", "how_are_you", "Hinglish: Kya haal hai"),
    (40, "shukriya dost", "hi-IN", "thanks", "Hinglish: Shukriya dost"),
    (41, "dhanyavad", "hi-IN", "thanks", "Hinglish: Dhanyavad"),
    (42, "phir milenge yaar", "hi-IN", "goodbye", "Hinglish: Phir milenge yaar"),
    (43, "tum kaun ho", "hi-IN", "who_are_you", "Hinglish: Tum kaun ho"),
    (44, "aap kya kar sakte ho", "hi-IN", "who_are_you", "Hinglish: Aap kya kar sakte ho"),

    # ---------------- Combined Intents ----------------
    (45, "hi how are you", "en-IN", "greeting_how_are_you", "Combined: Hi how are you (EN)"),
    (46, "hello how are you today", "en-IN", "greeting_how_are_you", "Combined: Hello how are you today (EN)"),
    (47, "namaste kaise ho", "hi-IN", "greeting_how_are_you", "Combined: Namaste kaise ho (Hinglish)"),
    (48, "नमस्ते, आप कैसे हैं?", "hi-IN", "greeting_how_are_you", "Combined: Namaste aap kaise hain (HI)"),
    (49, "नमस्कार कसं काय", "mr-IN", "greeting_how_are_you", "Combined: Namaskar kas kay (MR)"),

    # ---------------- Greeting + Real Question (MUST return None -> RAG) ----------------
    (50, "hi, tell me about Gnani", "en-IN", None, "RAG: Hi + tell me about Gnani"),
    (51, "hello, what is armour365", "en-IN", None, "RAG: Hello + armour365"),
    (52, "namaste, pricing kya hai", "hi-IN", None, "RAG: Namaste + pricing kya hai"),
    (53, "नमस्ते, दस्तावेज़ों के बारे में बताइए", "hi-IN", None, "RAG: Namaste + dastavez bataiye"),
    (54, "नमस्कार, ज्ञानीची माहिती सांगा", "mr-IN", None, "RAG: Namaskar + Gnani mahiti sanga"),

    # ---------------- Near Misses / Domain Questions (MUST return None -> RAG) ----------------
    (55, "how are you planning to price this", "en-IN", None, "RAG: Planning + price near miss"),
    (56, "who are the authors of the document", "en-IN", None, "RAG: Authors + document"),
    (57, "what can you do with voice biometrics", "en-IN", None, "RAG: Voice biometrics feature"),
    (58, "tell me your pricing details", "en-IN", None, "RAG: Pricing details"),
    (59, "can you explain the pricing features and architecture of gnani platform", "en-IN", None, "RAG: Long domain question"),

    # ---------------- Devanagari Punctuation / Danda Variants ----------------
    (60, "नमस्ते।", "hi-IN", "greeting", "HI: Single danda (।)"),
    (61, "नमस्ते॥", "hi-IN", "greeting", "HI: Double danda (॥)"),
    (62, "कसे आहात?", "mr-IN", "how_are_you", "MR: Question mark"),
    (63, "आप कैसे हैं।", "hi-IN", "how_are_you", "HI: Danda on how are you"),
    (64, "धन्यवाद!", "hi-IN", "thanks", "HI: Exclamation on thanks"),
]


def run_tests() -> bool:
    print(f"\n{'=' * 92}")
    print(f"| {'ID':<3} | {'UTTERANCE':<38} | {'LANG':<7} | {'EXPECTED':<21} | {'RESULT':<6} |")
    print(f"{'=' * 92}")

    passed = 0
    failed = 0

    for test_id, utterance, lang, expected, desc in TEST_CASES:
        match = detect_smalltalk(utterance, lang)
        actual = match.intent if match else None

        ok = (actual == expected)
        if ok:
            passed += 1
            res_str = "PASS"
        else:
            failed += 1
            res_str = f"FAIL (got {actual})"

        # Truncate utterance for display if too long
        disp_utt = (utterance[:35] + "...") if len(utterance) > 38 else utterance
        disp_exp = str(expected) if expected is not None else "None (RAG)"

        print(f"| {test_id:<3} | {disp_utt:<38} | {lang:<7} | {disp_exp:<21} | {res_str:<6} |")

    print(f"{'=' * 92}")
    print(f"TOTAL TESTS: {len(TEST_CASES)} | PASSED: {passed} | FAILED: {failed}")
    print(f"{'=' * 92}\n")

    return failed == 0


def test_smalltalk_all_cases():
    """Runs all 64 smalltalk test cases and asserts 100% pass."""
    success = run_tests()
    assert success, "One or more smalltalk test cases failed"


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

