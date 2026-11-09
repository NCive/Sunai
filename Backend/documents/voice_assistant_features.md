# Sunai Voice Assistant Architecture and Features

Sunai is an intelligent conversational voice assistant developed specifically to solve the timing and interruption problems inherent in conventional voice bots. Traditional assistants either talk over callers or stop abruptly at every ambient cough, whereas Sunai introduces pause-first conversational turn-taking.

When the caller speaks while Sunai is speaking, the assistant pauses playback immediately and classifies the utterance over a brief four hundred millisecond evaluation window. The classifier distinguishes between non-speech noise, conversational backchannels like haan or hmm, go-on commands, and real conversational interruptions.

Sunai operates on a deterministic eight-state finite state machine transitioning across IDLE, LISTENING, THINKING, SPEAKING, PAUSED, IDLE_CHECK, SLEEP, and WAKE. Transitions are smoothly blended over two hundred milliseconds using Web Audio API and WebGL shader parameters to provide intuitive visual feedback on a reactive three-dimensional sphere.

Conversational turn finalization uses an adaptive seven hundred millisecond silence threshold paired with heuristic sentence boundary checks to prevent cutting users off mid-thought. The assistant also incorporates an automated idle check that prompts the user after ten seconds of silence and gracefully transitions into a sleeping state after an additional ten seconds.

