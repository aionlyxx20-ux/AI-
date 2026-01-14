
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

type ImageSize = "1K" | "2K" | "4K";
type Status = 'idle' | 'analyzing' | 'rendering';
type RenderMode = 'plan' | 'spatial' | 'enhance';

const App: React.FC = () => {
  const [renderMode, setRenderMode] = useState<RenderMode>('plan');
  const [refImage, setRefImage] = useState<string | null>(null);
  const [lineartImage, setLineartImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [dnaData, setDnaData] = useState<string>("");
  const [synthesisScale, setSynthesisScale] = useState<number>(100); 
  const [selectedSize, setSelectedSize] = useState<ImageSize>("1K");
  
  const [manualKey, setManualKey] = useState<string>(() => localStorage.getItem('ARCHI_LOG_KEY') || "");
  const [showKeyPanel, setShowKeyPanel] = useState(false);

  const refInputRef = useRef<HTMLInputElement>(null);
  const lineartInputRef = useRef<HTMLInputElement>(null);

  const handleModeSwitch = (mode: RenderMode) => {
    setRenderMode(mode);
    setRefImage(null);
    setLineartImage(null);
    setResultImage(null);
    setDnaData("");
    setStatus('idle');
  };

  useEffect(() => {
    const activeKey = manualKey || process.env.API_KEY;
    if (!activeKey) setShowKeyPanel(true);
  }, [manualKey]);

  const getActiveKey = () => manualKey || process.env.API_KEY || "";

  const handleEngineManagement = () => {
    setShowKeyPanel(true);
  };

  const processLineart = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        }
      };
      img.src = dataUrl;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'ref' | 'lineart') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = event.target?.result as string;
      if (type === 'ref') {
        setRefImage(data);
        const img = new Image();
        img.onload = () => {
          if (renderMode === 'enhance') setAspectRatio(calculateAspectRatio(img.width, img.height));
        };
        img.src = data;
        await auditNeuralDNA(data);
      } else {
        const processedLineart = await processLineart(data);
        const img = new Image();
        img.onload = () => {
          setAspectRatio(calculateAspectRatio(img.width, img.height));
          setLineartImage(processedLineart);
          setResultImage(null);
        };
        img.src = processedLineart;
      }
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const calculateAspectRatio = (width: number, height: number): string => {
    const ratio = width / height;
    if (ratio > 1.5) return "16:9";
    if (ratio > 1.2) return "4:3";
    if (ratio < 0.6) return "9:16";
    if (ratio < 0.8) return "3:4";
    return "1:1";
  };

  const auditNeuralDNA = async (imageData: string) => {
    const key = getActiveKey();
    if (!key) return;
    setStatus('analyzing');
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          parts: [
            { inlineData: { data: imageData.split(',')[1], mimeType: 'image/jpeg' } },
            { text: `[STYLE-ONLY EXTRACTION] 仅分析色彩调性、光影强度和材质质感。完全忽略并剥离其任何几何结构、物体轮廓或空间布局信息。` }
          ]
        }]
      });
      setDnaData(response.text || "");
    } catch (err: any) {
      console.error("Audit Error:", err);
    } finally {
      setStatus('idle');
    }
  };

  const executeSynthesis = async () => {
    if (!refImage) return;
    if (renderMode !== 'enhance' && !lineartImage) return;

    const key = getActiveKey();
    if (!key) return;
    setStatus('rendering');
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      let modeInstruction = "";
      let parts: any[] = [];

      if (renderMode === 'plan') {
        modeInstruction = "TOPOLOGICAL BASE LAYER: 提供的线稿图是唯一的物理边界。";
        parts.push({ inlineData: { data: refImage.split(',')[1], mimeType: 'image/jpeg' } });
        parts.push({ inlineData: { data: lineartImage!.split(',')[1], mimeType: 'image/png' } });
      } else if (renderMode === 'spatial') {
        modeInstruction = "PERSPECTIVE ANCHOR: 严格遵守线稿图的所有透视线和几何边缘。";
        parts.push({ inlineData: { data: refImage.split(',')[1], mimeType: 'image/jpeg' } });
        parts.push({ inlineData: { data: lineartImage!.split(',')[1], mimeType: 'image/png' } });
      } else {
        modeInstruction = "HD PIXEL RECONSTRUCTION: 锁定现有构图进行超分辨率增强。";
        parts.push({ inlineData: { data: refImage.split(',')[1], mimeType: 'image/jpeg' } });
      }

      const prompt = `
        [CORE PROTOCOL: 100% GEOMETRIC FIDELITY]
        MODE_CONTEXT: ${modeInstruction}
        SYNTHESIS_STRENGTH: ${synthesisScale}%
        MATERIAL_PALETTE: ${dnaData}
        
        [STRICT INSTRUCTIONS - DO NOT DEVIATE]
        1. 线稿作为绝对模具 (THE MOLD)：黑白线稿是唯一的空间真相。禁止改变、增加或减少任何线条。线条坐标必须100%对齐。
        2. 色彩仅为填充 (COLOR AS FILL ONLY)：将风格图的质感和颜色如同液体一样填充在线稿限定的封闭区域内。
        3. 严禁改写 (NO REDRAWING)：禁止AI根据风格图自发添加家具、墙体或装饰。如果线稿中没有，成果图中就不允许出现。
        4. 线条一致性 (LINE CONSISTENCY)：线条必须清晰、锐利且与原稿位置完全一致。
      `;
      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: {
          imageConfig: { 
            aspectRatio: aspectRatio as any, 
            imageSize: selectedSize 
          },
          seed: 42 // 固定随机种子以确保最大的输出一致性
        }
      });

      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData) {
        setResultImage(`data:image/png;base64,${part.inlineData.data}`);
      }
    } catch (err: any) {
      console.error("Synthesis Error:", err);
      if (err.message?.includes("not found")) setShowKeyPanel(true);
    } finally {
      setStatus('idle');
    }
  };

  const saveManualKey = (val: string) => {
    const trimmed = val.trim();
    setManualKey(trimmed);
    localStorage.setItem('ARCHI_LOG_KEY', trimmed);
    setShowKeyPanel(false);
  };

  return (
    <div className={`h-screen text-[#a1a1aa] flex overflow-hidden font-sans select-none transition-all duration-700 ${renderMode === 'enhance' ? 'bg-[#040404]' : renderMode === 'spatial' ? 'bg-[#030306]' : 'bg-[#020202]'}`}>
      <nav className="w-20 border-r border-white/5 flex flex-col items-center py-10 gap-8 bg-[#050505] shrink-0 z-50">
        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6">
          <div className="w-4 h-4 bg-emerald-500 rounded-sm rotate-45 shadow-[0_0_15px_rgba(16,185,129,0.8)]"></div>
        </div>
        
        <button onClick={() => handleModeSwitch('plan')} className={`group relative flex flex-col items-center gap-2 transition-all ${renderMode === 'plan' ? 'text-emerald-500' : 'text-white/20 hover:text-white/40'}`}>
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${renderMode === 'plan' ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'border-transparent'}`}>
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3zM3 9h18M9 3v18" /></svg>
          </div>
          <span className="text-[8px] font-black uppercase tracking-tighter">平面模式</span>
        </button>

        <button onClick={() => handleModeSwitch('spatial')} className={`group relative flex flex-col items-center gap-2 transition-all ${renderMode === 'spatial' ? 'text-emerald-500' : 'text-white/20 hover:text-white/40'}`}>
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${renderMode === 'spatial' ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.3)]' : 'border-transparent'}`}>
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
            </svg>
          </div>
          <span className="text-[8px] font-black uppercase tracking-tighter">空间模式</span>
        </button>

        <button onClick={() => handleModeSwitch('enhance')} className={`group relative flex flex-col items-center gap-2 transition-all ${renderMode === 'enhance' ? 'text-amber-500' : 'text-white/20 hover:text-white/40'}`}>
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${renderMode === 'enhance' ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_40px_rgba(245,158,11,0.3)]' : 'border-transparent'}`}>
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /><circle cx="12" cy="12" r="2" />
            </svg>
          </div>
          <span className="text-[8px] font-black uppercase tracking-tighter">高清增强</span>
        </button>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <aside className={`w-[320px] lg:w-[380px] border-r border-white/5 p-8 flex flex-col gap-10 overflow-y-auto shrink-0 z-20 transition-all duration-700 ${renderMode === 'enhance' ? 'bg-[#0a0a0a]' : 'bg-[#080808]'}`}>
          <header className="space-y-1">
            <h1 className="text-white text-2xl font-black tracking-[-0.05em] uppercase italic leading-none">
              ARCHI-LOGIC<br/>
              <span className={`${renderMode === 'enhance' ? 'text-amber-500' : 'text-emerald-500'} text-sm tracking-[0.2em] font-black italic`}>{renderMode.toUpperCase()} PRIMARY</span>
            </h1>
          </header>

          <section className="space-y-8">
            <div className="space-y-4">
              <label className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">
                {renderMode === 'enhance' ? '01. 待增强底图' : '01. 风格参考DNA'}
              </label>
              <div onClick={() => refInputRef.current?.click()} className="aspect-square bg-white/[0.02] border border-white/10 rounded-[2.5rem] cursor-pointer hover:border-emerald-500/40 transition-all flex items-center justify-center overflow-hidden group">
                {refImage ? <img src={refImage} className="w-full h-full object-cover" /> : <div className="text-white/5 text-[10px] font-black uppercase tracking-widest text-center px-4">上传风格图</div>}
                <input ref={refInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'ref')} />
              </div>
            </div>

            {renderMode !== 'enhance' && (
              <div className="space-y-4">
                <label className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">02. 绝对锁定线稿</label>
                <div onClick={() => lineartInputRef.current?.click()} className="aspect-[4/3] bg-white/[0.02] border border-white/10 rounded-[2.5rem] cursor-pointer hover:border-emerald-500/40 transition-all flex items-center justify-center overflow-hidden group">
                  {lineartImage ? <img src={lineartImage} className="w-full h-full object-contain p-6" /> : <div className="text-white/5 text-[10px] font-black uppercase tracking-widest text-center px-4">上传 CAD 线稿</div>}
                  <input ref={lineartInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'lineart')} />
                </div>
              </div>
            )}
          </section>

          <section className="mt-auto space-y-8">
            <div className="space-y-5">
              <div className="flex justify-between items-end">
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">色彩合成比重</span>
                <span className={`${renderMode === 'enhance' ? 'text-amber-500' : 'text-emerald-500'} text-xl font-black italic`}>{synthesisScale}%</span>
              </div>
              <input type="range" min="0" max="100" value={synthesisScale} onChange={(e) => setSynthesisScale(parseInt(e.target.value))} className={`w-full h-1 appearance-none bg-white/5 rounded-full ${renderMode === 'enhance' ? 'accent-amber-500' : 'accent-emerald-500'} cursor-pointer`} />
            </div>

            <button onClick={executeSynthesis} disabled={status !== 'idle' || !refImage || (renderMode !== 'enhance' && !lineartImage)} className={`w-full py-6 text-black text-[11px] font-black uppercase tracking-[0.8em] rounded-[1.2rem] transition-all shadow-2xl ${renderMode === 'enhance' ? 'bg-amber-500 hover:bg-amber-400' : 'bg-white hover:bg-emerald-500 hover:text-white'} disabled:opacity-10`}>
              {status === 'rendering' ? '物理拓扑锁定渲染中...' : '启动绝对渲染'}
            </button>
          </section>
        </aside>

        <main className={`flex-1 p-12 lg:p-20 flex flex-col items-center justify-center relative transition-all duration-700 ${renderMode === 'enhance' ? 'bg-[#020202]' : 'bg-[#010103]'}`}>
          <nav className="absolute top-12 left-12 right-12 flex justify-between items-center z-20">
            <div className="flex gap-4">
              {(['1K', '2K', '4K'] as ImageSize[]).map(s => (
                <button key={s} onClick={() => setSelectedSize(s)} className={`px-6 py-2 rounded-full text-[9px] font-black transition-all border ${selectedSize === s ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-white/20 border-white/5 hover:border-white/20'}`}>{s} OUTPUT</button>
              ))}
            </div>
            <button onClick={handleEngineManagement} className="px-6 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">引擎管理</button>
          </nav>

          <div className={`w-full h-full max-w-7xl rounded-[4rem] border border-white/[0.03] flex items-center justify-center overflow-hidden relative group shadow-[0_0_200px_rgba(0,0,0,0.9)] bg-[#050505]`}>
            {status !== 'idle' && (
              <div className="flex flex-col items-center gap-10">
                <div className={`w-16 h-16 border-[2px] border-white/5 ${renderMode === 'enhance' ? 'border-t-amber-500' : 'border-t-emerald-500'} rounded-full animate-spin`}></div>
                <div className="text-white/40 text-[10px] font-black uppercase tracking-[1.5em] animate-pulse italic">TOPOLOGY LOCK ACTIVE</div>
              </div>
            )}

            {!resultImage && status === 'idle' && (
              <div className="opacity-[0.015] text-[30rem] font-black italic tracking-tighter cursor-default lowercase">
                {renderMode === 'plan' ? 'planar' : renderMode === 'spatial' ? 'spatial' : 'ultra'}
              </div>
            )}

            {resultImage && status === 'idle' && (
              <div className="w-full h-full flex items-center justify-center animate-reveal bg-white relative">
                <img src={resultImage} className="max-w-full max-h-full object-contain" />
                <div className="absolute inset-0 bg-black/98 opacity-0 group-hover:opacity-100 transition-all duration-700 flex flex-col items-center justify-center gap-10 backdrop-blur-3xl">
                  <a href={resultImage} download={`ARCHI_ABS_FIDELITY_${Date.now()}.png`} className="px-24 py-6 bg-white text-black rounded-full text-[14px] font-black uppercase tracking-[1em] hover:bg-emerald-500 hover:text-white transition-all shadow-2xl">导出零偏差成果</a>
                  <button onClick={() => setResultImage(null)} className="text-[10px] text-white/20 hover:text-red-500 uppercase font-black tracking-widest">重置当前会话</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {showKeyPanel && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-3xl">
          <div className="w-[480px] p-12 bg-[#0a0a0a] border border-white/10 rounded-[3rem] space-y-10 shadow-[0_0_100px_rgba(16,185,129,0.1)]">
            <h3 className="text-white text-2xl font-black italic uppercase">内核鉴权 AUTH</h3>
            <input type="password" value={manualKey} onChange={(e) => setManualKey(e.target.value)} placeholder="API KEY" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5 text-emerald-400 outline-none font-mono tracking-widest text-center" />
            <button onClick={() => saveManualKey(manualKey)} className="w-full py-5 bg-emerald-500 text-white font-black uppercase rounded-2xl shadow-xl hover:bg-emerald-400 transition-all">初始化引擎</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes reveal { 0% { opacity: 0; filter: blur(40px); transform: scale(1.05); } 100% { opacity: 1; filter: blur(0); transform: scale(1); } }
        .animate-reveal { animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 20px; width: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 4px solid currentColor;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default App;
