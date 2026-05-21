"use client";

import { useState, useEffect } from "react";

interface RegistryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export default function ConsolePage() {
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<string[]>([
    "CORE_SYS_OUT> NEXORA-CORE v2.5 ONLINE. NEURAL LINKS STABLE.",
    'CORE_SYS_OUT> TYPE "HELP" FOR CORE CAPABILITIES OR OPERATIONAL DIRECTIVES.'
  ]);
  const [registryData, setRegistryData] = useState<RegistryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-fetch the manifest on initial boot setup
  useEffect(() => {
    triggerSystemDirective("Pull up the latest inventory manifest from the product registry.");
  }, []);

  const triggerSystemDirective = async (commandText: string) => {
    if (!commandText.trim()) return;
    setIsLoading(true);
    
    setLogs((prev) => [...prev, `OP@NEXORA:~# ${commandText}`]);

    try {
      const response = await fetch("/api/console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: commandText }),
      });

      const result = await response.json();

      if (result.error) {
        setLogs((prev) => [...prev, `CORE_SYS_OUT> ❌ CRITICAL FAULT: ${result.error}`]);
        return;
      }

      // Handle successful data mutations/reads
      if (result.toolTriggered) {
        if (result.message) {
          setLogs((prev) => [...prev, `CORE_SYS_OUT> ⚡ ${result.message}`]);
        } else {
          setLogs((prev) => [...prev, "CORE_SYS_OUT> 📂 [DECRYPTING REGISTER]: Syncing live database inventory blocks."]);
        }
        
        if (result.data) {
          setRegistryData(result.data);
        }
      } else if (result.output) {
        setLogs((prev) => [...prev, `CORE_SYS_OUT> ${result.output}`]);
      }

    } catch (err: any) {
      setLogs((prev) => [...prev, `CORE_SYS_OUT> ❌ CRITICAL UPLINK EXCEPTION: ${err.message}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const command = input;
    setInput("");
    triggerSystemDirective(command);
  };

  return (
    <div className="min-h-screen bg-black text-emerald-500 font-mono p-6 selection:bg-emerald-900 selection:text-emerald-200">
      {/* Upper Terminal Frame Meta Headers */}
      <div className="flex justify-between items-center border border-emerald-950 bg-neutral-950 p-2 text-xs mb-4 text-emerald-600">
        <div>SYS_CON: ACTIVE_SYS_OP_SESSION</div>
        <div>FRAMEWORK: NEXTJS_15 // SECURE_MAIN_NODE_UPLINK</div>
      </div>

      {/* Terminal Text Execution Stream Logs */}
      <div className="space-y-1 mb-6 max-h-64 overflow-y-auto custom-scrollbar text-sm">
        {logs.map((log, index) => (
          <div key={index} className={log.startsWith("OP@") ? "text-cyan-400" : ""}>
            {log}
          </div>
        ))}
        {isLoading && <div className="text-amber-500 animate-pulse">CORE_SYS_OUT&gt; Processing quantum matrix instruction threads...</div>}
      </div>

      {/* Real-time Synced Database Inventory Data Grid Visualizer */}
      {registryData.length > 0 && (
        <div className="border border-emerald-950 bg-neutral-950 rounded p-4 mb-6 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-emerald-900 text-emerald-400 uppercase tracking-wider">
                <th className="pb-2 font-semibold">Asset ID</th>
                <th className="pb-2 font-semibold">Description</th>
                <th className="pb-2 font-semibold">Registry Category</th>
                <th className="pb-2 font-semibold text-right">Valuation</th>
                <th className="pb-2 font-semibold text-right">Stock Units</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/40">
              {registryData.map((item) => (
                <tr key={item.id} className="hover:bg-emerald-950/20 transition-colors">
                  <td className="py-2 font-bold text-cyan-500">{item.id}</td>
                  <td className="py-2 text-neutral-300">{item.name}</td>
                  <td className="py-2 text-emerald-600">{item.category}</td>
                  <td className="py-2 text-right text-amber-400 font-medium">R {item.price.toLocaleString()}</td>
                  <td className="py-2 text-right text-emerald-400">{item.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Main Terminal Command String Input Line Container */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-emerald-950 pt-4">
        <span className="text-cyan-400 font-bold shrink-0">OP@NEXORA:~#</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-transparent border-none outline-none text-emerald-400 font-mono text-sm focus:ring-0 placeholder:text-emerald-950"
          placeholder="Execute system commands sequence string..."
          autoFocus
        />
      </form>
    </div>
  );
}