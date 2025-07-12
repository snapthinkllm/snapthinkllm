/**
 * Utility functions for handling media files (images and videos)
 */

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];

export const isImageFile = (file) => {
  return SUPPORTED_IMAGE_TYPES.includes(file.type);
};

export const isVideoFile = (file) => {
  return SUPPORTED_VIDEO_TYPES.includes(file.type);
};

export const isMediaFile = (file) => {
  return isImageFile(file) || isVideoFile(file);
};

export const getMediaType = (file) => {
  if (isImageFile(file)) return 'image';
  if (isVideoFile(file)) return 'video';
  return null;
};

export const validateFileSize = (file, maxSizeMB = 50) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove the data:mime/type;base64, prefix
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
