import React from 'react';
import { Calendar, Bell, Clock, ArrowRight } from 'lucide-react';

export default function UpcomingPage() {
  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* BEFORE */}
        <div className="flex-1 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="bg-zinc-900 p-4 border-b border-zinc-800 text-center text-sm font-semibold text-zinc-400 uppercase tracking-widest">
            Sebelumnya
          </div>
          <div className="p-8 flex-1 bg-zinc-950">
            <h1 className="text-3xl font-bold mb-2 text-white">Upcoming Series</h1>
            <p className="text-zinc-400 mb-8 text-sm">Announced series that are coming soon.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              <div className="rounded-xl bg-zinc-900 aspect-[3/4] relative overflow-hidden group">
                <img 
                  src="https://images.unsplash.com/photo-1618336753974-aae8e04506aa?q=80&w=400&auto=format&fit=crop" 
                  alt="Cover" 
                  className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 flex flex-col justify-end">
                  <div className="flex gap-2 mb-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-600 rounded text-white uppercase tracking-wider">Sub</span>
                  </div>
                  <h3 className="text-sm font-medium leading-tight text-white">Swallowed Star Season 4</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AFTER */}
        <div className="flex-1 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_50px_-12px_rgba(225,29,72,0.15)]">
          <div className="bg-red-600/10 p-4 border-b border-red-900/30 text-center text-sm font-semibold text-red-500 uppercase tracking-widest">
            Sesudah
          </div>
          <div className="p-6 md:p-8 flex-1 bg-zinc-950 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-red-600/10 flex items-center justify-center text-red-500">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Coming Soon</h1>
                <p className="text-zinc-400 text-sm">Series yang segera hadir</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Countdown Banner */}
              <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/50 aspect-[21/9]">
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-900/80 to-transparent z-10" />
                <img 
                  src="https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?q=80&w=800&auto=format&fit=crop" 
                  alt="Banner" 
                  className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-luminosity"
                />
                <div className="absolute inset-0 z-20 p-5 md:p-6 flex flex-col justify-between">
                  <span className="inline-block px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded w-max tracking-widest uppercase">
                    Segera Hadir
                  </span>
                  
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold mb-3 text-white">Perfect World: New Arc</h2>
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <Clock className="w-4 h-4 text-red-500" />
                      <span className="font-semibold text-red-400">2 Minggu Lagi</span>
                      <span className="text-zinc-600 px-1">•</span>
                      <span className="text-zinc-400">15 Oktober 2024</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* List */}
              <div className="flex flex-col gap-3">
                {[
                  {
                    title: "Battle Through the Heavens Season 6",
                    status: "Segera",
                    img: "https://images.unsplash.com/photo-1542451313056-b7c8e626645f?q=80&w=200&auto=format&fit=crop"
                  },
                  {
                    title: "Soul Land II: The Peerless Tang Sect",
                    status: "Belum ada tanggal pasti",
                    img: "https://images.unsplash.com/photo-1578326629737-124b61543fc7?q=80&w=200&auto=format&fit=crop"
                  },
                  {
                    title: "Throne of Seal Season 2",
                    status: "Belum ada tanggal pasti",
                    img: "https://images.unsplash.com/photo-1560942152-474be6dcfa4b?q=80&w=200&auto=format&fit=crop"
                  }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-2 pr-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-800/80 transition-colors group cursor-pointer">
                    <img 
                      src={item.img} 
                      alt={item.title}
                      className="w-[60px] h-[80px] rounded-lg object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{item.title}</h3>
                      <p className="text-xs text-zinc-500 mt-1">{item.status}</p>
                    </div>
                    <button className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors" title="Beri Tahu Saya">
                      <Bell className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button className="w-full mt-2 py-4 rounded-xl border border-dashed border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 hover:bg-zinc-900/50 transition-all flex items-center justify-center gap-2 text-sm font-medium">
                Daftarkan notifikasi agar tidak ketinggalan
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
