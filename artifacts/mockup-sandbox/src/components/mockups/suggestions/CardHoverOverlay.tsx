import React from 'react';
import { Play, Star } from 'lucide-react';

export default function CardHoverOverlay() {
  // Donghua-style fantasy landscape placeholder
  const coverUrl = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-8 text-white font-sans w-full">
      <div className="mb-12 text-center max-w-lg">
        <h2 className="text-2xl font-bold text-white mb-2">Hover Overlay Card</h2>
        <p className="text-zinc-400 text-sm">
          A rich hover state that reveals metadata, synopsis, and a quick-action button without leaving the browse view.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-12 md:gap-24 items-center">
        
        {/* BEFORE CARD */}
        <div className="flex flex-col gap-4 items-center">
          <h3 className="text-zinc-500 font-medium tracking-widest uppercase text-xs">Sebelumnya</h3>
          
          <div className="relative w-[200px] h-[300px] rounded-xl overflow-hidden bg-zinc-800 shadow-lg border border-zinc-800/50">
            {/* Image Placeholder */}
            <div 
              className="absolute inset-0 bg-cover bg-center" 
              style={{ backgroundImage: `url(${coverUrl})` }}
            ></div>
            
            {/* Badges */}
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600 text-[10px] font-bold rounded shadow-sm tracking-wide">
              SUB
            </div>
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-600 text-[10px] font-bold rounded shadow-sm tracking-wide">
              ONGOING
            </div>
            
            {/* Title Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
              <h4 className="text-sm font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
                100.000 Years of Refining Qi
              </h4>
            </div>
          </div>
        </div>

        {/* AFTER CARD */}
        <div className="flex flex-col gap-4 items-center">
          <h3 className="text-zinc-500 font-medium tracking-widest uppercase text-xs">Sesudah (Hover)</h3>
          
          <div className="relative w-[200px] h-[300px] rounded-xl overflow-hidden bg-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.8)] border border-zinc-700/80 scale-[1.02] transition-transform">
            {/* Image Placeholder */}
            <div 
              className="absolute inset-0 bg-cover bg-center" 
              style={{ backgroundImage: `url(${coverUrl})` }}
            ></div>
            
            {/* Badges */}
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600 text-[10px] font-bold rounded shadow-sm tracking-wide z-10">
              SUB
            </div>
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-600 text-[10px] font-bold rounded shadow-sm tracking-wide z-10">
              ONGOING
            </div>
            
            {/* Hover State Overlay */}
            <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/95 to-transparent flex flex-col justify-end p-3">
              
              {/* Header row: Title + Rating */}
              <div className="flex items-start justify-between mb-2 gap-2">
                <h4 className="text-sm font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
                  100.000 Years of Refining Qi
                </h4>
                <div className="flex items-center gap-0.5 text-yellow-500 text-[10px] font-bold bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm shrink-0">
                  <Star className="w-3 h-3 fill-current" />
                  <span>8.0</span>
                </div>
              </div>
              
              {/* Genres */}
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                <span className="px-1.5 py-0.5 bg-zinc-800/80 text-[9px] font-medium text-zinc-300 rounded border border-zinc-700/50 backdrop-blur-sm">Action</span>
                <span className="px-1.5 py-0.5 bg-zinc-800/80 text-[9px] font-medium text-zinc-300 rounded border border-zinc-700/50 backdrop-blur-sm">Adventure</span>
                <span className="px-1.5 py-0.5 bg-zinc-800/80 text-[9px] font-medium text-zinc-300 rounded border border-zinc-700/50 backdrop-blur-sm">Fantasy</span>
              </div>
              
              {/* Synopsis */}
              <p className="text-[11px] text-zinc-400 line-clamp-2 mb-3 leading-snug">
                Seorang pemuda yang ingin mencapai puncak kultivasi namun terjebak dalam tahap Qi Condensation.
              </p>
              
              {/* Button */}
              <button className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-1.5 rounded flex items-center justify-center gap-1.5 text-xs transition-colors shadow-[0_0_15px_rgba(225,29,72,0.3)]">
                <Play className="w-3.5 h-3.5 fill-current" />
                Tonton
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
