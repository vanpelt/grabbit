import { useAudioPlayer } from 'expo-audio';
import {
    ExpoSpeechRecognitionErrorEvent,
    ExpoSpeechRecognitionModule,
    ExpoSpeechRecognitionResultEvent,
    useSpeechRecognitionEvent
} from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

const audioSource = require('../assets/start.mp3');

interface SpeechRecognitionOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onResult?: (transcript: string) => void;
  onError?: (error: ExpoSpeechRecognitionErrorEvent) => void;
}

export const useSpeechRecognition = (options: SpeechRecognitionOptions) => {
  const { onStart, onEnd, onResult, onError } = options;
  const [isRecording, setIsRecording] = useState(false);
  const player = useAudioPlayer(audioSource);
  const silenceTimeout = useRef<number | null>(null);

  const handleResult = useCallback(
    (event: ExpoSpeechRecognitionResultEvent) => {
      if (silenceTimeout.current) {
        clearTimeout(silenceTimeout.current);
      }
      silenceTimeout.current = setTimeout(() => {
        console.log('Silence timeout, stopping recognition.');
        stop();
      }, 5000); // 5 seconds of silence

      if (event.results?.[0]?.transcript) {
        onResult?.(event.results[0].transcript);
      }
    },
    [onResult]
  );

  useSpeechRecognitionEvent('start', () => {
    console.log('onSpeechStart');
    setIsRecording(true);
    onStart?.();
    silenceTimeout.current = setTimeout(() => {
      console.log('Silence timeout, stopping recognition.');
      stop();
    }, 5000); // 5 seconds of silence
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('onSpeechEnd');
    if (silenceTimeout.current) {
      clearTimeout(silenceTimeout.current);
      silenceTimeout.current = null;
    }
    setIsRecording(false);
    onEnd?.();
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('onSpeechError: ', event);
    setIsRecording(false);
    onError?.(event);
    if (silenceTimeout.current) {
        clearTimeout(silenceTimeout.current);
        silenceTimeout.current = null;
    }
    stop();
  });

  useSpeechRecognitionEvent('result', handleResult);

  const start = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      Alert.alert('Permissions not granted', 'Please allow microphone access.');
      return;
    }
    try {
      await ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true });
      if (player) {
        await player.play();
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error starting recognition', e.message);
      onError?.(e);
    }
  };

  const stop = async () => {
    if (silenceTimeout.current) {
        clearTimeout(silenceTimeout.current);
        silenceTimeout.current = null;
    }
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (e: any) {
       if (e.code !== 'recognizer-not-running') {
         console.error(e);
         onError?.(e);
       }
    }
    setIsRecording(false);
  };

  useEffect(() => {
    return () => {
      // Use a self-invoking async function for cleanup
      (async () => {
        try {
          await ExpoSpeechRecognitionModule.stop();
        } catch (error) {
          // It's possible the stop command fails if recognition is already stopped.
          // We can ignore this error during cleanup.
          if ((error as any).code !== 'recognizer-not-running') {
            console.error('Error stopping speech recognition during cleanup:', error);
          }
        }
      })();

      if (silenceTimeout.current) {
        clearTimeout(silenceTimeout.current);
      }
    };
  }, []);

  return {
    isRecording,
    start,
    stop,
  };
}; 