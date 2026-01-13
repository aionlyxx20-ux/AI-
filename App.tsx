
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

type ImageSize = "1K" | "2K" | "4K";
type Status = 'idle' | 'analyzing' | 'rendering';

const App: React.FC = () => {
  const [refImage, setRefImage] = useState<string | null>(null);
  const [lineartImage, setLineartImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [dnaData, setDnaData] = useState<string>("");
  const [fidelity, setFidelity] = useState<number>(80); // 默认 80% 强度
  const [selectedSize, setSelectedSize] = useState<ImageSize>("1K");
  
  const [manualKey, setManualKey] = useState<string>(() => localStorage.getItem('ARCHI_LOG_KEY') || "");
  const [showKeyPanel, setShowKeyPanel] = useState(false);

  const refInputRef = useRef<HTMLInputElement>(null);
  const lineartInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const activeKey = manualKey || process.env.API_KEY;
    if (!activeKey) setShowKeyPanel(true);
  }, [manualKey]);

  const getActiveKey = () => manualKey || process.env.API_KEY || "";

  const handleEngineManagement = () => setShowKeyPanel(true);

  const saveManualKey = (val: string) => {
    const trimmed = val.trim();
    setManualKey(trimmed);
    localStorage.setItem('ARCHI_LOG_KEY', trimmed);
    setShowKeyPanel(false);
  };

  const calculateAspectRatio = (width: number, height: number): string => {
    const ratio = width / height;
    if (ratio > 1.5) return "16:9";
    if (ratio > 1.2) return "4:3";
    if (ratio < 0.6) return "9:16";
    if (ratio < 0.8) return "3:4";
    return "1:1";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'ref' | 'lineart') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = event.target?.result as string;
      if (type === 'ref') {
        setRefImage(data);
        await auditNeuralDNA(data);
      } else {
        const img = new Image();
        img.onload = () => {
          setAspectRatio(calculateAspectRatio(img.width, img.height));
          setLineartImage(data);
          setResultImage(null);
        };
        img.src = data;
      }
    };
    reader.readAsDataURL(file);
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
            { text: `[STRUCTURAL DNA AUDIT]
              分析并提取图纸视觉基因：调色盘HEX逻辑、材质表现细节、光影衰减步长、空间渲染风格。输出精炼指令。` }
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
    if (!lineartImage || !refImage) return;
    const key = getActiveKey();
    if (!key) return;
    setStatus('rendering');
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      
      // 动态强度逻辑控制
      const intensityTag = fidelity < 30 ? "MINIMAL_STYLIZATION" : fidelity < 70 ? "BALANCED_STYLIZATION" : "MAXIMUM_STYLIZATION";
      
      const prompt = `
        [STRICT FIDELITY SYNTHESIS V29]
        INTENSITY_LEVEL: ${fidelity}% (${intensityTag})
        
        INPUT_1 (REF_DNA): ${dnaData}
        INPUT_2 (LINEART_STABILITY): 100% 几何锁定，严禁改变墙体、门窗和家具轮廓。

        STYLIZATION_LOGIC:
        - 当强度为 ${fidelity}% 时：${fidelity < 50 ? "保留大量留白，仅在关键区域应用参考图的色彩。" : "全面迁移参考图的材质纹理、光影退晕和环境色彩。"}
        - 边缘处理：所有填色必须精准闭合在黑线范围内。
        - 色彩饱和度：映射参考图的色彩跨度，应用 ${fidelity}% 的视觉对比度。
        
        CORE_CONSTRAINTS:
        - 零幻觉：禁止添加线稿中不存在的物体。
        - 矢量质感：输出应具有极高的工业纯净度，消除噪点，保持渐变丝滑。
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            { inlineData: { data: refImage.split(',')[1], mimeType: 'image/jpeg' } },
            { inlineData: { data: lineartImage.split(',')[1], mimeType: 'image/png' } },
            { text: prompt }
          ]
        },
        config: {
          imageConfig: { 
            // @ts-ignore
            aspectRatio: aspectRatio, 
            imageSize: selectedSize 
          }
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

  return (
    <div className="h-screen bg-[#020202] text-[#a1a1aa] flex overflow-hidden font-sans select-none">
      {showKeyPanel && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="w-[480px] p-12 bg-[#0a0a0a] border border-white/10 rounded-[3rem] shadow-[0_0_120px_rgba(0,0,0,0.9)] space-y-10 relative">
            <button onClick={() => setShowKeyPanel(false)} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors">✕</button>
            <div className="space-y-3">
              <h3 className="text-white text-2xl font-black italic tracking-tighter uppercase">引擎鉴权 / ENGINE AUTH</h3>
              <p className="text-white/30 text-[11px] uppercase tracking-widest font-bold leading-relaxed">请输入您的 Google API KEY 以启动渲染集群。</p>
            </div>
            <div className="space-y-5">
              <input 
                type="password" 
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                placeholder="Google Gemini API Key" 
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5 text-emerald-500 font-mono tracking-widest outline-none focus:border-emerald-500/50 transition-all"
              />
              <button onClick={() => saveManualKey(manualKey)} className="w-full py-5 bg-emerald-500 text-white text-[12px] font-black uppercase tracking-[0.6em] rounded-2xl active:scale-95 hover:bg-emerald-400 transition-all">激活内核</button>
            </div>
          </div>
        </div>
      )}

      <aside className="w-[320px] lg:w-[400px] border-r border-white/5 bg-[#080808] p-8 flex flex-col gap-10 overflow-y-auto shrink-0 z-20 scrollbar-hide">
        <header className="space-y-1">
          <h1 className="text-white text-2xl font-black tracking-[-0.05em] uppercase italic leading-none">
            ARCHI-LOGIC<br/>
            <span className="text-emerald-500 text-sm tracking-[0.2em] font-black italic">FIDELITY RENDER</span>
          </h1>
          <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.8em]">Absolute Precision V29.0</p>
        </header>

        <section className="space-y-8">
          <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">01. 风格源 (Style Reference)</label>
            <div onClick={() => refInputRef.current?.click()} className="aspect-square bg-white/[0.02] border border-white/10 rounded-[2.5rem] cursor-pointer hover:border-emerald-500/40 transition-all flex items-center justify-center overflow-hidden group">
              {refImage ? <img src={refImage} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" /> : <div className="text-white/5 text-[10px] font-black uppercase tracking-widest">Select Style Ref</div>}
              <input ref={refInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'ref')} />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">02. CAD 目标 (Target Lineart)</label>
            <div onClick={() => lineartInputRef.current?.click()} className="aspect-[4/3] bg-white/[0.02] border border-white/10 rounded-[2.5rem] cursor-pointer hover:border-emerald-500/40 transition-all flex items-center justify-center overflow-hidden group">
              {lineartImage ? <img src={lineartImage} className="w-full h-full object-contain p-6" /> : <div className="text-white/5 text-[10px] font-black uppercase tracking-widest">Select CAD Image</div>}
              <input ref={lineartInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'lineart')} />
            </div>
          </div>
        </section>

        <section className="mt-auto space-y-8">
          <div className="space-y-5">
            <div className="flex justify-between items-end">
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">风格强度 (Fidelity)</span>
              <span className="text-emerald-500 text-xl font-black italic">{fidelity}%</span>
            </div>
            <div className="relative h-1 bg-white/5 rounded-full">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={fidelity} 
                onChange={(e) => setFidelity(parseInt(e.target.value))} 
                className="absolute inset-0 w-full h-full appearance-none bg-transparent accent-emerald-500 cursor-pointer z-10" 
              />
              <div className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full" style={{ width: `${fidelity}%` }}></div>
            </div>
            <div className="flex justify-between text-[8px] font-black text-white/10 uppercase tracking-widest">
              <span>Minimal</span>
              <span>Ultra Heavy</span>
            </div>
          </div>

          <button 
            onClick={executeSynthesis} 
            disabled={status !== 'idle' || !lineartImage || !refImage} 
            className="w-full py-6 bg-white text-black text-[11px] font-black uppercase tracking-[0.8em] rounded-[1.2rem] hover:bg-emerald-500 hover:text-white transition-all shadow-2xl disabled:opacity-10 active:scale-95"
          >
            {status === 'rendering' ? 'SYNTHESIZING...' : '生成高保真图纸'}
          </button>
        </section>
      </aside>

      <main className="flex-1 bg-[#020202] p-12 lg:p-20 flex flex-col items-center justify-center relative">
        <nav className="absolute top-12 left-12 right-12 flex justify-between items-center z-10">
          <div className="flex gap-4">
            {(['1K', '2K', '4K'] as ImageSize[]).map(s => (
              <button key={s} onClick={() => setSelectedSize(s)} className={`px-6 py-2 rounded-full text-[9px] font-black transition-all border ${selectedSize === s ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-white/20 border-white/5 hover:border-white/20'}`}>{s} RENDER</button>
            ))}
          </div>
          <button onClick={handleEngineManagement} className="px-6 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[9px] font-black hover:bg-emerald-500 hover:text-white transition-all uppercase tracking-widest">引擎管理</button>
        </nav>

        <div className="w-full h-full max-w-7xl rounded-[4rem] border border-white/[0.03] bg-[#050505] flex items-center justify-center overflow-hidden relative group shadow-[0_0_150px_rgba(0,0,0,0.8)]">
          {status !== 'idle' && (
            <div className="flex flex-col items-center gap-10">
              <div className="w-16 h-16 border-[2px] border-white/5 border-t-emerald-500 rounded-full animate-spin"></div>
              <div className="text-white/40 text-[10px] font-black uppercase tracking-[1em] animate-pulse">正在执行多模态神经渲染</div>
            </div>
          )}

          {!resultImage && status === 'idle' && (
            <div className="opacity-[0.02] flex flex-col items-center gap-12 select-none pointer-events-none translate-y-12 transition-transform duration-1000">
              <div className="text-[25rem] font-black italic tracking-tighter leading-none">AI</div>
            </div>
          )}

          {resultImage && status === 'idle' && (
            <div className="w-full h-full flex items-center justify-center animate-reveal bg-white relative">
              <img src={resultImage} className="max-w-full max-h-full object-contain" />
              <div className="absolute inset-0 bg-black/98 opacity-0 group-hover:opacity-100 transition-all duration-700 flex flex-col items-center justify-center gap-10 backdrop-blur-3xl">
                <a href={resultImage} download="PLAN_SYNTHESIS.png" className="px-24 py-6 bg-white text-black rounded-full text-[14px] font-black uppercase tracking-[1em] hover:bg-emerald-500 hover:text-white transition-all transform scale-95 group-hover:scale-100 duration-1000 shadow-2xl">导出作品</a>
                <button onClick={() => setResultImage(null)} className="text-[10px] text-white/20 hover:text-red-500 uppercase tracking-[0.8em] font-black transition-colors">重新生成</button>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes reveal { 
          0% { opacity: 0; filter: blur(40px) brightness(2); transform: scale(1.1); } 
          100% { opacity: 1; filter: blur(0) brightness(1); transform: scale(1); } 
        }
        .animate-reveal { animation: reveal 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 24px; width: 24px;
          border-radius: 50%;
          background: #ffffff;
          border: 4px solid #10b981;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default App;
