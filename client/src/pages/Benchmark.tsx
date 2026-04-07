import { useState, useEffect, useRef } from "react";
import { CyberCard } from "../components/CyberCard";
import { Button } from "../components/ui/button";
import { Play, Square, Activity, Cpu, Zap, Server } from "lucide-react";

export default function Benchmark() {
    const [isRunning, setIsRunning] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [stats, setStats] = useState({
        tps: 0,
        metricsBuffer: [] as number[],
        avgLatencyMs: "0.000",
        totalProcessed: 0,
        errors: 0
    });

    const workerRef = useRef<Worker | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll to bottom when logs update
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const initWorker = () => {
        if (workerRef.current) workerRef.current.terminate();

        // Using Vite worker syntax
        const worker = new Worker(new URL("../workers/BenchmarkWorker.ts", import.meta.url), {
            type: 'module'
        });

        worker.onmessage = (e) => {
            const { type, data } = e.data;
            if (type === 'LOG') {
                setLogs(prev => [...prev.slice(-49), `[${new Date().toISOString().split('T')[1].slice(0, 11)}] ${data}`]);
            }
            if (type === 'INIT_COMPLETE') {
                setIsReady(true);
                setLogs(prev => [...prev, `[System] Ready. Map Locks idle.`]);
            }
            if (type === 'BENCHMARK_TICK') {
                setStats(prev => {
                    const newBuffer = [...prev.metricsBuffer, data.tps].slice(-20); // Keep last 20 ticks for smooth average
                    return {
                        tps: data.tps,
                        metricsBuffer: newBuffer,
                        avgLatencyMs: data.avgLatencyMs,
                        totalProcessed: prev.totalProcessed + data.totalProcessed,
                        errors: prev.errors + data.errors
                    };
                });
            }
        };

        worker.onerror = (error) => {
            console.error("Worker Error: ", error);
            setLogs(prev => [...prev, `[CRITICAL ERROR] Worker thread crashed. See console.`]);
        };

        workerRef.current = worker;
        worker.postMessage({ type: 'INIT' });
        setLogs([`Booting Background WebWorker...`]);
    };

    useEffect(() => {
        initWorker();
        return () => {
            if (workerRef.current) workerRef.current.terminate();
        };
    }, []);

    const handleStart = () => {
        setIsRunning(true);
        setStats({ tps: 0, metricsBuffer: [], avgLatencyMs: "0.000", totalProcessed: 0, errors: 0 });
        workerRef.current?.postMessage({ type: 'START_BENCHMARK', payload: { batchSize: 250 } });
    };

    const handleStop = () => {
        setIsRunning(false);
        workerRef.current?.postMessage({ type: 'STOP_BENCHMARK' });
    };

    const currentTPSStr = (stats.metricsBuffer.reduce((a, b) => a + b, 0) / (stats.metricsBuffer.length || 1)).toFixed(0);

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="border-b border-primary/20 pb-4">
                <h1 className="text-4xl font-heading text-accent flex items-center gap-3">
                    <Activity className="w-8 h-8" /> WebDollar 2 Testnet Benchmark
                </h1>
                <p className="font-mono text-muted-foreground text-sm mt-2">
                    Decoupled Instant Execution with Lazy Block Settlement. Raw TypeScript Native Worker.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <CyberCard title="ENGINE CONTROL" className="bg-card/40 backdrop-blur-sm">
                        <div className="space-y-4">
                            <div className="font-mono text-xs text-muted-foreground border border-primary/20 p-3 rounded bg-background/50">
                                This stress-tests the local HotStateEngine using Ed25519 binary buffers across an isolated CPU thread. It mimics 10,000 P2P Quorum lock requests hitting Map Promises simultaneously.
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button
                                    disabled={!isReady || isRunning}
                                    onClick={handleStart}
                                    className="w-full h-12 text-lg font-bold bg-green-500/20 hover:bg-green-500/40 text-green-400 border border-green-500/50"
                                >
                                    <Play className="w-5 h-5 mr-2" /> FIRE SYSTEM (10k TPS)
                                </Button>
                                <Button
                                    disabled={!isRunning}
                                    onClick={handleStop}
                                    variant="destructive"
                                    className="w-full border border-red-500/50"
                                >
                                    <Square className="w-5 h-5 mr-2" /> HALT EXECUTION
                                </Button>
                                <Button
                                    disabled={isRunning}
                                    onClick={initWorker}
                                    variant="outline"
                                    className="w-full text-xs font-mono opacity-50"
                                >
                                    HARD REBOOT THREAD
                                </Button>
                            </div>
                        </div>
                    </CyberCard>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-card/50 border border-primary/20 p-4 rounded text-center">
                            <Zap className="w-6 h-6 text-accent mx-auto mb-2" />
                            <div className="font-mono text-2xl font-bold text-white">
                                {isRunning ? currentTPSStr : '0'}
                            </div>
                            <div className="font-mono text-[10px] text-accent font-bold mt-1 tracking-widest">LIVE TPS</div>
                        </div>
                        <div className="bg-card/50 border border-primary/20 p-4 rounded text-center">
                            <Cpu className="w-6 h-6 text-[#4ade80] mx-auto mb-2" />
                            <div className="font-mono text-2xl font-bold text-white">
                                {stats.avgLatencyMs}<span className="text-sm text-gray-500">ms</span>
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground mt-1 tracking-widest">AVG LOCK TIME</div>
                        </div>
                        <div className="bg-card/50 border border-primary/20 p-4 rounded text-center">
                            <Server className="w-6 h-6 text-[#60a5fa] mx-auto mb-2" />
                            <div className="font-mono text-2xl font-bold text-white">
                                {stats.totalProcessed.toLocaleString()}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground mt-1 tracking-widest">PROCESSED</div>
                        </div>
                        <div className="bg-card/50 border border-red-500/20 p-4 rounded text-center shadow-[inset_0_0_15px_rgba(239,68,68,0.05)]">
                            <Activity className="w-6 h-6 text-red-400 mx-auto mb-2" />
                            <div className="font-mono text-2xl font-bold text-red-500">
                                {stats.errors}
                            </div>
                            <div className="font-mono text-[10px] text-red-400/80 mt-1 tracking-widest">DEADLOCKS</div>
                        </div>
                    </div>

                    <CyberCard title="WEB-WORKER 0 TERMINAL LOG (Map Locking Flow)">
                        <div
                            ref={scrollRef}
                            className="bg-black/80 h-[400px] border border-primary/30 rounded p-4 overflow-y-auto font-mono text-xs sm:text-sm"
                            style={{ textShadow: '0 0 2px rgba(255,255,255,0.4)' }}
                        >
                            {logs.map((log, i) => (
                                <div key={i} className="mb-1">
                                    <span className="text-muted-foreground opacity-50 mr-2">{'>'}</span>
                                    <span className={log.includes('TPS') ? 'text-accent font-bold' : log.includes('error') ? 'text-red-400' : 'text-[#86efac]'}>
                                        {log}
                                    </span>
                                </div>
                            ))}
                            {isRunning && (
                                <div className="animate-pulse text-accent mt-2 ml-4">_</div>
                            )}
                        </div>
                    </CyberCard>
                </div>
            </div>
        </div>
    );
}
