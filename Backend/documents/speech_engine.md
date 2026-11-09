# Gnani Speech Engine Architecture

Prisma is Gnani's next-generation streaming Speech-to-Text engine engineered for real-time conversational transcription. Prisma delivers word-level streaming transcripts with latency under three hundred milliseconds, making it ideal for real-time voice bots and interactive voice response systems.

Prisma features automatic language identification and code-switching capabilities. It accurately transcribes colloquial speech, regional accents, and multilingual mixtures such as Hinglish, Marathi mixed with English, and southern Indian linguistic variants without requiring explicit language toggling by the user.

Timbre is Gnani's neural Text-to-Speech synthesis system designed to produce expressive, human-like voice responses. Timbre supports customizable emotional inflections, speaking speed adjustment, and dialect-specific pronunciations, achieving an industry-leading Mean Opinion Score of 4.3 in voice naturalness.

Timbre outputs studio-quality audio in sixteen kilohertz, sixteen-bit mono linear PCM WAV container format, as well as compressed MP3 and Opus formats. It provides pre-recorded audio caching mechanisms to ensure sub-second latency for common conversational greetings and system notifications.

