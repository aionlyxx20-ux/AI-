
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

type RenderMode = 'plan' | 'spatial' | 'enhance';
type Status = 'idle' | 'rendering' | 'key_needed';
type ImageSize = "1K输出" | "2K输出" | "4K输出";

interface EnhanceParams {
  texture: number;
  smoothing: number;
  detail: number;
  light: number;
}

const App: React.FC = () => {
  const [renderMode, setRenderMode] = useState<RenderMode>('spatial');
  const [refImage, setRefImage] = useState<string | null>(null);
  const [lineartImage, setLineartImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [selectedSize, setSelectedSize] = useState<ImageSize>("1K输出");
  const [blendWeight, setBlendWeight] = useState<number>(100);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [lineartAspectRatio, setLineartAspectRatio] = useState<string>("1:1");

  const [enhanceParams, setEnhanceParams] = useState<EnhanceParams>({
    texture: 99,
    smoothing: 10,
    detail: 90,
    light: 70,
  });

  const isEnhance = renderMode === 'enhance';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lineartInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    };
    checkKey();
  }, []);

  const handleOpenKeyPicker = async () => {
    await (window as any).aistudio.openSelectKey();
    setHasApiKey(true);
    setStatus('idle');
  };

  const handleModeSwitch = (mode: RenderMode) => {
    setRenderMode(mode);
    setResultImage(null);
    setStatus('idle');
  };

  const getImageAspectRatio = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        if (ratio > 1.5) resolve("16:9");
        else if (ratio < 0.6) resolve("9:16");
        else if (ratio > 1.1) resolve("4:3");
        else if (ratio < 0.9) resolve("3:4");
        else resolve("1:1");
      };
      img.src = base64;
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'ref' | 'lineart') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const data = ev.target?.result as string;
      if (type === 'ref') {
        setRefImage(data);
      } else {
        setLineartImage(data);
        const ratio = await getImageAspectRatio(data);
        setLineartAspectRatio(ratio);
      }
      setResultImage(null);
    };
    reader.readAsDataURL(file);
  };

  const saveImage = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `Archi-Logic-V8-${renderMode}-${Date.now()}.png`;
    link.click();
  };

  const executeSynthesis = async () => {
    if (!lineartImage || status !== 'idle') return;
    if (!isEnhance && !refImage) return;

    const keySelected = await (window as any).aistudio.hasSelectedApiKey();
    if (!keySelected) {
      setStatus('key_needed');
      return;
    }
    
    setStatus('rendering');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const parts: any[] = [];
      const apiSize = selectedSize === "4K输出" ? "4K" : selectedSize === "2K输出" ? "2K" : "1K";

      if (isEnhance) {
        parts.push({ inlineData: { data: lineartImage.split(',')[1], mimeType: 'image/png' } });
        const enhancePrompt = `
          [PROTOCOL: HD_STRUCTURAL_PRESERVATION]
          - TASK: Restore 8K material micro-detail without structural drift.
          - TEXTURE_ACCURACY: ${enhanceParams.texture}%.
          - ILLUMINATION: Physically based rendering at ${enhanceParams.light}%.
          - MANDATE: Zero tolerance for geometry warping. Preserve lineart edge sharpness.
        `;
        parts.push({ text: enhancePrompt });
        
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: { parts: parts },
          config: { 
            imageConfig: { aspectRatio: lineartAspectRatio as any, imageSize: apiSize as any } 
          }
        });

        const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imgPart?.inlineData) setResultImage(`data:image/png;base64,${imgPart.inlineData.data}`);

      } else {
        // SPATIAL MODE - V8 SEMANTIC TOPOLOGY
        parts.push({ inlineData: { data: lineartImage.split(',')[1], mimeType: 'image/png' } });
        parts.push({ text: `
          [SEMANTIC_LOCK: TOPOLOGICAL_UNDERSTANDING]
          1. ANALYZE SPACE: The input is a 3D architectural wireframe. 
          2. STRUCTURAL RIGIDITY: Every line defines a coordinate in 3D space. Do not modify the perspective, vanishing points, or object shapes.
          3. OBJECT RECOGNITION: Correct-scale objects (furniture, walls, ceilings) are fixed. Ensure textures map precisely to their geometric planes.
        `});

        parts.push({ inlineData: { data: refImage!.split(',')[1], mimeType: 'image/jpeg' } });
        parts.push({ text: `
          [PBR_EXTRACTOR: MATERIAL_INTELLIGENCE]
          - EXTRACT: High-end material PBR properties (albedo, roughness, metallic, normal).
          - IGNORE: Ignore the spatial layout and shapes in this style image.
          - TRANSFER: Map these material logics onto the geometry defined by the wireframe.
        `});

        const synthesisPrompt = `
          [FINAL_TASK: RATIONAL_SPATIAL_SYNTHESIS_V8]
          - RENDER_GOAL: High-end Architectural Photography with 100% geometric stability.
          - LIGHTING_ENGINE: Physically accurate global illumination (GI). Soft-ray shadows in corners.
          - RATIONALITY: Materials must match architectural context (e.g., floors are solid, ceilings have depth, metallic surfaces show clear reflections).
          - INFUSION_WEIGHT: ${blendWeight}%.
          - OUTPUT: Absolute fidelity, zero style-induced warping, sharp and clean rendering.
        `;
        parts.push({ text: synthesisPrompt });

        const response: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: { parts: parts },
          config: { 
            imageConfig: { aspectRatio: lineartAspectRatio as any, imageSize: apiSize as any } 
          }
        });

        const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imgPart?.inlineData) setResultImage(`data:image/png;base64,${imgPart.inlineData.data}`);
      }
    } catch (err: any) {
      console.error("Rendering Error:", err);
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setStatus('key_needed');
      }
    } finally {
      setStatus('idle');
    }
  };

  const renderSlider = (label: string, value: number, onChange: (val: number) => void, colorClass: string) => (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">{label}</span>
        <span className={`text-xs font-black italic ${colorClass}`}>{value}%</span>
      </div>
      <input 
        type="range" min="0" max="100" value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={`w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-current ${colorClass}`}
      />
    </div>
  );

  return (
    <div className="h-screen bg-black text-[#666] flex overflow-hidden font-sans select-none">
      {status === 'key_needed' && (
        <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#050505] border border-white/10 p-10 rounded-[3rem] shadow-2xl text-center space-y-8">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div className="space-y-3">
              <h3 className="text-white text-2xl font-black tracking-tighter italic">V8 渲染内核授权</h3>
              <p className="text-[11px] text-white/30 leading-relaxed px-4">
                当前核心正在执行 V8 级语义拓扑锁定渲染，这需要更高的计算资源及 API 额度。
                <br/>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-amber-500 hover:underline">去控制台检查 API 计费状态</a>
              </p>
            </div>
            <button onClick={handleOpenKeyPicker} className="w-full py-5 bg-amber-500 text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-amber-400 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)]">
              激活 V8 渲染内核
            </button>
          </div>
        </div>
      )}

      <nav className="w-24 border-r border-white/5 flex flex-col items-center py-8 bg-black z-50">
        <div className="w-12 h-12 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mb-16 border border-white/10 shadow-xl">
            <div className={`w-6 h-6 rounded-sm rotate-45 transition-colors duration-500 ${isEnhance ? 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)]' : 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.6)]'}`} />
        </div>
        <div className="flex flex-col gap-12">
          {(['spatial', 'enhance', 'plan'] as RenderMode[]).map(mode => (
            <button 
              key={mode}
              onClick={() => handleModeSwitch(mode)} 
              className={`flex flex-col items-center gap-2 group transition-all ${renderMode === mode ? (mode === 'enhance' ? 'text-amber-500' : 'text-emerald-500') : 'text-white/10 hover:text-white/30'}`}
            >
              <div className={`p-4 rounded-2xl border transition-all duration-700 ${renderMode === mode ? (mode === 'enhance' ? 'border-amber-500/40 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]') : 'border-transparent'}`}>
                {mode === 'spatial' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/></svg>}
                {mode === 'enhance' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M15 3l6 6-6 6M9 21l-6-6 6-6"/></svg>}
                {mode === 'plan' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M3 3h18v18H3zM3 9h18M9 3v18"/></svg>}
              </div>
              <span className="text-[8px] font-black uppercase tracking-[0.2em]">{mode === 'spatial' ? 'Spatial V8' : mode === 'enhance' ? 'HD+ Master' : 'Plan'}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1 flex flex-col">
        <header className="h-20 flex items-center justify-between px-10 border-b border-white/5 bg-[#010101]">
           <div className="flex items-center gap-4">
             {(["1K输出", "2K输出", "4K输出"] as ImageSize[]).map(size => (
               <button 
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-6 py-2 rounded-full text-[10px] font-black border transition-all ${selectedSize === size ? 'bg-white text-black border-white' : 'border-white/5 text-white/20 hover:border-white/10'}`}
               >
                 {size}
               </button>
             ))}
           </div>
           <div className="flex items-center gap-8">
             <div className="flex flex-col items-end">
               <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${hasApiKey ? 'text-emerald-500' : 'text-rose-500'}`}>
                 {hasApiKey ? 'V8 ENGINE: SYNCHRONIZED' : 'ENGINE: UNLABELED'}
               </span>
               <span className="text-[10px] text-white/10 font-medium italic">RATIO: {lineartAspectRatio}</span>
             </div>
             <button onClick={handleOpenKeyPicker} className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
             </button>
           </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-[380px] bg-[#030303] p-10 flex flex-col gap-10 border-r border-white/5 overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              <h2 className="text-white text-2xl font-black tracking-tighter italic uppercase leading-none">V8 Engine</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isEnhance ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-40">Semantic Topology Synthesis</span>
              </div>
            </div>

            <div className="space-y-10">
              {!isEnhance ? (
                <>
                  <div className="space-y-5">
                    <p className="text-[10px] font-black opacity-20 uppercase tracking-[0.2em]">01. Material DNA Analysis</p>
                    <div onClick={() => fileInputRef.current?.click()} className="aspect-square bg-[#080808] border border-white/5 rounded-[3rem] flex items-center justify-center cursor-pointer hover:border-emerald-500/20 transition-all overflow-hidden relative group">
                      {refImage ? <img src={refImage} className="w-full h-full object-cover" /> : <span className="text-[10px] font-black opacity-10 uppercase italic">Drop Genetic Image</span>}
                      <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleUpload(e, 'ref')} />
                  </div>
                  {renderSlider("Topology Weight", blendWeight, setBlendWeight, "text-emerald-500")}
                </>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-left duration-700">
                  <p className="text-[10px] font-black opacity-20 uppercase tracking-[0.2em]">Physical Modifiers</p>
                  <div className="space-y-8 p-8 bg-white/[0.01] border border-white/5 rounded-[3rem]">
                    {renderSlider("高频纹理", enhanceParams.texture, (v) => setEnhanceParams(p => ({...p, texture: v})), "text-amber-500")}
                    {renderSlider("几何锁定", 100 - enhanceParams.smoothing, (v) => setEnhanceParams(p => ({...p, smoothing: 100 - v})), "text-amber-500")}
                    {renderSlider("细节采样", enhanceParams.detail, (v) => setEnhanceParams(p => ({...p, detail: v})), "text-amber-500")}
                    {renderSlider("全局照明", enhanceParams.light, (v) => setEnhanceParams(p => ({...p, light: v})), "text-amber-500")}
                  </div>
                </div>
              )}

              <div className="space-y-5">
                <p className="text-[10px] font-black opacity-20 uppercase tracking-[0.2em]">
                  02. Geometric Anchor (CAD)
                </p>
                <div onClick={() => lineartInputRef.current?.click()} className="aspect-video bg-[#080808] border border-white/5 rounded-[2.5rem] flex items-center justify-center cursor-pointer hover:border-white/10 transition-all overflow-hidden relative group">
                  {lineartImage ? <img src={lineartImage} className="w-full h-full object-cover" /> : <span className="text-[10px] font-black opacity-10 uppercase italic">Drop Lineart</span>}
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <input ref={lineartInputRef} type="file" className="hidden" onChange={(e) => handleUpload(e, 'lineart')} />
              </div>
            </div>

            <button 
              onClick={executeSynthesis}
              disabled={status === 'rendering' || !lineartImage || (!isEnhance && !refImage)}
              className={`mt-auto w-full py-7 rounded-[2rem] text-[10px] font-black tracking-[0.4em] uppercase transition-all duration-700 ${status === 'rendering' ? 'bg-white/5 text-white/10 animate-pulse cursor-wait' : 'bg-white text-black hover:shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95'}`}
            >
              {status === 'rendering' ? 'Calculating V8...' : 'Start Render'}
            </button>
          </aside>

          <main className="flex-1 bg-[#010101] p-16 flex items-center justify-center relative">
            <div className="w-full h-full rounded-[6rem] bg-[#030303] border border-white/5 flex items-center justify-center overflow-hidden relative shadow-2xl">
              {status === 'rendering' ? (
                <div className="flex flex-col items-center gap-10">
                  <div className="relative">
                    <div className="w-24 h-24 border border-white/5 rounded-full" />
                    <div className={`w-24 h-24 border-2 ${isEnhance ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)]' : 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]'} border-t-transparent rounded-full animate-spin absolute inset-0`} />
                  </div>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className={`text-xs tracking-[1em] font-black uppercase ${isEnhance ? 'text-amber-500' : 'text-emerald-500'}`}>
                      Processing Topology
                    </span>
                    <span className="text-[9px] text-white/10 font-medium italic tracking-widest uppercase">Ratio-Lock Active | PBR Logic Synchronizing</span>
                  </div>
                </div>
              ) : resultImage ? (
                <div className="group w-full h-full flex items-center justify-center p-12 animate-in zoom-in-95 duration-700 relative">
                  <img src={resultImage} className="max-w-full max-h-full object-contain rounded-[3rem] shadow-2xl border border-white/5" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/70 backdrop-blur-xl rounded-[6rem] pointer-events-none">
                    <button 
                      onClick={(e) => { e.stopPropagation(); saveImage(); }}
                      className="pointer-events-auto px-12 py-5 bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] rounded-full hover:scale-110 active:scale-90 transition-all shadow-2xl flex items-center gap-4"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Save V8 Result
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative flex items-center justify-center opacity-[0.01] pointer-events-none select-none">
                  <span className="text-[40rem] font-black italic tracking-tighter uppercase">{renderMode === 'spatial' ? 'V8' : renderMode === 'enhance' ? 'HD' : 'PLAN'}</span>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #111; border-radius: 10px; }
        
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 15px rgba(255,255,255,0.4);
        }
      `}</style>
    </div>
  );
};

export default App;
