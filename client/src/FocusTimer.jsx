import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from './services/api';
import { auth } from './firebase';

const FocusTimer = () => {
    // Settings
    const [focusDuration, setFocusDuration] = useState(25);
    const [breakDuration, setBreakDuration] = useState(5);
    
    // Timer State
    const [mode, setMode] = useState('focus'); // focus | break
    const [timeLeft, setTimeLeft] = useState(focusDuration * 60);
    const [isActive, setIsActive] = useState(false);
    
    // Task Integration
    const [tasks, setTasks] = useState([]);
    const [selectedTaskId, setSelectedTaskId] = useState('');
    const [todayTotal, setTodayTotal] = useState(0);
    const [dailyGoal, setDailyGoal] = useState(0); // [NEW]
    const [showSetGoal, setShowSetGoal] = useState(false); // [NEW]
    
    // Session Tracking
    const startTimeRef = useRef(null);

    // Audio
    const alertSound = useRef(new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'));

    const fetchStats = async () => {
        try {
            if (auth.currentUser) {
                const res = await api.get('/focus/today');
                setTodayTotal(res.data.totalMinutes);
                setDailyGoal(res.data.dailyFocusGoal);
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };
    
    const handleSetGoal = async (newGoal) => {
        try {
            const res = await api.post('/focus/goal', { dailyFocusGoal: newGoal });
            setDailyGoal(res.data.dailyFocusGoal);
            setShowSetGoal(false);
        } catch (error) {
            console.error("Error setting goal:", error);
        }
    };

    // Persistence: Save State
    const persistState = (active, start, currentMode, currentDuration, taskId) => {
        if (active) {
            localStorage.setItem('focusTimer', JSON.stringify({
                active,
                start: start.toISOString(),
                mode: currentMode,
                duration: currentDuration,
                taskId
            }));
        } else {
            localStorage.removeItem('focusTimer');
        }
    };

    // Initial Load
    useEffect(() => {
        const initData = async () => {
            // Restore Timer
            const saved = localStorage.getItem('focusTimer');
            if (saved) {
                try {
                    const { active, start, mode: sMode, duration, taskId } = JSON.parse(saved);
                    if (active) {
                        const startTime = new Date(start);
                        const elapsedSec = Math.floor((new Date() - startTime) / 1000);
                        const totalSec = duration * 60;
                        const remaining = totalSec - elapsedSec;

                        if (remaining > 0) {
                            // Resume
                            setMode(sMode);
                            if (sMode === 'focus') setFocusDuration(duration);
                            else setBreakDuration(duration);
                            
                            setTimeLeft(remaining);
                            setIsActive(true);
                            setSelectedTaskId(taskId || '');
                            startTimeRef.current = startTime;
                        } else {
                            // Finished while gone
                            if (sMode === 'focus') {
                                // Save the missed session
                                const sessionData = {
                                    taskId: taskId || null,
                                    duration: duration,
                                    type: 'focus',
                                    startTime: startTime,
                                    endTime: new Date(startTime.getTime() + duration * 60000)
                                };
                                api.post('/focus/session', sessionData)
                                   .then(() => fetchStats())
                                   .catch(e => console.error("Auto-save failed:", e));
                                
                                if (Notification.permission === "granted") {
                                    new Notification("Focus Session Complete!");
                                }
                            }

                            setMode(sMode);
                            setTimeLeft(0);
                            setIsActive(false); 
                            localStorage.removeItem('focusTimer');
                        }
                    }
                } catch (e) {
                    console.error("Failed to restore timer:", e);
                    localStorage.removeItem('focusTimer');
                }
            }

            // Fetch Data
            if (auth.currentUser) {
                try {
                    const resTasks = await api.get('/todos?status=todo');
                    setTasks(resTasks.data);
                    
                    const resStats = await api.get('/focus/today');
                    setTodayTotal(resStats.data.totalMinutes);
                    setDailyGoal(resStats.data.dailyFocusGoal);
                } catch (error) { 
                    console.error('Error initializing data:', error);
                }
            }
        };
        
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) initData();
        });
        return () => unsubscribe();
    }, []);

    // Timer Completion Logic
    const handleTimerComplete = useCallback(async (manualStop = false) => {
        setIsActive(false);
        persistState(false); // Clear storage

        if (!manualStop) {
            try { 
                alertSound.current.play().catch(() => {
                    // console.log('Audio error:', e);
                }); 
            } catch {
                // console.log('Audio error:', e);
            }
        }
        
        // Save Session
        if (mode === 'focus') {
            try {
                let durationToSave = focusDuration;
                
                if (manualStop && startTimeRef.current) {
                    const now = new Date();
                    const diffMs = now - startTimeRef.current;
                    const diffMins = Math.ceil(diffMs / 60000); 
                    durationToSave = diffMins > 0 ? diffMins : 0;
                }

                if (durationToSave > 0) {
                    const sessionData = {
                        taskId: selectedTaskId || null,
                        duration: durationToSave, 
                        type: 'focus',
                        startTime: startTimeRef.current || new Date(),
                        endTime: new Date()
                    };
                    await api.post('/focus/session', sessionData);
                    
                    // Refresh stats
                    fetchStats();
                    
                    if (!manualStop && Notification.permission === "granted") {
                        new Notification("Focus Session Complete!");
                    }
                }
                
                setMode('break');
                setTimeLeft(breakDuration * 60);

            } catch (error) {
                console.error("Failed to save session:", error);
                setMode('break');
                setTimeLeft(breakDuration * 60);
            }
        } else {
            // Break over
            setMode('focus');
            setTimeLeft(focusDuration * 60);
            if (!manualStop && Notification.permission === "granted") {
                new Notification("Break Over! Back to work.");
            }
        }
    }, [mode, focusDuration, breakDuration, selectedTaskId]);

    // Timer Tick Logic
    useEffect(() => {
        let interval = null;
        
        if (isActive) {
            interval = setInterval(() => {
                const now = new Date();
                // Calculate elapsed time based on start time (handles sleep/drift)
                const elapsedSeconds = Math.floor((now - startTimeRef.current) / 1000);
                const currentDurationMinutes = mode === 'focus' ? focusDuration : breakDuration;
                const totalSeconds = currentDurationMinutes * 60;
                const remaining = totalSeconds - elapsedSeconds;

                if (remaining <= 0) {
                    clearInterval(interval);
                    setTimeLeft(0);
                    handleTimerComplete(false); 
                } else {
                    setTimeLeft(remaining);
                }
            }, 1000);
        }
        
        return () => clearInterval(interval);
    }, [isActive, mode, focusDuration, breakDuration, handleTimerComplete]); 

    const toggleTimer = () => {
        if (!isActive) {
            // Starting
            const start = new Date();
            startTimeRef.current = start;
            setIsActive(true);
            
            // Save
            const currentDuration = mode === 'focus' ? focusDuration : breakDuration;
            persistState(true, start, mode, currentDuration, selectedTaskId);

            if (Notification.permission === "default") {
                Notification.requestPermission();
            }
        } else {
            // Pausing
            setIsActive(false);
            persistState(false); 
        }
    };

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(mode === 'focus' ? focusDuration * 60 : breakDuration * 60);
        persistState(false);
    };

    const handleDurationChange = (e, type) => {
        const val = parseInt(e.target.value) || 1;
        if (type === 'focus') {
            setFocusDuration(val);
            if (mode === 'focus' && !isActive) setTimeLeft(val * 60);
        } else {
            setBreakDuration(val);
            if (mode === 'break' && !isActive) setTimeLeft(val * 60);
        }
    };

    const formatTime = (seconds) => {
        if (seconds < 0) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const progress = 100 - (timeLeft / ((mode === 'focus' ? focusDuration : breakDuration) * 60)) * 100;

    return (
        <div className="relative w-full h-[calc(100vh-80px)] overflow-hidden bg-gray-50 flex flex-col items-center justify-center">
            
            {/* Background Transitions */}
            <div className={`absolute inset-0 transition-opacity duration-1000 ${mode === 'focus' ? 'bg-red-50 opacity-30' : 'bg-green-50 opacity-30'}`}></div>

            {/* Top Stats */}
            <div className="absolute top-6 left-6 z-20 flex flex-col gap-3 animate-fade-in">
                <div className="bg-white/50 backdrop-blur-md px-6 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                    <span className="text-2xl">🔥</span>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Today's Focus</p>
                        <p className="text-xl font-bold text-gray-800">{todayTotal} <span className="text-sm font-normal text-gray-500">mins</span></p>
                    </div>
                </div>

                {/* Goal Progress */}
                {dailyGoal > 0 ? (
                    <div className="bg-white/50 backdrop-blur-md px-6 py-3 rounded-2xl shadow-sm border border-gray-100 w-full">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-gray-500 uppercase">Daily Goal</span>
                            <span className="text-xs font-bold text-gray-500">{Math.min(100, Math.round((todayTotal/dailyGoal)*100))}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                            <div className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (todayTotal/dailyGoal)*100)}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400">
                             <span>{todayTotal}m</span>
                             <button onClick={() => setShowSetGoal(true)} className="hover:text-blue-600 underline">Goal: {dailyGoal}m</button>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={() => setShowSetGoal(true)}
                        className="bg-white/50 backdrop-blur-md px-6 py-2 rounded-full shadow-sm border border-gray-100 text-sm font-bold text-blue-600 hover:bg-white hover:scale-105 transition-all"
                    >
                        🎯 Set Daily Goal
                    </button>
                )}
            </div>

            {/* Set Goal Modal */}
            {showSetGoal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-bounce-in">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Set Daily Focus Goal 🎯</h3>
                        <p className="text-sm text-gray-500 mb-4">How many minutes do you want to focus today?</p>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            handleSetGoal(Number(e.target.goal.value));
                        }}>
                            <input 
                                name="goal" 
                                type="number" 
                                className="w-full border-2 border-gray-100 rounded-xl p-3 text-lg font-bold text-center focus:border-blue-500 outline-none mb-4" 
                                defaultValue={dailyGoal || 60}
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setShowSetGoal(false)} className="flex-1 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
                                <button type="submit" className="flex-1 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">Save Goal</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Main Timer Area */}
            <div className="z-10 flex flex-col items-center">
                {/* Task Selection */}
                {mode === 'focus' && !isActive && (
                    <div className="mb-8 w-64 animate-fade-in">
                        <select 
                            value={selectedTaskId}
                            onChange={(e) => setSelectedTaskId(e.target.value)}
                            className="w-full p-2 border-b-2 border-gray-200 bg-transparent text-center font-medium focus:border-gray-500 outline-none transition-all text-gray-600"
                        >
                            <option value="">-- No Task Selected --</option>
                            {tasks.map(t => (
                                <option key={t._id} value={t._id}>{t.title}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Circular Timer */}
                <div className="relative mb-8 group cursor-default">
                    <svg className="w-96 h-96 transform -rotate-90 drop-shadow-xl">
                        <circle
                            cx="192"
                            cy="192"
                            r="180"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="white"
                            className="text-gray-100"
                        />
                        <circle
                            cx="192"
                            cy="192"
                            r="180"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 180}
                            strokeDashoffset={2 * Math.PI * 180 * (1 - progress / 100)}
                            className={`transition-all duration-1000 ${mode === 'focus' ? 'text-red-400' : 'text-green-400'}`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-8xl font-mono font-bold tracking-tight text-gray-800">
                            {formatTime(timeLeft)}
                        </span>
                        <span className="uppercase tracking-widest text-sm font-bold text-gray-400 mt-4">
                            {mode === 'focus' ? 'Focusing' : 'Resting'}
                        </span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6">
                    <button 
                        onClick={toggleTimer}
                        className={`px-12 py-4 rounded-full text-2xl font-bold text-white shadow-xl hover:scale-105 transition-transform ${
                            isActive 
                            ? 'bg-gray-800' 
                            : (mode === 'focus' ? 'bg-red-500' : 'bg-green-500')
                        }`}
                    >
                        {isActive ? 'Pause' : 'Start'}
                    </button>
                    
                    {/* Reset / Finish Button */}
                    {isActive ? (
                        <button 
                            onClick={() => handleTimerComplete(true)} // Manual Stop
                            className="p-4 rounded-full text-red-500 bg-white shadow-md hover:bg-red-50 transition-colors uppercase font-bold text-xs tracking-wider"
                            title="Finish Session Early"
                        >
                            End
                        </button>
                    ) : (
                        <button 
                            onClick={resetTimer}
                            className="p-4 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                            title="Reset Timer"
                        >
                            <span className="text-xl">↺</span>
                        </button>
                    )}
                </div>

                {/* Inline Inputs (Only when paused) */}
                {!isActive && (
                    <div className="mt-8 flex gap-8 text-sm text-gray-400">
                        <label className="flex items-center gap-2 cursor-pointer hover:text-gray-600">
                            Focus: 
                            <input 
                                type="number" 
                                value={focusDuration} 
                                onChange={(e) => handleDurationChange(e, 'focus')}
                                className="w-12 text-center border-b border-gray-300 focus:border-gray-500 outline-none bg-transparent font-bold text-gray-600"
                            />
                            m
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:text-gray-600">
                            Break: 
                            <input 
                                type="number" 
                                value={breakDuration} 
                                onChange={(e) => handleDurationChange(e, 'break')}
                                className="w-12 text-center border-b border-gray-300 focus:border-gray-500 outline-none bg-transparent font-bold text-gray-600"
                            />
                            m
                        </label>
                    </div>
                )}
            </div>

            {/* Bottom Left: Spotify */}
            <div className="absolute bottom-6 left-6 w-80 z-20 transition-all hover:scale-105 hover:shadow-xl rounded-xl overflow-hidden shadow-lg">
                <iframe 
                    style={{ borderRadius: '12px' }} 
                    src="https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn?utm_source=generator" 
                    width="100%" 
                    height="80" 
                    frameBorder="0" 
                    allowFullScreen="" 
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                    loading="lazy"
                    title="Spotify Mini Player"
                ></iframe>
            </div>

            {/* Bottom Right: Pro Tip */}
            <div className="absolute bottom-6 right-6 max-w-xs bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-100 shadow-sm text-right z-20">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Stay Focused</h4>
                <p className="text-sm text-gray-600 italic">
                    "Flow state happens when distractions disappear. Keep the music low and the goals high."
                </p>
            </div>

        </div>
    );
};

export default FocusTimer;
