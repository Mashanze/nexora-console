'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'system';
  content: string;
  type?: 'text' | 'table' | 'success';
  tableData?: Array<{ id: string; name: string; category: string; price: number; stock: number }>;
}

export default function TerminalConsole() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Message[]>([
    { role: 'system', content: 'NEXORA-CORE v2.5 ONLINE. NEURAL LINKS STABLE.', type: 'text' },
    { role: 'system', content: 'TYPE "HELP" FOR CORE CAPABILITIES OR OPERATIONAL DIRECTIVES.', type: 'text' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setHistory((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    if (userMessage.toUpperCase() === 'HELP') {
      setHistory((prev) => [...prev, { 
        role: 'system', 
        content: 'AVAILABLE COMMANDS:\n- CLEAR: Wipes console logs\n- STATUS: Runs telemetry audit\n- Or input standard database prompt targets.',
        type: 'text' 
      }]);
      setIsLoading(false);
      return;
    }

    if (userMessage.toUpperCase() === 'CLEAR') {
      setHistory([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/console', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.toolTriggered) {
          if (data.action === "READ") {
            setHistory((prev) => [
              ...prev,
              { role: 'system', content: '📂 [DECRYPTING REGISTER]: Syncing live database inventory blocks...', type: 'text' },
              { role: 'system', content: '', type: 'table', tableData: data.data }
            ]);
          } else if (data.action === "UPDATE") {
            setHistory((prev) => [
              ...prev,
              { role: 'system', content: `⚡ ${data.message}`, type: 'success' },
              { role: 'system', content: '', type: 'table', tableData: data.data }
            ]);
          }
        } else {
          setHistory((prev) => [...prev, { role: 'system', content: data.output, type: 'text' }]);
        }
      } else {
        setHistory((prev) => [...prev, { role: 'system', content: `❌ CRITICAL FAULT: ${data.error || 'Uplink disruption.'}`, type: 'text' }]);
      }
    } catch (err: any) {
      setHistory((prev) => [...prev, { role: 'system', content: `💥 INTERRUPT: Local crash: ${err.message}`, type: 'text' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-emerald-400 p-4 font-mono select-none flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Top Banner */}
      <div className="border border-emerald-900/60 bg-emerald-950/10 p-3 rounded flex justify-between items-center text-xs text-emerald-500/80 mb-4 tracking-wider backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>SYS_CON: ACTIVE_SYS_OP_SESSION</span>
        </div>
        <div className="text-[10px] text-emerald-600/70 uppercase">
          FRAMEWORK: NEXTJS_15 // SECURE MAIN_NODE UPLINK
        </div>
      </div>

      {/* Console Windows */}
      <div className="flex-1 border border-emerald-900/30 bg-zinc-950/40 rounded p-4 overflow-y-auto mb-4 space-y-4 shadow-inner text-sm custom-scrollbar max-h-[calc(100vh-140px)]">
        {history.map((msg, i) => (
          <div key={i} className={`whitespace-pre-wrap leading-relaxed ${msg.role === 'user' ? 'text-cyan-400' : 'text-emerald-400'}`}>
            <span className="font-bold opacity-70">
              {msg.role === 'user' ? 'OP@NEXORA:~# ' : 'CORE_SYS_OUT> '}
            </span>
            
            {msg.type === 'text' && msg.content}
            
            {msg.type === 'success' && <span className="text-yellow-400 font-semibold">{msg.content}</span>}
            
            {msg.type === 'table' && msg.tableData && (
              <div className="mt-3 overflow-x-auto border border-emerald-900/40 rounded bg-black/60 p-2">
                <table className="w-full text-left text-xs text-emerald-500 tracking-wide">
                  <thead>
                    <tr className="border-b border-emerald-900 text-emerald-400 bg-emerald-950/20 font-bold">
                      <th className="p-2">ASSET ID</th>
                      <th className="p-2">DESCRIPTION</th>
                      <th className="p-2">REGISTRY CATEGORY</th>
                      <th className="p-2 text-right">VALUATION</th>
                      <th className="p-2 text-right">STOCK UNITS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {msg.tableData.map((row) => (
                      <tr key={row.id} className="border-b border-emerald-950/30 hover:bg-emerald-950/10 transition-colors">
                        <td className="p-2 font-bold text-cyan-400">{row.id}</td>
                        <td className="p-2 text-zinc-300">{row.name}</td>
                        <td className="p-2 text-emerald-600">{row.category}</td>
                        <td className="p-2 text-right text-yellow-500 font-medium">${row.price}</td>
                        <td className="p-2 text-right font-semibold">{row.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="text-emerald-500/50 animate-pulse flex items-center gap-1.5 text-xs">
            <span className="inline-block w-1.5 h-3 bg-emerald-500/50 animate-blink" />
            SYNCHRONIZING WITH SYSTEM COGNITIVE VECTOR CORE...
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Input CLI Bar */}
      <form onSubmit={handleSubmit} className="relative flex items-center border border-emerald-900/50 rounded overflow-hidden focus-within:border-emerald-500 transition-colors bg-zinc-950">
        <span className="pl-3 pr-1 text-cyan-400 font-bold text-sm select-none">OP@NEXORA:~#</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          placeholder="Execute system commands sequence string..."
          className="w-full bg-transparent text-cyan-300 p-3 text-sm font-mono outline-none placeholder:text-emerald-950 placeholder:italic"
          autoFocus
        />
      </form>
    </div>
  );
}