"""
Small Talk Phrase Definitions and Reply Templates for Sunai.
Organized by conversational intent and language:
- en: English
- hi: Hindi (Devanagari)
- mr: Marathi (Devanagari)
- hinglish: Romanized Hindi / Hinglish
"""

# Address words, honorifics, and conversational fillers that may accompany small talk
FILLERS_AND_ADDRESSES = {
    # English
    "sunai", "assistant", "there", "today", "now", "please", "buddy", "friend", "sir", "madam",
    "later", "soon", "again",
    # Hindi / Hinglish
    "सुनाई", "जी", "भाई", "यार", "दोस्त", "आज", "साहब", "सर", "मैडम", "कृपया",
    "bhai", "yaar", "dost", "aaj", "saheb", "kripya",
    # Marathi
    "मित्रा", "दादा", "ताई", "साहेब", "आज",
    "mitra", "dada", "tai",
}

# Domain and task words that signal a REAL knowledge question (NOT small talk)
DOMAIN_AND_QUESTION_WORDS = {
    # English
    "tell", "pricing", "price", "document", "documents", "armour365", "gnani",
    "biometrics", "prisma", "timbre", "cost", "feature", "features", "architecture",
    "plan", "planning", "build", "building", "work", "explain", "details", "compare",
    "comparison", "rate", "accuracy", "language", "languages",
    # Hindi / Hinglish
    "बताओ", "बताइए", "दस्तावेज़", "दस्तावेज", "ज्ञानी", "आर्मर", "कीमत", "लागत",
    "खर्च", "फ़ीचर्स", "फीचर्स", "विशेषताएं", "सटीकता", "पहचान",
    "batao", "bataiye", "dastavez", "keemat", "lagat", "kharch",
    # Marathi
    "सांगा", "कागदपत्रे", "माहिती", "किंमत", "खर्च", "वैशिष्ट्ये", "अचूकता",
    "sanga", "mahiti", "kimmat",
}

# Small talk trigger phrases (normalized: lowercase, punctuation removed)
GREETING_PHRASES = {
    "en": [
        "hi", "hello", "hey", "good morning", "good afternoon", "good evening",
        "good day", "greetings", "hey there", "hi there", "hello there",
    ],
    "hi": [
        "नमस्ते", "नमस्कार", "प्रणाम", "शुभ प्रभात", "शुभ संध्या",
    ],
    "mr": [
        "नमस्कार", "प्रणाम", "शुभ प्रभात", "शुभ संध्या",
    ],
    "hinglish": [
        "namaste", "namaskar", "pranam", "shubh prabhat", "shubh sandhya",
        "hi", "hello", "hey",
    ],
}

HOW_ARE_YOU_PHRASES = {
    "en": [
        "how are you", "how are you doing", "how is it going", "hows it going",
        "how do you do", "are you good", "how are things",
    ],
    "hi": [
        "कैसे हो", "कैसे हैं आप", "आप कैसे हैं", "आप कैसी हैं", "क्या हाल है",
        "सब ठीक है", "कैसा चल रहा है", "क्या चल रहा है",
    ],
    "mr": [
        "कसे आहात", "कशा आहात", "कसे आहात तुम्ही", "कसं काय", "काय चाललंय",
        "सर्व ठीक आहे का",
    ],
    "hinglish": [
        "kaise ho", "kaise hain aap", "aap kaise hain", "aap kaisi hain",
        "kya haal hai", "sab theek hai", "kaisa chal raha hai", "kya chal raha hai",
        "kasa ahes", "kase ahat", "kas kay", "kasa kay", "kay chalalay",
    ],
}

THANKS_PHRASES = {
    "en": [
        "thank you", "thanks", "thank you so much", "thanks a lot", "many thanks",
        "appreciate it", "grateful",
    ],
    "hi": [
        "धन्यवाद", "बहुत धन्यवाद", "शुक्रिया", "बहुत बहुत धन्यवाद", "आभार",
    ],
    "mr": [
        "धन्यवाद", "खूप धन्यवाद", "आभारी आहे", "मनःपूर्वक धन्यवाद",
    ],
    "hinglish": [
        "thank you", "thanks", "dhanyavad", "shukriya", "bahut dhanyavad",
        "aabhari aahe", "khup dhanyavad",
    ],
}

