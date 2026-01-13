
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
  const [dnaStream, setDnaStream] = useState<string>("");
  const [fidelity, setFidelity] = useState<number>(100);
  const [selectedSize, setSelectedSize] = useState<ImageSize>("1K");
  
  // 核心状态：手动输入的 Key 具有最高优先级
  const [manualKey, setManualKey] = useState<string>(() => localStorage.getItem('ARCHI_LOGIC_KEY') || "");
  const [showKeyPanel, setShowKeyPanel] = useState(false);

  const refInputRef = useRef<HTMLInputElement>(null);
  const lineartInputRef = useRef<HTMLInputElement>(null);

  // 初始化检测：如果没有 Key，直接弹出配置层
  useEffect(() => {
    const activeKey = manualKey || process.env.API_KEY;
    if (!activeKey) {
      setShowKeyPanel(true);
    }
  }, [manualKey]);

  // 获取当前有效的 API Key
  const getActiveKey = () => manualKey || process.env.API_KEY || "";

  // 彻底修复：无论环境如何，点击“引擎管理”必须显示内置面板
  const handleEngineManagement = () => {
    setShowKeyPanel(true);
    // 同时尝试调用系统级接口以保持兼容性
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      aistudio.openSelectKey().catch(() => {});
    }
  };

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

  const processLineart = (dataUrl: string): Promise<{data: string, ratio: string}> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const ratio = calculateAspectRatio(img.width, img.height);
        resolve({ data: canvas.toDataURL('image/png'), ratio: ratio });
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
        await auditNeuralDNA(data);
      } else {
        const processed = await processLineart(data);
        setLineartImage(processed.data);
        setAspectRatio(processed.ratio);
        setResultImage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const auditNeuralDNA = async (imageData: string) => {
    const key = getActiveKey();
    if (!key) {
      setShowKeyPanel(true);
      return;
    }
    setStatus('analyzing');
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          parts: [
            { inlineData: { data: imageData.split(',')[1], mimeType: 'image/jpeg' } },
            { text: `[DNA AUDIT] 提取此图高级色彩布局逻辑：主要色值、渐变逻辑、阴影分布。` }
          ]
        }]
      });
      setDnaStream(response.text || "");
    } catch (err: any) {
      console.error("Audit Error:", err);
      if (err.message?.includes("API_KEY") || err.message?.includes("403") || err.message?.includes("not found")) {
        setShowKeyPanel(true);
      }
    } finally {
      setStatus('idle');
    }
  };

  const executeSynthesis = async () => {
    if (!lineartImage) return;
    const key = getActiveKey();
    if (!key) {
      setShowKeyPanel(true);
      return;
    }
    setStatus('rendering');
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const prompt = `[RENDER V28] 严格锁定线稿，基于[${dnaStream}]进行高级渐变填色，阴影偏差<3%，极致工业纯净。`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
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
      if (err.message?.includes("API_KEY") || err.message?.includes("403") || err.message?.includes("not found")) {
        setShowKeyPanel(true);
      }
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="h-screen bg-[#020202] text-[#a1a1aa] flex overflow-hidden font-sans select-none">
      {/* 彻底独立的高优先级 API Key 输入层 */}
      {showKeyPanel && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-3xl transition-all duration-500">
          <div className="w-[480px] p-12 bg-[#0a0a0a] border border-white/10 rounded-[3rem] shadow-[0_0_120px_rgba(0,0,0,0.9)] space-y-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0"></div>
            <button 
              onClick={() => setShowKeyPanel(false)} 
              className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors p-2"
            >
              ✕
            </button>
            <div className="space-y-3">
              <h3 className="text-white text-2xl font-black italic tracking-tighter uppercase">引擎配置 / SYSTEM AUTH</h3>
              <p className="text-white/30 text-[11px] uppercase tracking-widest leading-relaxed font-bold">
                独立部署环境需要手动配置 API KEY。<br/>
                此密钥将仅保存在您的本地浏览器中。
              </p>
            </div>
            <div className="space-y-5">
              <div className="relative group">
                <input 
                  type="password" 
                  autoFocus
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  placeholder="请输入您的 Google Gemini API Key" 
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5 text-emerald-500 text-sm focus:border-emerald-500/50 focus:bg-white/[0.05] outline-none transition-all font-mono tracking-widest"
                />
              </div>
              <button 
                onClick={() => saveManualKey(manualKey)}
                className="w-full py-5 bg-emerald-500 text-white text-[12px] font-black uppercase tracking-[0.6em] rounded-2xl hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all active:scale-95"
              >
                激活 AI 引擎
              </button>
              <div className="flex flex-col gap-3 pt-4">
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-center text-[9px] text-white/20 hover:text-emerald-500 transition-colors uppercase tracking-[0.2em] font-black">
                  1. 访问 Google AI Studio 获取密钥
                </a>
                <p className="text-center text-[9px] text-red-500/40 uppercase tracking-[0.2em] font-black italic">
                  * 必须使用已开启计费的 Paid Project 密钥
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <aside className="w-[320px] lg:w-[400px] border-r border-white/5 bg-[#080808] p-8 flex flex-col gap-10 overflow-y-auto scrollbar-hide shrink-0 z-20">
        <header className="space-y-1">
          <h1 className="text-white text-2xl font-black tracking-[-0.05em] uppercase italic leading-none">
            COLOR LAYOUT<br/>
            <span className="text-emerald-500 text-sm tracking-[0.2em] font-black italic">AI SYSTEM</span>
          </h1>
          <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.8em]">Absolute Fidelity V28</p>
        </header>

        <section className="space-y-8">
          <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">01. 风格 DNA 审计</label>
            <div onClick={() => refInputRef.current?.click()} className="aspect-square bg-white/[0.02] border border-white/10 rounded-[2rem] cursor-pointer hover:border-emerald-500/40 transition-all flex items-center justify-center overflow-hidden group">
              {refImage ? <img src={refImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" /> : <div className="text-white/5 text-[10px] font-black tracking-widest uppercase">Style Reference</div>}
              <input ref={refInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'ref')} />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">02. 线稿 (比例: {aspectRatio})</label>
            <div onClick={() => lineartInputRef.current?.click()} className="aspect-video bg-white/[0.02] border border-white/10 rounded-[2rem] cursor-pointer hover:border-emerald-500/40 transition-all flex items-center justify-center overflow-hidden group">
              {lineartImage ? <img src={lineartImage} className="w-full h-full object-contain p-8 group-hover:scale-105 transition-transform duration-[2s]" /> : <div className="text-white/5 text-[10px] font-black tracking-widest uppercase">CAD Lineart</div>}
              <input ref={lineartInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'lineart')} />
            </div>
          </div>
        </section>

        <section className="mt-auto space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">保真系数</span>
              <span className="text-white text-xl font-black italic">{fidelity}%</span>
            </div>
            <input type="range" min="0" max="100" value={fidelity} onChange={(e) => setFidelity(parseInt(e.target.value))} className="w-full h-1 bg-white/5 appearance-none accent-emerald-500 rounded-full cursor-pointer" />
          </div>

          <button onClick={executeSynthesis} disabled={status !== 'idle' || !lineartImage} className="w-full py-6 bg-white text-black text-[11px] font-black uppercase tracking-[0.8em] rounded-[1rem] hover:bg-emerald-500 hover:text-white transition-all shadow-2xl disabled:opacity-5 disabled:cursor-not-allowed">
            {status === 'rendering' ? '执行渲染中...' : '生成高级色彩布局'}
          </button>
        </section>
      </aside>

      <main className="flex-1 bg-[#020202] p-12 lg:p-20 flex flex-col items-center justify-center relative">
        <nav className="absolute top-12 left-12 right-12 flex justify-between items-center z-10">
          <div className="flex gap-4">
            {(['1K', '2K', '4K'] as ImageSize[]).map(s => (
              <button key={s} onClick={() => setSelectedSize(s)} className={`px-6 py-2 rounded-full text-[9px] font-black transition-all border ${selectedSize === s ? 'bg-white text-black border-white shadow-lg' : 'text-white/20 border-white/5 hover:border-white/20'}`}>{s} RENDER</button>
            ))}
          </div>
          <button 
            type="button"
            onClick={handleEngineManagement} 
            className="px-6 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[9px] font-black hover:bg-emerald-500 hover:text-white transition-all uppercase tracking-widest cursor-pointer z-[100]"
          >
            引擎管理
          </button>
        </nav>

        <div className="w-full h-full max-w-7xl rounded-[4rem] border border-white/[0.03] bg-[#050505] flex items-center justify-center overflow-hidden relative shadow-[0_0_120px_rgba(0,0,0,0.6)] group">
          {status === 'analyzing' && (
            <div className="flex flex-col items-center gap-6 animate-pulse text-emerald-500 text-[10px] font-black uppercase tracking-[1em]">DNA 色彩审计中...</div>
          )}
          
          {status === 'rendering' && (
            <div className="flex flex-col items-center gap-10">
              <div className="w-20 h-20 border-[3px] border-white/5 border-t-emerald-500 rounded-full animate-spin"></div>
              <div className="text-white text-[11px] font-black uppercase tracking-[1em]">零幻觉保真渲染中</div>
            </div>
          )}

          {!resultImage && status === 'idle' && (
            <div className="opacity-[0.02] flex flex-col items-center gap-12 select-none pointer-events-none translate-y-12">
              <div className="text-[20rem] font-black italic tracking-tighter leading-none">CAD</div>
              <div className="text-[14px] tracking-[4em] font-black ml-[4em]">COLOR LAYOUT AI</div>
            </div>
          )}

          {resultImage && status === 'idle' && (
            <div className="w-full h-full flex items-center justify-center animate-reveal bg-white relative">
              <img src={resultImage} className="max-w-full max-h-full object-contain" />
              <div className="absolute inset-0 bg-black/98 opacity-0 group-hover:opacity-100 transition-all duration-700 flex flex-col items-center justify-center gap-10 backdrop-blur-3xl">
                <a href={resultImage} download="COLOR_LAYOUT.png" className="px-24 py-6 bg-white text-black rounded-full text-[14px] font-black uppercase tracking-[1em] hover:bg-emerald-500 hover:text-white transition-all transform scale-95 group-hover:scale-100 duration-1000">导出图纸</a>
                <button onClick={() => setResultImage(null)} className="text-[10px] text-white/20 hover:text-red-500 uppercase tracking-[0.8em] font-black">销毁会话</button>
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
        .animate-reveal { animation: reveal 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 24px; width: 24px; border-radius: 50%;
          background: #fff; border: 6px solid #10b981;
          cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.3); }
      `}</style>
    </div>
  );
};

export default App;
