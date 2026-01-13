
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
  const [fidelity, setFidelity] = useState<number>(100);
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
              请严格按照以下维度提取参考图的视觉基因：
              1. 调色盘(Palette): 提取主色、辅助色、点缀色的确切HEX逻辑。
              2. 材质表现(Texture): 描述表面的平滑度、光泽感。
              3. 光影逻辑(Lighting): 阴影的方向、柔和度、环境光的冷暖色温。
              4. 渲染风格(Style): 描述其为极简主义、写实渲染还是扁平化图纸。
              请用短语形式输出，作为后续渲染引擎的硬性指令。` }
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
      
      // 加固渲染逻辑：采用多模态部件注入 (Ref Image + Lineart Image + DNA Text)
      const prompt = `
        [STRICT FIDELITY SYNTHESIS V28]
        INPUT_1 (REF): 提取参考图中的配色方案、光影、阴影质量和整体美学。
        INPUT_2 (LINEART): 严格锁定线稿。禁止改变任何墙体、家具、开口的几何位置。
        
        DNA_INSTRUCTIONS:
        ${dnaData}

        CORE_CONSTRAINTS:
        - 零幻觉: 严禁在线稿之外添加新物体。
        - 边缘锁定: 所有填色必须精准闭合在线稿边界内。
        - 迁移一致性: 将REF的色彩梯度完全迁移到LINEART上。
        - 渲染精度: 保持工业图纸的整洁感，消除噪声，增强矢量质感。
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-3xl">
          <div className="w-[480px] p-12 bg-[#0a0a0a] border border-white/10 rounded-[3rem] shadow-[0_0_120px_rgba(0,0,0,0.9)] space-y-10 relative">
            <button onClick={() => setShowKeyPanel(false)} className="absolute top-8 right-8 text-white/20 hover:text-white">✕</button>
            <div className="space-y-3">
              <h3 className="text-white text-2xl font-black italic tracking-tighter uppercase">引擎管理 / ENGINE AUTH</h3>
              <p className="text-white/30 text-[11px] uppercase tracking-widest font-bold">请配置具有图像生成权限的 API KEY。</p>
            </div>
            <div className="space-y-5">
              <input 
                type="password" 
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                placeholder="Google Gemini API Key" 
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5 text-emerald-500 font-mono tracking-widest outline-none focus:border-emerald-500/50"
              />
              <button onClick={() => saveManualKey(manualKey)} className="w-full py-5 bg-emerald-500 text-white text-[12px] font-black uppercase tracking-[0.6em] rounded-2xl active:scale-95 transition-all">激活引擎</button>
            </div>
          </div>
        </div>
      )}

      <aside className="w-[320px] lg:w-[400px] border-r border-white/5 bg-[#080808] p-8 flex flex-col gap-10 overflow-y-auto shrink-0 z-20">
        <header className="space-y-1">
          <h1 className="text-white text-2xl font-black tracking-[-0.05em] uppercase italic leading-none">
            ARCHI-LOGIC<br/>
            <span className="text-emerald-500 text-sm tracking-[0.2em] font-black italic">ULTRA STABLE</span>
          </h1>
          <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.8em]">Neural Fidelity V28.2</p>
        </header>

        <section className="space-y-8">
          <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">01. 迁移源 (Style Source)</label>
            <div onClick={() => refInputRef.current?.click()} className="aspect-square bg-white/[0.02] border border-white/10 rounded-[2.5rem] cursor-pointer hover:border-emerald-500/40 transition-all flex items-center justify-center overflow-hidden group">
              {refImage ? <img src={refImage} className="w-full h-full object-cover" /> : <div className="text-white/5 text-[10px] font-black uppercase">Drop Style Ref</div>}
              <input ref={refInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'ref')} />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">02. 目标线稿 (CAD Target)</label>
            <div onClick={() => lineartInputRef.current?.click()} className="aspect-[4/3] bg-white/[0.02] border border-white/10 rounded-[2.5rem] cursor-pointer hover:border-emerald-500/40 transition-all flex items-center justify-center overflow-hidden group">
              {lineartImage ? <img src={lineartImage} className="w-full h-full object-contain p-6" /> : <div className="text-white/5 text-[10px] font-black uppercase">Drop Lineart</div>}
              <input ref={lineartInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'lineart')} />
            </div>
          </div>
        </section>

        <section className="mt-auto space-y-6">
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
             <div className="text-[8px] text-emerald-500 font-black uppercase mb-2">Neural Status</div>
             <div className="text-[10px] text-white/60 leading-tight italic line-clamp-3">
               {dnaData || "Waiting for style analysis..."}
             </div>
          </div>
          <button 
            onClick={executeSynthesis} 
            disabled={status !== 'idle' || !lineartImage || !refImage} 
            className="w-full py-6 bg-white text-black text-[11px] font-black uppercase tracking-[0.8em] rounded-[1.2rem] hover:bg-emerald-500 hover:text-white transition-all shadow-xl disabled:opacity-10"
          >
            {status === 'rendering' ? '处理中...' : '启动高保真合成'}
          </button>
        </section>
      </aside>

      <main className="flex-1 bg-[#020202] p-12 lg:p-20 flex flex-col items-center justify-center relative">
        <nav className="absolute top-12 left-12 right-12 flex justify-between items-center z-10">
          <div className="flex gap-4">
            {(['1K', '2K', '4K'] as ImageSize[]).map(s => (
              <button key={s} onClick={() => setSelectedSize(s)} className={`px-6 py-2 rounded-full text-[9px] font-black transition-all border ${selectedSize === s ? 'bg-white text-black border-white shadow-lg' : 'text-white/20 border-white/5'}`}>{s} OUTPUT</button>
            ))}
          </div>
          <button onClick={handleEngineManagement} className="px-6 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[9px] font-black hover:bg-emerald-500 hover:text-white transition-all">引擎管理</button>
        </nav>

        <div className="w-full h-full max-w-7xl rounded-[4rem] border border-white/[0.03] bg-[#050505] flex items-center justify-center overflow-hidden relative group">
          {status !== 'idle' && (
            <div className="flex flex-col items-center gap-10">
              <div className="w-20 h-20 border-[3px] border-white/5 border-t-emerald-500 rounded-full animate-spin"></div>
              <div className="text-white text-[11px] font-black uppercase tracking-[1em] animate-pulse">正在进行多模态对齐渲染</div>
            </div>
          )}

          {!resultImage && status === 'idle' && (
            <div className="opacity-[0.02] flex flex-col items-center gap-12 select-none pointer-events-none">
              <div className="text-[20rem] font-black italic tracking-tighter">CAD</div>
            </div>
          )}

          {resultImage && status === 'idle' && (
            <div className="w-full h-full flex items-center justify-center animate-reveal bg-white relative">
              <img src={resultImage} className="max-w-full max-h-full object-contain" />
              <div className="absolute inset-0 bg-black/98 opacity-0 group-hover:opacity-100 transition-all duration-700 flex flex-col items-center justify-center gap-10 backdrop-blur-3xl">
                <a href={resultImage} download="SYNTHESIS_PLAN.png" className="px-24 py-6 bg-white text-black rounded-full text-[14px] font-black uppercase tracking-[1em] hover:bg-emerald-500 hover:text-white transition-all transform scale-95 group-hover:scale-100 duration-1000">导出高精度图纸</a>
                <button onClick={() => setResultImage(null)} className="text-[10px] text-white/20 hover:text-red-500 uppercase tracking-[0.8em] font-black">重新渲染</button>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes reveal { 
          0% { opacity: 0; filter: blur(60px); transform: scale(1.08); } 
          100% { opacity: 1; filter: blur(0); transform: scale(1); } 
        }
        .animate-reveal { animation: reveal 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;
