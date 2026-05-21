"use client";

import { useState, useEffect } from "react";

interface RegistryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

interface VentureTask {
  id: string;
  task_description: string;
  is_completed: boolean;
  priority: string;
}

interface VentureItem {
  id: string;
  name: string;
  focus_sector: string;
  revenue_zar: number;
  target_launch_date: string;
  venture_tasks: VentureTask[];
}

export default function ConsolePage() {
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<string[]>([
    "CORE_SYS_OUT> NEXORA-CORE v2.5 ONLINE. NEURAL LINKS STABLE.",
    'CORE_SYS_OUT> TYPE "HELP" FOR CORE CAPABILITIES OR OPERATIONAL DIRECTIVES.'
  ]);
  
  // Data State Drivers
  const [registryData, setRegistryData] = useState<RegistryItem[]>([]);
  const [venturesData, setVenturesData] = useState<VentureItem[]>([]);
  const [currentView, setCurrentView] = useState<"PRODUCTS" | "VENTURES" | "NONE">("NONE");
  const [isLoading, setIsLoading] = useState(false);

  // Initial boot-up sequence pulls products manifest automatically
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

      if (result.toolTriggered) {
        if (result.message) {
          setLogs((prev) => [...prev, `CORE_SYS_OUT> ⚡ ${result.message}`]);
        }

        // Dynamically toggle rendering states depending on the backend action response
        if (result.action === "READ_PRODUCTS") {
          setRegistryData(result.data);
          setCurrentView("PRODUCTS");
          if (!result.message) {
            setLogs((prev) => [...prev, "CORE_SYS_OUT> 📂 [DECRYPTING REGISTER]: Syncing live database inventory blocks."]);
          }
        } 
        
        else if (result.action === "READ_VENTURES") {
          setVenturesData(result.data);
          setCurrentView("VENTURES");
          if (!result.message) {
            setLogs((prev) => [...prev, "CORE_SYS_OUT> 🛰️ [VENTURE MATRIX ONLINE]: Synchronized relational business nodes."]);
          }
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
        <div>SYS_CON: ACTIVE_SYS_OP_SESSION // MODULES: 1 & 2 SECURED</div>
        <div>FRAMEWORK: NEXTJS_15 // SECURE_MAIN_NODE_UPLINK</div>
      </div>

      {/* Terminal Text Execution Stream Logs */}
      <div className="space-y-1 mb-6 max-h-64 overflow-y-auto custom-scrollbar text-sm">
        {logs.map((log, index) => (
          <div key={index} className={log.startsWith("OP@") ? "text-cyan-400" : ""}>
            {log}
          </div>
        ))}
{isLoading && <div className="text-amber-500 animate-pulse">{"CORE_SYS_OUT> Processing quantum matrix instruction threads..."}</div>}      </div>

      {/* ======================================================= */}
      {/* VIEW PANEL 1: PRODUCT MANIFEST GRID                     */}
      {/* ======================================================= */}
      {currentView === "PRODUCTS" && registryData.length > 0 && (
        <div className="border border-emerald-950 bg-neutral-950 rounded p-4 mb-6 overflow-x-auto animate-fadeIn">
          <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Live Registry Asset Data Monitor
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-emerald-900 text-emerald-500 font-semibold tracking-wider">
                <th className="pb-2">Asset ID</th>
                <th className="pb-2">Description</th>
                <th className="pb-2">Registry Category</th>
                <th className="pb-2 text-right">Valuation</th>
                <th className="pb-2 text-right">Stock Units</th>
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

      {/* ======================================================= */}
      {/* VIEW PANEL 2: SIDE HUSTLE & VENTURE MATRIX MODULE       */}
      {/* ======================================================= */}
      {currentView === "VENTURES" && venturesData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-fadeIn">
          {venturesData.map((venture) => (
            <div key={venture.id} className="border border-emerald-950 bg-neutral-950 rounded p-4 flex flex-col justify-between">
              <div>
                {/* Brand Identifier */}
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-cyan-400 font-bold text-sm tracking-wide">{venture.name}</h3>
                  <span className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded uppercase">
                    {venture.id}
                  </span>
                </div>
                
                <p className="text-neutral-500 text-[11px] mb-3">{venture.focus_sector}</p>
                
                {/* Financial Metric Indicator */}
                <div className="border border-emerald-950/60 bg-black/40 rounded p-2.5 mb-4 flex justify-between items-center">
                  <span className="text-[10px] text-emerald-600 uppercase">Gross Revenue Balance</span>
                  <span className="text-amber-400 text-xs font-semibold">R {Number(venture.revenue_zar).toLocaleString()}</span>
                </div>

                {/* Sub-Checklist Elements */}
                <div className="space-y-2">
                  <div className="text-[10px] text-emerald-500 uppercase tracking-wider font-bold mb-1">Launch Milestones</div>
                  {venture.venture_tasks && venture.venture_tasks.length > 0 ? (
                    venture.venture_tasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-2 border border-neutral-900 bg-neutral-950 p-2 rounded text-xs">
                        <span className={`text-[9px] px-1 font-bold rounded ${
                          task.priority === "HIGH" ? "bg-rose-950 text-rose-400 border border-rose-900" : "bg-neutral-900 text-neutral-400"
                        }`}>
                          {task.priority}
                        </span>
                        <p className={`flex-1 text-[11px] leading-tight ${task.is_completed ? "line-through text-neutral-600" : "text-neutral-300"}`}>
                          {task.task_description}
                        </p>
                        <span className={`text-[10px] font-bold ${task.is_completed ? "text-emerald-500" : "text-amber-600"}`}>
                          {task.is_completed ? "✓" : "⬦"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-neutral-600 italic">No tasks assigned to core stack.</div>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-neutral-600 border-t border-neutral-900/60 pt-2 mt-4 text-right">
                TARGET LAUNCH: {new Date(venture.target_launch_date).toLocaleDateString()}
              </div>
            </div>
          ))}
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