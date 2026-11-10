import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SphereView, SphereViewHandle } from './sphere/SphereView';
import { SphereState, DecisionType } from './sphere/SphereRenderer';
import { MicCapture } from './audio/capture';
import { BrowserVAD } from './audio/vad';
import { PlayQueue } from './audio/playQueue';
import { generateTestWav } from './audio/syntheticAudio';
import { SunaiWebSocketClient, MetricsPayload } from './ws/client';
import { CONFIG } from './config';
import {
  LiveCaptions,
  DecisionBadge,
  ConversationTimeline,
  BackgroundParticles,
  SentenceItem,
  AppLayout,
  RightSidebar,
} from './ui';

export const App: React.FC = () => {
  const [sphereState, setSphereState] = useState<SphereState>('IDLE');
  const [fps, setFps] = useState<number>(60);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [isMicOn, setIsMicOn] = useState<boolean>(false);
  const [micChunksCount, setMicChunksCount] = useState<number>(0);
  const [micEnergy, setMicEnergy] = useState<number>(0);
  const [isSpeakingVad, setIsSpeakingVad] = useState<boolean>(false);

  // Interruption mode & stub setting
  const [interruptionMode, setInterruptionMode] = useState<'pause_first' | 'baseline'>('pause_first');
  const [stubDecision, setStubDecisionState] = useState<'small_sound' | 'interruption'>('small_sound');

  // Captions and bot sentences tracking
  const [userText, setUserText] = useState<string>('');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('hi-IN');
  const [botSentences, setBotSentences] = useState<SentenceItem[]>([]);
  const [heardUpto, setHeardUpto] = useState<number>(0);
  const [isInterrupted, setIsInterrupted] = useState<boolean>(false);
  const [isContinuation, setIsContinuation] = useState<boolean>(false);

  // Decision badge
  const [activeDecision, setActiveDecision] = useState<DecisionType | null>(null);
  const [decisionText, setDecisionText] = useState<string>('');

  // Sources and metrics
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [isRefused, setIsRefused] = useState<boolean>(false);
  const [metricsData, setMetricsData] = useState<MetricsPayload | null>(null);

  // PlayQueue status
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [activeSentenceId, setActiveSentenceId] = useState<number | string | null>(null);
  const [queueLength, setQueueLength] = useState<number>(0);

  // Performance toggles
  const [lowPower, setLowPower] = useState<boolean>(CONFIG.lowPower);
  const [reduceMotion, setReduceMotion] = useState<boolean>(CONFIG.reduceMotion);

  // Layout toggles
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState<boolean>(false);

  const sphereRef = useRef<SphereViewHandle>(null);
  const micCaptureRef = useRef<MicCapture | null>(null);
  const vadRef = useRef<BrowserVAD | null>(null);
  const playQueueRef = useRef<PlayQueue | null>(null);
  const wsClientRef = useRef<SunaiWebSocketClient | null>(null);
  const interruptionModeRef = useRef<'pause_first' | 'baseline'>('pause_first');

  const [micAnalyser, setMicAnalyser] = useState<AnalyserNode | null>(null);
  const [playAnalyser, setPlayAnalyser] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    interruptionModeRef.current = interruptionMode;
  }, [interruptionMode]);

  useEffect(() => {
    vadRef.current?.setAssistantSpeaking(sphereState === 'SPEAKING');
  }, [sphereState]);

  // Initialize PlayQueue & WebSocket
  useEffect(() => {
    const pq = new PlayQueue();
    playQueueRef.current = pq;
    setPlayAnalyser(pq.getAnalyser());

    const ws = new SunaiWebSocketClient();
    wsClientRef.current = ws;

    // Sentence finished callback: notify server and update local state
    pq.setOnSentenceFinished((id, turnId, kind) => {
      console.log(`[App] Sentence finished: ${id} (turn=${turnId}, kind=${kind})`);
      ws.sendSentencePlayed(id, turnId, kind);
      const numId = Number(id);
      if (!isNaN(numId) && kind !== 'filler' && numId > 0) {
        setHeardUpto((prev) => Math.max(prev, numId));
      }
      setActiveSentenceId(pq.getActiveSentenceId());
      const remaining = pq.getQueueLength();
      setQueueLength(remaining);
      const isPlaying = pq.getIsPlaying();
      setIsPlayingAudio(isPlaying);
      if (remaining === 0 && !isPlaying) {
        ws.sendPlaybackFinished();
      }
    });

    // Wire WebSocket events
    ws.onConnectionChange = (connected) => {
      setIsWsConnected(connected);
      if (connected) {
        ws.setMode(interruptionModeRef.current);
        // Do NOT send stub override on normal connect (Bug 2 fix)
      }
    };

    ws.onStateChange = (nextState) => {
      console.log(`[App] Server transitioned state to: ${nextState}`);
      setSphereState(nextState);
      if (nextState === 'PAUSED') {
        setIsInterrupted(true);
      }
    };

    ws.onPartialText = (text, lang) => {
      setUserText(text);
      if (lang) setDetectedLanguage(lang);
    };

    ws.onFinalText = (text, lang) => {
      setUserText(text);
      if (lang) setDetectedLanguage(lang);
    };

    ws.onTtsAudio = (sentenceId, audioBuffer, replyText, turnId, kind) => {
      console.log(`[App] Received TTS audio for sentence ${sentenceId} (turn=${turnId}, kind=${kind}): ${replyText}`);
      // If real sentence arrives and filler is playing, immediately abort filler (Bug 3 fix)
      if (kind !== 'filler' && sentenceId !== 0) {
        pq.stopCurrentIfFiller();
      }
      if (replyText && typeof sentenceId === 'number' && sentenceId > 0 && kind !== 'filler') {
        setBotSentences((prev) => {
          if (prev.some((s) => s.id === sentenceId)) return prev;
          return [...prev, { id: sentenceId, text: replyText }];
        });
      }
      pq.enqueue({ sentenceId, audioData: audioBuffer, turnId, kind: kind || 'sentence' });
      setQueueLength(pq.getQueueLength());
      setIsPlayingAudio(true);
    };

    ws.onUnclearPrompt = (phrase, text, audioBuffer) => {
      console.log(`[App] Received unclear prompt (${phrase}): ${text}`);
      sphereRef.current?.setDecision('unclear');
      setActiveDecision('unclear');
      setDecisionText(text);
      setTimeout(() => setActiveDecision(null), 3000);
      pq.enqueue({ sentenceId: `unclear_${Date.now()}`, audioData: audioBuffer });
      setQueueLength(pq.getQueueLength());
      setIsPlayingAudio(true);
    };

    ws.onIdlePrompt = (phrase, text, audioBuffer) => {
      console.log(`[App] Received idle prompt (${phrase}): ${text}`);
      pq.enqueue({ sentenceId: `idle_${Date.now()}`, audioData: audioBuffer });
      setQueueLength(pq.getQueueLength());
      setIsPlayingAudio(true);
    };

    ws.onResume = () => {
      console.log('[App] Received resume command from backend.');
      setIsInterrupted(false);
      pq.resume();
      setSphereState('SPEAKING');
    };

    ws.onClearQueue = () => {
      console.log('[App] Received clear_queue command from backend.');
      pq.clear();
      setSphereState('LISTENING');
    };

    ws.onSources = (sources, refused) => {
      console.log(`[App] Received sources: ${sources.join(', ')} (refused=${refused})`);
      setActiveSources(sources);
      setIsRefused(refused);
    };

    ws.onDecision = (dec) => {
      sphereRef.current?.setDecision(dec);
      setActiveDecision(dec);
      if (dec === 'interruption') {
        setIsInterrupted(true);
        setIsContinuation(false);
      } else if (dec === 'go_on') {
        setIsContinuation(true);
        setIsInterrupted(false);
      } else if (dec === 'small_sound' || dec === 'noise') {
        setIsInterrupted(false);
      }
      setTimeout(() => setActiveDecision(null), 3000);
    };

    ws.onMetrics = (metrics) => {
      console.log('[App] Received metrics message:', metrics);
      setMetricsData(metrics);
    };

    ws.connect();

    return () => {
      pq.clear();
      ws.disconnect();
      playQueueRef.current = null;
      wsClientRef.current = null;
    };
  }, []);

  // Poll PlayQueue & VAD status for UI
  useEffect(() => {
    const interval = setInterval(() => {
      if (vadRef.current) {
        setMicEnergy(vadRef.current.getEnergy());
        setIsSpeakingVad(vadRef.current.getIsSpeaking());
      }
      if (playQueueRef.current) {
        setIsPlayingAudio(playQueueRef.current.getIsPlaying());
        setActiveSentenceId(playQueueRef.current.getActiveSentenceId());
        setQueueLength(playQueueRef.current.getQueueLength());
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Handle Mic Start / Stop
  const toggleMic = useCallback(async () => {
    if (isMicOn) {
      vadRef.current?.stop();
      micCaptureRef.current?.stop();
      micCaptureRef.current = null;
      vadRef.current = null;
      setMicAnalyser(null);
      setIsMicOn(false);
      setMicEnergy(0);
      setIsSpeakingVad(false);
    } else {
      try {
        const capture = new MicCapture();
        const vad = new BrowserVAD();

        let chunkCounter = 0;
        await capture.start((chunk) => {
          chunkCounter++;
          setMicChunksCount(chunkCounter);
          wsClientRef.current?.sendAudioChunk(chunk);
        });

        const analyser = capture.getAnalyser();
        if (analyser) {
          vad.start(
            analyser,
            () => {
              console.log('VAD: Voice Start');
              setIsSpeakingVad(true);

              // Instant browser pause if audio is playing (Section 6 & 8)
              if (playQueueRef.current && playQueueRef.current.getIsPlaying()) {
                if (interruptionModeRef.current === 'pause_first') {
                  console.log('[App] Instantly pausing audio queue on voice start.');
                  playQueueRef.current.pause();
                  setSphereState('PAUSED');
                  setIsInterrupted(true);
                } else {
                  console.log('[App] Instantly clearing audio queue on voice start (baseline).');
                  playQueueRef.current.clear();
                  setSphereState('LISTENING');
                  setIsInterrupted(true);
                }
              }

              wsClientRef.current?.sendVadStart();
            },
            () => {
              console.log('VAD: Voice End');
              setIsSpeakingVad(false);
              wsClientRef.current?.sendVadEnd();
            }
          );
        }

        micCaptureRef.current = capture;
        vadRef.current = vad;
        setMicAnalyser(analyser);
        setIsMicOn(true);
      } catch (err) {
        console.error('Failed to access microphone:', err);
        alert('Microphone access denied or unavailable: ' + (err as Error).message);
      }
    }
  }, [isMicOn]);

  // Audio PlayQueue test helpers
  const handleEnqueueSentence = (id: number, duration: number, freq: number) => {
    if (!playQueueRef.current) return;
    const wav = generateTestWav(duration, freq);
    setBotSentences((prev) => {
      if (prev.some((s) => s.id === id)) return prev;
      return [...prev, { id, text: `Test synthesized sentence ${id} (${duration}s)` }];
    });
    playQueueRef.current.enqueue({ sentenceId: id, audioData: wav });
    setQueueLength(playQueueRef.current.getQueueLength());
    setIsPlayingAudio(true);
  };

  const handlePauseAudio = async () => {
    await playQueueRef.current?.pause();
    setIsPlayingAudio(false);
    setIsInterrupted(true);
  };

  const handleResumeAudio = () => {
    playQueueRef.current?.resume();
    setIsPlayingAudio(true);
    setIsInterrupted(false);
    setIsContinuation(true);
  };

  const handleClearAudio = () => {
    playQueueRef.current?.clear();
    setIsPlayingAudio(false);
    setActiveSentenceId(null);
    setQueueLength(0);
  };

  const handleStateChange = (nextState: SphereState) => {
    setSphereState(nextState);
    sphereRef.current?.setState(nextState);
  };

  const handleDecision = (type: DecisionType) => {
    sphereRef.current?.setDecision(type);
    setActiveDecision(type);
    if (type === 'interruption') {
      setIsInterrupted(true);
      setIsContinuation(false);
    } else if (type === 'go_on') {
      setIsContinuation(true);
      setIsInterrupted(false);
    } else {
      setIsInterrupted(false);
    }
    setTimeout(() => setActiveDecision(null), 3000);
  };

  const handleModeChange = (mode: 'pause_first' | 'baseline') => {
    setInterruptionMode(mode);
    interruptionModeRef.current = mode;
    wsClientRef.current?.setMode(mode);
  };

  const handleStubDecisionChange = (decision: 'small_sound' | 'interruption') => {
    setStubDecisionState(decision);
    wsClientRef.current?.setStubDecision(decision);
  };

  return (
    <AppLayout
      background={<BackgroundParticles lowPower={lowPower} reduceMotion={reduceMotion} />}
      headerLeft={
        <div className="app-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.04em' }}>SUNAI</span>
          <span
            style={{
              fontSize: '0.72rem',
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontWeight: 600,
            }}
          >
            Pause-First Voice Assistant
          </span>
        </div>
      }
      headerRight={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge fps">{fps} FPS</span>
          <span className={`badge state ${sphereState.toLowerCase()}`}>{sphereState}</span>
          <span
            className="badge"
            style={{
              color: isWsConnected ? '#4ade80' : '#f87171',
              borderColor: isWsConnected ? 'rgba(74, 222, 128, 0.4)' : 'rgba(248, 113, 113, 0.4)',
            }}
          >
            {isWsConnected ? '● WS Connected' : '○ WS Offline'}
          </span>
        </div>
      }
      stage={
        <SphereView
          ref={sphereRef}
          state={sphereState}
          micAnalyser={micAnalyser}
          playAnalyser={playAnalyser}
          onFps={setFps}
          lowPower={lowPower}
          reduceMotion={reduceMotion}
        />
      }
      decisionBadge={
        <DecisionBadge
          decision={activeDecision}
          text={decisionText}
          reduceMotion={reduceMotion}
        />
      }
      captions={
        <LiveCaptions
          userText={userText}
          isUserSpeaking={isSpeakingVad}
          botSentences={botSentences}
          activeSentenceId={activeSentenceId}
          heardUpto={heardUpto}
          isInterrupted={isInterrupted}
          isContinuation={isContinuation}
          reduceMotion={reduceMotion}
        />
      }
      timeline={
        <ConversationTimeline
          currentState={sphereState}
          isUserSpeaking={isSpeakingVad}
          activeDecision={activeDecision}
          reduceMotion={reduceMotion}
          lowPower={lowPower}
          isCollapsed={isTimelineCollapsed}
          onToggleCollapse={() => setIsTimelineCollapsed(!isTimelineCollapsed)}
        />
      }
      sidebar={
        <RightSidebar
          interruptionMode={interruptionMode}
          onModeChange={handleModeChange}
          metrics={metricsData}
          isMicOn={isMicOn}
          onToggleMic={toggleMic}
          micEnergy={micEnergy}
          isSpeakingVad={isSpeakingVad}
          micChunksCount={micChunksCount}
          detectedLanguage={detectedLanguage}
          sources={activeSources}
          isRefused={isRefused}
          stubDecision={stubDecision}
          onStubDecisionChange={handleStubDecisionChange}
          isPlayingAudio={isPlayingAudio}
          activeSentenceId={activeSentenceId}
          queueLength={queueLength}
          onEnqueueSentence={handleEnqueueSentence}
          onPauseAudio={handlePauseAudio}
          onResumeAudio={handleResumeAudio}
          onClearAudio={handleClearAudio}
          currentState={sphereState}
          onStateChange={handleStateChange}
          onDecision={handleDecision}
          lowPower={lowPower}
          onToggleLowPower={() => setLowPower(!lowPower)}
          reduceMotion={reduceMotion}
          onToggleReduceMotion={() => setReduceMotion(!reduceMotion)}
          onReconnectWs={() => wsClientRef.current?.connect()}
        />
      }
      isTimelineCollapsed={isTimelineCollapsed}
    />
  );
};

export default App;
