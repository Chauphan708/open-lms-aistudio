import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Play, RotateCcw, X } from 'lucide-react';
import { User } from '../../types';

interface DuckRaceProps {
    students: User[];
    onComplete: (winner: User) => void;
    onClose: () => void;
}

interface Racer {
    id: string;
    student: User;
    progress: number; // 0 to 100
    speed: number;
}

export const DuckRace: React.FC<DuckRaceProps> = ({ students, onComplete, onClose }) => {
    const [racers, setRacers] = useState<Racer[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [winner, setWinner] = useState<User | null>(null);
    const requestRef = useRef<number>();
    const lastTimeRef = useRef<number>();

    // Initialize racers
    useEffect(() => {
        if (students.length > 0) {
            initRacers();
        }
    }, [students]);

    const initRacers = () => {
        const initialRacers = students.map(s => ({
            id: s.id,
            student: s,
            progress: 0,
            speed: Math.random() * 2 + 1 // Random initial speed
        }));
        setRacers(initialRacers);
        setWinner(null);
        setIsRunning(false);
    };

    const runRace = (time: number) => {
        if (lastTimeRef.current != undefined) {
            const deltaTime = time - lastTimeRef.current;

            setRacers(prevRacers => {
                let someoneWon = false;
                let newWinner: User | null = null;

                const updated = prevRacers.map(racer => {
                    if (someoneWon) return racer; // Stop others if won

                    // Random speed bump to make it exciting
                    const speedBump = (Math.random() - 0.4) * 0.5;
                    let newSpeed = Math.max(0.5, Math.min(5, racer.speed + speedBump));

                    let newProgress = racer.progress + (newSpeed * deltaTime * 0.015);

                    if (newProgress >= 100) {
                        newProgress = 100;
                        someoneWon = true;
                        newWinner = racer.student;
                    }

                    return { ...racer, progress: newProgress, speed: newSpeed };
                });

                if (someoneWon && newWinner) {
                    setIsRunning(false);
                    setWinner(newWinner);
                }

                return updated;
            });
        }

        lastTimeRef.current = time;
        if (isRunning && !winner) {
            requestRef.current = requestAnimationFrame(runRace);
        }
    };

    useEffect(() => {
        if (isRunning && !winner) {
            requestRef.current = requestAnimationFrame(runRace);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isRunning, winner]);

    const startRace = () => {
        setIsRunning(true);
        lastTimeRef.current = undefined; // Reset time so we don't jump
    };

    const handleSelectWinner = () => {
        if (winner) {
            onComplete(winner);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-indigo-600 p-4 text-white flex justify-between items-center relative overflow-hidden">
                    {/* Water waves background effect */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400 via-indigo-600 to-indigo-800"></div>

                    <h2 className="text-2xl font-black italic flex items-center gap-2 relative z-10">
                        <span className="text-3xl">🦆</span> GIẢI ĐUA VỊT LỚP HỌC
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition relative z-10">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Race Track */}
                <div className="flex-1 overflow-y-auto p-6 bg-sky-50 relative">
                    {/* Finish Line Indicator (visual only) */}
                    <div className="absolute right-6 top-6 bottom-6 w-8 border-l-4 border-dashed border-red-500 flex flex-col justify-center items-center opacity-50 z-0">
                        <div className="text-xs font-bold text-red-500 uppercase rotate-90 tracking-widest whitespace-nowrap">Đích Đến</div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        {racers.map((racer, idx) => (
                            <div key={racer.id} className="relative h-14 bg-blue-100 rounded-full border-2 border-blue-200 shadow-inner overflow-hidden">
                                {/* Water ripple effect */}
                                <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-blue-300 via-white to-blue-300 animate-pulse"></div>

                                <div className="absolute inset-0 py-2 px-3 flex items-center">
                                    <div className="font-bold text-blue-900 w-32 truncate text-sm z-10 mix-blend-color-burn">
                                        {idx + 1}. {racer.student.name}
                                    </div>
                                </div>

                                {/* The Duck */}
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 transition-all duration-75 flex flex-col items-center z-20"
                                    style={{ left: `calc(${racer.progress}% - 2rem)` }}
                                >
                                    <span className={`text-4xl filter drop-shadow-md ${winner && winner.id !== racer.id ? 'opacity-50 grayscale' : ''}`}>
                                        🦆
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Winner Announcement & Controls */}
                <div className="p-4 bg-gray-50 border-t flex items-center justify-between">
                    <div className="flex-1">
                        {winner ? (
                            <div className="animate-bounce flex items-center gap-3 text-emerald-600">
                                <Trophy className="h-8 w-8 text-amber-500" />
                                <div>
                                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Người chiến thắng</p>
                                    <p className="text-xl font-black">{winner.name}!</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">Sẵn sàng đua...</p>
                        )}
                    </div>

                    <div className="flex gap-3">
                        {!isRunning && !winner && (
                            <button onClick={startRace} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold transition shadow-md hover:shadow-lg active:scale-95">
                                <Play className="h-5 w-5 fill-current" /> BẮT ĐẦU ĐUA
                            </button>
                        )}
                        {(winner || (!isRunning && racers.some(r => r.progress > 0))) && (
                            <button onClick={initRacers} className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2.5 rounded-xl font-bold transition">
                                <RotateCcw className="h-5 w-5" /> Đua lại
                            </button>
                        )}
                        {winner && (
                            <button onClick={handleSelectWinner} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition shadow-md hover:shadow-lg active:scale-95 animate-pulse">
                                Chọn học sinh này
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
