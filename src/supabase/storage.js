import { supabase } from './config';

// Upload file to Supabase Storage
export const uploadFile = async (file, folder = 'files', userId) => {
  try {
    if (!supabase) {
      throw new Error('Supabase chưa được cấu hình. Vui lòng kiểm tra file .env và đảm bảo có REACT_APP_SUPABASE_URL và REACT_APP_SUPABASE_ANON_KEY');
    }

    if (!file) {
      throw new Error('Không có file để upload');
    }

    if (!userId) {
      throw new Error('UserId không hợp lệ');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File quá lớn. Kích thước tối đa là 10MB');
    }

    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `${folder}/${userId}/${fileName}`;

    const { error } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Lỗi khi tải file lên: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
      path: filePath,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Upload image with compression
export const uploadImage = async (file, userId, maxWidth = 1920, quality = 0.8) => {
  try {
    if (!file.type.startsWith('image/')) {
      throw new Error('File không phải là hình ảnh');
    }

    const compressedFile = await compressImage(file, maxWidth, quality);
    return await uploadFile(compressedFile, 'images', userId);
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Compress image before upload
const compressImage = (file, maxWidth = 1920, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: file.type }));
          } else {
            reject(new Error('Không thể nén ảnh'));
          }
        }, file.type, quality);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Không thể tải ảnh'));
    img.src = URL.createObjectURL(file);
  });
};

// Upload voice recording
export const uploadVoiceRecording = async (audioBlob, userId, duration) => {
  try {
    const timestamp = Date.now();
    const fileName = `voice_${timestamp}.webm`;
    const file = new File([audioBlob], fileName, { type: 'audio/webm' });

    const result = await uploadFile(file, 'voice', userId);
    return {
      ...result,
      duration: duration,
      type: 'voice'
    };
  } catch (error) {
    console.error('Error uploading voice recording:', error);
    throw error;
  }
};

// Capture and upload camera photo
export const captureAndUploadPhoto = async (userId) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' }
    });

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.srcObject = stream;
      video.play();

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Capture frame after 1 second
        setTimeout(() => {
          ctx.drawImage(video, 0, 0);

          canvas.toBlob(async (blob) => {
            stream.getTracks().forEach(track => track.stop());

            try {
              const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
              const result = await uploadImage(file, userId);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }, 'image/jpeg', 0.8);
        }, 1000);
      };
    });
  } catch (error) {
    console.error('Error capturing photo:', error);
    throw error;
  }
};

// Get user location and create location data
export const shareLocation = async (userId) => {
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      });
    });

    const { latitude, longitude } = position.coords;

    // Get address from coordinates (using reverse geocoding)
    const address = await reverseGeocode(latitude, longitude);

    return {
      type: 'location',
      latitude,
      longitude,
      address,
      accuracy: position.coords.accuracy,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error sharing location:', error);
    throw error;
  }
};

// Reverse geocoding to get address from coordinates
const reverseGeocode = async (lat, lng) => {
  try {
    // Using OpenStreetMap Nominatim API (free alternative to Google Maps)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
};

// Delete file from storage
export const deleteFile = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from('chat-files')
      .remove([filePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// Get file type category
export const getFileCategory = (fileType) => {
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('audio/')) return 'audio';
  if (fileType.includes('pdf')) return 'pdf';
  if (fileType.includes('word') || fileType.includes('document')) return 'document';
  if (fileType.includes('sheet') || fileType.includes('excel')) return 'spreadsheet';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'presentation';
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return 'archive';
  return 'file';
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
