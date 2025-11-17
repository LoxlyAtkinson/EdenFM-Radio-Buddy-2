import React, { useState, useRef, useEffect } from 'react';
import { textToSpeech, transcribeAudio } from '../services/geminiService';
import { PlayIcon, MicIcon, StopIcon, LoadingIcon, DownloadIcon } from './icons';

// Audio decoding/encoding functions (as per guidelines)
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}


const AudioFeatures: React.FC = () => {
    // TTS State
    const [ttsText, setTtsText] = useState('Hello from Eden FM! This is an example of text-to-speech.');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voice, setVoice] = useState('Kore');

    // Transcription State
    const [isRecording, setIsRecording] = useState(false);
    const [transcribedText, setTranscribedText] = useState('');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<globalThis.Blob[]>([]);

    // NEW: Session Recorder State
    const [isSessionRecording, setIsSessionRecording] = useState(false);
    const [recordedSessionURL, setRecordedSessionURL] = useState<string | null>(null);
    const sessionRecorderRef = useRef<MediaRecorder | null>(null);
    const sessionAudioChunksRef = useRef<globalThis.Blob[]>([]);


    // --- TTS Handler ---
    const handleSpeak = async () => {
        if (!ttsText.trim()) return;
        setIsSpeaking(true);
        try {
            const audioData = await textToSpeech(ttsText, voice);
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const decodedBuffer = decode(audioData);
            const audioBuffer = await decodeAudioData(decodedBuffer, audioContext, 24000, 1);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
            source.onended = () => setIsSpeaking(false);
        } catch (error) {
            console.error('TTS Error:', error);
            alert('Failed to generate speech.');
            setIsSpeaking(false);
        }
    };
    
    // --- Transcription Handlers ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];
                setIsTranscribing(true);
                setTranscribedText('');
                try {
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = async () => {
                        const base64Audio = (reader.result as string).split(',')[1];
                        const result = await transcribeAudio(base64Audio, audioBlob.type);
                        setTranscribedText(result);
                    };
                } catch (error) {
                    console.error('Transcription Error:', error);
                    setTranscribedText('Error transcribing audio.');
                } finally {
                    setIsTranscribing(false);
                }
                 // Stop the mic light
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Could not start recording:', error);
            alert('Microphone access denied or not available.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };
    
    // --- Session Recorder Handlers ---
    const startSessionRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            sessionRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            sessionRecorderRef.current.ondataavailable = (event) => {
                sessionAudioChunksRef.current.push(event.data);
            };
            sessionRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(sessionAudioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setRecordedSessionURL(audioUrl);
                sessionAudioChunksRef.current = [];
            };
            sessionRecorderRef.current.start();
            setIsSessionRecording(true);
            setRecordedSessionURL(null); // Clear previous recording if there was one
        } catch (error) {
            console.error('Could not start session recording:', error);
            alert('Microphone access denied or not available.');
        }
    };

    const stopSessionRecording = () => {
        if (sessionRecorderRef.current) {
            sessionRecorderRef.current.stop();
            // Get the stream and stop all tracks to turn off the mic indicator
            sessionRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsSessionRecording(false);
        }
    };
    
    // Cleanup object URL to prevent memory leaks
    useEffect(() => {
        return () => {
            if (recordedSessionURL) {
                URL.revokeObjectURL(recordedSessionURL);
            }
        };
    }, [recordedSessionURL]);


    const voices = ['Kore', 'Puck', 'Charon', 'Zephyr', 'Fenrir'];

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Voice & Audio Tools</h1>
            
            {/* Text-to-Speech */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Text-to-Speech</h2>
                <textarea 
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    className="w-full bg-gray-50 text-gray-800 p-2 rounded-md h-24 border border-gray-300 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter text to speak..."
                />
                <div className="mt-4 flex flex-wrap items-center gap-4">
                    <button onClick={handleSpeak} disabled={isSpeaking} className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-500">
                        {isSpeaking ? <LoadingIcon /> : <PlayIcon />}
                        {isSpeaking ? 'Speaking...' : 'Speak Text'}
                    </button>
                     <div>
                        <label htmlFor="voice-select" className="text-sm font-medium text-gray-600 mr-2">Voice:</label>
                        <select
                            id="voice-select"
                            value={voice}
                            onChange={(e) => setVoice(e.target.value)}
                            className="px-3 py-1.5 text-sm text-gray-800 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {voices.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Transcription */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Audio Transcription</h2>
                <div className="flex items-center gap-4">
                    <button onClick={isRecording ? stopRecording : startRecording} className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {isRecording ? <StopIcon/> : <MicIcon />}
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </button>
                    {isTranscribing && <LoadingIcon />}
                </div>
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md min-h-[100px] text-gray-600">
                    {transcribedText || 'Transcription will appear here...'}
                </div>
            </div>

            {/* Session Recorder */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">DJ Session Recorder</h2>
                <div className="flex flex-wrap items-center gap-4">
                    <button onClick={isSessionRecording ? stopSessionRecording : startSessionRecording} className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg ${isSessionRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {isSessionRecording ? <StopIcon/> : <MicIcon />}
                        {isSessionRecording ? 'Stop Recording Session' : 'Start Recording Session'}
                    </button>
                    {isSessionRecording && <div className="flex items-center text-sm text-red-600"><div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>Recording...</div>}
                </div>
                {recordedSessionURL && (
                    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                        <p className="font-medium text-gray-700 mb-2">Your recording is ready.</p>
                        <audio controls src={recordedSessionURL} className="w-full mb-4"></audio>
                        <div className="flex items-center gap-4">
                            <a 
                                href={recordedSessionURL} 
                                download={`DJ-Session-${new Date().toISOString().replace(/:/g, '-')}.webm`}
                                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                            >
                                <DownloadIcon />
                                Download Recording
                            </a>
                             <button onClick={() => setRecordedSessionURL(null)} className="text-sm text-gray-600 hover:underline">Clear</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AudioFeatures;