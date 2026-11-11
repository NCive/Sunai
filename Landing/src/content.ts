// Centralized content file - Single source of truth for Sunai Landing Page
// All copy, links, team names, numbers, image paths, and URLs are defined here.

export interface NavItem {
  label: string;
  href: string;
}

export interface OutcomeCard {
  color: 'green' | 'red' | 'amber';
  label: string;
  trigger: string;
  behavior: string;
  explanation: string;
}

export interface SimScenario {
  id: string;
  buttonLabel: string;
  inputPhrase: string;
  category: 'noise' | 'backchannel' | 'interruption' | 'unclear';
  color: 'green' | 'red' | 'amber';
  action: string;
  responseLine: string;
  explanation: string;
}

export interface FeatureCard {
  title: string;
  description: string;
  badge: string;
}

export interface LanguageCard {
  code: string;
  name: string;
  nativeName: string;
  sampleQuestion: string;
  translation: string;
  greetings: string[];
}

export interface ArchNode {
  id: string;
  title: string;
  role: string;
  subtitle: string;
  details: string;
}

export interface PipelineStage {
  name: string;
  startPercent: number;
  widthPercent: number;
  color: string;
  note: string;
}

export interface QwenPoint {
  title: string;
  description: string;
}

export interface HonestStatusCard {
  title: string;
  description: string;
  statusDot: 'green' | 'amber';
}

export interface TeamMember {
  name: string;
  role: string;
  link?: string;
  contribution: string;
}

