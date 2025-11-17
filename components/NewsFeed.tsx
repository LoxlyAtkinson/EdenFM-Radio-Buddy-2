import React, { useState, useEffect, useCallback } from 'react';
import { NewsItem } from '../types';
import { fetchData, createRow, updateRow, deleteRow, uploadFile } from '../services/googleSheetService';
import AnnouncementCard from './AnnouncementCard';
import { PlusIcon, LoadingIcon, CloseIcon } from './icons';

// Helper to convert file to Base64
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });


const NewsFeed: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<NewsItem> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  
  const sheetName = 'Announcements';

  const loadNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchData<NewsItem>(sheetName);
      setNews(result.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime()));
    } catch (err) {
      setError('Failed to load news. Please check sheet configuration.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const handleAdd = () => {
    setCurrentItem({
      Date: new Date().toISOString().split('T')[0],
      Title: '',
      Content: '',
      Category: 'General',
      MediaURL: '',
    });
    setFileToUpload(null);
    setModalError(null);
    setIsModalOpen(true);
  };
  
  const handleEdit = (item: NewsItem) => {
    setCurrentItem(item);
    setFileToUpload(null);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (rowIndex: number) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
        console.log(`Attempting to delete row ${rowIndex} from sheet: ${sheetName}`);
        try {
            await deleteRow(sheetName, rowIndex);
            console.log(`Successfully deleted row ${rowIndex} from sheet: ${sheetName}`);
            await loadNews();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error(`Failed to delete row ${rowIndex} from sheet: ${sheetName}`, err);
            alert(`Failed to delete announcement. Reason: ${errorMessage}`);
        }
    }
  };

  const handleSave = async () => {
    if (!currentItem) return;
    setIsSaving(true);
    setModalError(null);

    try {
        let finalItem = { ...currentItem };
        
        // If there's a file to upload, handle it first
        if (fileToUpload) {
            const base64Data = await fileToBase64(fileToUpload);
            const uploadResult = await uploadFile(fileToUpload.name, fileToUpload.type, base64Data);
            finalItem.MediaURL = uploadResult.url;
        }

        if ('rowIndex' in finalItem && finalItem.rowIndex) {
            console.log(`Attempting to update row in sheet: ${sheetName}`, { payload: finalItem });
            await updateRow(sheetName, finalItem as NewsItem);
            console.log(`Successfully updated row in sheet: ${sheetName}`);
        } else {
            console.log(`Attempting to create row in sheet: ${sheetName}`, { payload: finalItem });
            await createRow(sheetName, finalItem);
            console.log(`Successfully created row in sheet: ${sheetName}`);
        }
        
        setIsModalOpen(false);
        setCurrentItem(null);
        setFileToUpload(null);
        await loadNews();
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Failed to save data to sheet: ${sheetName}`, { error: err, payload: currentItem });
        setModalError(`Failed to save announcement. Reason: ${errorMessage}`);
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCurrentItem(prev => prev ? ({ ...prev, [e.target.name]: e.target.value }) : null);
  };
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
        setFileToUpload(files[0]);
        // Also clear the existing MediaURL if a new file is chosen for an existing item
        setCurrentItem(prev => prev ? ({ ...prev, MediaURL: '' }) : null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  };

  if (loading) return <div className="p-8 text-center">Loading news...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Manage News & Announcements</h1>
        <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200">
          <PlusIcon /> Add Announcement
        </button>
      </div>

      <div className="space-y-6">
        {news.length > 0 ? news.map((item) => (
          <AnnouncementCard key={item.rowIndex} announcement={item} onEdit={handleEdit} onDelete={handleDelete} />
        )) : (
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 text-center">
                <p className="text-gray-500">No news items found. Click 'Add Announcement' to create one.</p>
            </div>
        )}
      </div>
      
      {isModalOpen && currentItem && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl relative">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800" disabled={isSaving}><CloseIcon /></button>
                <h2 className="text-xl font-bold mb-6 text-gray-900">{currentItem.rowIndex ? 'Edit' : 'Add'} Announcement</h2>
                
                {modalError && (
                  <div className="my-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm" role="alert">
                    {modalError}
                  </div>
                )}

                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div>
                        <label htmlFor="Title" className="block text-sm font-medium text-gray-600">Title</label>
                        <input type="text" name="Title" value={currentItem.Title || ''} onChange={handleModalInputChange} className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900" />
                    </div>
                     <div>
                        <label htmlFor="Category" className="block text-sm font-medium text-gray-600">Category</label>
                        <input type="text" name="Category" value={currentItem.Category || ''} onChange={handleModalInputChange} className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900" />
                    </div>
                     <div>
                        <label htmlFor="Date" className="block text-sm font-medium text-gray-600">Date</label>
                        <input type="date" name="Date" value={currentItem.Date || ''} onChange={handleModalInputChange} className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900" />
                    </div>
                    <div>
                        <label htmlFor="Content" className="block text-sm font-medium text-gray-600">Content</label>
                        <textarea name="Content" value={currentItem.Content || ''} onChange={handleModalInputChange} rows={5} className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600">Media File (Optional)</label>
                        {fileToUpload ? (
                             <div className="mt-2 flex items-center justify-between p-3 bg-gray-100 border border-gray-300 rounded-md">
                                <span className="text-sm font-medium text-gray-800">{fileToUpload.name}</span>
                                <button onClick={() => setFileToUpload(null)} className="text-sm text-red-600 hover:underline">Remove</button>
                            </div>
                        ) : currentItem.MediaURL ? (
                            <div className="mt-2 flex items-center justify-between p-3 bg-gray-100 border border-gray-300 rounded-md">
                                <a href={currentItem.MediaURL} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate">{currentItem.MediaURL}</a>
                                <button onClick={() => setCurrentItem(prev => prev ? ({ ...prev, MediaURL: '' }) : null)} className="text-sm text-red-600 hover:underline ml-4">Remove</button>
                            </div>
                        ) : (
                            <div 
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('file-upload-input')?.click()}
                                className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-blue-500"
                            >
                                <div className="space-y-1 text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">Any image, audio, or document file</p>
                                    <input id="file-upload-input" type="file" className="sr-only" onChange={(e) => handleFileSelect(e.target.files)} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50" disabled={isSaving}>Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 w-40 flex items-center justify-center disabled:bg-blue-400" disabled={isSaving}>
                        {isSaving ? <LoadingIcon /> : 'Save Announcement'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default NewsFeed;
