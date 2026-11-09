# Sunai: Project Plan

## 1. Goal and pitch

**Pitch:** "Most voice bots either talk over you or stop for every sound. Sunai fixes the timing."

Sunai is a voice assistant for the Gnani AI Hackathon. It works in Hindi, Marathi, Hinglish and English, including noisy and phone-quality audio. It answers **only** from the provided English documents (RAG) and must not answer beyond them.

Main feature: **pause-first interruption.** When the user makes a sound, the bot pauses, checks what the sound was, then resumes or stops. A config switch lets us compare it against a "stop on any voice" baseline and show numbers.

## 2. Rules for the builder (Antigravity)

- Do not modify `/LLM_Testing`, `/Models`, `/Voice_Api`. Read them only.
- Before writing code, read those folders and reuse the working Prisma and Timbre calls and the Qwen settings. Do not guess API formats.
- New code goes only in `/Backend` and `/Frontend`.
- Every tunable value lives in one `config.py`.
- Build module by module. Each module gets a small test.

Existing folders (untouched):
- `/LLM_Testing`: model benchmarking (BoolQ, HellaSwag, WikiText perplexity, custom rule tests, latency tests, results).
- `/Models`: downloaded LLMs and weights (SafeTensors/GGUF), test datasets.
- `/Voice_Api`: experiments with Gnani Prisma and Timbre APIs, including transcription accuracy attempts.

## 3. Stack

| Part | Choice |
|---|---|
| Backend | Python, FastAPI, WebSocket |
| LLM | Qwen3.5-4B-UD-Q5_K_XL.gguf via llama.cpp (from `/Models`), thinking off. Check the chat template or the `/LLM_Testing` settings for how to disable thinking on this exact model |
| STT / TTS | Gnani Prisma / Gnani Timbre |
| Embeddings | all-MiniLM-L6-v2 (English documents only for now) |
| Retrieval | BM25 + vectors, merged with RRF |
| Translation | One offline tool behind `translate(text, from_lang, to_lang)`, such as IndicTrans2. Pick after timing it |
| Frontend | React + Vite + Three.js |

## 4. Folder layout

**Backend**
```
main.py, config.py, ws_server.py, state_machine.py,
turn_manager.py, interruption.py, history.py, metrics.py
stt/          Prisma client
tts/          Timbre client
translate/    base interface + chosen tool
rag/          ingest, index, retrieve
llm/          client, prompts, sentence_splitter
audio_cache/  pre-recorded phrases
documents/    English source documents
```

**Frontend**
```
src/audio/    capture, browser VAD, play queue
src/ws/       WebSocket client
src/sphere/   Three.js sphere
src/ui/       panels
```

## 5. States

`LISTENING -> THINKING -> SPEAKING -> PAUSED -> (SPEAKING or LISTENING)`

Plus `IDLE_CHECK` and `SLEEP`.

## 6. Where each part runs

- **Browser:** mic capture, audio playback, instant pause. It pauses on its own the moment it hears voice, without waiting for the server.
- **Backend:** everything else (STT, translation, RAG, LLM, TTS, state machine, history, metrics).

## 7. Normal flow

1. Browser captures 16 kHz mono mic audio, with echo cancellation and noise suppression on, and sends small chunks over WebSocket.
2. Backend streams them to Prisma and gets live text and detected language.
3. The turn ends after about 700 ms of silence, if the text looks finished (tune this).
4. If the question is not English, translate it to English.
5. Search the documents (section 9). If there is no good match, speak the fixed "I don't have this in my documents" phrase (pre-recorded) and do **not** call the LLM.
6. Send the question, the top 3 retrieved chunks and the last 3-4 turns to Qwen.
7. Split the streaming answer into sentences.
8. Translate each sentence to the user's language, then send it to Timbre.
9. Send audio to the browser play queue. Playback starts on sentence 1 while the LLM keeps writing.
10. If sentence 1 is not ready after about 1.5 s, play the pre-recorded "please wait, I'm checking".

## 8. Interruption flow (main feature)

