import { useState, useEffect, useRef, ChangeEvent } from "react";
import { apiClient } from "../api/client";
import { Upload, X, Trash2, Edit2, Loader2, Image as ImageIcon, Video, CheckCircle2, AlertCircle } from "lucide-react";

export interface MediaAsset {
  id: number;
  uuid: string;
  original_name: string;
  url: string;
  thumbnail_url: string | null;
  mime_type: string;
  extension: string;
  file_size: number;
  width: number;
  height: number;
  media_type: 'image' | 'video';
  title: string | null;
  alt_text: string | null;
  caption: string | null;
  status: string;
  created_at: string;
  uploaded_by_username?: string;
  usage_count?: number;
}

export function MediaPage() {
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editTitle, setEditTitle] = useState("");
  const [editAlt, setEditAlt] = useState("");
  const [editCaption, setEditCaption] = useState("");

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/admin/media');
      setMedia(res.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Medya yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleUploadClick = () => {
    setUploadModalOpen(true);
    setUploadError(null);
    setUploadSuccess(false);
  };

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // For phase 5b, upload sequentially or all at once. We'll do sequential for multiple files.
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        await apiClient.post('/api/admin/media', formData);
      }
      setUploadSuccess(true);
      fetchMedia();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setTimeout(() => setUploadModalOpen(false), 1500);
    } catch (err: any) {
      setUploadError(err.message || 'Yükleme başarısız oldu.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditClick = async (asset: MediaAsset) => {
    try {
      const fullAsset = await apiClient.get(`/api/admin/media/${asset.id}`);
      setSelectedAsset(fullAsset);
      setEditTitle(fullAsset.title || "");
      setEditAlt(fullAsset.alt_text || "");
      setEditCaption(fullAsset.caption || "");
      setEditModalOpen(true);
    } catch (err) {
      alert("Medya detayları alınamadı.");
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedAsset) return;
    try {
      await apiClient.patch(`/api/admin/media/${selectedAsset.id}`, {
        title: editTitle,
        alt_text: editAlt,
        caption: editCaption
      });
      setEditModalOpen(false);
      fetchMedia();
    } catch (err: any) {
      alert(err.message || "Güncelleme başarısız.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bu medyayı silmek istediğinize emin misiniz?")) return;
    try {
      await apiClient.delete(`/api/admin/media/${id}`);
      fetchMedia();
      setEditModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Silme başarısız.");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Medya Kütüphanesi</h2>
        <button 
          onClick={handleUploadClick}
          className="bg-white text-black px-4 py-2 rounded text-sm font-medium hover:bg-white/90 transition flex items-center space-x-2"
        >
          <Upload className="w-4 h-4" />
          <span>Yeni Medya</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-white/30" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {media.length === 0 && (
            <div className="col-span-full py-12 text-center text-white/40">
              Henüz medya yüklenmemiş.
            </div>
          )}
          
          {media.map(asset => (
            <div 
              key={asset.id} 
              className="bg-[#121212] border border-white/10 rounded-lg overflow-hidden group cursor-pointer hover:border-white/30 transition flex flex-col"
              onClick={() => handleEditClick(asset)}
            >
              <div className="aspect-square bg-[#0a0a0a] relative overflow-hidden flex items-center justify-center">
                {asset.media_type === 'image' ? (
                  <img 
                    src={asset.thumbnail_url || asset.url} 
                    alt={asset.alt_text || asset.original_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center text-white/30">
                    <Video className="w-10 h-10 mb-2" />
                    <span className="text-xs">{asset.extension.toUpperCase()}</span>
                  </div>
                )}
                
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider text-white">
                  {asset.extension}
                </div>
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-medium truncate mb-1" title={asset.title || asset.original_name}>
                    {asset.title || asset.original_name}
                  </div>
                  {asset.media_type === 'image' && !asset.alt_text && (
                    <div className="text-[10px] text-amber-500 flex items-center mb-1">
                      <AlertCircle className="w-3 h-3 mr-1" /> Alt metin eksik
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-white/40 flex justify-between mt-2">
                  <span>{formatSize(asset.file_size)}</span>
                  {asset.width && asset.height && (
                    <span>{asset.width}x{asset.height}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-md overflow-hidden relative">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Yeni Medya Yükle</h3>
                <button onClick={() => setUploadModalOpen(false)} className="text-white/50 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div 
                className={`border-2 border-dashed ${uploading ? 'border-white/10' : 'border-white/20 hover:border-white/40'} rounded-lg p-8 flex flex-col items-center justify-center text-center transition bg-white/5 relative`}
              >
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-10 h-10 animate-spin text-white/50 mb-4" />
                    <span className="text-sm">Yükleniyor...</span>
                  </div>
                ) : uploadSuccess ? (
                  <div className="flex flex-col items-center text-green-500">
                    <CheckCircle2 className="w-10 h-10 mb-4" />
                    <span className="text-sm">Tamamlandı</span>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-10 h-10 text-white/30 mb-4" />
                    <p className="text-sm text-white/70 mb-2">Görsel veya video seçin</p>
                    <p className="text-xs text-white/40">JPEG, PNG, WEBP, MP4 (Max 15MB/100MB)</p>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={onFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      multiple
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                    />
                  </>
                )}
              </div>

              {uploadError && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-sm text-center">
                  {uploadError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-3xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            
            <div className="md:w-1/2 bg-black/50 p-6 flex items-center justify-center border-r border-white/5 overflow-hidden">
              {selectedAsset.media_type === 'image' ? (
                <img 
                  src={selectedAsset.url} 
                  alt="Preview" 
                  className="max-w-full max-h-[60vh] object-contain rounded"
                />
              ) : (
                <video 
                  src={selectedAsset.url} 
                  controls 
                  className="max-w-full max-h-[60vh] rounded"
                />
              )}
            </div>

            <div className="md:w-1/2 p-6 flex flex-col h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Medya Detayı</h3>
                <button onClick={() => setEditModalOpen(false)} className="text-white/50 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Başlık</label>
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#121212] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                    placeholder="Başlık girin..."
                  />
                </div>
                
                {selectedAsset.media_type === 'image' && (
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1">
                      Alt Metin <span className="text-white/30">(Erişilebilirlik ve SEO)</span>
                    </label>
                    <input 
                      type="text" 
                      value={editAlt}
                      onChange={(e) => setEditAlt(e.target.value)}
                      className="w-full bg-[#121212] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                      placeholder="Görseli betimleyin..."
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Açıklama (Caption)</label>
                  <textarea 
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    rows={3}
                    className="w-full bg-[#121212] border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 resize-none"
                    placeholder="Opsiyonel açıklama..."
                  />
                </div>

                <div className="pt-4 border-t border-white/10 mt-4 space-y-2 text-xs text-white/50">
                  <div className="flex justify-between">
                    <span>Dosya:</span>
                    <span className="text-white truncate ml-4" title={selectedAsset.original_name}>{selectedAsset.original_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Boyut / Çözünürlük:</span>
                    <span className="text-white">{formatSize(selectedAsset.file_size)} {selectedAsset.width ? `• ${selectedAsset.width}x${selectedAsset.height}` : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tarih:</span>
                    <span className="text-white">{new Date(selectedAsset.created_at).toLocaleString('tr-TR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Yükleyen:</span>
                    <span className="text-white">{selectedAsset.uploaded_by_username || 'Sistem'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kullanıldığı yerler:</span>
                    <span className={selectedAsset.usage_count && selectedAsset.usage_count > 0 ? "text-amber-400" : "text-white"}>
                      {selectedAsset.usage_count && selectedAsset.usage_count > 0 ? `${selectedAsset.usage_count} kez` : 'Henüz kullanılmıyor'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <button 
                  onClick={() => handleDelete(selectedAsset.id)}
                  className="text-red-400 hover:bg-red-400/10 px-3 py-1.5 rounded text-sm transition flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Sil</span>
                </button>
                
                <div className="space-x-2 flex">
                  <button 
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 border border-white/20 rounded text-sm hover:bg-white/5 transition"
                  >
                    İptal
                  </button>
                  <button 
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-white text-black rounded text-sm hover:bg-white/90 transition font-medium"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
