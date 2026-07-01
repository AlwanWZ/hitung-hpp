import React, { useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  Calculator, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Store, 
  BrainCircuit, 
  Package, 
  BookOpen 
} from 'lucide-react';

export default function LandingPage({ onStart }: { onStart?: () => void }) {
  // 1. Buat Referensi (Ref) untuk elemen yang mau di-scroll otomatis
  const eduScrollRef = useRef<HTMLDivElement>(null);
  const featureScrollRef = useRef<HTMLUListElement>(null);

  // 2. Logic Auto-Scroll yang sangat ringan (tanpa library external)
  useEffect(() => {
    const autoScroll = (ref: React.RefObject<HTMLElement | null>) => {
      if (!ref.current) return;
      
      const { scrollLeft, scrollWidth, clientWidth } = ref.current;
      
      // Jika sudah mentok di kanan, balik ke awal. Jika belum, geser ke kanan.
      if (Math.ceil(scrollLeft + clientWidth) >= scrollWidth) {
        ref.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        ref.current.scrollBy({ left: clientWidth, behavior: 'smooth' });
      }
    };

    // Atur interval scroll (contoh: 3000ms = 3 detik)
    const eduInterval = setInterval(() => autoScroll(eduScrollRef), 3000);
    const featureInterval = setInterval(() => autoScroll(featureScrollRef), 3500); // Dibikin beda dikit biar natural

    // Bersihkan interval saat komponen ditutup agar memori HP gak bocor (Performance friendly)
    return () => {
      clearInterval(eduInterval);
      clearInterval(featureInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-teal-200 overflow-x-hidden">
      
      {/* ─── NAVBAR ─── */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200/60 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-teal-600 p-1.5 sm:p-2 rounded-xl text-white shadow-sm">
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
              HPP<span className="text-teal-600">Pro</span>
            </span>
          </div>
          <button 
            onClick={onStart}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95"
          >
            Mulai Hitung
          </button>
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="pt-24 pb-12 md:pt-32 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-8 lg:gap-12 w-full">
        <div className="flex-1 text-center lg:text-left space-y-5 md:space-y-6 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-[10px] sm:text-xs font-bold tracking-wide uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            100% Gratis Tanpa Login
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
            Berhenti Nebak Harga. <br className="hidden lg:block" />
            Mulai <span className="text-teal-600">Cetak Profit.</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-500 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
            Kalkulator pintar untuk bantu UMKM temukan Harga Pokok Penjualan (HPP) yang akurat. Cocok untuk bisnis F&B, Retail, Jasa, maupun Manufaktur.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start pt-2">
            <button 
              onClick={onStart}
              className="w-full sm:w-auto px-6 py-3.5 md:px-8 md:py-4 bg-teal-600 hover:bg-teal-500 text-white text-sm md:text-base font-black rounded-2xl transition-all shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 active:scale-95 group"
            >
              Hitung HPP Sekarang
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Abstract Hero Graphic */}
        <div className="flex-1 w-full max-w-sm sm:max-w-md lg:max-w-none relative mx-auto">
          <div className="absolute inset-0 bg-gradient-to-tr from-teal-100 to-emerald-50 rounded-full blur-2xl md:blur-3xl opacity-60"></div>
          <div className="relative bg-white border border-slate-200/80 p-5 md:p-6 rounded-3xl shadow-xl shadow-slate-200/50 transform rotate-1 hover:rotate-0 transition-transform duration-500 w-full overflow-hidden">
            <div className="flex justify-between items-center mb-5 md:mb-6 border-b border-slate-100 pb-3 md:pb-4">
              <div>
                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contoh Analisis AI</p>
                <p className="text-xs md:text-sm font-black text-slate-800">Kopi Susu Gula Aren</p>
              </div>
              <div className="bg-emerald-50 text-emerald-700 px-2 py-1 md:px-3 md:py-1 rounded-lg text-[10px] md:text-xs font-bold border border-emerald-100">
                Margin 55%
              </div>
            </div>
            <div className="space-y-3 md:space-y-4 w-full">
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-slate-500 font-medium">Modal Bahan (HPP)</span>
                <span className="font-bold text-slate-700">Rp 6.750</span>
              </div>
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-slate-500 font-medium">Saran Harga Jual</span>
                <span className="font-bold text-teal-600">Rp 15.000</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1 md:mt-2">
                <div className="bg-teal-500 w-[55%] h-full rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── EDUKASI HPP (CAROUSEL DI MOBILE) ─── */}
      <section className="py-12 md:py-20 bg-white border-y border-slate-200/60 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-8 md:mb-16">
            <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-teal-600 mx-auto mb-3 md:mb-4" />
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 md:mb-4">Kenapa Harus Paham HPP?</h2>
            <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed px-2">
              HPP adalah total biaya asli untuk membuat satu produk. Banyak pebisnis pemula gagal karena salah hitung bagian ini.
            </p>
          </div>

          {/* Container Scroll - Ditambahkan ref={eduScrollRef} */}
          <div 
            ref={eduScrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            
            {/* Edu Card 1 */}
            <div className="bg-rose-50/50 border border-rose-100 p-6 md:p-8 rounded-3xl shrink-0 w-[85vw] sm:w-[320px] md:w-auto snap-center">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-rose-100 text-rose-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3 className="text-base md:text-lg font-black text-slate-900 mb-2 md:mb-3">Bahaya "Nebak Harga"</h3>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                Meniru harga pesaing tanpa tahu modal sendiri (HPP) bisa membuatmu jualan laris, tapi uangnya habis tak tersisa karena "subsidi" pembeli.
              </p>
            </div>

            {/* Edu Card 2 */}
            <div className="bg-amber-50/50 border border-amber-100 p-6 md:p-8 rounded-3xl shrink-0 w-[85vw] sm:w-[320px] md:w-auto snap-center">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-100 text-amber-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                <Package className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3 className="text-base md:text-lg font-black text-slate-900 mb-2 md:mb-3">Biaya Tersembunyi</h3>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                Kemasan, tenaga kerja, listrik, hingga lakban untuk *packing* sering dilupakan. HPP mencatat semua agar tahu modal bersihmu.
              </p>
            </div>

            {/* Edu Card 3 */}
            <div className="bg-emerald-50/50 border border-emerald-100 p-6 md:p-8 rounded-3xl md:col-span-2 lg:col-span-1 shrink-0 w-[85vw] sm:w-[320px] md:w-auto snap-center">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-100 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3 className="text-base md:text-lg font-black text-slate-900 mb-2 md:mb-3">Kontrol Profit Penuh</h3>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                Dengan mengetahui HPP presisi, kamu bebas menentukan diskon atau promo tanpa takut rugi. Margin ada di tanganmu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FITUR UNGGULAN (CAROUSEL DI MOBILE) ─── */}
      <section className="py-12 md:py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8 md:gap-12 items-center">
            <div className="flex-1 w-full">
              <div className="text-center lg:text-left mb-6 md:mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 md:mb-4">Fitur Lengkap Sesuai Bisnismu</h2>
                <p className="text-sm md:text-base text-slate-500 font-medium">Bukan kalkulator biasa. Kami sesuaikan rumus dan variabel berdasarkan usahamu.</p>
              </div>
              
              {/* Container Scroll - Ditambahkan ref={featureScrollRef} */}
              <ul 
                ref={featureScrollRef}
                className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4 md:mx-0 md:px-0 md:flex-col md:space-y-6 md:gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                <li className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center bg-white p-5 md:p-0 rounded-2xl shadow-sm md:shadow-none border border-slate-100 md:border-none md:bg-transparent shrink-0 w-[85vw] sm:w-[320px] md:w-auto snap-center">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0"><Store className="w-5 h-5"/></div>
                  <div>
                    <h4 className="text-sm md:text-base font-black text-slate-900 mb-1">Mode F&B (Kuliner)</h4>
                    <p className="text-xs text-slate-500">Fitur Stok Induk! Hitung modal 1 resep panci besar, lalu pecah harganya untuk varian porsi.</p>
                  </div>
                </li>
                <li className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center bg-white p-5 md:p-0 rounded-2xl shadow-sm md:shadow-none border border-slate-100 md:border-none md:bg-transparent shrink-0 w-[85vw] sm:w-[320px] md:w-auto snap-center">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Package className="w-5 h-5"/></div>
                  <div>
                    <h4 className="text-sm md:text-base font-black text-slate-900 mb-1">Manufaktur & Retail</h4>
                    <p className="text-xs text-slate-500">Hitung bea masuk, ongkir, diskon supplier, hingga upah lembur tim produksi.</p>
                  </div>
                </li>
                <li className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center bg-white p-5 md:p-0 rounded-2xl shadow-sm md:shadow-none border border-slate-100 md:border-none md:bg-transparent shrink-0 w-[85vw] sm:w-[320px] md:w-auto snap-center">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0"><BrainCircuit className="w-5 h-5"/></div>
                  <div>
                    <h4 className="text-sm md:text-base font-black text-slate-900 mb-1">Saran Harga AI</h4>
                    <p className="text-xs text-slate-500">Dapatkan opini AI mengenai apakah harga jualmu terlalu murah atau sudah pas untuk pasar.</p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="flex-1 w-full bg-slate-200/50 rounded-3xl p-4 sm:p-6 md:p-10 border border-slate-200 shadow-inner mt-2 lg:mt-0">
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-4">
                 <div className="h-3 md:h-4 w-24 md:w-32 bg-slate-200 rounded animate-pulse"></div>
                 <div className="flex gap-3 md:gap-4">
                   <div className="h-8 md:h-10 w-full bg-teal-50 border border-teal-100 rounded-lg"></div>
                   <div className="h-8 md:h-10 w-full bg-slate-100 rounded-lg"></div>
                 </div>
                 <div className="space-y-2 mt-3 md:mt-4">
                   <div className="h-10 md:h-12 w-full bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between px-3 md:px-4">
                     <div className="h-2 md:h-3 w-16 md:w-20 bg-slate-200 rounded"></div>
                     <div className="h-2 md:h-3 w-10 md:w-12 bg-slate-300 rounded"></div>
                   </div>
                   <div className="h-10 md:h-12 w-full bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between px-3 md:px-4">
                     <div className="h-2 md:h-3 w-20 md:w-24 bg-slate-200 rounded"></div>
                     <div className="h-2 md:h-3 w-12 md:w-16 bg-slate-300 rounded"></div>
                   </div>
                 </div>
                 <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-slate-100 flex justify-between items-center">
                    <div className="h-5 md:h-6 w-20 md:w-24 bg-teal-100 rounded-md"></div>
                    <div className="h-8 md:h-10 w-24 md:w-28 bg-teal-600 rounded-xl"></div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA BOTTOM ─── */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-5xl mx-auto bg-slate-900 rounded-3xl p-6 sm:p-8 md:p-16 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 md:w-64 h-32 md:h-64 bg-teal-500 rounded-full blur-[80px] md:blur-[100px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-32 md:w-64 h-32 md:h-64 bg-emerald-500 rounded-full blur-[80px] md:blur-[100px] opacity-20 -translate-x-1/2 translate-y-1/2"></div>
          
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-4 md:mb-6 leading-tight">Siap Mengamankan Profitmu?</h2>
            <p className="text-xs sm:text-sm md:text-base text-slate-400 font-medium mb-6 md:mb-8 max-w-xl mx-auto leading-relaxed">
              Tidak perlu install, tidak perlu registrasi ribet. Langsung hitung modal dan temukan harga jual terbaik untuk produkmu sekarang juga.
            </p>
            <button 
              onClick={onStart}
              className="w-full sm:w-auto px-6 py-3.5 md:px-8 md:py-4 bg-teal-500 hover:bg-teal-400 text-slate-900 text-sm md:text-base font-black rounded-2xl transition-all shadow-lg hover:shadow-teal-500/25 flex items-center justify-center gap-2 mx-auto active:scale-95"
            >
              <Calculator className="w-4 h-4 md:w-5 md:h-5" />
              Buka Kalkulator Sekarang
            </button>
            <div className="mt-5 md:mt-6 flex flex-wrap items-center justify-center gap-3 md:gap-4 text-[10px] md:text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500"/> 100% Gratis</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500"/> Private & Aman</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-slate-200/60 bg-white py-6 md:py-8 text-center text-slate-500 text-[10px] md:text-xs font-medium px-4">
        <p>© {new Date().getFullYear()} HPP Pro. Dirancang untuk membantu UMKM Indonesia.</p>
      </footer>
    </div>
  );
}