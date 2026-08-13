import { useState, useEffect } from "react";
import { X, Search, Image as ImageIcon, Video, Filter } from "lucide-react";
import { apiClient } from "../api/client";

interface MediaAsset {
  id: number;
  url: string;
  thumbnail_url: string | null;
  media_type: 'image' | 'video';
  original_name: string;
  alt_text: string | null;
}

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: MediaAsset) => void;
  mode?: 'image' | 'video' | 'all';
  selectedIds?: number[];
}

export function MediaPicker({ open, onClose, onSelect, mode = 'all', selectedIds = [] }: MediaPickerProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedType, setSelectedType] = useState('');

  const fetchAssets = async (p = 1) => {
    try {
      setLoading(true);
      let typeParam = '';
      if (mode !== 'all') { typeParam = `&type=${mode}`; } else if (selectedType) { typeParam = `&type=${selectedType}`; }
      
      const res = await apiClient.get(`/api/admin/media?page=${p}&limit=20&search=${encodeURIComponent(search)}${typeParam}`);
      if (p === 1) {
        setAssets(res.data);
      } else {
        setAssets(prev => [...prev, ...res.data]);
      }
      setTotalPages(res.meta?.total_pages || 1);
      setPage(p);
    } catch (err) {
      // API call failed
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAssets(1);
    }
  }, [open, search, mode, selectedType]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#121212]">
          <h2 className="text-lg font-semibold text-white">Medya Seçin</h2>
          <div className="flex items-center space-x-4">
            <a href="/admin/media" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
              Medya Kütüphanesine Git
            </a>
            <button onClick={onClose} className="text-white/50 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>


        <div className="p-4 border-b border-white/5 flex gap-4 bg-[#1a1a1a]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text" 
              placeholder="Dosya adı, başlık..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-black/20 border border-white/10 rounded pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
          </div>
          {mode === 'all' && (
            <select 
              value={selectedType}
              onChange={e => { setSelectedType(e.target.value); setPage(1); }}
              className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 appearance-none min-w-[120px]"
            >
              <option value="">Tümü</option>
              <option value="image">Görseller</option>
              <option value="video">Videolar</option>
            </select>
          )}
        </div>


        <div className="flex-1 overflow-y-auto p-4 relative" onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          if (target.scrollHeight - target.scrollTop === target.clientHeight) {
            if (!loading && page < totalPages) {
              fetchAssets(page + 1);
            }
          }
        }}>
          {assets.length === 0 && !loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
              <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
              <p>Medya kütüphanesinde uygun dosya bulunamadı.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {assets.map(asset => (
                <div 
                  key={asset.id} 
                  className={`group relative aspect-square bg-[#121212] border rounded overflow-hidden transition-colors ${selectedIds.includes(asset.id) ? "border-green-500 cursor-default" : "border-white/10 cursor-pointer hover:border-white/40"}`}
                  onClick={() => !selectedIds.includes(asset.id) && onSelect(asset)}
                >
                  {asset.media_type === 'image' ? (
                    <img src={asset.thumbnail_url || asset.url} alt={asset.alt_text || 'Asset'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-black/50 flex flex-col items-center justify-center">
                      <Video className="w-8 h-8 text-white/50 mb-2" />
                      <span className="text-[10px] text-white/50 px-2 text-center truncate w-full">{asset.original_name}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    {selectedIds.includes(asset.id) ? <span className="bg-green-500 text-white text-xs px-3 py-1.5 rounded font-medium shadow-xl flex items-center gap-1">Seçildi</span> : <span className="bg-black/80 text-white text-xs px-3 py-1.5 rounded font-medium backdrop-blur-sm border border-white/10 shadow-xl">Seç</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {loading && (
            <div className="w-full py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
