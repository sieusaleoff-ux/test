
import React, { useState, useCallback, useEffect } from 'react';
import { ToolType, GeneratedAsset, ImageSize, AspectRatio } from './types';
import { GeminiService } from './services/geminiService';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.GENERATE);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  
  // Generation state
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<ImageSize>('1K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  
  // Edit/Combine state
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [colorImage, setColorImage] = useState<string | null>(null);

  // Animation state
  const [animateImage, setAnimateImage] = useState<string | null>(null);

  const checkApiKey = async () => {
    try {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        // Fixed: Proceed immediately after calling openSelectKey to avoid race conditions.
        await window.aistudio.openSelectKey();
      }
      return true;
    } catch (e) {
      console.error("API Key selection error", e);
      return false;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addAsset = (url: string, type: 'image' | 'video', assetPrompt: string) => {
    const newAsset: GeneratedAsset = {
      id: Math.random().toString(36).substring(7),
      url,
      type,
      prompt: assetPrompt,
      timestamp: Date.now()
    };
    setAssets(prev => [newAsset, ...prev]);
    setActiveTool(ToolType.HISTORY);
  };

  const runGeneration = async () => {
    if (!prompt) return setError("Please enter a prompt");
    setLoading(true);
    setLoadingMessage("Synthesizing your imagination...");
    setError(null);
    try {
      await checkApiKey();
      const url = await GeminiService.generateImage(prompt, size, aspectRatio);
      addAsset(url, 'image', prompt);
    } catch (err: any) {
      setError(err.message || "Generation failed");
      // Fixed: If the request fails with this message, reset key selection by prompting user again.
      if (err.message.includes("Requested entity was not found")) {
        await window.aistudio.openSelectKey();
      }
    } finally {
      setLoading(false);
    }
  };

  const runEditing = async () => {
    if (!baseImage || !colorImage) return setError("Please upload both images");
    setLoading(true);
    setLoadingMessage("Blending visuals and styles...");
    setError(null);
    try {
      // Fixed: Ensure API key check is performed before editing operations.
      await checkApiKey();
      const url = await GeminiService.editImage(baseImage, colorImage, prompt);
      addAsset(url, 'image', prompt || 'Styled Blend');
    } catch (err: any) {
      setError(err.message || "Editing failed");
      if (err.message.includes("Requested entity was not found")) {
        await window.aistudio.openSelectKey();
      }
    } finally {
      setLoading(false);
    }
  };

  const runAnimation = async () => {
    if (!animateImage) return setError("Please upload an image to animate");
    setLoading(true);
    setLoadingMessage("Breathing life into your pixels (this may take a minute)...");
    setError(null);
    try {
      await checkApiKey();
      const url = await GeminiService.animateImage(animateImage, prompt, aspectRatio);
      addAsset(url, 'video', prompt || 'Cinematic Motion');
    } catch (err: any) {
      setError(err.message || "Animation failed");
      if (err.message.includes("Requested entity was not found")) {
        await window.aistudio.openSelectKey();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-20 md:w-64 glass border-r border-white/10 flex flex-col p-4 z-20">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
            <i className="fas fa-layer-group text-xl"></i>
          </div>
          <h1 className="hidden md:block font-bold text-xl tracking-tight">Lumina</h1>
        </div>

        <nav className="space-y-2 flex-1">
          <NavItem icon="fa-wand-magic-sparkles" label="Create" active={activeTool === ToolType.GENERATE} onClick={() => setActiveTool(ToolType.GENERATE)} />
          <NavItem icon="fa-images" label="Edit & Blend" active={activeTool === ToolType.EDIT} onClick={() => setActiveTool(ToolType.EDIT)} />
          <NavItem icon="fa-video" label="Animate" active={activeTool === ToolType.ANIMATE} onClick={() => setActiveTool(ToolType.ANIMATE)} />
          <div className="pt-4 mt-4 border-t border-white/5">
            <NavItem icon="fa-clock-rotate-left" label="History" active={activeTool === ToolType.HISTORY} onClick={() => setActiveTool(ToolType.HISTORY)} />
          </div>
        </nav>

        <div className="mt-auto px-2 py-4">
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-xs text-white/40 hover:text-white transition-colors">
            Billing Documentation <i className="fas fa-external-link-alt ml-1"></i>
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col overflow-y-auto bg-neutral-950">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-xl font-medium text-blue-400 animate-pulse">{loadingMessage}</p>
          </div>
        )}

        {/* Toolbar Header */}
        <header className="sticky top-0 z-10 p-6 flex justify-between items-center glass border-b border-white/5">
          <h2 className="text-2xl font-bold">
            {activeTool === ToolType.GENERATE && "Image Synthesis"}
            {activeTool === ToolType.EDIT && "Style Transfer & Blending"}
            {activeTool === ToolType.ANIMATE && "Veo Cinematic Motion"}
            {activeTool === ToolType.HISTORY && "Your Creation Gallery"}
          </h2>
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <i className="fas fa-circle-exclamation"></i> {error}
            </div>
          )}
        </header>

        <div className="p-8 max-w-6xl mx-auto w-full">
          {activeTool === ToolType.GENERATE && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-400">Prompt Instructions</label>
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your vision in detail..."
                    className="w-full h-40 bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg transition-all"
                  />
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-3">Resolution (Pro Image)</label>
                    <div className="flex gap-2">
                      {(['1K', '2K', '4K'] as ImageSize[]).map(s => (
                        <button 
                          key={s} 
                          onClick={() => setSize(s)}
                          className={`flex-1 py-3 rounded-lg border transition-all ${size === s ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-3">Aspect Ratio</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['1:1', '3:4', '4:3', '9:16', '16:9'] as AspectRatio[]).map(r => (
                        <button 
                          key={r} 
                          onClick={() => setAspectRatio(r)}
                          className={`py-2 px-3 rounded-lg border text-sm transition-all ${aspectRatio === r ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={runGeneration}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-violet-600 rounded-xl font-bold text-xl hover:shadow-2xl hover:shadow-blue-500/20 transform hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
              >
                <i className="fas fa-bolt"></i> Generate Masterpiece
              </button>
            </div>
          )}

          {activeTool === ToolType.EDIT && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ImageUploader 
                  label="1. Base Subject Image" 
                  image={baseImage} 
                  onUpload={(e) => handleFileUpload(e, setBaseImage)} 
                />
                <ImageUploader 
                  label="2. Style / Color Image" 
                  image={colorImage} 
                  onUpload={(e) => handleFileUpload(e, setColorImage)} 
                />
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-400">Refinement Prompt (Optional)</label>
                <input 
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., 'Enhance the cinematic contrast', 'Keep the subject sharp'..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <button 
                onClick={runEditing}
                className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl font-bold text-xl hover:shadow-2xl hover:shadow-emerald-500/20 transform hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
              >
                <i className="fas fa-layer-group"></i> Blend & Edit
              </button>
            </div>
          )}

          {activeTool === ToolType.ANIMATE && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="max-w-2xl mx-auto">
                <ImageUploader 
                  label="Upload Image to Animate" 
                  image={animateImage} 
                  onUpload={(e) => handleFileUpload(e, setAnimateImage)} 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-400">Motion Description</label>
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe how the scene should move (e.g., 'gentle camera pan', 'dynamic water flow')..."
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-pink-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-400">Format</label>
                  <div className="flex gap-4">
                    <button onClick={() => setAspectRatio('16:9')} className={`flex-1 py-8 rounded-xl border flex flex-col items-center justify-center gap-2 ${aspectRatio === '16:9' ? 'bg-pink-600 border-pink-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                      <i className="fas fa-desktop text-2xl"></i>
                      <span>Landscape (16:9)</span>
                    </button>
                    <button onClick={() => setAspectRatio('9:16')} className={`flex-1 py-8 rounded-xl border flex flex-col items-center justify-center gap-2 ${aspectRatio === '9:16' ? 'bg-pink-600 border-pink-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                      <i className="fas fa-mobile-screen text-2xl"></i>
                      <span>Portrait (9:16)</span>
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={runAnimation}
                className="w-full py-5 bg-gradient-to-r from-pink-600 to-rose-600 rounded-xl font-bold text-xl hover:shadow-2xl hover:shadow-pink-500/20 transform hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
              >
                <i className="fas fa-clapperboard"></i> Animate with Veo
              </button>
            </div>
          )}

          {activeTool === ToolType.HISTORY && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
              {assets.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-500 border-2 border-dashed border-white/5 rounded-3xl">
                  <i className="fas fa-folder-open text-5xl mb-4 opacity-20"></i>
                  <p className="text-xl">Your creative gallery is empty</p>
                </div>
              ) : (
                assets.map(asset => (
                  <div key={asset.id} className="group relative bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all">
                    <div className="aspect-[4/5] relative">
                      {asset.type === 'image' ? (
                        <img src={asset.url} alt={asset.prompt} className="w-full h-full object-cover" />
                      ) : (
                        <video src={asset.url} controls className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end">
                        <p className="text-sm line-clamp-2 mb-4">{asset.prompt}</p>
                        <a 
                          href={asset.url} 
                          download={`lumina-${asset.id}`}
                          className="w-full py-2 bg-white text-black rounded-lg font-bold text-center hover:bg-gray-200"
                        >
                          <i className="fas fa-download mr-2"></i> Download
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-300 ${active ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
  >
    <div className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-transparent'}`}>
      <i className={`fas ${icon} text-lg`}></i>
    </div>
    <span className="hidden md:block font-medium">{label}</span>
  </button>
);

const ImageUploader: React.FC<{ label: string; image: string | null; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, image, onUpload }) => (
  <div className="space-y-3">
    <label className="block text-sm font-medium text-gray-400">{label}</label>
    <div className="relative group aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all">
      {image ? (
        <>
          <img src={image} className="w-full h-full object-contain" alt="Preview" />
          <button className="absolute top-4 right-4 bg-black/50 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <i className="fas fa-sync-alt"></i>
          </button>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 cursor-pointer">
          <i className="fas fa-cloud-arrow-up text-4xl mb-4 group-hover:scale-110 transition-transform"></i>
          <span className="text-sm">Click to upload or drag & drop</span>
        </div>
      )}
      <input 
        type="file" 
        accept="image/*" 
        onChange={onUpload} 
        className="absolute inset-0 opacity-0 cursor-pointer" 
      />
    </div>
  </div>
);

export default App;
