
import React, { useState } from 'react';
import { useStore } from '../store';
import { WebResource } from '../types';
import { Globe, Plus, Trash2, ExternalLink, Layout, X, PlayCircle, AlertTriangle, Loader2 } from 'lucide-react';

export const ResourceLibrary: React.FC = () => {
  const { resources, addResource, deleteResource, user } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [viewingResource, setViewingResource] = useState<WebResource | null>(null);
  const [isSaving, setIsSaving] = useState(false); // Loading state for save

  // Form State
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'LINK' | 'EMBED'>('LINK');
  const [description, setDescription] = useState('');

  const handleAdd = async () => {
    if (!title || !url) return;
    setIsSaving(true);
    
    // Simple URL validation
    let validUrl = url.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
        validUrl = `https://${validUrl}`;
    }

    const newRes: WebResource = {
        id: `res_${Date.now()}`,
        title: title.trim(),
        url: validUrl,
        type,
        description: description.trim(),
        addedBy: user?.id || 'unknown',
        createdAt: new Date().toISOString()
    };

    const success = await addResource(newRes);
    setIsSaving(false);

    if (success) {
        setIsAdding(false);
        resetForm();
    } else {
        alert("Lỗi khi lưu tài liệu. Vui lòng đảm bảo bảng 'resources' đã được tạo trong Database.");
    }
  };

  const resetForm = () => {
      setTitle('');
      setUrl('');
      setType('LINK');
      setDescription('');
  };

  const handleDelete = async (id: string) => {
      if (confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) {
          const success = await deleteResource(id);
          if (!success) {
              alert("Lỗi khi xóa tài liệu.");
          }
      }
  };

  const canManage = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Globe className="text-indigo-600" /> Kho Tài Liệu & Web
            </h1>
            <p className="text-gray-500 mt-1">Lưu trữ các trang web hữu ích, bài giảng hoặc công cụ mô phỏng.</p>
        </div>
        {canManage && (
            <button 
                onClick={() => setIsAdding(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-indigo-700 shadow-sm"
            >
                <Plus className="h-4 w-4" /> Thêm mới
            </button>
        )}
      </div>

      {/* Add Modal */}
      {isAdding && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="font-bold text-lg text-gray-900">Thêm trang web / tài liệu</h3>
                      <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Tiêu đề <span className="text-red-500">*</span></label>
                          <input className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500" value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: PhET Mô phỏng vật lý" />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Đường dẫn (URL) <span className="text-red-500">*</span></label>
                          <input className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <label className={`cursor-pointer border p-3 rounded-lg flex flex-col items-center gap-2 text-sm transition-colors ${type === 'LINK' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white hover:bg-gray-50'}`}>
                              <input type="radio" name="type" className="hidden" checked={type === 'LINK'} onChange={() => setType('LINK')} />
                              <ExternalLink className="h-5 w-5" />
                              Mở tab mới (Link)
                              <span className="text-[10px] text-center text-gray-500 font-normal">Dùng cho web chặn nhúng (Google, FB...)</span>
                          </label>
                          <label className={`cursor-pointer border p-3 rounded-lg flex flex-col items-center gap-2 text-sm transition-colors ${type === 'EMBED' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white hover:bg-gray-50'}`}>
                              <input type="radio" name="type" className="hidden" checked={type === 'EMBED'} onChange={() => setType('EMBED')} />
                              <Layout className="h-5 w-5" />
                              Nhúng vào App (Embed)
                              <span className="text-[10px] text-center text-gray-500 font-normal">Dùng cho web cho phép iframe (Wiki, PhET...)</span>
                          </label>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả ngắn</label>
                          <textarea className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả nội dung..." />
                      </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-2">
                      <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Hủy</button>
                      <button 
                        onClick={handleAdd} 
                        disabled={isSaving || !title || !url}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Lưu lại
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* View Resource Modal (Embed) */}
      {viewingResource && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full h-full md:w-[95%] md:h-[90%] rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
                  <div className="bg-gray-100 p-3 flex justify-between items-center border-b">
                      <div className="flex items-center gap-2 overflow-hidden">
                          <h3 className="font-bold text-gray-800 truncate">{viewingResource.title}</h3>
                          <a href={viewingResource.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" /> Mở gốc
                          </a>
                      </div>
                      <button onClick={() => setViewingResource(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
                          <X className="h-6 w-6" />
                      </button>
                  </div>
                  <div className="flex-1 bg-gray-50 relative">
                      <iframe 
                          src={viewingResource.url} 
                          className="w-full h-full border-none"
                          title={viewingResource.title}
                          allowFullScreen
                          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                      />
                      {/* Warning Overlay if it might fail */}
                      <div className="absolute top-0 left-0 w-full p-2 bg-yellow-50 text-yellow-800 text-xs text-center border-b border-yellow-200 opacity-80 hover:opacity-100 transition-opacity">
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          Nếu trang web không hiển thị (màn hình trắng/xám), hãy nhấn "Mở gốc" ở trên. Một số trang web chặn hiển thị trong ứng dụng khác.
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.length === 0 && (
              <div className="col-span-full text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed">
                  <Globe className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Chưa có tài liệu nào.</p>
                  {canManage && <p className="text-sm">Hãy thêm trang web đầu tiên cho lớp học!</p>}
              </div>
          )}

          {resources.map(res => (
              <div key={res.id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-all group flex flex-col">
                  <div className="p-5 flex-1">
                      <div className="flex justify-between items-start mb-2">
                          <div className={`p-2 rounded-lg ${res.type === 'EMBED' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
                              {res.type === 'EMBED' ? <Layout className="h-6 w-6" /> : <ExternalLink className="h-6 w-6" />}
                          </div>
                          {canManage && (
                              <button onClick={() => handleDelete(res.id)} className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors">
                                  <Trash2 className="h-4 w-4" />
                              </button>
                          )}
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-2">{res.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-3 mb-3">{res.description || 'Không có mô tả.'}</p>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-auto">
                          <span>Thêm bởi: {res.addedBy === user?.id ? 'Bạn' : 'Giáo viên'}</span>
                          <span>• {new Date(res.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                  </div>
                  <div className="p-3 border-t bg-gray-50 rounded-b-xl">
                      {res.type === 'EMBED' ? (
                          <button 
                            onClick={() => setViewingResource(res)}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors"
                          >
                              <PlayCircle className="h-4 w-4" /> Xem ngay
                          </button>
                      ) : (
                          <a 
                            href={res.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-bold text-sm hover:bg-gray-100 transition-colors"
                          >
                              <ExternalLink className="h-4 w-4" /> Mở trang web
                          </a>
                      )}
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};
