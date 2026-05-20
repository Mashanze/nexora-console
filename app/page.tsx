'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'system';
  content: string;
}

export default function TerminalConsole() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Message[]>([
    { role: 'system', content: 'NEXORA-CORE v2.5 ONLINE. NEURAL LINKS STABLE.' },
    { role: 'system', content: 'TYPE "HELP" FOR CORE CAPABILITIES OR OPERATIONAL DIRECTIVES.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scrolls the terminal down as text populates
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Append user input to terminal log
    setHistory((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Simple custom local commands shortcut
    if (userMessage.toUpperCase() === 'HELP') {
      setHistory((prev) => [
        ...prev,
        { role: 'system', content: 'AVAILABLE COMMANDS:\n- CLEAR: Wipes terminal log buffer\n- STATUS: Runs core system diagnostic telemetry\n- Or input any natural language instruction to prompt the AI matrix.' }
      ]);
      setIsLoading(false);
      return;
    }

    if (userMessage.toUpperCase() === 'CLEAR') {
      setHistory([]);
      setIsLoading(false);
      return;
    }

    if (userMessage.toUpperCase() === 'STATUS') {
      setHistory((prev) => [
        ...prev,
        { role: 'system', content: 'TELEMETRY STATUS: EXCELLENT\nCOGNITIVE ENGINE: GEMINI-2.5-PRO ACTIVE\nUPLINK: SECURE SSL TUNNEL\nPORT: 3003' }
      ]);
      setIsLoading(false);
      return;
    }

    try {
      // 📡 Fetch payload from our internal API route handler
      const response = await fetch('/api/console', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.toolTriggered) {
          // Intercept and print out the specific tool target parameters
          setHistory((prev) => [
            ...prev, 
            { role: 'system', content: `⚙️ [TOOL TRIGGERED]: Intercepted macro [${data.functionCall.name}]` },
            { role: 'system', content: `📦 [PAYLOAD]: ${JSON.stringify(data.functionCall.args)}` }
          ]);
        } else {
          setHistory((prev) => [...prev, { role: 'system', content: data.output || "NEXORA-CORE: Response resolved without text wrapper." }]);
        }
      } else {
        // Extract diagnostic log strings directly from the 500 runtime error payload
        const errorDiagnostic = data.error || data.output || JSON.stringify(data);
        setHistory((prev) => [
          ...prev, 
          { role: 'system', content: `❌ [CRITICAL GRID INTERRUPT]: Server processing pipeline failed.` },
          { role: 'system', content: `🔍 [DIAGNOSTIC LOG]: ${errorDiagnostic}` }
        ]);
      }
    } catch (err: any) {
      setHistory((prev) => [...prev, { role: 'system', content: `CRITICAL CONSOLE FAULT: Local browser network packet dropped. Details: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-emerald-400 p-4 font-mono select-none flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Top Console Stats Banner */}
      <div className="border border-emerald-900/60 bg-emerald-950/10 p-3 rounded flex justify-between items-center text-xs text-emerald-500/80 mb-4 tracking-wider backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>SYS_CON: ACTIVE_SYS_OP_SESSION</span>
        </div>
        <div className="hidden sm:block text-[10px] text-emerald-600/70 uppercase">
          FRAMEWORK: NEXTJS_16 // COGNITIVE_BRAIN: GEMINI_AI
        </div>
      </div>

      {/* Main Terminal Activity Window */}
      <div className="flex-1 border border-emerald-900/30 bg-zinc-950/40 rounded p-4 overflow-y-auto mb-4 space-y-3.5 shadow-inner custom-scrollbar text-sm max-h-[calc(100vh-140px)]">
        {history.map((msg, i) => (
          <div key={i} className={`whitespace-pre-wrap leading-relaxed ${msg.role === 'user' ? 'text-cyan-400' : 'text-emerald-400'}`}>
            <span className="font-bold opacity-70">
              {msg.role === 'user' ? 'OP@NEXORA:~# ' : 'CORE_SYS_OUT> '}
            </span>
            {msg.content}
          </div>
        ))}

        {isLoading && (
          <div className="text-emerald-500/50 animate-pulse flex items-center gap-1.5 text-xs">
            <span className="inline-block w-1.5 h-3 bg-emerald-500/50 animate-blink" />
            THINKING... COMMUNICATING WITH AI VECTOR BLOCKS...
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Persistent Terminal CLI Prompt Bar */}
      <form onSubmit={handleSubmit} className="relative flex items-center border border-emerald-900/50 rounded overflow-hidden focus-within:border-emerald-500 transition-colors bg-zinc-950">
        <span className="pl-3 pr-1 text-cyan-400 font-bold text-sm select-none">
          OP@NEXORA:~#
        </span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          placeholder={isLoading ? "Processing sequence..." : "Type instruction string or 'help'..."}
          className="w-full bg-transparent text-cyan-300 p-3 text-sm font-mono outline-none placeholder:text-emerald-950 placeholder:italic disabled:opacity-50"
          autoFocus
        />
      </form>
    </div>
  );
}