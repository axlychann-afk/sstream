import React from 'react';
import { Search, X, ArrowRight } from 'lucide-react';

export default function SearchAutocomplete() {
  const results = [
    { title: "Martial Master", genre: "Action", gradient: "from-red-900/40 to-zinc-800" },
    { title: "Martial Universe", genre: "Fantasy", gradient: "from-indigo-900/40 to-zinc-800" },
    { title: "The Supreme Body Refining Master", genre: "Cultivation", gradient: "from-emerald-900/40 to-zinc-800" },
    { title: "Martial Arts Reigns", genre: "Action", gradient: "from-purple-900/40 to-zinc-800" },
    { title: "The Martial Unity", genre: "Adventure", gradient: "from-amber-900/40 to-zinc-800" },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-16 p-8 bg-[#0a0a0a] min-h-screen text-zinc-100 items-start justify-center pt-24 font-sans">
      
      {/* Before */}
      <div className="flex flex-col gap-5 w-full max-w-sm">
        <div className="flex items-center gap-3">
          <div className="h-px bg-zinc-800 flex-1"></div>
          <h3 className="text-zinc-500 font-semibold tracking-wider uppercase text-xs">Sebelumnya</h3>
          <div className="h-px bg-zinc-800 flex-1"></div>
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
            <Search size={18} strokeWidth={2.5} />
          </div>
          <input 
            type="text" 
            placeholder="Search donghua..." 
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-full py-3 pl-11 pr-4 focus:outline-none placeholder-zinc-500"
            readOnly
          />
        </div>
      </div>

      {/* After */}
      <div className="flex flex-col gap-5 w-full max-w-sm">
        <div className="flex items-center gap-3">
          <div className="h-px bg-zinc-800 flex-1"></div>
          <h3 className="text-red-500 font-semibold tracking-wider uppercase text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            Sesudah
          </h3>
          <div className="h-px bg-zinc-800 flex-1"></div>
        </div>
        
        <div className="relative z-20">
          <div className="relative z-30">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-300">
              <Search size={18} strokeWidth={2.5} />
            </div>
            <input 
              type="text" 
              value="martial" 
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-t-2xl border-b-zinc-800 py-3 pl-11 pr-10 focus:outline-none font-medium"
              readOnly
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 cursor-pointer hover:text-zinc-200">
              <X size={16} strokeWidth={2.5} />
            </div>
          </div>
          
          <div className="absolute left-0 right-0 top-full bg-zinc-900 border border-zinc-700 border-t-0 rounded-b-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden z-20 flex flex-col">
            <div className="flex flex-col py-1">
              {results.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${idx === 0 ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'}`}
                >
                  <div className={`w-10 h-14 rounded bg-gradient-to-br ${item.gradient} flex-shrink-0 shadow-inner border border-zinc-700/50`}></div>
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <span className="text-sm font-medium text-zinc-100 truncate">{item.title}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded w-max border border-red-500/20">{item.genre}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-800 bg-zinc-900">
              <button className="w-full py-3 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5">
                Tekan Enter untuk semua hasil <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
