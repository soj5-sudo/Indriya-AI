"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal typings for the Web Speech API (SpeechRecognition). It isn't part of
 * the standard DOM lib, and ships prefixed as `webkitSpeechRecognition` in
 * Chromium/Safari, so we describe just the surface we use.
 */
interface SpeechAlternative {
  readonly transcript: string;
}
interface SpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechAlternative;
}
interface SpeechResultList {
  readonly length: number;
  readonly [index: number]: SpeechResult;
}
interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: SpeechResultList;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Dictation hook. Wires the browser's speech recognition to a text setter so
 * spoken words flow into an existing input. `onTranscript` receives the full
 * intended value (base text + everything recognised this session), so callers
 * can use it directly as a controlled `setText`.
 */
export function useSpeechToText(onTranscript: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");
  // keep the latest callback without re-initialising recognition
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang =
      (typeof navigator !== "undefined" && navigator.language) || "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let spoken = "";
      for (let i = 0; i < event.results.length; i += 1) {
        spoken += event.results[i][0].transcript;
      }
      const base = baseTextRef.current;
      const joiner = base && !base.endsWith(" ") ? " " : "";
      onTranscriptRef.current((base + joiner + spoken).trimStart());
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    setSupported(true);

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  /** Begin dictating, appending onto whatever is already in the field. */
  const start = useCallback((currentText: string) => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    baseTextRef.current = currentText.trim();
    try {
      recognition.start();
      setListening(true);
    } catch {
      /* start() throws if already running — ignore */
    }
  }, []);

  const toggle = useCallback(
    (currentText: string) => {
      if (listening) stop();
      else start(currentText);
    },
    [listening, start, stop]
  );

  return { supported, listening, start, stop, toggle };
}