GOODBYE_PHRASES = {
    "en": [
        "goodbye see you later", "bye see you later", "goodbye see you",
        "bye", "goodbye", "see you", "see you later", "take care", "have a nice day",
        "catch you later", "talk to you later", "bye bye",
    ],
    "hi": [
        "अलविदा", "फिर मिलेंगे", "बाय", "टाटा", "अपना ध्यान रखना", "शुभ विदा",
    ],
    "mr": [
        "निरोप", "पुन्हा भेटू", "बाय", "टाटा", "काळजी घ्या",
    ],
    "hinglish": [
        "bye", "goodbye", "alvida", "phir milenge", "tata", "take care",
        "punha bhetu", "kalji ghya", "bye bye",
    ],
}

WHO_ARE_YOU_PHRASES = {
    "en": [
        "who are you", "what is your name", "what can you do", "introduce yourself",
        "tell me about yourself", "who made you", "what are you",
    ],
    "hi": [
        "तुम कौन हो", "आप कौन हैं", "आपका नाम क्या है", "तुम्हारा नाम क्या है",
        "आप क्या कर सकते हैं", "तुम क्या कर सकते हो", "अपना परिचय दो",
    ],
    "mr": [
        "तू कोण आहेस", "तुम्ही कोण आहात", "तुमचे नाव काय आहे", "तुझे नाव काय आहे",
        "तुम्ही काय करू शकता", "तू काय करू शकतोस", "तुमची ओळख करून द्या",
    ],
    "hinglish": [
        "tum kaun ho", "aap kaun hain", "aapka naam kya hai", "tumhara naam kya hai",
        "aap kya kar sakte ho", "aap kya kar sakte hain", "tum kya kar sakte ho",
        "tu kon aahes", "tumhi kon ahat", "tumche naav kay aahe",
    ],
}

