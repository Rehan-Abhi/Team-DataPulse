import { useState, useRef, useEffect } from 'react';
import api from '../services/api';

export default function DataPulseStudio() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [script, setScript] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [voices, setVoices] = useState([]);

    // Refs for audio control
    const synth = window.speechSynthesis;
    const utteranceRef = useRef(null);

    // Load voices on mount
    useEffect(() => {
        const loadVoices = () => {
            setVoices(synth.getVoices());
        };
        loadVoices();
        synth.onvoiceschanged = loadVoices;
    }, [synth]);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleGenerate = async () => {
        if (!file) return;
        setLoading(true);
        setScript(null);

        const formData = new FormData();
        formData.append('pdf', file);

        try {
            const res = await api.post('/studio/generate', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setScript(res.data.script);
        } catch (error) {
            console.error(error);
            alert("Failed to generate script");
        } finally {
            setLoading(false);
        }
    };

    // TTS Logic
    const speakLine = (index) => {
        if (index >= script.length) {
            setIsPlaying(false);
            setCurrentIndex(0);
            return;
        }

        const line = script[index];
        const utterance = new SpeechSynthesisUtterance(line.text);
        
        // Try to pick different voices for Host vs Expert
        // This is a simple heuristic; real apps might let user select
        if (line.speaker === 'Host') {
            utterance.voice = voices.find(v => v.name.includes('Google US English')) || voices[0];
            utterance.pitch = 1.1;
        } else {
             utterance.voice = voices.find(v => v.name.includes('Google UK English Male')) || voices[1] || voices[0];
             utterance.pitch = 0.9;
             utterance.rate = 0.9;
        }

        utterance.onend = () => {
            setCurrentIndex(prev => prev + 1);
            speakLine(index + 1);
        };

        utteranceRef.current = utterance;
        synth.speak(utterance);
    };

    const handlePlay = () => {
        if (!script) return;
        setIsPlaying(true);
        speakLine(currentIndex);
    };

    const handleStop = () => {
        synth.cancel();
        setIsPlaying(false);
        setCurrentIndex(0);
    };

    return (
        <div className="animate-fade-in pb-20">
            <h2 className="text-3xl font-extrabold text-gray-800 mb-2">DataPulse Studio 🎙️</h2>
            <p className="text-gray-500 mb-8">Turn your boring lecture notes into an engaging Audio Podcast.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px]">
                    {!script ? (
                        <>
                            <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mb-6">
                                <span className="text-4xl">📄</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Upload Lecture PDF</h3>
                            <p className="text-gray-400 text-sm mb-6 text-center max-w-xs">
                                Drag and drop or select a PDF file. We'll extract the key concepts and generate a discussion.
                            </p>
                            
                            <input 
                                type="file" 
                                accept="application/pdf"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-purple-50 file:text-purple-700
                                hover:file:bg-purple-100
                                mb-4 max-w-xs
                                "
                            />

                            <button 
                                onClick={handleGenerate}
                                disabled={!file || loading}
                                className={`w-full max-w-xs py-3 rounded-xl font-bold text-white transition-all shadow-md
                                    ${!file || loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}
                                `}
                            >
                                {loading ? "Analyzing & Scripting..." : "Generate Audio Overview ✨"}
                            </button>
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col">
                            {/* Visualizer Placeholder */}
                            <div className="flex-1 bg-gray-900 rounded-xl mb-4 relative overflow-hidden flex items-center justify-center">
                                {isPlaying ? (
                                    <div className="flex gap-1 items-end h-16">
                                        {[...Array(10)].map((_, i) => (
                                            <div key={i} className={`w-3 bg-purple-500 rounded-t-sm animate-pulse`} style={{ height: `${Math.random() * 100}%`, animationDuration: `${0.5 + Math.random()}s` }}></div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-gray-500">Ready to Play</span>
                                )}
                                
                                <div className="absolute top-4 left-4 text-white text-xs bg-black/50 px-2 py-1 rounded">
                                    {script[currentIndex]?.speaker || "Buffering..."} Speaking
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex justify-center gap-4">
                                {!isPlaying ? (
                                    <button onClick={handlePlay} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-md">
                                        ▶ Play Overview
                                    </button>
                                ) : (
                                    <button onClick={handleStop} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-md">
                                        ⏹ Stop
                                    </button>
                                )}
                                <button onClick={() => setScript(null)} className="px-4 text-gray-400 hover:text-gray-600 font-medium">
                                    New File
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Transcript Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
                         <span>📝 Generated Script</span>
                         <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Gemini 1.5 Flash</span>
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {script ? (
                            script.map((line, i) => (
                                <div key={i} className={`p-3 rounded-lg text-sm transition-all ${i === currentIndex && isPlaying ? 'bg-purple-50 border-l-4 border-purple-500' : 'bg-gray-50'}`}>
                                    <span className={`text-xs font-bold uppercase tracking-wider mb-1 block ${line.speaker === 'Host' ? 'text-blue-600' : 'text-orange-600'}`}>
                                        {line.speaker}
                                    </span>
                                    <p className="text-gray-700 leading-relaxed">{line.text}</p>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                <span className="text-4xl mb-2">📜</span>
                                <p>Script will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
