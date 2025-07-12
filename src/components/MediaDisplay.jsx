import { useState, useEffect } from 'react';
import { formatFileSize } from '../utils/mediaUtils';

export default function MediaDisplay({ mediaFile, chatId }) {
  const [mediaUrl, setMediaUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadMedia = async () => {
      try {
        setLoading(true);
        setError(false);
        
        const url = await window.chatAPI.getMediaPath({
          chatId,
          fileName: mediaFile.fileName
        });
        
        if (url) {
          setMediaUrl(url);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error loading media:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (mediaFile && chatId) {
      loadMedia();
    }
  }, [mediaFile, chatId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <div className="animate-pulse text-sm text-gray-500">Loading media...</div>
      </div>
    );
  }

  if (error || !mediaUrl) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <span className="text-red-500">❌</span>
        <div className="text-sm text-red-700 dark:text-red-300">
          Failed to load media file: {mediaFile.originalName}
        </div>
      </div>
    );
  }

  const fileInfo = (
    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      📁 {mediaFile.originalName} ({formatFileSize(mediaFile.size)})
    </div>
  );

  if (mediaFile.fileType === 'image') {
    return (
      <div className="max-w-md">
        <img
          src={mediaUrl}
          alt={mediaFile.originalName}
          className="max-w-full h-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-600"
          style={{ maxHeight: '400px' }}
          onError={() => setError(true)}
        />
        {fileInfo}
      </div>
    );
  }

  if (mediaFile.fileType === 'video') {
    return (
      <div className="max-w-lg">
        <video
          src={mediaUrl}
          controls
          className="max-w-full h-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-600"
          style={{ maxHeight: '400px' }}
          onError={() => setError(true)}
        >
          Your browser does not support the video tag.
        </video>
        {fileInfo}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
      <span>📄</span>
      <div className="text-sm">
        <div className="font-medium">{mediaFile.originalName}</div>
        <div className="text-gray-500 dark:text-gray-400 text-xs">
          {mediaFile.fileType} • {formatFileSize(mediaFile.size)}
        </div>
      </div>
    </div>
  );
}