# -----------------------------------------------------------------------------
# High quality, natural reply templates (2 variants per intent per language)
# -----------------------------------------------------------------------------
SMALLTALK_REPLIES = {
    # 1. GREETING
    ("greeting", "en-IN", 0): "Hello! I'm Sunai. Ask me anything about the documents.",
    ("greeting", "en-IN", 1): "Hi there! How can I assist you with the documents today?",
    ("greeting", "hi-IN", 0): "नमस्ते! मैं सुनाई हूँ। दस्तावेज़ों के बारे में मुझसे कुछ भी पूछिए।",
    ("greeting", "hi-IN", 1): "नमस्कार! कहिए, मैं आपकी क्या मदद कर सकता हूँ?",
    ("greeting", "mr-IN", 0): "नमस्कार! मी सुनाई आहे. कागदपत्रांबद्दल मला काहीही विचारा.",
    ("greeting", "mr-IN", 1): "नमस्कार! सांगा, मी तुम्हाला कशी मदत करू शकतो?",
    ("greeting", "hinglish", 0): "Namaste! Main Sunai hoon. Documents ke baare mein kuch bhi poochiye.",
    ("greeting", "hinglish", 1): "Hello! Kahiye, main aapki kya madad kar sakta hoon?",

    # 2. HOW ARE YOU
    ("how_are_you", "en-IN", 0): "I'm doing well, thank you! How can I help you today?",
    ("how_are_you", "en-IN", 1): "I'm doing great! What would you like to know from the documents?",
    ("how_are_you", "hi-IN", 0): "मैं बिल्कुल ठीक हूँ, धन्यवाद! आज मैं आपकी क्या सहायता करूँ?",
    ("how_are_you", "hi-IN", 1): "सब बढ़िया है! बताइए, दस्तावेज़ों से क्या जानना चाहते हैं?",
    ("how_are_you", "mr-IN", 0): "मी मजेत आहे, धन्यवाद! आज मी तुम्हाला कशी मदत करू?",
    ("how_are_you", "mr-IN", 1): "सर्व काही छान चालू आहे! कागदपत्रांमधून तुम्हाला काय माहिती हवी आहे?",
    ("how_are_you", "hinglish", 0): "Main badhiya hoon, thank you! Aaj main aapki kya help kar sakta hoon?",
    ("how_are_you", "hinglish", 1): "Sab accha hai! Batayein, documents se kya janna chahte hain?",

    # 3. THANKS
    ("thanks", "en-IN", 0): "You're welcome! Let me know if you need anything else.",
    ("thanks", "en-IN", 1): "Happy to help! Ask me anything about the documents.",
    ("thanks", "hi-IN", 0): "आपका स्वागत है! कोई और सवाल हो तो ज़रूर पूछिए।",
    ("thanks", "hi-IN", 1): "खुशी हुई कि मैं मदद कर सका!",
    ("thanks", "mr-IN", 0): "तुमचे स्वागत आहे! आणखी काही माहिती हवी असल्यास नक्की विचारा.",
    ("thanks", "mr-IN", 1): "मदत करू शकलो याचा आनंद आहे!",
    ("thanks", "hinglish", 0): "Welcome! Koi aur sawal ho toh zaroor poochiye.",
    ("thanks", "hinglish", 1): "Glad to help! Kabhi bhi pooch sakte hain.",

    # 4. GOODBYE
    ("goodbye", "en-IN", 0): "Goodbye! Have a nice day.",
    ("goodbye", "en-IN", 1): "Bye! Feel free to ask whenever you need information.",
    ("goodbye", "hi-IN", 0): "अलविदा! आपका दिन शुभ हो।",
    ("goodbye", "hi-IN", 1): "फिर मिलेंगे! अपना ध्यान रखिएगा।",
    ("goodbye", "mr-IN", 0): "निरोप! आपला दिवस चांगला जावो.",
    ("goodbye", "mr-IN", 1): "पुन्हा भेटू! काळजी घ्या.",
    ("goodbye", "hinglish", 0): "Goodbye! Aapka din accha rahe.",
    ("goodbye", "hinglish", 1): "Bye! Phir milenge, take care.",

    # 5. WHO ARE YOU
    ("who_are_you", "en-IN", 0): "I'm Sunai, a voice assistant. I answer questions from my documents, in Hindi, Marathi, Hinglish and English.",
    ("who_are_you", "en-IN", 1): "I am Sunai, an intelligent enterprise voice assistant powered by Gnani.ai.",
    ("who_are_you", "hi-IN", 0): "मैं सुनाई हूँ, एक आवाज़ी सहायक। मैं हिंदी, मराठी, हिंग्लिश और अंग्रेज़ी में दस्तावेज़ों से उत्तर देता हूँ।",
    ("who_are_you", "hi-IN", 1): "मेरा नाम सुनाई है। मैं ज्ञानी एआई का बुद्धिमान आवाज़ी सहायक हूँ।",
    ("who_are_you", "mr-IN", 0): "मी सुनाई आहे, एक व्हॉईस असिस्टंट. मी हिंदी, मराठी आणि इंग्रजीत कागदपत्रांमधून उत्तरे देतो.",
    ("who_are_you", "mr-IN", 1): "माझे नाव सुनाई आहे. मी ज्ञानी एआयचा व्हॉईस असिस्टंट आहे.",
    ("who_are_you", "hinglish", 0): "Main Sunai hoon, ek voice assistant. Main documents se aapke sawalon ke jawab deta hoon.",
    ("who_are_you", "hinglish", 1): "Mera naam Sunai hai, Gnani.ai ka voice assistant.",

    # 6. COMBINED GREETING + HOW ARE YOU
    ("greeting_how_are_you", "en-IN", 0): "Hello! I'm doing well, thank you! How can I help you today?",
    ("greeting_how_are_you", "en-IN", 1): "Hi there! Everything is great. What would you like to know today?",
    ("greeting_how_are_you", "hi-IN", 0): "नमस्ते! मैं बिल्कुल ठीक हूँ, शुक्रिया। आज मैं आपकी क्या मदद करूँ?",
    ("greeting_how_are_you", "hi-IN", 1): "नमस्कार! सब अच्छा है। आप बताइए, आज क्या जानना चाहते हैं?",
    ("greeting_how_are_you", "mr-IN", 0): "नमस्कार! मी मजेत आहे, धन्यवाद. आज मी तुम्हाला कशी मदत करू?",
    ("greeting_how_are_you", "mr-IN", 1): "नमस्कार! सर्व काही छान आहे. सांगा, आज काय माहिती हवी आहे?",
    ("greeting_how_are_you", "hinglish", 0): "Hello! Main badhiya hoon, thank you. Aaj aapko kya janna hai?",
    ("greeting_how_are_you", "hinglish", 1): "Namaste! Sab badhiya hai. Batayein, aaj kya help chahiye?",
}
