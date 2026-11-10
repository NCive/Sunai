"""
Editable keyword dictionaries for deterministic interruption classification.
Grouped by class and language (English, Hindi, Marathi, Hinglish) in Roman and Devanagari.
"""

from typing import Dict, Set, List

# Non-lexical acoustic filler sounds that should be treated as noise
NON_LEXICAL_SOUNDS: Set[str] = {
    "uh", "um", "ah", "er", "erm", "eh", "oh", "huh", "shh", "sh", "ts",
    "uhh", "umm", "ahh", "err", "ohh", "ooh",
}

# BACKCHANNEL (small_sound -> resume)
# Single words and short multi-word backchannels
BACKCHANNEL_WORDS: Set[str] = {
    # English Roman
    "ok", "okay", "o.k.", "okey", "k", "hmm", "hm", "mm", "mhm", "uh huh", "uh-huh",
    "yes", "yeah", "yep", "yup", "sure", "right", "alright", "got it", "i see",
    "understood", "fine", "cool", "great", "perfect",

    # Hindi / Hinglish Roman
    "haan", "han", "haa", "ha", "ji", "haan ji", "haaji", "hanji", "accha", "achha",
    "acha", "accha ji", "theek hai", "thik hai", "tik hai", "theek", "thik",
    "samajh gaya", "samajh gayi", "sahi", "sahi hai", "hai",

    # Marathi Roman
    "barobar", "hoy", "hoy ji", "bara", "theek aahe", "thik ahe", "samajla",
    "ho", "ho ka",

    # Devanagari (Hindi & Marathi)
    "हाँ", "हां", "हूँ", "हूं", "जी", "अच्छा", "ठीक है", "ठीक", "हम्म", "ओके",
    "बरोबर", "होय", "बरं", "ठीक आहे", "समझ गया", "समझ गयी", "समजलं",
    "हो", "सही", "सही है", "अच्छा जी", "हांजी",
}

# GO_ON (continuation -> resume / play saved remaining sentences)
GO_ON_PHRASES: List[str] = [
    # English Roman
    "go on", "continue", "carry on", "keep going", "proceed", "go ahead",
    "tell me more", "next", "more", "keep talking",

    # Hindi / Hinglish Roman
    "aage bolo", "bolo aage", "aage badho", "aage batao", "bolo", "phir", "fir", "aur batao",
    "batao", "jaari rakho", "aur bolo", "aage sunao", "chalo aage", "haan bolo",
    "haan aage", "haan aage bolo", "haan aur batao", "chalu rakho",

    # Marathi Roman
    "pudhe bola", "pudhe sanga", "sang", "pudhe ja", "aani", "aani sanga",
    "chala pudhe", "chalu theva",

    # Devanagari (Hindi & Marathi)
    "आगे बोलो", "आगे बढ़ो", "आगे बताओ", "बोलो", "फिर", "जारी रखो", "चालू रखो",
    "और बताओ", "और बोलो", "बताओ", "पुढे बोला", "पुढे सांगा", "सांगा",
    "पुढे जा", "पुढे चालवा", "हं बोला", "सांगा पुढे", "चालू ठेवा",
]

# STOP (interruption -> hard stop)
STOP_WORDS: Set[str] = {
    # English Roman
    "stop", "wait", "hold on", "one second", "one sec", "pause", "enough",
    "shut up", "quiet", "cancel", "listen", "hang on", "wait a minute", "wait wait",

    # Hindi / Hinglish Roman
    "ruko", "ruk jao", "ruk", "rukiye", "bas", "bas karo", "mat bolo",
    "ek second", "ek minute", "chup", "suno", "roko", "rukna",

    # Marathi Roman
    "thamba", "thaamb", "thamb", "purna kara", "band kara", "aik", "aika",

    # Devanagari (Hindi & Marathi)
    "रुको", "रुकिए", "रुक जाओ", "बस", "बस करो", "रुक", "सुनो",
    "थांब", "थांबा", "बंद करा", "ऐका", "ऐक", "शांत बसा",
}

# QUESTION_WORDS (interruption -> hard stop / new question)
QUESTION_WORDS: Set[str] = {
    # English Roman
    "what", "why", "how", "when", "where", "who", "which", "whose", "whom",
    "can", "could", "would", "should", "will", "is", "are", "do", "does", "did",
    "tell", "explain", "give", "help",

    # Hindi / Hinglish Roman
    "kya", "kyun", "kyu", "kaise", "kab", "kahan", "kaun", "kitna", "kitni", "kitne",
    "kisko", "kiska", "bataiye", "batao na", "samjhao",

    # Marathi Roman
    "kay", "kasa", "kashi", "kase", "kuthe", "konta", "konti", "konte", "kevha",
    "kiti", "kon",

    # Devanagari (Hindi & Marathi)
    "क्या", "क्यों", "क्यूं", "कैसे", "कब", "कहाँ", "कहा", "कौन", "कितना", "कितनी", "कितने",
    "काय", "कसा", "कशी", "कसे", "कुठे", "कोणता", "कोणती", "कोणते", "केव्हा", "किती", "कोण",
}

# Explicit variants and common STT typos mapped directly
EXPLICIT_VARIANTS: Dict[str, str] = {
    # Backchannel typos
    "okie": "okay",
    "okk": "okay",
    "okkay": "okay",
    "yaa": "yeah",
    "yah": "yeah",
    "yea": "yeah",
    "hmmm": "hmm",
    "hmmmm": "hmm",
    "haanji": "haan ji",
    "hanjee": "haan ji",
    "theekh": "theek",
    "thikk": "theek",
    "achaa": "accha",
    "achha": "accha",
    "acha": "accha",

    # Go-on typos
    "cont": "continue",
    "contine": "continue",
    "aagey": "aage",
    "boloo": "bolo",

    # Stop typos
    "waitt": "wait",
    "waii": "wait",
    "rukoo": "ruko",
    "thaamba": "thamba",
}

# Aliases for backward compatibility
SMALL_SOUND_WORDS = BACKCHANNEL_WORDS
GO_ON_WORDS = set(GO_ON_PHRASES)
QUESTION_STARTERS = QUESTION_WORDS
