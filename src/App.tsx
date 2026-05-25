import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Download, Loader2, ArrowRight, Sparkles, ZoomIn, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const pixelateImage = (file: File, level: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Render gambar tidak didukung');

        const MAX_DIMENSION = 2000;
        let w = img.width || 1;
        let h = img.height || 1;
        
        if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h);
          w = Math.floor(w * ratio);
          h = Math.floor(h * ratio);
        }

        const block = Math.max(1, Math.min(level, 40));
        const smallW = Math.max(1, Math.floor(w / block));
        const smallH = Math.max(1, Math.floor(h / block));

        const smallCanvas = document.createElement('canvas');
        smallCanvas.width = smallW;
        smallCanvas.height = smallH;
        const smallCtx = smallCanvas.getContext('2d');
        if (!smallCtx) throw new Error('Render piksel gagal');
        
        smallCtx.imageSmoothingEnabled = false;
        smallCtx.drawImage(img, 0, 0, smallW, smallH);

        canvas.width = w;
        canvas.height = h;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(smallCanvas, 0, 0, smallW, smallH, 0, 0, w, h);

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          if (blob) resolve(blob);
          else reject(new Error('Gagal merender gambar'));
        }, file.type || 'image/png');
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('File rusak atau tidak terbaca'));
    };
    
    img.src = objectUrl;
  });
};

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [pixelLevel, setPixelLevel] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [processingTimeLeft, setProcessingTimeLeft] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewOriginal(url);
      setPreviewResult(null);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      const url = URL.createObjectURL(droppedFile);
      setPreviewOriginal(url);
      setPreviewResult(null);
      setError(null);
    }
  };

  const processImage = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setProcessingTimeLeft(3);

    const startTime = Date.now();
    let timer: any;

    try {
      timer = setInterval(() => {
        setProcessingTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);

      const blob = await pixelateImage(file, pixelLevel);

      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 3000 - elapsed);

      setTimeout(() => {
        clearInterval(timer);
        if (!blob) {
          setError('Render gagal, coba gambar lain.');
        } else {
          const resultUrl = URL.createObjectURL(blob);
          setPreviewResult(resultUrl);
        }
        setIsLoading(false);
        setProcessingTimeLeft(0);
      }, remainingTime);

    } catch (err: any) {
      if (timer) clearInterval(timer);
      setError(err.message || 'Terjadi kesalahan tidak terduga');
      setIsLoading(false);
      setProcessingTimeLeft(0);
    }
  };

  const handleDownload = () => {
    if (!previewResult) return;
    const a = document.createElement('a');
    a.href = previewResult;
    a.download = 'hasil-seni-piksel.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0c10]"
          >
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 bg-[#c4f135] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(196,241,53,0.3)]">
                <Sparkles className="w-8 h-8 text-black" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white">ToPixel.</h1>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-[#0b0c10] text-[#8a8d98] font-sans selection:bg-[#c4f135] selection:text-black pb-12 relative overflow-hidden">
        
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PHBhdHRlcm4gaWQ9InB4IiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCBMIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3B4KSIvPjwvc3ZnPg==')] pointer-events-none z-0"></div>

        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#c4f135]/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[#c4f135]/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 pt-8 relative z-10">
          
          <motion.header 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
            className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div>
               <h2 className="text-[#c4f135] font-bold tracking-widest text-xs uppercase mb-3 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-[#c4f135]"></span>
                 Ubah instan & gratis
               </h2>
               <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-2 leading-tight">
                 ToPixel <br/>
                 <span className="text-[#c4f135]">8-bit art</span> dari fotomu
               </h1>
            </div>
            
            <p className="max-w-xs md:max-w-sm text-sm sm:text-base leading-relaxed text-[#8a8d98]">
              Bikin foto biasa jadi pixel art keren ala game retro jadul. Cepat, gampang, dan gratis.
            </p>
          </motion.header>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 2.0 }}
             className="grid lg:grid-cols-[380px_1fr] gap-8 items-start"
          >
            <div className="space-y-6">
              <div className="bg-[#13141b] p-6 rounded-3xl border border-[#262833] shadow-lg hover:border-[#383b4a] transition-all">
                <h2 className="text-base font-bold mb-4 text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#1e2029] flex items-center justify-center text-xs text-[#c4f135]">01.</span>
                  Unggah Gambar
                </h2>
                
                <div 
                  className={`relative group flex flex-col items-center justify-center h-48 border-2 border-dashed ${file ? 'border-[#c4f135] bg-[#c4f135]/5' : 'border-[#262833] hover:border-[#c4f135] hover:bg-[#c4f135]/5'} rounded-2xl transition-all cursor-pointer`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <AnimatePresence mode='wait'>
                    {file ? (
                      <motion.div 
                        key="has-file"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex flex-col items-center text-center px-4"
                      >
                         <ImageIcon className="w-10 h-10 mb-3 text-[#c4f135]" />
                         <p className="text-sm font-semibold text-white truncate max-w-[220px]">
                           {file.name}
                         </p>
                         <p className="text-xs text-[#8a8d98] mt-1 font-medium">
                           Klik untuk mengganti
                         </p>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="no-file"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex flex-col items-center text-center px-4"
                      >
                        <div className="w-12 h-12 rounded-full bg-[#1e2029] shadow-sm flex items-center justify-center mb-3 group-hover:bg-[#c4f135] transition-colors">
                          <Upload className="w-5 h-5 text-[#8a8d98] group-hover:text-black transition-colors" />
                        </div>
                        <p className="text-sm font-semibold text-white">
                          Klik atau seret gambar
                        </p>
                        <p className="text-xs text-[#8a8d98] mt-2 font-medium">
                          Mendukung JPG, PNG, WEBP
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Settings Box */}
              <div className="bg-[#13141b] p-6 rounded-3xl border border-[#262833] shadow-lg hover:border-[#383b4a] transition-all">
                <h2 className="text-base font-bold mb-6 flex justify-between items-center text-white">
                  <span className="flex items-center gap-2">
                     <span className="w-6 h-6 rounded-full bg-[#1e2029] flex items-center justify-center text-xs text-[#c4f135]">02.</span>
                     Pengaturan
                  </span>
                  <span className="text-xs font-mono font-bold text-[#c4f135] bg-[#c4f135]/10 px-3 py-1.5 rounded-lg border border-[#c4f135]/20">
                    Level {pixelLevel}
                  </span>
                </h2>
                
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-sm font-bold text-white">Kepadatan Piksel</label>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="40"
                      value={pixelLevel}
                      onChange={(e) => setPixelLevel(parseInt(e.target.value))}
                      className="w-full accent-[#c4f135] h-2 bg-[#262833] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between mt-3 text-xs font-semibold text-[#8a8d98]">
                      <span>Halus</span>
                      <span>Kotak / Piksel 8-bit</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={processImage}
                      disabled={!file || isLoading}
                      className="w-full py-4 px-4 bg-[#c4f135] hover:bg-[#b0d830] disabled:bg-[#1e2029] disabled:text-[#4a4d59] disabled:cursor-not-allowed text-black font-black tracking-wide rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          PROCESSING... {processingTimeLeft > 0 ? `(${processingTimeLeft}s)` : ''}
                        </>
                      ) : (
                        <>
                          GENERATE PIXEL ART <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </button>
                    {error && (
                      <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 font-medium text-sm mt-4 text-center bg-red-400/10 py-2.5 rounded-xl border border-red-400/20">
                        {error}
                      </motion.p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Area */}
            <div className="bg-[#13141b] border border-[#262833] rounded-3xl overflow-hidden flex flex-col min-h-[500px] shadow-lg relative">
              {/* Subtle Grid Pattern for Preview */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PHBhdHRlcm4gaWQ9InB4IiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCBMIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3B4KSIvPjwvc3ZnPg==')] pointer-events-none z-0"></div>

              {previewOriginal || previewResult ? (
                <div className="flex-1 grid md:grid-cols-2 p-6 md:p-8 gap-8 h-full items-center relative z-10">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <span className="text-xs uppercase tracking-wider text-[#8a8d98] font-bold px-3 py-1.5 rounded-lg bg-[#1e2029] border border-[#262833] shadow-sm">
                      Sebelum
                    </span>
                    <div 
                      className="group relative w-full aspect-square md:aspect-auto md:h-[350px] rounded-2xl overflow-hidden bg-[#0b0c10] border border-[#262833] shadow-inner flex items-center justify-center p-2 cursor-zoom-in"
                      onClick={() => setFullScreenImage(previewOriginal!)}
                    >
                      <img 
                        src={previewOriginal!} 
                        className="max-w-full max-h-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105 group-hover:opacity-50"
                        alt="Original upload"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="bg-[#1e2029]/80 backdrop-blur-sm p-3 rounded-full text-white shadow-lg">
                           <ZoomIn className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-[#c4f135] rounded-full border-4 border-[#13141b] items-center justify-center shadow-lg">
                    <ArrowRight className="w-5 h-5 text-black" />
                  </div>
                  
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <span className="text-xs uppercase tracking-wider text-[#c4f135] font-bold px-3 py-1.5 rounded-lg bg-[#c4f135]/10 border border-[#c4f135]/20 shadow-sm">
                      Sesudah
                    </span>
                    <div 
                      className={`relative w-full aspect-square md:aspect-auto md:h-[350px] rounded-2xl overflow-hidden bg-[#0b0c10] border border-[#262833] shadow-inner flex items-center justify-center p-2 ${previewResult ? 'group cursor-zoom-in' : ''}`}
                      onClick={() => previewResult && setFullScreenImage(previewResult)}
                    >
                      {previewResult ? (
                        <>
                          <motion.img 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            src={previewResult} 
                            className="max-w-full max-h-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105 group-hover:opacity-50" 
                            style={{ imageRendering: 'pixelated' }}
                            alt="Pixelation preview"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                            <div className="bg-[#1e2029]/80 backdrop-blur-sm p-3 rounded-full text-[#c4f135] shadow-lg">
                               <ZoomIn className="w-6 h-6" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-[#8a8d98] flex flex-col items-center gap-4">
                          <div className="w-16 h-16 border-2 border-dashed border-[#262833] rounded-2xl flex items-center justify-center bg-[#1e2029] shadow-sm">
                             <Sparkles className="w-6 h-6 opacity-40 text-[#8a8d98]" />
                          </div>
                          <span className="text-sm font-semibold">Preview hasil di sini</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center p-12 text-center h-full relative z-10">
                  <div className="max-w-sm">
                    <motion.div 
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                      className="w-20 h-20 mx-auto bg-[#1e2029] rounded-3xl flex items-center justify-center mb-6 border border-[#262833] relative"
                    >
                       <div className="absolute inset-0 bg-[#c4f135]/10 rounded-3xl blur-md"></div>
                      <ImageIcon className="w-8 h-8 text-[#8a8d98] relative z-10" />
                    </motion.div>
                    <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Menunggu Gambar...</h3>
                    <p className="text-[#8a8d98] text-sm leading-relaxed font-medium">
                      Upload fotomu di sebelah kiri dulu, biar kita proses jadi pixel art keren.
                    </p>
                  </div>
                </div>
              )}
              
              <AnimatePresence>
                {previewResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="border-t border-[#262833] p-5 bg-[#13141b]/90 flex justify-end relative z-10 backdrop-blur-xl"
                  >
                    <button
                       onClick={handleDownload}
                      className="px-6 py-2.5 bg-[#c4f135] hover:bg-[#c4f135]/90 text-black rounded-xl transition-all font-bold tracking-wide flex items-center gap-2 text-sm shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      SIMPAN GAMBAR
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
          </motion.div>
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      <AnimatePresence>
        {fullScreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b0c10]/90 backdrop-blur-md p-4 lg:p-8 cursor-zoom-out"
            onClick={() => setFullScreenImage(null)}
          >
            <button 
              className="absolute top-6 right-6 text-[#8a8d98] hover:text-white bg-[#13141b] rounded-full p-2.5 transition-colors border border-[#262833] z-50 cursor-pointer shadow-lg hover:border-white"
              onClick={(e) => {
                e.stopPropagation();
                setFullScreenImage(null);
              }}
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={fullScreenImage}
              style={{ imageRendering: fullScreenImage === previewResult ? 'pixelated' : 'auto' }}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl cursor-default"
              alt="Fullscreen preview"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
