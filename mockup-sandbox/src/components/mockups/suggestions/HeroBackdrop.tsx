import React from 'react';

export default function HeroBackdrop() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans p-4 md:p-10">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-10">
        
        {/* Header */}
        <div className="flex flex-col gap-2 border-b border-zinc-900 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Hero Section: Cinematic Backdrop</h1>
          <p className="text-zinc-400">Detail page hero improvements for a richer, more immersive Netflix-style experience.</p>
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-10 items-start">
          
          {/* Before */}
          <div className="flex flex-col gap-4">
            <h2 className="font-semibold text-zinc-500 uppercase tracking-widest text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
              Sebelumnya
            </h2>
            <div className="bg-[#0a0a0a] border border-zinc-900 rounded-xl h-[400px] flex p-8 gap-8">
              <div className="w-[180px] h-[260px] bg-zinc-900 rounded-lg flex flex-col items-center justify-center shrink-0 border border-zinc-800">
                <span className="text-zinc-600 text-xs uppercase">Cover Art</span>
              </div>
              <div className="flex flex-col gap-3 py-2 w-full">
                <h3 className="text-2xl font-bold">100,000 Years of Refining Qi</h3>
                <p className="text-zinc-500 text-sm">炼气十万年</p>
                <div className="flex gap-2 text-xs mt-2">
                  <span className="bg-zinc-900 text-zinc-400 px-2 py-1 rounded">Adventure</span>
                  <span className="bg-zinc-900 text-zinc-400 px-2 py-1 rounded">Fantasy</span>
                </div>
                <div className="flex gap-4 mt-auto">
                  <button className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded text-sm font-semibold flex items-center gap-2 transition-colors">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Tonton Sekarang
                  </button>
                  <button className="border border-zinc-700 hover:bg-zinc-800 text-zinc-300 px-5 py-2.5 rounded text-sm font-semibold flex items-center gap-2 transition-colors">
                    Detail
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* After */}
          <div className="flex flex-col gap-4">
            <h2 className="font-semibold text-red-500 uppercase tracking-widest text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
              Sesudah
            </h2>
            <div className="bg-zinc-950 border border-zinc-800/60 rounded-xl h-[400px] relative overflow-hidden group">
              
              {/* Cinematic Backdrop Layer (Simulating blurred cover art) */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/50 via-teal-900/30 to-zinc-900/80 opacity-80 mix-blend-screen scale-110 group-hover:scale-105 transition-transform duration-1000"></div>
              
              {/* Blur & Vignette Layers */}
              <div className="absolute inset-0 backdrop-blur-[60px]"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent"></div>

              {/* Foreground Content */}
              <div className="relative h-full p-8 flex items-center gap-8">
                
                {/* Poster */}
                <div className="w-[200px] h-[280px] bg-gradient-to-br from-blue-800 to-teal-900 rounded-xl shrink-0 shadow-2xl shadow-black/80 border border-white/10 relative overflow-hidden transform group-hover:-translate-y-1 transition-transform duration-500">
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent"></div>
                  <div className="absolute bottom-6 left-0 right-0 text-center text-white/50 text-xs font-bold tracking-widest uppercase">
                    Refining Qi
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex gap-2.5 items-center mb-1">
                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">Ongoing</span>
                    <span className="bg-white/10 text-blue-200 border border-white/10 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase backdrop-blur-sm">Donghua</span>
                    <span className="flex items-center gap-1 text-yellow-400 text-sm font-semibold ml-2">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      8.0
                    </span>
                  </div>
                  
                  <h3 className="text-[2.5rem] font-extrabold text-white tracking-tight leading-tight drop-shadow-xl">100,000 Years of<br/>Refining Qi</h3>
                  <p className="text-zinc-400 text-lg font-medium drop-shadow-md">炼气十万年</p>
                  
                  <div className="flex gap-2 text-sm mt-3">
                    <span className="bg-white/5 border border-white/10 backdrop-blur-md px-3 py-1 rounded-full text-zinc-300 font-medium">Adventure</span>
                    <span className="bg-white/5 border border-white/10 backdrop-blur-md px-3 py-1 rounded-full text-zinc-300 font-medium">Fantasy</span>
                    <span className="bg-white/5 border border-white/10 backdrop-blur-md px-3 py-1 rounded-full text-zinc-300 font-medium">Action</span>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button className="bg-red-600 hover:bg-red-500 transition-all text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-red-600/20 hover:shadow-red-600/40 hover:-translate-y-0.5">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      Tonton Sekarang
                    </button>
                    <button className="border-2 border-zinc-600 hover:border-zinc-400 hover:bg-zinc-800/50 transition-all text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 bg-zinc-900/40 backdrop-blur hover:-translate-y-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                      Detail
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
