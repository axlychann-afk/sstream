import { ChevronDown, ChevronUp } from "lucide-react";

export default function SynopsisCleanup() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-400 p-8 flex flex-col items-center justify-center font-sans">
      <div className="max-w-6xl w-full flex flex-col gap-10">
        <div className="text-center space-y-4 mb-4">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Synopsis Cleanup
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Replacing SEO-spam boilerplate with clean, focused story summaries to improve the reading experience.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* BEFORE */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-zinc-800 text-gray-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                Sebelumnya
              </span>
              <span className="text-sm text-gray-500">
                Raw SEO-spam text
              </span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lg">📖</span>
                <h2 className="text-lg font-bold text-white">Sinopsis</h2>
              </div>
              
              <div className="text-sm leading-relaxed text-gray-400">
                <p>
                  Tonton streaming 100.000 Years of Refining Qi Subtitle Indonesia di Anichin. kamu juga bisa download gratis 100.000 Years of Refining Qi Sub Indo, jangan lupa ya untuk nonton streaming online berbagai kualitas 4K 1080p 720P 360P 240P 480P sesuai koneksi kamu untuk menghemat kuota internet, 100.000 Years of Refining Qi di Anichin MP4 MKV hardsub softsub subtitle bahasa Indonesia sudah terdapat di dalam video.
                </p>
              </div>
            </div>
          </div>

          {/* AFTER */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-red-600/20 text-red-500 border border-red-600/30 text-xs font-semibold px-2.5 py-1 rounded-full">
                Sesudah
              </span>
              <span className="text-sm text-gray-500">
                Clean summary with expandable text
              </span>
            </div>

            <div className="flex flex-col gap-6">
              {/* Collapsed State */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-lg">📖</span>
                  <h2 className="text-lg font-bold text-white">Sinopsis</h2>
                </div>
                
                <div className="text-sm leading-relaxed text-gray-400">
                  <p>
                    Qi Hao, seorang pemuda berbakat yang terlahir tanpa bakat kultivasi, bersumpah untuk mencapai puncak kultivasi melalui kerja keras dan ketekunannya selama 100.000 tahun...
                  </p>
                </div>
                
                <button className="mt-3 flex items-center gap-1 text-sm font-medium text-[#e11d48] hover:text-red-500 transition-colors">
                  Baca selengkapnya <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Expanded State (Small Inset) */}
              <div className="ml-8 border-l-2 border-zinc-800 pl-6 relative">
                <div className="absolute -left-2 top-4 w-4 h-px bg-zinc-800" />
                <span className="text-xs font-medium text-gray-500 mb-2 block uppercase tracking-wider">Expanded View</span>
                <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-5 shadow-lg opacity-80 scale-95 origin-left">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-base">📖</span>
                    <h2 className="text-base font-bold text-white">Sinopsis</h2>
                  </div>
                  
                  <div className="text-xs leading-relaxed text-gray-400 space-y-2">
                    <p>
                      Qi Hao, seorang pemuda berbakat yang terlahir tanpa bakat kultivasi, bersumpah untuk mencapai puncak kultivasi melalui kerja keras dan ketekunannya selama 100.000 tahun. 
                    </p>
                    <p>
                      Meskipun terus diremehkan oleh rekan-rekan seperguruannya, ia menemukan sebuah rahasia kuno yang mengubah nasibnya selamanya, membawanya ke dalam perjalanan epik melawan dewa-dewa iblis.
                    </p>
                  </div>
                  
                  <button className="mt-3 flex items-center gap-1 text-xs font-medium text-[#e11d48] hover:text-red-500 transition-colors">
                    Tutup <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
