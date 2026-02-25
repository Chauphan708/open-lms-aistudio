import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Plus, Trash2, Repeat, Clock, Music, ArrowLeft, Volume2, Settings2, Bell } from 'lucide-react';

type TimerMode = 'NORMAL' | 'STUDY';

interface TimerStep {
    id: string;
    label: string;
    hours: number;
    minutes: number;
    seconds: number;
    sound: string;
}

export const CountdownTimer: React.FC = () => {
    const [mode, setMode] = useState<TimerMode>('NORMAL');

    // Normal Mode State
    const [normalHours, setNormalHours] = useState<number>(0);
    const [normalMinutes, setNormalMinutes] = useState<number>(10);
    const [normalSeconds, setNormalSeconds] = useState<number>(0);
    const [normalSound, setNormalSound] = useState<string>('alarm1');
    const [normalLabel, setNormalLabel] = useState<string>('Đồng hồ hẹn giờ');

    // Study Mode State
    const [studySteps, setStudySteps] = useState<TimerStep[]>([
        { id: '1', label: 'Học', hours: 0, minutes: 25, seconds: 0, sound: 'none' },
        { id: '2', label: 'Nghỉ', hours: 0, minutes: 5, seconds: 0, sound: 'alarm1' }
    ]);
    const [isRepeat, setIsRepeat] = useState<boolean>(false);

    // Running State
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [timeRemaining, setTimeRemaining] = useState<number>(0); // in seconds
    const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
    const [currentLabel, setCurrentLabel] = useState<string>('');

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Audio Maps
    const sounds = [
        { id: 'none', name: 'Im lặng', url: '' },
        { id: 'alarm1', name: 'Đồng hồ báo thức 1', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
        { id: 'bell1', name: 'Chuông kêu', url: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3' },
        { id: 'digital', name: 'Beep điện tử', url: 'https://assets.mixkit.co/active_storage/sfx/2871/2871-preview.mp3' }
    ];

    // Presets
    const presets = [
        { label: '15 giây', h: 0, m: 0, s: 15 },
        { label: '30 giây', h: 0, m: 0, s: 30 },
        { label: '45 giây', h: 0, m: 0, s: 45 },
        { label: '1 phút', h: 0, m: 1, s: 0 },
        { label: '5 phút', h: 0, m: 5, s: 0 },
        { label: '10 phút', h: 0, m: 10, s: 0 },
        { label: '15 phút', h: 0, m: 15, s: 0 },
        { label: '30 phút', h: 0, m: 30, s: 0 },
    ];

    const handleStart = () => {
        if (mode === 'NORMAL') {
            const totalSeconds = normalHours * 3600 + normalMinutes * 60 + normalSeconds;
            if (totalSeconds === 0) return;
            setTimeRemaining(totalSeconds);
            setCurrentLabel(normalLabel);
        } else {
            if (studySteps.length === 0) return;
            startStudyStep(0);
        }
        setIsRunning(true);
        setIsPaused(false);
    };

    const startStudyStep = (index: number) => {
        const step = studySteps[index];
        const totalSeconds = step.hours * 3600 + step.minutes * 60 + step.seconds;
        setTimeRemaining(totalSeconds);
        setCurrentLabel(step.label);
        setCurrentStepIndex(index);
    };

    const playSound = (soundId: string) => {
        if (soundId === 'none') return;
        const soundObj = sounds.find(s => s.id === soundId);
        if (soundObj && soundObj.url) {
            if (audioRef.current) {
                audioRef.current.src = soundObj.url;
                audioRef.current.play().catch(e => console.log('Audio play failed:', e));
            }
        }
    };

    const handleStop = () => {
        setIsRunning(false);
        setIsPaused(false);
        if (timerRef.current) clearInterval(timerRef.current);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const handlePauseResume = () => {
        setIsPaused(!isPaused);
    };

    useEffect(() => {
        if (isRunning && !isPaused && timeRemaining > 0) {
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => prev - 1);
            }, 1000);
        } else if (isRunning && !isPaused && timeRemaining === 0) {
            // Timer finished
            if (timerRef.current) clearInterval(timerRef.current);

            let soundToPlay = 'none';
            if (mode === 'NORMAL') {
                soundToPlay = normalSound;
                setIsRunning(false);
            } else {
                soundToPlay = studySteps[currentStepIndex].sound;

                // Move to next step
                const nextIndex = currentStepIndex + 1;
                if (nextIndex < studySteps.length) {
                    startStudyStep(nextIndex);
                } else if (isRepeat) {
                    startStudyStep(0); // Loop back
                } else {
                    setIsRunning(false);
                }
            }
            playSound(soundToPlay);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning, isPaused, timeRemaining, mode, currentStepIndex, studySteps, isRepeat, normalSound]);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatTimeFull = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const testAudio = (soundId: string) => {
        playSound(soundId);
    };

    return (
        <div className="min-h-screen bg-[#0f1115] text-white flex flex-col font-sans">
            <audio ref={audioRef} />

            {/* Header */}
            {!isRunning && (
                <header className="p-6 text-center border-b border-gray-800">
                    <h1 className="text-3xl font-bold tracking-wide">Đồng hồ đếm ngược</h1>
                </header>
            )}

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-4">

                {/* RUNNING VIEW */}
                {isRunning ? (
                    <div className="w-full max-w-4xl flex flex-col items-center animate-fade-in">
                        <div className="mb-8 text-2xl md:text-4xl text-gray-400 font-medium tracking-wider">
                            {currentLabel}
                        </div>

                        <div className={`text-[120px] md:text-[200px] font-black leading-none tabular-nums tracking-tighter ${timeRemaining <= 10 && timeRemaining > 0 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                            {formatTime(timeRemaining)}
                        </div>

                        {mode === 'STUDY' && (
                            <div className="mt-8 text-gray-500 text-lg">
                                Bước {currentStepIndex + 1} / {studySteps.length}
                            </div>
                        )}

                        <div className="mt-16 flex items-center gap-6">
                            <button
                                onClick={handleStop}
                                className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
                                title="Hủy"
                            >
                                <Square className="h-8 w-8" />
                            </button>
                            <button
                                onClick={handlePauseResume}
                                className={`p-6 rounded-full transition shadow-lg shadow-black/50 ${isPaused ? 'bg-blue-500 hover:bg-blue-400' : 'bg-orange-500 hover:bg-orange-400'}`}
                            >
                                {isPaused ? <Play className="h-10 w-10 text-white fill-current" /> : <Pause className="h-10 w-10 text-white fill-current" />}
                            </button>
                            <button
                                onClick={() => setTimeRemaining(prev => prev + 60)}
                                className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 transition font-bold text-xl"
                                title="Cộng thêm 1 phút"
                            >
                                +1m
                            </button>
                        </div>
                    </div>
                ) : (
                    /* SETUP VIEW */
                    <div className="w-full max-w-3xl animate-fade-in">

                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold">Đặt một đồng hồ hẹn giờ</h2>
                            <button
                                onClick={() => setMode(mode === 'NORMAL' ? 'STUDY' : 'NORMAL')}
                                className={`px-4 py-2 rounded-full text-sm font-bold transition border ${mode === 'STUDY' ? 'bg-[#29b6f6] text-black border-[#29b6f6]' : 'border-[#29b6f6] text-[#29b6f6] hover:bg-[#29b6f6]/10'}`}
                            >
                                Chế độ học
                            </button>
                        </div>

                        <div className="bg-[#1a1d24] rounded-2xl p-6 md:p-8 shadow-2xl border border-gray-800">

                            {mode === 'NORMAL' && (
                                <div className="space-y-8">
                                    {/* Time Selectors */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-2">Số giờ</label>
                                            <select
                                                value={normalHours} onChange={e => setNormalHours(Number(e.target.value))}
                                                className="w-full bg-[#0f1115] border border-gray-700 rounded-lg p-3 text-white text-xl appearance-none focus:outline-none focus:border-blue-500"
                                            >
                                                {Array.from({ length: 100 }).map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-2">Số phút</label>
                                            <select
                                                value={normalMinutes} onChange={e => setNormalMinutes(Number(e.target.value))}
                                                className="w-full bg-[#0f1115] border border-gray-700 rounded-lg p-3 text-white text-xl appearance-none focus:outline-none focus:border-blue-500"
                                            >
                                                {Array.from({ length: 60 }).map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-2">Số giây</label>
                                            <select
                                                value={normalSeconds} onChange={e => setNormalSeconds(Number(e.target.value))}
                                                className="w-full bg-[#0f1115] border border-gray-700 rounded-lg p-3 text-white text-xl appearance-none focus:outline-none focus:border-blue-500"
                                            >
                                                {Array.from({ length: 60 }).map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Presets */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {presets.map(p => (
                                            <button
                                                key={p.label}
                                                onClick={() => { setNormalHours(p.h); setNormalMinutes(p.m); setNormalSeconds(p.s); }}
                                                className="flex items-center gap-2 text-[#29b6f6] hover:text-white transition group"
                                            >
                                                <Bell className="h-4 w-4" />
                                                <span>{p.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Settings */}
                                    <div className="space-y-6 pt-6 border-t border-gray-800">
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-gray-300 font-bold text-lg">Âm thanh báo thức</label>
                                                <button onClick={() => testAudio(normalSound)} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
                                                    <Play className="h-3 w-3" /> Kiểm tra âm thanh
                                                </button>
                                            </div>
                                            <select
                                                value={normalSound} onChange={e => setNormalSound(e.target.value)}
                                                className="w-full bg-[#0f1115] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                                            >
                                                {sounds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-gray-300 font-bold text-lg mb-2">Tên đồng hồ hẹn giờ</label>
                                            <input
                                                value={normalLabel} onChange={e => setNormalLabel(e.target.value)}
                                                placeholder="Đồng hồ hẹn giờ"
                                                className="w-full bg-[#0f1115] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {mode === 'STUDY' && (
                                <div className="space-y-6">
                                    {/* Headers */}
                                    <div className="flex text-gray-500 text-sm px-2">
                                        <div className="w-10 text-center">#</div>
                                        <div className="flex-1">Nhãn</div>
                                        <div className="w-48 text-center text-[10px] md:text-sm">Thời gian</div>
                                        <div className="flex-1 text-center md:text-left">Âm thanh báo thức</div>
                                        <div className="w-10"></div>
                                    </div>

                                    {/* Steps List */}
                                    <div className="space-y-3">
                                        {studySteps.map((step, index) => (
                                            <div key={step.id} className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-4 bg-[#0f1115] p-2 md:p-3 rounded-xl border border-gray-800">
                                                <div className="w-6 md:w-8 text-center text-gray-500 font-mono text-sm">{index + 1}</div>
                                                <div className="flex-1 min-w-[100px]">
                                                    <input
                                                        value={step.label} onChange={e => {
                                                            const newSteps = [...studySteps];
                                                            newSteps[index].label = e.target.value;
                                                            setStudySteps(newSteps);
                                                        }}
                                                        className="w-full bg-transparent border border-gray-700 rounded p-2 text-white focus:border-[#29b6f6] outline-none text-sm md:text-base"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <input type="number" min="0" max="99" value={step.hours.toString().padStart(2, '0')}
                                                        onChange={e => { const newSteps = [...studySteps]; newSteps[index].hours = Number(e.target.value); setStudySteps(newSteps); }}
                                                        className="w-10 md:w-12 bg-transparent border border-gray-700 text-center rounded p-1.5 focus:border-[#29b6f6] outline-none text-sm md:text-base"
                                                    /> :
                                                    <input type="number" min="0" max="59" value={step.minutes.toString().padStart(2, '0')}
                                                        onChange={e => { const newSteps = [...studySteps]; newSteps[index].minutes = Number(e.target.value); setStudySteps(newSteps); }}
                                                        className="w-10 md:w-12 bg-transparent border border-gray-700 text-center rounded p-1.5 focus:border-[#29b6f6] outline-none text-sm md:text-base"
                                                    /> :
                                                    <input type="number" min="0" max="59" value={step.seconds.toString().padStart(2, '0')}
                                                        onChange={e => { const newSteps = [...studySteps]; newSteps[index].seconds = Number(e.target.value); setStudySteps(newSteps); }}
                                                        className="w-10 md:w-12 bg-transparent border border-gray-700 text-center rounded p-1.5 focus:border-[#29b6f6] outline-none text-sm md:text-base"
                                                    />
                                                </div>
                                                <div className="flex-[0.8] min-w-[100px]">
                                                    <select
                                                        value={step.sound} onChange={e => {
                                                            const newSteps = [...studySteps];
                                                            newSteps[index].sound = e.target.value;
                                                            setStudySteps(newSteps);
                                                        }}
                                                        className="w-full bg-transparent border border-gray-700 rounded p-2 text-white text-sm focus:border-[#29b6f6] outline-none"
                                                    >
                                                        {sounds.map(s => <option key={s.id} value={s.id} className="bg-[#0f1115]">{s.name}</option>)}
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setStudySteps(studySteps.filter((_, i) => i !== index));
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded transition"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Controls */}
                                    <div className="flex justify-between items-center pt-4">
                                        <button
                                            onClick={() => {
                                                setStudySteps([...studySteps, { id: Date.now().toString(), label: 'Mới', hours: 0, minutes: 0, seconds: 0, sound: 'none' }]);
                                            }}
                                            className="flex items-center gap-2 border border-[#29b6f6] text-[#29b6f6] hover:bg-[#29b6f6]/10 px-4 py-2 rounded-lg font-bold text-sm transition"
                                        >
                                            <Plus className="h-4 w-4" /> Thêm hẹn giờ
                                        </button>

                                        <label className="flex items-center gap-3 cursor-pointer text-gray-300 hover:text-white transition">
                                            <span>Lặp lại</span>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isRepeat ? 'border-[#29b6f6] bg-[#29b6f6]' : 'border-gray-500'}`}>
                                                {isRepeat && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                            </div>
                                            {/* hidden checkbox for accessibility/logic toggle */}
                                            <input type="checkbox" className="hidden" checked={isRepeat} onChange={e => setIsRepeat(e.target.checked)} />
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Global Start Button */}
                            <button
                                onClick={handleStart}
                                className="w-full mt-8 bg-[#29b6f6] hover:bg-[#4fc3f7] text-black font-bold py-4 rounded-xl text-lg transition shadow-lg shadow-[#29b6f6]/20"
                            >
                                Bắt đầu hẹn giờ
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

// Helper SVG Icon since X was missing from top imports in this scope originally, let's just add it locally if needed, or import
const X = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);
