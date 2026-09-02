import React from 'react';
import { Play } from 'lucide-react';

const DONGHUA_DATA = [
  { title: "100.000 Years of Refining Qi", image: "from-blue-900 to-indigo-950", sub: true, ongoing: true },
  { title: "Apotheosis", image: "from-red-900 to-orange-950", sub: true, ongoing: true },
  { title: "Perfect World", image: "from-purple-900 to-fuchsia-950", sub: true, ongoing: true },
  { title: "Martial Master", image: "from-emerald-900 to-teal-950", sub: false, ongoing: true },
  { title: "Shrouding the Heavens", image: "from-slate-900 to-zinc-950", sub: true, ongoing: true },
  { title: "A Record of a Mortal's Journey", image: "from-yellow-900 to-amber-950", sub: true, ongoing: false },
];

const GENRES = ["Semua", "Action", "Adventure", "Fantasy", "Romance", "Comedy", "Thriller", "Martial Arts", "Cultivation"];

function Card({ item }: { item: typeof DONGHUA_DATA[0] }) {
  return (
    <div className="relative aspect-[2/3] rounded-xl overflow-hidden group cursor-pointer border border-zinc-800/50 hover:border-red-500/50 transition-colors bg-zinc-900">
      <div className={`absolute inset-0 bg-gradient-to-br ${item.image} opacity-60 group-hover:opacity-80 transition-opacity`} />
      
      {/* Badges */}
      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
        {item.sub ? (
          <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">SUB</span>
        ) : (
          <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">DUB</span>
        )}
      </div>
      
      {item.ongoing && (
         <div className="absolute top-2 right-2 z-10">
            <span className="bg-zinc-900/80 backdrop-blur-sm text-zinc-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-zinc-700/50">
              ONGOING
            </span>
         </div>
      )}
      
      {/* Play Overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 z-10">
        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white backdrop-blur-sm shadow-lg shadow-red-900/50 transform scale-90 group-hover:scale-100 transition-transform">
          <Play className="w-5 h-5 ml-1" fill="currentColor" />
        </div>
      </div>
      
      {/* Title Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent pt-16 z-10">
        <h3 className="text-white text-sm font-semibold leading-snug line-clamp-2 group-hover:text-red-400 transition-colors shadow-sm">
          {item.title}
        </h3>
      </div>
    </div>
  );
}

export function GenreFilter() {
  return (
    <div className="w-full h-full min-h-screen bg-zinc-950 text-zinc-200 p-4 md:p-8 flex flex-col font-sans">
      <div className="max-w-[1400px] mx-auto w-full flex flex-col lg:flex-row gap-8 lg:gap-12">
        
        {/* BEFORE */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Sebelumnya</h2>
            <div className="h-px bg-zinc-800 flex-1" />
          </div>
          
          <div className="bg-[#0a0a0a] rounded-2xl p-6 border border-zinc-800 shadow-xl relative">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <span className="text-red-500">🔥</span> Ongoing Series
              </h1>
              <p className="text-zinc-400 text-sm">
                Tonton donghua terbaru yang sedang tayang musim ini.
              </p>
            </div>
            
            {/* Directly into grid with no filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              {DONGHUA_DATA.map((item, i) => (
                <Card key={i} item={item} />
              ))}
            </div>
          </div>
        </div>

        {/* AFTER */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-red-500 uppercase tracking-widest">Sesudah</h2>
            <div className="h-px bg-red-900/30 flex-1" />
          </div>
          
          <div className="bg-[#0a0a0a] rounded-2xl p-6 border border-red-900/30 shadow-2xl shadow-red-900/5 relative overflow-hidden ring-1 ring-red-500/10">
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-red-600/10 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="mb-5 relative z-10">
              <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <span className="text-red-500">🔥</span> Ongoing Series
              </h1>
              <p className="text-zinc-400 text-sm">
                Tonton donghua terbaru yang sedang tayang musim ini.
              </p>
            </div>
            
            {/* Filter Bar */}
            <div className="flex gap-2.5 overflow-x-auto pb-5 mb-1 scrollbar-none relative z-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {GENRES.map((genre, i) => (
                <button
                  key={genre}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    i === 0
                      ? "bg-red-600 text-white shadow-md shadow-red-600/20 border border-red-500"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-red-500/50 hover:text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 relative z-10">
              {DONGHUA_DATA.map((item, i) => (
                <Card key={i} item={item} />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default GenreFilter;