export const content = {
  // App navigation & status check config
  assistantUrl: (import.meta.env.VITE_APP_URL as string) || 'http://localhost:5173',
  codeUrl: 'https://lnkd.in/dTYUN_zv',
  
  assistantStatus: {
    enabled: true,
    pollIntervalMs: 5000,
    timeoutMs: 1500,
    labels: {
      online: 'Assistant online',
      offline: 'Assistant offline',
    },
  },

  stats: {
    enabled: false, // Flag to keep stats hidden until real telemetry is enabled
  },

  deck: {
    snap: true,
    autoplayInterval: 8,
    lowPowerDefault: false,
  },

  lenis: {
    speed: 1.0,
  },

  // Navbar items
  navItems: [
    { label: 'Problem', href: '#problem' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Simulation', href: '#simulation' },
    { label: 'Features', href: '#features' },
    { label: 'Languages', href: '#languages' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'Pipeline', href: '#pipeline' },
    { label: 'Hardware', href: '#hardware' },
    { label: 'Demo', href: '#demo' },
    { label: 'Team', href: '#team' },
  ] as NavItem[],

  // Hero section
  hero: {
    brand: 'SUNAI',
    brandMeaning: 'Sunai translates to "listening"',
    headlineWords: [
      'Most', 'voice', 'bots', 'either', 'talk', 'over', 'you',
      'or', 'stop', 'for', 'every', 'sound.',
      'Sunai', 'fixes', 'the', 'timing.'
    ],
    subline: 'Voice assistants still get one thing wrong: timing. Sunai pauses first, classifies what it heard in a split second, then decides.',
    primaryCta: 'Open the Voice Assistant',
    secondaryCta: 'See how it works',
    chips: [
      'Hindi',
      'Marathi',
      'Hinglish',
      'English',
      'Runs locally on a 16 GB laptop',
    ],
  },

  // Problem section
  problem: {
    tag: 'THE TIMING PROBLEM',
    title: 'Most voice bots either talk over you, or stop dead.',
    description: 'Voice assistants still get one thing wrong: timing. Most voice bots either talk over you, or stop dead the moment they hear a cough, a hmm or a barking dog.',
    lanes: [
      {
        title: 'Traditional Voice Bot: Talks Over You',
        bad: true,
        userAction: 'User says "wait, quick question..."',
        botAction: 'Bot keeps speaking without hearing the user',
        result: 'Frustration and collided audio',
      },
      {
        title: 'Aggressive VAD: Stops for Every Sound',
        bad: true,
        userAction: 'User clears throat or says "hmm"',
        botAction: 'Bot halts immediately, clears memory, and resets',
        result: 'Interrupted flow on harmless background noise',
      },
      {
        title: 'Sunai: Pause First, Decide Second',
        bad: false,
        userAction: 'User makes a sound, backchannel, or question',
        botAction: 'Pauses audio instantly -> classifies in split second -> resumes or listens',
        result: 'Natural timing without losing context',
      },
    ],
    caption: 'Illustration: Comparison of conversational timing behaviors.',
  },

  // How pause-first works
  howItWorks: {
    tag: 'THE CORE INNOVATION',
    title: 'Pause first, decide second.',
    subtitle: 'When you make a sound while Sunai is speaking, it does not stop and it does not carry on. It pauses instantly, listens for a split second, classifies what it heard, then decides.',
    steps: [
      {
        number: '01',
        title: 'Sound Detected & Instant Pause',
        description: 'When acoustic energy enters the microphone while the bot is speaking, playback pauses immediately without discarding audio buffers or resetting LLM state.',
        state: 'PAUSED',
      },
      {
        number: '02',
        title: 'Quick Check Window',
        description: 'Prisma streams the audio chunk for rapid transcription while acoustic energy and lexical tokens are evaluated inside a brief verification window.',
        state: 'CHECKING',
      },
      {
        number: '03',
        title: 'Acoustic & Lexical Classification',
        description: 'The classifier evaluates if the sound was background noise, an affirmative backchannel, an explicit stop command, or an interrogative question.',
        state: 'CLASSIFYING',
      },
      {
        number: '04',
        title: 'Resume or Listen',
        description: 'Harmless sounds trigger an immediate seamless audio resume where it left off. Genuine questions stop playback and trigger a new listening turn.',
        state: 'DECISION',
      },
    ],
    outcomes: [
      {
        color: 'green',
        label: 'Green dot',
        trigger: 'Noise, or "haan" / "hmm" / "theek hai"',
        behavior: 'Resumes where it left off',
        explanation: 'Background noise, coughs, or conversational acknowledgments allow the bot to continue speaking smoothly without losing its place.',
      },
      {
        color: 'red',
        label: 'Red dot',
        trigger: '"ruko", "wait", or a real question',
        behavior: 'Stops and listens',
        explanation: 'Genuine interruptions immediately halt speech playback, clear pending audio buffers, and open the microphone for your query.',
      },
      {
        color: 'amber',
        label: 'Amber dot',
        trigger: 'Unclear speech or partial utterance',
        behavior: 'Prompts "ji?" or "kya kaha aapne?"',
        explanation: 'When speech is detected but confidence is low or ambiguous, Sunai courteously asks for clarification.',
      },
    ] as OutcomeCard[],
  },

  // Interactive decision-ring simulation
  simulation: {
    tag: 'FRONTEND SIMULATION',
    title: 'Test the Decision Ring',
    subtitle: 'Simulate how Sunai reacts when speech or noise occurs while the assistant is speaking.',
    scenarios: [
      {
        id: 'noise',
        buttonLabel: 'Noise / cough',
        inputPhrase: '[Short non-speech cough sound]',
        category: 'noise',
        color: 'green',
        action: 'Resume playback',
        responseLine: 'Resuming: "...and this allows the pipeline to remain fully responsive."',
        explanation: 'Classified as non-speech noise. Speech playback resumes immediately without interruption.',
      },
      {
        id: 'haan',
        buttonLabel: 'Backchannel: "haan"',
        inputPhrase: 'User says: "haan"',
        category: 'backchannel',
        color: 'green',
        action: 'Resume playback',
        responseLine: 'Resuming: "...ensuring that affirmative acknowledgments do not halt the bot."',
        explanation: 'Recognized as an affirmative listener acknowledgment ("haan" / "hmm" / "theek hai"). Playback continues seamlessly.',
      },
      {
        id: 'question',
        buttonLabel: 'Interruption: "Wait, what is the price?"',
        inputPhrase: 'User says: "Wait, what is the price?"',
        category: 'interruption',
        color: 'red',
        action: 'Stop & Listen',
        responseLine: 'Stopped playback. Listening to user question...',
        explanation: 'Stop word "Wait" and question detected. Speech output halted immediately, switching to user turn.',
      },
      {
        id: 'mumbled',
        buttonLabel: 'Ambiguous: mumbled speech',
        inputPhrase: 'User says: [low-confidence acoustic fragment]',
        category: 'unclear',
        color: 'amber',
        action: 'Prompt clarification',
        responseLine: 'Bot asks: "ji? kya kaha aapne?"',
        explanation: 'Speech detected but lexical intent is ambiguous. Sunai politely asks "ji?" or "kya kaha aapne?".',
      },
    ] as SimScenario[],
    disclaimer: 'Front-end simulation for demonstration purposes.',
  },

  // Features Bento grid
  features: {
    tag: 'VERIFIED CAPABILITIES',
    title: 'What works so far',
    subtitle: 'Every feature listed here is implemented and verified in the running system.',
    items: [
      {
        title: 'Four Supported Languages',
        description: 'Fluent speech recognition and interaction across Hindi, Marathi, Hinglish, and English.',
        badge: 'Multilingual',
      },
      {
        title: 'Pause-First State Machine',
        description: 'Six distinct states: listening, thinking, speaking, paused, idle check, and sleep for reliable conversational flow.',
        badge: '6 States',
      },
      {
        title: 'Document-Grounded RAG',
        description: 'Answers strictly from provided documents using hybrid BM25 + vector retrieval, with a refusal gate for off-topic questions.',
        badge: 'Refusal Gate',
      },
      {
        title: 'Live Audio-Reactive Sphere',
        description: '6,000 instanced particle sphere with an active decision ring that flashes green or red as decisions are made.',
        badge: '3D Visualizer',
      },
      {
        title: 'Full Voice & Local LLM Stack',
        description: 'Gnani Prisma for speech to text, Gnani Timbre for text to speech, concurrent translation, and local Qwen3.5-4B inference.',
        badge: 'End-to-End',
      },
    ] as FeatureCard[],
  },

  // Languages section
  languages: {
    tag: 'MULTILINGUAL',
    title: 'Hindi, Marathi, Hinglish, and English',
    subtitle: 'Sunai processes input in native scripts and romanized Hinglish with real-time translation to English for the local LLM and back to native speech.',
    cards: [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        sampleQuestion: 'How does pause-first handle background interruptions?',
        translation: 'English interaction with zero translation latency',
        greetings: ['Hello', 'Welcome', 'Good morning', 'How can I assist?'],
      },
      {
        code: 'hi',
        name: 'Hindi',
        nativeName: 'हिन्दी',
        sampleQuestion: 'ज्ञानाई के कौन से मुख्य प्रोडक्ट्स हैं?',
        translation: 'What are the core products offered by Gnani.ai?',
        greetings: ['नमस्ते', 'स्वागत है', 'सुप्रभात', 'मैं क्या मदद करूँ?'],
      },
      {
        code: 'mr',
        name: 'Marathi',
        nativeName: 'मराठी',
        sampleQuestion: 'सुनाई चे मुख्य वैशिष्ट्ये काय आहेत?',
        translation: 'What are the main features of Sunai?',
        greetings: ['नमस्कार', 'सुस्वागतम', 'शुभ सकाळ', 'कशी मदत करू?'],
      },
      {
        code: 'hi-en',
        name: 'Hinglish',
        nativeName: 'Hinglish',
        sampleQuestion: 'Gnani.ai ke Prisma STT me kaunse features hain?',
        translation: 'What features are available in Gnani.ai Prisma STT?',
        greetings: ['Namaste', 'Kaise ho?', 'Kya haal hai?', 'Bataiye'],
      },
    ] as LanguageCard[],
  },

  // Architecture diagram section
  architecture: {
    tag: 'SYSTEM DESIGN',
    title: 'Streaming, Pipelined Architecture',
    subtitle: 'The browser microphone captures audio, connects via WebSocket, and streams through a coordinated backend pipeline.',
    nodes: [
      {
        id: 'browser',
        title: 'Browser Client',
        role: 'Frontend UI',
        subtitle: 'React + Three.js + Web Audio API',
        details: 'Microphone capture (16kHz PCM), client-side energy VAD, and real-time audio-reactive 3D sphere.',
      },
      {
        id: 'ws',
        title: 'WebSocket Connection',
        role: 'Bi-Directional Transport',
        subtitle: 'FastAPI WebSocket',
        details: 'Low-latency binary audio chunk transport and JSON state messages with monotonic turn tracking.',
      },
      {
        id: 'backend',
        title: 'Backend Turn Manager',
        role: 'State Orchestration',
        subtitle: '8-State Machine & Classifier',
        details: 'Manages listening, thinking, speaking, and paused states. Runs acoustic energy and lexical keyword interruption classifiers.',
      },
      {
        id: 'prisma',
        title: 'Gnani Prisma STT',
        role: 'Speech to Text',
        subtitle: 'Always-Listening Mode',
        details: 'High-accuracy multi-lingual speech transcription streaming partial and final transcript hypotheses.',
      },
      {
        id: 'translator',
        title: 'Translator',
        role: 'Language Bridge',
        subtitle: 'Sits between Prisma & Qwen',
        details: 'Translates detected native language to English for LLM reasoning, and translates generated English tokens back for speech output.',
      },
      {
        id: 'rag',
        title: 'Hybrid RAG Engine',
        role: 'Document Grounding',
        subtitle: 'BM25 + MiniLM-L6-v2',
        details: 'Retrieves relevant Gnani.ai documentation chunks with an absolute cosine/BM25 refusal gate for off-topic questions.',
      },
      {
        id: 'llm',
        title: 'Qwen3.5-4B via llama-server',
        role: 'Local LLM Reasoning',
        subtitle: 'Local Port 8080',
        details: 'Quantized by Unsloth to under 3.3 GB. Streams generated tokens sentence by sentence.',
      },
      {
        id: 'timbre',
        title: 'Gnani Timbre TTS',
        role: 'Speech Synthesis',
        subtitle: 'Text to Speech',
        details: 'Converts generated sentence chunks into natural audio playback streamed directly back to the browser.',
      },
    ] as ArchNode[],
  },

  // Latency & pipeline section
  latency: {
    tag: 'PIPELINE TIMING',
    title: 'How we kept latency low',
    subtitle: 'Prisma stays in always-listening mode, so it hears any voice. The stages do not wait for each other: while speech is being converted to text and translated, the text is already being streamed to the LLM, and replies are spoken as they are generated.',
    streamingStages: [
      { name: 'Prisma Speech to Text', startPercent: 0, widthPercent: 40, color: '#2FD3A5', note: 'Streams partials concurrently' },
      { name: 'Translator (Input to EN)', startPercent: 20, widthPercent: 35, color: '#FFCB9A', note: 'Translates sentence chunks' },
      { name: 'Qwen3.5-4B (llama-server)', startPercent: 35, widthPercent: 45, color: '#D9B08C', note: 'Streams tokens as generated' },
      { name: 'Gnani Timbre Speech Synthesis', startPercent: 55, widthPercent: 45, color: '#D1E8E2', note: 'Speaks first sentence immediately' },
    ] as PipelineStage[],
    sequentialStages: [
      { name: 'Prisma Speech to Text', startPercent: 0, widthPercent: 25, color: '#2C3531', note: 'Waits for full user silence' },
      { name: 'Translator', startPercent: 25, widthPercent: 20, color: '#2C3531', note: 'Waits for complete transcript' },
      { name: 'LLM Generation', startPercent: 45, widthPercent: 30, color: '#2C3531', note: 'Generates entire response before speaking' },
      { name: 'Speech Synthesis', startPercent: 75, widthPercent: 25, color: '#2C3531', note: 'Starts audio playback only after full text' },
    ] as PipelineStage[],
    caption: 'Illustrative timing, not measured. Demonstrates overlapping concurrent streaming vs sequential block execution.',
  },

  // Hardware and Model specs
  hardware: {
    tag: 'LOCAL HARDWARE FOOTPRINT',
    title: 'Runs on a bare-minimum laptop',
    subtitle: 'Built and tested on a Ryzen 7 8845HS with 16 GB RAM and no dedicated GPU, so it should run on any better laptop.',
    specs: [
      { label: 'Tested Processor', value: 'AMD Ryzen 7 8845HS' },
      { label: 'Memory Requirement', value: '16 GB RAM minimum' },
      { label: 'Dedicated GPU', value: 'None required (runs on CPU / iGPU)' },
      { label: 'Total Footprint', value: 'Under 5 to 5.5 GB total (including LLM weights)' },
    ],
    unslothReduction: {
      originalSize: '8 to 9 GB',
      quantizedSize: '< 3.3 GB',
      description: 'Quantized by Unsloth down to under 3.3 GB with near-zero quality loss, fitting comfortably inside standard 16 GB memory alongside the OS and browser.',
    },
  },

  // Why Qwen3.5-4B
  whyQwen: {
    tag: 'MODEL SELECTION',
    title: 'Why Qwen3.5-4B',
    subtitle: 'Carefully chosen to balance local footprint, reasoning capability, and multilingual performance on modest hardware.',
    points: [
      {
        title: 'Open Source and Local',
        description: 'Runs entirely on your machine through llama-server with zero recurring API costs or data leakage.',
      },
      {
        title: 'Under 3.3 GB via Unsloth',
        description: 'Quantized down from 8 to 9 GB with almost no quality loss, enabling local execution on a 16 GB laptop.',
      },
      {
        title: 'Strong Long-Context Handling',
        description: 'Handles retrieved document context reliably with room to grow into coding and tool calling in later extensions.',
      },
      {
        title: 'Evaluated Against Alternatives',
        description: 'Chosen over Gemma 4 and SmolLM3; Meta\'s MobileMoE may have been better but it did not work on this laptop.',
      },
      {
        title: 'Served Through llama-server',
        description: 'High-efficiency C++ inference engine providing streaming HTTP endpoints for sentence-by-sentence token delivery.',
      },
    ] as QwenPoint[],
  },

  // Honest status
  honestStatus: {
    tag: 'TRANSPARENCY',
    title: 'Honest Status',
    subtitle: 'A frank assessment of where the project stands today.',
    cards: [
      {
        title: 'Core idea works',
        description: 'The pause-first state machine reliably pauses speech playback upon acoustic onset and resumes or stops according to intent.',
        statusDot: 'green',
      },
      {
        title: 'Noisy-audio interruption accuracy still being tuned',
        description: 'Extreme background acoustic noise can occasionally require threshold adjustments for consistent separation.',
        statusDot: 'amber',
      },
      {
        title: 'STT edge cases still being tuned',
        description: 'Rapid overlapping multi-speaker talk and unusual phonetic dialects continue to be refined in the STT layer.',
        statusDot: 'amber',
      },
      {
        title: 'A few retakes to get the successful run',
        description: 'As with any live edge voice pipeline, perfecting live demonstrations required calibration across acoustic environments.',
        statusDot: 'green',
      },
    ] as HonestStatusCard[],
  },

  // Tech stack marquee
  techStack: {
    tag: 'BUILT WITH',
    title: 'Technology Stack',
    wordmarks: [
      'Gnani Prisma',
      'Gnani Timbre',
      'Qwen3.5-4B',
      'llama-server',
      'Unsloth quantization',
      'hybrid BM25 + vector retrieval',
      'FastAPI',
      'React',
      'Three.js',
    ],
  },

  // Demo section
  demo: {
    tag: 'DEMONSTRATION',
    title: 'See Sunai in Action',
    subtitle: 'Watch how the pause-first architecture handles conversational timing.',
    videoSrc: '/video/demo.mp4',
    note: 'The demo video was recorded without audio. In it, Sunai was responding through Timbre and listening through Prisma.',
    fallbackTitle: 'Demonstration Video',
    fallbackDescription: 'Video recording of Sunai interacting with live Prisma speech transcription and Timbre speech synthesis.',
    runStepsTitle: 'Run it yourself',
    runStepsSubtitle: 'To test Sunai on your local machine, open three terminal windows and start the components:',
    steps: [
      {
        step: '1',
        title: 'Start local llama-server (Qwen3.5-4B)',
        command: 'llama-server --model "Models\\hub\\models--unsloth--Qwen3.5-4B-GGUF\\snapshots\\e87f176479d0855a907a41277aca2f8ee7a09523\\Qwen3.5-4B-UD-Q5_K_XL.gguf" --ctx-size 1024 --threads 8 --port 8080',
      },
      {
        step: '2',
        title: 'Launch Sunai Backend',
        command: 'python -m uvicorn Backend.main:app --host 127.0.0.1 --port 8000',
      },
      {
        step: '3',
        title: 'Launch Sunai Frontend',
        command: 'cd Frontend && npm run dev',
      },
    ],
    openAssistantCta: 'Open the Voice Assistant',
  },

  // Offline guidance popover
  offlineModal: {
    title: 'The assistant is not running yet',
    message: 'Sunai runs locally across three services. Start them in your terminal before launching the voice interface:',
    openAnywayLabel: 'Open anyway',
    closeLabel: 'Close',
  },

  // Team and credits
  team: {
    tag: 'PROJECT CONTRIBUTORS',
    title: 'Team and Credits',
    challenge: 'Built for the Gnani.ai internship challenge',
    members: [
      {
        name: 'Indraneil Dhere',
        role: 'Co-Creator',
        contribution: 'Architecture, State Machine & Local Pipeline',
      },
      {
        name: 'Yugal Upadhayay',
        role: 'Co-Creator',
        link: 'https://www.linkedin.com/in/yugal-upadhayay-8883b7291/',
        contribution: 'Voice Integration & Evaluator Testing',
      },
    ] as TeamMember[],
    acknowledgments: [
      'Gnani.ai for the opportunity and for building the speech tech this runs on',
      'Unsloth for the quantized Qwen3.5-4B model',
    ],
    hashtags: [
      '#GreatIndianAIInternshipChallenge',
      '#GnaniAI',
      '#VoiceAI',
      '#SpeechRecognition',
      '#Hinglish',
      '#RAG',
      '#LocalLLM',
      '#OpenSource',
      '#GenAI',
    ],
  },

  // Footer
  footer: {
    motto: 'Pause first. Decide second.',
    voiceAssistantCta: 'Voice Assistant',
    codeCta: 'Code and results',
    copyright: 'Sunai Project. Built for the Gnani.ai internship challenge.',
    reduceMotionLabel: 'Reduce motion',
  },
};

