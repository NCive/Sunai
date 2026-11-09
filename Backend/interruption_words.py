"""
Interruption Word Lists for Sunai Assistant.
Separate, editable repository for small sounds, go-on commands, stop words,
and question starters across Hindi, Marathi, Hinglish, and English in both
Roman and Devanagari scripts.
"""

# -----------------------------------------------------------------------------
# 1. SMALL SOUNDS / BACKCHANNELS (Category: "small_sound" -> Resume playback)
# -----------------------------------------------------------------------------
SMALL_SOUND_WORDS: set[str] = {
    # English
    "hmm", "hm", "mhm", "uh-huh", "uh huh", "uhuh", "huh", "um", "uh", "ok", "okay",
    "yeah", "yep", "yes", "right", "got it", "sure", "yup", "alright", "cool",

    # Hindi & Hinglish (Roman)
    "haan", "ha", "haa", "haanji", "hanji", "accha", "achha", "achaa", "acha",
    "theek", "theek hai", "thik", "thik hai", "ji", "ji haan", "sahi", "badhiya",
    "sahi hai",

    # Hindi (Devanagari)
    "हाँ", "हूँ", "हं", "अच्छा", "जी", "जी हाँ", "हाँजी", "ठीक", "ठीक है",
    "सही", "बढ़िया", "सही है",

    # Marathi (Roman)
    "ho", "hoy", "barobar", "theek", "chhan", "ji", "achha", "accha", "khare", "bar",

    # Marathi (Devanagari)
    "हो", "होय", "बरोबर", "ठीक", "छान", "जी", "बरं", "खरे", "बर",
}

# -----------------------------------------------------------------------------
# 2. GO-ON COMMANDS (Category: "go_on" -> Resume playback)
# -----------------------------------------------------------------------------
GO_ON_WORDS: set[str] = {
    # English
    "go on", "continue", "keep going", "carry on", "go ahead", "speak",
    "tell me", "please continue", "keep talking", "next",

    # Hindi & Hinglish (Roman)
    "aage bolo", "bolo aage", "aage batao", "batao aage", "batao", "bolo",
    "chalu rakho", "aage", "aur bolo", "aage kya", "phir aage",

    # Hindi (Devanagari)
    "आगे बोलो", "बोलो आगे", "आगे बताओ", "बताओ", "बोलो", "चालू रखो", "आगे",
    "और बोलो", "फिर आगे",

    # Marathi (Roman)
    "pudhe sanga", "sanga pudhe", "pudhe bola", "sanga", "chalu theva", "pudhe",
    "bola pudhe", "aani pudhe",

    # Marathi (Devanagari)
    "पुढे सांगा", "सांगा", "पुढे बोला", "चालू ठेवा", "पुढे", "सांगा पुढे", "आणि पुढे",
}

# -----------------------------------------------------------------------------
# 3. STOP WORDS (Category: "interruption" -> Hard stop playback, new turn)
# -----------------------------------------------------------------------------
STOP_WORDS: set[str] = {
    # English
    "stop", "wait", "hold on", "hold up", "pause", "listen", "shut up", "quiet",
    "halt", "hang on", "cancel", "dont", "don't",

    # Hindi & Hinglish (Roman)
    "ruko", "ruk", "rukna", "thahar", "chup", "suno", "sun", "are ruko", "bas",
    "rok", "roko", "ruk jao", "thahro", "band karo", "mat bolo",

    # Hindi (Devanagari)
    "रुको", "रुक", "सुनो", "सुन", "चुप", "ठहरो", "बस", "रोको", "रुक जाओ",
    "बंद करो", "मत बोलो",

    # Marathi (Roman)
    "thamba", "thamb", "aika", "aik", "thaamba", "thamba jara", "band kara",
    "shant raha", "bolu naka",

    # Marathi (Devanagari)
    "थांबा", "थांब", "ऐका", "ऐक", "थांबा जरा", "बंद करा", "शांत राहा", "बोलू नका",
}

# -----------------------------------------------------------------------------
# 4. QUESTION STARTERS (Category: "interruption" -> Hard stop playback, new turn)
# -----------------------------------------------------------------------------
QUESTION_STARTERS: set[str] = {
    # English
    "what", "why", "how", "when", "where", "who", "which", "whose", "whom",
    "can", "could", "is", "are", "do", "does", "did", "tell", "will", "would",
    "should", "explain",

    # Hindi & Hinglish (Roman)
    "kya", "kyun", "kyu", "kaise", "kab", "kahan", "kaun", "kiska", "kitna",
    "batao", "samjhao",

    # Hindi (Devanagari)
    "क्या", "क्यों", "कैसे", "कब", "कहाँ", "कौन", "किसका", "कितना", "बताओ", "समझाओ",

    # Marathi (Roman)
    "kay", "kashala", "kashe", "kadhi", "kuthe", "kon", "konache", "kitpat",
    "kiti", "sanga", "spasht kara",

    # Marathi (Devanagari)
    "काय", "कशाला", "कसे", "कधी", "कुठे", "कोण", "कोणाचे", "किती", "सांगा", "स्पष्ट करा",
}
