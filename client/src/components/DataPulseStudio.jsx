import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source (using local file from public folder)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export default function DataPulseStudio() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [script, setScript] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [voices, setVoices] = useState([]);
    
    // Visualizer State
    const [pdfImages, setPdfImages] = useState([]);
    const [processingImages, setProcessingImages] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);

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

    // PDF Processing Function
    const convertPdfToImages = async (file) => {
        setProcessingImages(true);
        setProcessingProgress(0);
        setPdfImages([]);
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const images = [];

            console.log(`PDF Loaded: ${pdf.numPages} pages`);

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.0 }); // Reduced scale for speed (was 1.5)
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;
                images.push(canvas.toDataURL('image/jpeg', 0.8)); // slightly compressed
                
                // Update Progress
                setProcessingProgress(Math.round((i / pdf.numPages) * 100));
            }
            setPdfImages(images);
            console.log("PDF Images extracted:", images.length);
        } catch (err) {
            console.error("PDF Image Extraction Failed:", err);
            // Non-blocking error, just won't show visuals
        } finally {
            setProcessingImages(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        if (selectedFile) {
            convertPdfToImages(selectedFile);
        }
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
            const msg = error.response?.data?.error || error.response?.data?.details || error.message || "Failed to generate script";
            alert(`Error: ${msg}`);
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
        
        // Filter for US English voices
        const usVoices = voices.filter(v => v.lang === 'en-US');



        if (line.speaker === 'Host') {
             // Host: Priority US Female/Neutral
            const preferred = usVoices.find(v => v.name.includes('Samantha')) || 
                              usVoices.find(v => v.name.includes('Google US English')) || 
                              usVoices[0] || 
                              voices[0];
            utterance.voice = preferred;
            utterance.pitch = 1.0;
            utterance.rate = 1.0;
        } else {
             // Expert: Priority US Male (or distinct from Host)
             const preferred = usVoices.find(v => v !== utterance.voice && (v.name.includes('Male') || v.name.includes('Fred') || v.name.includes('Victoria'))) || 
                               usVoices[1] || 
                               usVoices[0] || 
                               voices[1];
             utterance.voice = preferred;
             utterance.pitch = 0.95;
             utterance.rate = 0.95;
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

    // calculate current slide logic
    // We want to distribute the script lines evenly across the number of PDF pages
    const currentSlideIndex = script && pdfImages.length > 0 
        ? Math.min(
            Math.floor((currentIndex / script.length) * pdfImages.length), 
            pdfImages.length - 1
          )
        : 0;

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

                            {processingImages && (
                                <div className="w-full max-w-xs mb-4">
                                    <div className="flex justify-between text-xs text-purple-600 mb-1">
                                        <span>Extracting Slides...</span>
                                        <span>{processingProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div className="bg-purple-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${processingProgress}%` }}></div>
                                    </div>
                                </div>
                            )}

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
                            {/* Visualizer / Slideshow */}
                            <div className="flex-1 bg-gray-900 rounded-xl mb-4 relative overflow-hidden flex items-center justify-center group">
                                {pdfImages.length > 0 ? (
                                    <div className="w-full h-full relative">
                                        {/* Background Blur */}
                                        <div 
                                            className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl scale-110 transition-all duration-1000"
                                            style={{ backgroundImage: `url(${pdfImages[currentSlideIndex]})` }}
                                        ></div>
                                        
                                        {/* Main Image */}
                                        <img 
                                            src={pdfImages[currentSlideIndex]} 
                                            alt={`Slide ${currentSlideIndex + 1}`}
                                            className="absolute inset-0 w-full h-full object-contain z-10 p-4 transition-opacity duration-500"
                                        />

                                        {/* Overlay Info */}
                                        <div className="absolute top-4 right-4 z-20 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                            Slide {currentSlideIndex + 1} / {pdfImages.length}
                                        </div>
                                    </div>
                                ) : (
                                    // Fallback Visualizer
                                    isPlaying ? (
                                        <div className="flex gap-1 items-end h-16">
                                            {[...Array(10)].map((_, i) => (
                                                <div key={i} className={`w-3 bg-purple-500 rounded-t-sm animate-pulse`} style={{ height: `${Math.random() * 100}%`, animationDuration: `${0.5 + Math.random()}s` }}></div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-gray-500">Ready to Play</span>
                                    )
                                )}
                                
                                <div className="absolute top-4 left-4 text-white text-xs bg-black/50 px-2 py-1 rounded z-20">
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
                         <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Gemini 3.0 Flash</span>
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
