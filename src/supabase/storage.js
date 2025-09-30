import { supabase } from './config';

/**
 * Tải file lên Supabase Storage
 * @param {File} file - File cần tải lên
 * @param {string} folder - Thư mục đích (mặc định: 'files')
 * @param {string} userId - ID của người dùng
 * @returns {Promise<Object>} Thông tin file đã tải lên
 */
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
    throw error;
  }
};

/**
 * Tải ảnh lên với nén
 * @param {File} file - File ảnh cần tải lên
 * @param {string} userId - ID của người dùng
 * @param {number} maxWidth - Chiều rộng tối đa (mặc định: 1920)
 * @param {number} quality - Chất lượng nén (mặc định: 0.8)
 * @returns {Promise<Object>} Thông tin ảnh đã tải lên
 */
export const uploadImage = async (file, userId, maxWidth = 1920, quality = 0.8) => {
  try {
    if (!file.type.startsWith('image/')) {
      throw new Error('File không phải là hình ảnh');
    }

    const compressedFile = await compressImage(file, maxWidth, quality);
    return await uploadFile(compressedFile, 'images', userId);
  } catch (error) {
    throw error;
  }
};

/**
 * Nén ảnh trước khi tải lên
 * @param {File} file - File ảnh cần nén
 * @param {number} maxWidth - Chiều rộng tối đa
 * @param {number} quality - Chất lượng nén
 * @returns {Promise<File>} File ảnh đã nén
 */
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

/**
 * Tải bản ghi âm giọng nói
 * @param {Blob} audioBlob - Blob âm thanh
 * @param {string} userId - ID của người dùng
 * @param {number} duration - Thời lượng âm thanh
 * @returns {Promise<Object>} Thông tin bản ghi âm đã tải lên
 */
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
    throw error;
  }
};

/**
 * Chụp và tải ảnh từ camera
 * @param {string} userId - ID của người dùng
 * @returns {Promise<Object>} Thông tin ảnh đã tải lên
 */
export const captureAndUploadPhoto = async (userId) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' }
    });

    return new Promise((resolve, reject) => {
      // Create camera preview modal
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); display: flex; justify-content: center; 
        align-items: center; z-index: 9999;
      `;

      const container = document.createElement('div');
      container.style.cssText = `
        background: white; padding: 20px; border-radius: 10px; 
        text-align: center; max-width: 400px;
      `;

      const video = document.createElement('video');
      video.style.cssText = 'width: 100%; max-width: 300px; border-radius: 8px;';
      video.srcObject = stream;
      video.play();

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'margin-top: 15px; display: flex; gap: 10px; justify-content: center;';

      const captureBtn = document.createElement('button');
      captureBtn.textContent = 'Chụp ảnh';
      captureBtn.style.cssText = `
        background: #0066cc; color: white; border: none; padding: 10px 20px; 
        border-radius: 5px; cursor: pointer;
      `;

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Hủy';
      cancelBtn.style.cssText = `
        background: #666; color: white; border: none; padding: 10px 20px; 
        border-radius: 5px; cursor: pointer;
      `;

      const cleanup = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
      };

      captureBtn.onclick = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
          cleanup();
          try {
            const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const result = await uploadImage(file, userId);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, 'image/jpeg', 0.8);
      };

      cancelBtn.onclick = () => {
        cleanup();
        reject(new Error('Người dùng hủy chụp ảnh'));
      };

      buttonContainer.appendChild(captureBtn);
      buttonContainer.appendChild(cancelBtn);
      container.appendChild(video);
      container.appendChild(buttonContainer);
      modal.appendChild(container);
      document.body.appendChild(modal);
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Lấy vị trí người dùng và tạo dữ liệu vị trí
 * @param {string} userId - ID của người dùng
 * @returns {Promise<Object>} Dữ liệu vị trí
 */
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
    throw error;
  }
};

/**
 * Đảo ngược mã hóa địa lý để lấy địa chỉ từ tọa độ
 * @param {number} lat - Vĩ độ
 * @param {number} lng - Kinh độ
 * @returns {Promise<string>} Địa chỉ
 */
const reverseGeocode = async (lat, lng) => {
  try {
    // Using OpenStreetMap Nominatim API (free alternative to Google Maps)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
};

/**
 * Xóa file khỏi bộ lưu trữ
 * @param {string} filePath - Đường dẫn file
 * @returns {Promise<boolean>} Kết quả xóa
 */
export const deleteFile = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from('chat-files')
      .remove([filePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Lấy danh mục loại file
 * @param {string} fileType - Loại file (MIME type)
 * @returns {string} Danh mục file
 */
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

/**
 * Định dạng kích thước file
 * @param {number} bytes - Kích thước file tính bằng byte
 * @returns {string} Kích thước đã định dạng
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
