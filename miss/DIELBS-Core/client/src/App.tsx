import { useState, useEffect, useRef } from "react";

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
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const initWorker = () => {
        if (workerRef.current) workerRef.current.terminate();

        const worker = new Worker(new URL("./workers/BenchmarkWorker.ts", import.meta.url), {
            type: 'module'
        });

        worker.onmessage = (e) => {
            const { type, data } = e.data;
            if (type === 'LOG') {
                setLogs(prev => [...prev.slice(-99), data]);
            }
            if (type === 'INIT_COMPLETE') {
                setIsReady(true);
                setLogs(prev => [...prev, `[Ready] Engine Warm. HotStateEngine initialized.`]);
            }
            if (type === 'BENCHMARK_TICK') {
                setStats(prev => {
                    const newBuffer = [...prev.metricsBuffer, data.tps].slice(-10);
                    return {
                        tps: data.tps,
                        metricsBuffer: newBuffer,
                        avgLatencyMs: data.avgLatencyMs,
                        totalProcessed: data.totalProcessed,
                        errors: data.errors
                    };
                });
            }
            if (type === 'CHAIN_UPDATE') {
                // Standalone test simply logs block creation
                setLogs(prev => [...prev.slice(-99), `[Block] ${data.hash.slice(0, 16)}...`]);
            }
        };

        workerRef.current = worker;
        worker.postMessage({ type: 'INIT' });
        setLogs([`Booting DIELBS Runtime Environment...`]);
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
        workerRef.current?.postMessage({ type: 'START_BENCHMARK', payload: { batchSize: 10000 } });
    };

    const handleStop = () => {
        setIsRunning(false);
        workerRef.current?.postMessage({ type: 'STOP_BENCHMARK' });
    };

    // Local Worker Stats
    const displayTPS = isRunning
        ? Math.round(stats.metricsBuffer.reduce((a, b) => a + b, 0) / (stats.metricsBuffer.length || 1))
        : 0;

    const displayLatency = isRunning
        ? stats.avgLatencyMs
        : "0.000";

    const displayTotal = stats.totalProcessed;

    const displayErrors = stats.errors;

    // Progress bar max at 15,000 TPS
    const progressPct = Math.min((displayTPS / 15000) * 100, 100);

    const currentTPSStr = displayTPS.toLocaleString();

    return (
        <div className="relative min-h-screen bg-slate-950/20 py-12 px-6">
            <div className="mesh-bg" />

            <div className="container mx-auto max-w-7xl">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/5 pb-8 mb-12 gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-primary/20 p-2 rounded-lg border border-primary/30">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-primary"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                            </div>
                            <span className="text-xs font-bold font-mono text-primary/80 uppercase tracking-[0.4em]">Integrated Protocol Performance</span>
                        </div>
                        <h1 className="text-5xl font-extrabold text-white tracking-tight">
                            DIELBS <span className="text-primary">BENCHMARK</span>
                        </h1>
                        <p className="text-slate-400 font-medium text-lg mt-3 max-w-2xl leading-relaxed">
                            Simulating high-frequency enterprise validation across isolated CPU threads. Real-time sub-millisecond state management.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            disabled={!isReady || isRunning}
                            onClick={handleStart}
                            className="btn-premium h-14 px-8 text-base shadow-xl shadow-primary/10"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-3 fill-current"><polygon points="5 3 19 12 5 21 5 3"/></svg> EXECUTE 10k TPS
                        </button>
                        <button
                            disabled={!isRunning}
                            onClick={handleStop}
                            className="btn-premium-outline h-14 px-8 text-base hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-3 fill-current"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/></svg> STOP ENGINE
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Stats Column */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-primary/5 border-primary/20 p-6 rounded-lg backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-primary"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">Network Throughput</span>
                            </div>
                            <div className="stat-value text-5xl tabular-nums text-sky-600 drop-shadow-[0_0_5px_rgba(2,132,199,0.3)]">
                                {displayTPS.toLocaleString()}
                                <span className="text-lg text-sky-600/40 ml-2">TX/S</span>
                            </div>
                            <div className="w-full bg-primary/10 h-1.5 mt-8 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(14,165,233,0.5)]"
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 rounded-lg backdrop-blur-sm bg-slate-800/30 border border-slate-700/50">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-emerald-400 mb-3"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/><path d="M6 12h.01"/><path d="M10 12h.01"/><path d="M14 12h.01"/><path d="M18 12h.01"/><path d="M6 16h.01"/><path d="M10 16h.01"/><path d="M14 16h.01"/><path d="M18 16h.01"/></svg>
                                <div className="stat-value text-2xl text-sky-600">
                                    {displayLatency}<span className="text-xs text-sky-600/40 font-normal ml-1">ms</span>
                                </div>
                                <div className="stat-label">LOCK LATENCY</div>
                            </div>
                            <div className="p-6 rounded-lg backdrop-blur-sm bg-slate-800/30 border border-slate-700/50">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary mb-3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                <div className="stat-value text-2xl text-sky-600">
                                    {displayErrors}
                                </div>
                                <div className="stat-label">COLLISIONS</div>
                            </div>
                        </div>

                        <div className="p-6 rounded-lg backdrop-blur-sm bg-slate-800/30 border border-slate-700/50">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-slate-400"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/></svg>
                                    <span className="stat-label mt-0 text-xs">Total Infrastructure Payload</span>
                                </div>
                                <div className="text-sky-600 font-mono text-4xl font-bold drop-shadow-[0_0_8px_rgba(2,132,199,0.3)] tracking-tight">
                                    {displayTotal.toLocaleString()}
                                </div>
                            </div>
                            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-400"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                                    <span className="stat-label mt-0">P2P Relay Nodes</span>
                                </div>
                                <div className="text-sky-600 font-mono text-sm animate-pulse-azure">ACTIVE</div>
                            </div>
                        </div>
                    </div>

                    {/* Terminal Section */}
                    <div className="lg:col-span-8 flex flex-col h-full">
                        <div className="p-4 rounded-lg backdrop-blur-sm bg-slate-800/30 border border-slate-700/50 flex-1 flex flex-col">
                            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500/20" />
                                        <div className="w-3 h-3 rounded-full bg-amber-500/20" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/20" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4">System Journal Console</span>
                                </div>
                                <button
                                    onClick={initWorker}
                                    className="h-8 px-3 text-[10px] text-slate-500 hover:text-white transition-colors uppercase tracking-widest font-bold"
                                >
                                    Clear Buffer
                                </button>
                            </div>

                            <div
                                ref={scrollRef}
                                className="cloud-terminal h-[480px] overflow-y-auto"
                            >
                                {logs.map((log, i) => (
                                    <div key={i} className="terminal-line">
                                        <span className="terminal-prompt">$</span>
                                        <span className={log.includes('error') ? 'text-red-400' : 'text-slate-300'}>
                                            {log}
                                        </span>
                                    </div>
                                ))}
                                {isRunning && (
                                    <div className="terminal-line">
                                        <span className="terminal-prompt">$</span>
                                        <div className="w-2 h-4 bg-primary/60 animate-pulse ml-1" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
