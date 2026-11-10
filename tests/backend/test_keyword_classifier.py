"""
Table-Driven Test Suite for Sunai Keyword-Based Interruption Classifier.
Tests 85+ utterances across English, Hindi, Marathi, and Hinglish (Roman and Devanagari).
Validates:
1. Rule A (Noise): Empty, whitespace, non-lexical sounds, low confidence with <= 2 words.
2. Rule B (Interruption): Stop words, question words, trailing '?', mixed ("okay but wait").
3. Rule C (Go On): Continuation phrases ("go on", "aage bolo", "haan aur batao", "pudhe sanga").
4. Rule D (Small Sound): Backchannels <= 4 words ("hmm", "haan", "theek hai", "haan haan theek hai").
5. Rule E (Interruption): 3+ words, or unknown content words ("price", "Armour365", "laptop").
6. Rule F (Unclear): Voice detected with unusable / garbled tokens ("zz", "unclear").
7. Normalization & Typos: Repeated letters ("hmmmm", "waitt", "rukoo"), punctuation & dandas.
"""

import sys
from pathlib import Path

# Add Sunai root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir))

from Backend.interruption import classify_utterance, normalize_interruption_text

# Table: (id, utterance, language, has_voice, rms_energy, dur_sec, conf, speech_prob, expected_rule, description)
TEST_CASES = [
    # =========================================================================
    # RULE A: NOISE (Sub-threshold, empty, non-lexical, low confidence)
    # =========================================================================
    (1, "", "en", False, 0.0, 0.0, 1.0, 0.0, "noise", "Rule A: No voice"),
    (2, "", "en", True, 0.04, 0.5, 1.0, 0.5, "noise", "Rule A: Empty string with VAD voice"),
    (3, "   ", "en", True, 0.02, 0.3, 1.0, 0.4, "noise", "Rule A: Whitespace only"),
    (4, "...", "en", True, 0.03, 0.2, 1.0, 0.5, "noise", "Rule A: Punctuation only"),
    (5, "।॥", "hi", True, 0.03, 0.2, 1.0, 0.5, "noise", "Rule A: Indic dandas only"),
    (6, "uh", "en", True, 0.05, 0.3, 1.0, 0.9, "noise", "Rule A: Non-lexical 'uh'"),
    (7, "um", "en", True, 0.05, 0.3, 1.0, 0.9, "noise", "Rule A: Non-lexical 'um'"),
    (8, "er", "en", True, 0.05, 0.3, 1.0, 0.8, "noise", "Rule A: Non-lexical 'er'"),
    (9, "erm", "en", True, 0.05, 0.4, 1.0, 0.8, "noise", "Rule A: Non-lexical 'erm'"),
    (10, "ah", "en", True, 0.05, 0.3, 1.0, 0.8, "noise", "Rule A: Non-lexical 'ah'"),
    (11, "shh", "en", True, 0.04, 0.3, 1.0, 0.7, "noise", "Rule A: Non-lexical 'shh'"),
    (12, "ts", "en", True, 0.04, 0.2, 1.0, 0.6, "noise", "Rule A: Non-lexical 'ts' click"),
    (13, "uhh umm", "en", True, 0.05, 0.4, 1.0, 0.9, "noise", "Rule A: Repeated non-lexical sounds"),
    (14, "click", "en", True, 0.04, 0.2, 0.3, 0.4, "noise", "Rule A: Low confidence (0.3 < 0.5) with 1 word"),
    (15, "desk tap", "en", True, 0.04, 0.3, 0.4, 0.5, "noise", "Rule A: Low confidence (0.4 < 0.5) with 2 words"),

    # =========================================================================
    # RULE B: INTERRUPTION (STOP words, QUESTION words, '?', mixed)
    # =========================================================================
    # English STOP
    (16, "stop", "en", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: EN stop"),
    (17, "wait", "en", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: EN wait"),
    (18, "hold on", "en", True, 0.06, 0.5, 1.0, 1.0, "interruption", "Rule B: EN hold on"),
    (19, "one second", "en", True, 0.06, 0.6, 1.0, 1.0, "interruption", "Rule B: EN one second"),
    (20, "pause", "en", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: EN pause"),
    (21, "enough", "en", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: EN enough"),
    (22, "cancel", "en", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: EN cancel"),
    (23, "listen", "en", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: EN listen"),
    # Hindi / Hinglish Roman STOP
    (24, "ruko", "hi-IN", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: HI ruko"),
    (25, "ruk jao", "hi-IN", True, 0.06, 0.5, 1.0, 1.0, "interruption", "Rule B: HI ruk jao"),
    (26, "rukiye", "hi-IN", True, 0.06, 0.5, 1.0, 1.0, "interruption", "Rule B: HI rukiye"),
    (27, "bas", "hi-IN", True, 0.06, 0.3, 1.0, 1.0, "interruption", "Rule B: HI bas"),
    (28, "bas karo", "hi-IN", True, 0.06, 0.5, 1.0, 1.0, "interruption", "Rule B: HI bas karo"),
    (29, "ek second", "hi-IN", True, 0.06, 0.5, 1.0, 1.0, "interruption", "Rule B: HI ek second"),
    (30, "suno", "hi-IN", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: HI suno"),
    # Marathi Roman STOP
    (31, "thamba", "mr-IN", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: MR thamba"),
    (32, "thaamb", "mr-IN", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: MR thaamb"),
    (33, "band kara", "mr-IN", True, 0.06, 0.5, 1.0, 1.0, "interruption", "Rule B: MR band kara"),
    (34, "aika", "mr-IN", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: MR aika"),
    # Devanagari STOP
    (35, "रुको", "hi-IN", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: Dev रुको"),
    (36, "रुकिए", "hi-IN", True, 0.06, 0.5, 1.0, 1.0, "interruption", "Rule B: Dev रुकिए"),
    (37, "बस", "hi-IN", True, 0.06, 0.3, 1.0, 1.0, "interruption", "Rule B: Dev बस"),
    (38, "थांबा", "mr-IN", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: Dev थांबा"),
    (39, "ऐका", "mr-IN", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: Dev ऐका"),
    # English QUESTION
    (40, "what", "en", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: EN what"),
    (41, "why", "en", True, 0.06, 0.3, 1.0, 1.0, "interruption", "Rule B: EN why"),
    (42, "how", "en", True, 0.06, 0.3, 1.0, 1.0, "interruption", "Rule B: EN how"),
    (43, "when", "en", True, 0.06, 0.3, 1.0, 1.0, "interruption", "Rule B: EN when"),
    (44, "where", "en", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: EN where"),
    (45, "who", "en", True, 0.06, 0.3, 1.0, 1.0, "interruption", "Rule B: EN who"),
    (46, "which", "en", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: EN which"),
    # Hindi / Marathi Roman QUESTION
    (47, "kya", "hi-IN", True, 0.06, 0.3, 1.0, 1.0, "interruption", "Rule B: HI kya"),
    (48, "kyun", "hi-IN", True, 0.06, 0.3, 1.0, 1.0, "interruption", "Rule B: HI kyun"),
    (49, "kaise", "hi-IN", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: HI kaise"),
    (50, "kab", "hi-IN", True, 0.06, 0.3, 1.0, 1.0, "interruption", "Rule B: HI kab"),
    (51, "kahan", "hi-IN", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: HI kahan"),
    (52, "kay", "mr-IN", True, 0.06, 0.3, 1.0, 1.0, "interruption", "Rule B: MR kay"),
    (53, "kasa", "mr-IN", True, 0.06, 0.3, 1.0, 1.0, "interruption", "Rule B: MR kasa"),
    (54, "kuthe", "mr-IN", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: MR kuthe"),
    # Devanagari QUESTION
    (55, "क्या", "hi-IN", True, 0.06, 0.3, 1.0, 1.0, "interruption", "Rule B: Dev क्या"),
    (56, "क्यों", "hi-IN", True, 0.06, 0.3, 1.0, 1.0, "interruption", "Rule B: Dev क्यों"),
    (57, "कैसे", "hi-IN", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: Dev कैसे"),
    (58, "काय", "mr-IN", True, 0.06, 0.3, 1.0, 1.0, "interruption", "Rule B: Dev काय"),
    (59, "कुठे", "mr-IN", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: Dev कुठे"),
    # Trailing question mark
    (60, "really?", "en", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule B: Trailing '?'"),
    (61, "sach mein?", "hi-IN", True, 0.06, 0.5, 1.0, 1.0, "interruption", "Rule B: Trailing '?' in Hindi"),
    # CRITICAL MIXED CASES: STOP / QUESTION word overrides backchannel
    (62, "okay but wait", "en", True, 0.06, 0.6, 1.0, 1.0, "interruption", "Rule B: Mixed 'okay but wait' -> stop"),
    (63, "theek hai ruko", "hi-IN", True, 0.06, 0.6, 1.0, 1.0, "interruption", "Rule B: Mixed 'theek hai ruko' -> stop"),
    (64, "haan wait", "hinglish", True, 0.06, 0.5, 1.0, 1.0, "interruption", "Rule B: Mixed 'haan wait' -> stop"),
    (65, "accha stop", "hinglish", True, 0.06, 0.5, 1.0, 1.0, "interruption", "Rule B: Mixed 'accha stop' -> stop"),
    (66, "haan kyu", "hinglish", True, 0.06, 0.5, 1.0, 1.0, "interruption", "Rule B: Mixed 'haan kyu' -> question"),
    (67, "ok what is price", "en", True, 0.06, 0.8, 1.0, 1.0, "interruption", "Rule B: Mixed 'ok what is price' -> question"),

    # =========================================================================
    # RULE C: GO_ON (Continuation commands)
    # =========================================================================
    (68, "go on", "en", True, 0.05, 0.4, 1.0, 1.0, "go_on", "Rule C: EN go on"),
    (69, "continue", "en", True, 0.05, 0.4, 1.0, 1.0, "go_on", "Rule C: EN continue"),
    (70, "carry on", "en", True, 0.05, 0.4, 1.0, 1.0, "go_on", "Rule C: EN carry on"),
    (71, "keep going", "en", True, 0.05, 0.5, 1.0, 1.0, "go_on", "Rule C: EN keep going"),
    (72, "tell me more", "en", True, 0.05, 0.6, 1.0, 1.0, "go_on", "Rule C: EN tell me more"),
    (73, "aage bolo", "hi-IN", True, 0.05, 0.4, 1.0, 1.0, "go_on", "Rule C: HI aage bolo"),
    (74, "bolo aage", "hi-IN", True, 0.05, 0.4, 1.0, 1.0, "go_on", "Rule C: HI bolo aage"),
    (75, "aage badho", "hi-IN", True, 0.05, 0.5, 1.0, 1.0, "go_on", "Rule C: HI aage badho"),
    (76, "aur batao", "hi-IN", True, 0.05, 0.4, 1.0, 1.0, "go_on", "Rule C: HI aur batao"),
    (77, "haan aur batao", "hi-IN", True, 0.05, 0.6, 1.0, 1.0, "go_on", "Rule C: CRITICAL 'haan aur batao' -> continuation"),
    (78, "aage batao", "hi-IN", True, 0.05, 0.5, 1.0, 1.0, "go_on", "Rule C: HI aage batao"),
    (79, "jaari rakho", "hi-IN", True, 0.05, 0.5, 1.0, 1.0, "go_on", "Rule C: HI jaari rakho"),
    (80, "chalu rakho", "hi-IN", True, 0.05, 0.5, 1.0, 1.0, "go_on", "Rule C: HI chalu rakho"),
    (81, "pudhe sanga", "mr-IN", True, 0.05, 0.5, 1.0, 1.0, "go_on", "Rule C: MR pudhe sanga"),
    (82, "pudhe bola", "mr-IN", True, 0.05, 0.5, 1.0, 1.0, "go_on", "Rule C: MR pudhe bola"),
    (83, "chalu theva", "mr-IN", True, 0.05, 0.5, 1.0, 1.0, "go_on", "Rule C: MR chalu theva"),
    (84, "आगे बोलो", "hi-IN", True, 0.05, 0.4, 1.0, 1.0, "go_on", "Rule C: Dev आगे बोलो"),
    (85, "और बताओ", "hi-IN", True, 0.05, 0.4, 1.0, 1.0, "go_on", "Rule C: Dev और बताओ"),
    (86, "जारी रखो", "hi-IN", True, 0.05, 0.5, 1.0, 1.0, "go_on", "Rule C: Dev जारी रखो"),
    (87, "पुढे सांगा", "mr-IN", True, 0.05, 0.5, 1.0, 1.0, "go_on", "Rule C: Dev पुढे सांगा"),

    # =========================================================================
    # RULE D: SMALL_SOUND (Backchannels <= 4 words, repeats allowed)
    # =========================================================================
    (88, "hmm", "en", True, 0.04, 0.3, 1.0, 1.0, "small_sound", "Rule D: EN hmm"),
    (89, "ok", "en", True, 0.05, 0.3, 1.0, 1.0, "small_sound", "Rule D: EN ok"),
    (90, "okay", "en", True, 0.05, 0.3, 1.0, 1.0, "small_sound", "Rule D: EN okay"),
    (91, "yeah", "en", True, 0.05, 0.3, 1.0, 1.0, "small_sound", "Rule D: EN yeah"),
    (92, "got it", "en", True, 0.05, 0.4, 1.0, 1.0, "small_sound", "Rule D: EN got it"),
    (93, "i see", "en", True, 0.04, 0.3, 1.0, 1.0, "small_sound", "Rule D: EN i see"),
    (94, "uh-huh", "en", True, 0.04, 0.3, 1.0, 1.0, "small_sound", "Rule D: EN uh-huh"),
    (95, "haan", "hi-IN", True, 0.05, 0.3, 1.0, 1.0, "small_sound", "Rule D: HI haan"),
    (96, "accha", "hi-IN", True, 0.05, 0.4, 1.0, 1.0, "small_sound", "Rule D: HI accha"),
    (97, "theek hai", "hi-IN", True, 0.05, 0.5, 1.0, 1.0, "small_sound", "Rule D: HI theek hai"),
    (98, "ji haan", "hi-IN", True, 0.05, 0.4, 1.0, 1.0, "small_sound", "Rule D: HI ji haan"),
    (99, "sahi hai", "hi-IN", True, 0.05, 0.4, 1.0, 1.0, "small_sound", "Rule D: HI sahi hai"),
    (100, "samajh gaya", "hi-IN", True, 0.05, 0.5, 1.0, 1.0, "small_sound", "Rule D: HI samajh gaya"),
    (101, "barobar", "mr-IN", True, 0.05, 0.4, 1.0, 1.0, "small_sound", "Rule D: MR barobar"),
    (102, "hoy", "mr-IN", True, 0.04, 0.3, 1.0, 1.0, "small_sound", "Rule D: MR hoy"),
    (103, "theek aahe", "mr-IN", True, 0.05, 0.5, 1.0, 1.0, "small_sound", "Rule D: MR theek aahe"),
    (104, "हाँ", "hi-IN", True, 0.05, 0.3, 1.0, 1.0, "small_sound", "Rule D: Dev हाँ"),
    (105, "हूँ", "hi-IN", True, 0.04, 0.3, 1.0, 1.0, "small_sound", "Rule D: Dev हूँ"),
    (106, "अच्छा", "hi-IN", True, 0.05, 0.4, 1.0, 1.0, "small_sound", "Rule D: Dev अच्छा"),
    (107, "ठीक है", "hi-IN", True, 0.05, 0.5, 1.0, 1.0, "small_sound", "Rule D: Dev ठीक है"),
    (108, "बरोबर", "mr-IN", True, 0.05, 0.4, 1.0, 1.0, "small_sound", "Rule D: Dev बरोबर"),
    (109, "होय", "mr-IN", True, 0.04, 0.3, 1.0, 1.0, "small_sound", "Rule D: Dev होय"),
    (110, "haan haan theek hai", "hi-IN", True, 0.05, 0.6, 1.0, 1.0, "small_sound", "Rule D: Multi-word repeat 'haan haan theek hai'"),
    (111, "ok ok got it", "en", True, 0.05, 0.6, 1.0, 1.0, "small_sound", "Rule D: Multi-word repeat 'ok ok got it'"),
    (112, "theek theek", "hi-IN", True, 0.05, 0.4, 1.0, 1.0, "small_sound", "Rule D: Multi-word repeat 'theek theek'"),

    # =========================================================================
    # RULE E: INTERRUPTION (3+ words or unknown content words)
    # =========================================================================
    (113, "price", "en", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Rule E: 1-word content 'price'"),
    (114, "Armour365", "en", True, 0.06, 0.5, 1.0, 1.0, "interruption", "Rule E: 1-word content 'Armour365'"),
    (115, "founders", "en", True, 0.06, 0.5, 1.0, 1.0, "interruption", "Rule E: 1-word content 'founders'"),
    (116, "features", "en", True, 0.06, 0.5, 1.0, 1.0, "interruption", "Rule E: 1-word content 'features'"),
    (117, "delivery time", "en", True, 0.06, 0.6, 1.0, 1.0, "interruption", "Rule E: 2-word content 'delivery time'"),
    (118, "tell me about company", "en", True, 0.06, 0.8, 1.0, 1.0, "interruption", "Rule E: 4 words question"),
    (119, "mujhe dusra prashna poochna hai", "hi-IN", True, 0.06, 1.2, 1.0, 1.0, "interruption", "Rule E: 5 words Hindi question"),
    (120, "mala dusra vicharaycha aahe", "mr-IN", True, 0.06, 1.0, 1.0, 1.0, "interruption", "Rule E: 4 words Marathi question"),

    # =========================================================================
    # RULE F: UNCLEAR (High speech prob, unusable text)
    # =========================================================================
    (121, "zz", "en", True, 0.05, 0.3, 1.0, 0.9, "unclear", "Rule F: Unclear token 'zz' with voice"),
    (122, "zzz", "en", True, 0.05, 0.4, 1.0, 0.9, "unclear", "Rule F: Unclear token 'zzz' with voice"),
    (123, "unclear", "en", True, 0.05, 0.4, 1.0, 0.9, "unclear", "Rule F: STT marker 'unclear'"),
    (124, "garbled", "en", True, 0.05, 0.4, 1.0, 0.85, "unclear", "Rule F: STT marker 'garbled'"),

    # =========================================================================
    # NORMALIZATION & TYPOS (Repeated letters, explicit variants, fuzzy)
    # =========================================================================
    (125, "hmmmm", "en", True, 0.04, 0.4, 1.0, 1.0, "small_sound", "Typo: Repeated 'hmmmm' -> 'hmm'"),
    (126, "waitt", "en", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Typo: Repeated 'waitt' -> 'wait'"),
    (127, "rukoo", "hi-IN", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Typo: Repeated 'rukoo' -> 'ruko'"),
    (128, "okie", "en", True, 0.05, 0.3, 1.0, 1.0, "small_sound", "Typo: Variant 'okie' -> 'okay'"),
    (129, "okkay", "en", True, 0.05, 0.3, 1.0, 1.0, "small_sound", "Typo: Variant 'okkay' -> 'okay'"),
    (130, "theekh", "hi-IN", True, 0.05, 0.4, 1.0, 1.0, "small_sound", "Typo: Variant 'theekh' -> 'theek'"),
    (131, "achaa", "hi-IN", True, 0.05, 0.4, 1.0, 1.0, "small_sound", "Typo: Variant 'achaa' -> 'accha'"),
    (132, "aagey bolo", "hi-IN", True, 0.05, 0.5, 1.0, 1.0, "go_on", "Typo: Variant 'aagey' -> 'aage'"),
    (133, "thaamba", "mr-IN", True, 0.06, 0.5, 1.0, 1.0, "interruption", "Typo: Variant 'thaamba' -> 'thamba'"),
    (134, "stopp", "en", True, 0.06, 0.4, 1.0, 1.0, "interruption", "Typo: Repeated 'stopp' -> 'stop'"),
    (135, "contine", "en", True, 0.05, 0.4, 1.0, 1.0, "go_on", "Typo: Fuzzy 'contine' -> 'continue'"),
]


def run_classifier_tests() -> bool:
    print("=" * 115)
    print(f"SUNAI DETERMINISTIC KEYWORD CLASSIFIER TEST SUITE ({len(TEST_CASES)} CASES)")
    print("=" * 115)
    header = f"{'#':<3} | {'Utterance':<30} | {'Lang':<8} | {'Exp':<12} | {'Actual':<12} | {'Status':<6} | {'Reason'}"
    separator = "-" * 115
    print(header)
    print(separator)

    passed = 0
    failed = 0

    for tc in TEST_CASES:
        num, text, lang, has_v, energy, dur, conf, sp, expected, desc = tc
        actual, reason = classify_utterance(
            text=text,
            has_voice=has_v,
            rms_energy=energy,
            duration_sec=dur,
            confidence=conf,
            speech_probability=sp,
        )
        is_pass = (actual == expected)
        if is_pass:
            passed += 1
            status_str = "PASS"
        else:
            failed += 1
            status_str = "FAIL"

        disp_utt = f"'{text}'" if text else "(empty)"
        if len(disp_utt) > 30:
            disp_utt = disp_utt[:27] + "..."

        print(f"{num:<3} | {disp_utt:<30} | {lang:<8} | {expected:<12} | {actual:<12} | {status_str:<6} | {reason}")

    print(separator)
    print(f"TOTAL: {len(TEST_CASES)} | PASSED: {passed} | FAILED: {failed} | SUCCESS RATE: {passed / len(TEST_CASES) * 100:.1f}%")
    print("=" * 115)
    return failed == 0


def test_keyword_classifier_all_cases():
    """Pytest hook that runs all 135 table-driven keyword classifier tests."""
    assert run_classifier_tests() is True, "One or more keyword classifier test cases failed!"


if __name__ == "__main__":
    success = run_classifier_tests()
    sys.exit(0 if success else 1)