1. While SPEAKING, the **browser** detects voice and pauses audio immediately.
2. Browser sends `vad_start` to the backend. Prisma keeps listening.
3. After a first check of about 300-500 ms, the backend classifies the sound:
   - **Noise** (no real words): resume.
   - **Small sound** ("haan", "hmm", "ok", "accha", "ji", "theek hai", in Roman and Devanagari): resume.
   - **Go-on command** ("go on", "continue", "aage bolo"): resume, or play the saved rest of the answer.
   - **Real interruption** (a question, a stop word like "ruko" or "wait", or about 3 or more words): stop. Cancel the LLM, clear the audio queue, treat it as a new question.
   - **Voice but empty or weak text:** play "ji?" or "kya kaha aapne?" (pre-recorded, user's language). After two failures, ask the user to repeat slowly, then go back to listening.
4. If the user keeps talking, keep listening until they finish (same 700 ms rule), with a safety limit of about 20 s.
5. Do **not** cancel the LLM until the decision is made. The user might say "go on".
6. **Baseline mode** (config switch): any voice stops the bot at once, with no resume. Used only for comparison.

## 9. RAG

- English documents only for now. Chunk into short pieces of about a paragraph. MiniLM reads a limited length per chunk (I believe about 256 word pieces), so verify this and keep chunks small.
- Build the BM25 and vector indexes at startup.
- Merge the two ranked lists with RRF (k = 60 as a start).
- **Refusal gate uses raw scores, not the RRF score.** RRF only uses rank order, so it cannot tell a good match from a bad one. Check the top raw vector similarity and the raw BM25 score. If both are low, refuse. Starting thresholds are guesses; tune them with off-topic questions.
- Send the top 3 chunks to the LLM.

## 10. Translation

- One interface: `translate(text, from_lang, to_lang)`.
- Default: an offline tool (IndicTrans2 or similar), chosen for latency. Time it per sentence on Hindi, Marathi and Hinglish before committing.
- Try running translation on the CPU and Qwen on the iGPU so they do not compete. Measure; this is not guaranteed to help.
- Reply in the user's detected language. For Hinglish users, reply in Hindi script unless Timbre handles Roman Hinglish well. Check what Timbre accepts.
- Note: Prisma and Timbre are APIs, so the system still needs internet. Offline translation only removes one network trip.

## 11. LLM prompt rules

- Answer only from the given context. Otherwise say the fixed refusal phrase. (Prompting alone is not reliable, which is why the retrieval gate exists.)
- Short, simple sentences for speaking. No lists, markdown, emojis or brackets.
- About 2-4 sentences per answer.
- Sentence splitter: split on `.`, `?`, `!`. Do not split on numbers like 3.5 or short forms like "Dr.". Ignore very short fragments.
- Keep thinking mode off by default (automatic control if needed).

## 12. History

Each turn stores:
- the user text and language,
- the full assistant answer, split into numbered sentences,
- `heard_upto`: the last sentence the browser fully played,
- an `interrupted` flag.

The browser reports each fully played sentence. The prompt tells the LLM what the user actually heard. The full answer stays saved, so "go on" plays the saved rest without calling the LLM. Keep the last 3-4 turns in the prompt.

## 13. Idle check

- The timer starts when the **browser finishes playing** audio.
- After about 10 s of silence, play "Are you there?" (pre-recorded).
- After another 10 s, say goodbye and go to SLEEP. Ask only once.
- Wake on a tap or on voice.

## 14. Pre-recorded audio

Generate once with Timbre and save in `audio_cache/`, one set per language:
"ji?", "kya kaha aapne?", "please wait, I'm checking", "are you there?", goodbye, "not in my documents".

## 15. Metrics and logs

Write one JSON line per turn with timestamps: voice end, final text, translation done, retrieval done, first LLM token, first sentence ready, first TTS audio, playback start.

Also log each interruption: classification and time-to-pause.

Track per mode (pause-first vs baseline): **wrong stops, wrong non-stops, response delay.** These numbers are the proof for the pitch.

## 16. WebSocket messages

**Browser to server:** audio chunk (binary), `vad_start`, `vad_end`, `sentence_played {id}`, `set_mode {pause_first | baseline}`

**Server to browser:** `state`, `partial_text`, `final_text`, `language`, `tts_audio {sentence_id, audio}`, `resume`, `clear_queue`, `decision {noise | small_sound | interruption | unclear}`, `sources`, `metrics`

## 17. Frontend

Dark theme, smooth animations. Rule: **every animation should show what the system decided.**

### 17A. Sphere (main visual)

**Look**
- A thick white glowing ring on the outside, with a soft bloom. Its edge is slightly uneven because small bumps follow the audio.
- Inside, a sphere of small round glowing white dots, arranged in rows like lines of latitude.
- Middle rows are often faint or empty, so the background shows through.
- Transparent canvas over our **own** calm night-sky or gradient background. Do not use NCS artwork or logos.

**Build (Three.js)**
1. **Dots:** N rows of points, each row a ring of dots. Round, glowing, additive-blended. Start with about 5,000-10,000 dots.
2. **Rows linked to sound:** take the spectrum from the Web Audio analyser and give each row one frequency range. Loud range pushes the row outward and wiggles it. Quiet range fades the row out. This gives the wavy bands and empty middle. Smooth the spectrum over a few frames if it looks noisy.
3. **Rotation:** rotate the whole sphere slowly so waves seem to travel around it.
4. **Ring:** circle with bloom. Radius pulses with the bass. Small bumps along the edge come from the spectrum.
5. **Audio source:** the analyser reads the **mic** when LISTENING, the **playing audio** when SPEAKING, and a **synthetic slow wave** when THINKING or idle.
6. **Blending:** blend between states over about 200 ms. Never switch hard.

**State behaviour**

| State | Sphere | Ring |
|---|---|---|
| Idle | slow breathing, rows barely move | dim, calm |
| Listening | rows react to mic, ripples move inward | pulses with the mic |
| Thinking | slow gentle wave travels through rows, a few dots orbit | steady |
| Speaking | rows react to the bot's voice, ripples move outward | pulses with the bass |
| **Paused** | rows flatten and slow down smoothly (no hard stop), dims | main ring dims; a thin **decision ring** fills over the 300-500 ms check |
| Resume (noise / small sound) | speeds up again | decision ring turns green, then fades |
| Real interruption | quick burst, then shrinks and switches to the mic | decision ring turns red |
| Unclear ("ji?") | small head-tilt wobble | brief flicker |
| Idle check | dims, breathes slower | dim |
| Sleep / wake | shrinks to a small dot and fades; on wake, dots gather back into a sphere | fades out / back in |

The decision ring is the key visual for the pitch: the viewer sees "it is checking", then sees the result in colour.

**Performance and access**
- Dot count, row count, bloom strength and rotation speed go in the config.
- **Low power** option: about 2,000 dots, bloom off.
- **Reduce motion** option: no rotation, no burst, only gentle fades.
- Qwen, MiniLM and translation share the machine, so test the frame rate while they run and choose the default dot count from that.
- Optional extras (circular equalizer, drifting background particles) come last and are dropped first if the frame rate drops.

### 17B. Panels (in priority order)

1. **Live captions:** user words fade in as they speak. Bot sentences: heard ones bright, unplayed ones grey. On interruption the grey sentences slide away or fade out; on "go on" they light up again.
2. **Decision badge:** a small tag ("noise ignored", "backchannel, resuming", "interruption, new question") that pops in with a small spring and fades out.
3. **Mode switch:** pause-first vs stop-on-any-voice, plus a small stats card comparing both.
4. **Conversation timeline:** two lanes (user, bot) with blocks growing live. A pause shows as a gap in the bot lane. This shows the timing directly.
5. **Latency strip:** time per stage for the last turn; bars grow from zero when a turn ends.
6. **Sources panel:** the document chunks used for the answer.
7. **Small items:** language chip, mic level bar, softly pulsing mic button, tip "Use headphones for best results".

If time is short, do these first: rows-to-spectrum mapping, state blending, the PAUSED decision ring, caption fade, and the timeline.

## 18. Build order

1. Browser mic and play queue, with the sphere reacting to audio.
2. Prisma streaming and Timbre playback with a fixed reply (thin end-to-end version).
3. Turn manager and state machine with pause, resume and stop.
4. Interruption classifier, "ji?" and idle check.
5. RAG and the refusal gate.
6. Qwen streaming, sentence splitter and translation.
7. History, metrics, baseline mode and extra UI panels.

If time runs out, a strong interruption demo with simple RAG beats a perfect RAG with weak interruptions.

## 19. Risks and things to verify

- **Echo:** the bot can hear itself and interrupt itself. Use headphones for the demo and test this early.
- **Prisma:** does it support live streaming, return the detected language, and give a confidence score?
- **Timbre:** accepted audio format, and whether it handles Roman Hinglish.
- **Qwen:** how to disable thinking for this exact model.
- **MiniLM:** confirm the chunk length limit.
- **Offline translation:** speed on the laptop, per sentence, on Hindi, Marathi and Hinglish. It runs once per question and once per answer sentence, so small delays add up.
- **Shared resources:** Qwen, MiniLM, translation and WebGL compete for the same machine. Measure early.
- **Tune:** the 700 ms end-of-turn, the 300-500 ms check, the retrieval gate thresholds, and the idle timers.
- **Document set:** choose a small, real English document set for the demo, and test it with off-topic questions.

## 20. Next optional step

Write the Hindi, Marathi and Hinglish small-sound and stop-word lists for the interruption classifier.