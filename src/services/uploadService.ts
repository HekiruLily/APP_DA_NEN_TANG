const CLOUD_NAME = 'abubl1yi';
const UPLOAD_PRESET = 'ChatApp';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export interface UploadResult {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
}

/**
 * Tải ảnh lên Cloudinary bằng Unsigned Upload Preset
 * KHÔNG sử dụng API Secret
 */
export const uploadImageToCloudinary = async (
  fileUri: string,
  fileName?: string,
  fileType?: string
): Promise<UploadResult> => {
  if (!fileUri) {
    throw new Error('URI ảnh không hợp lệ.');
  }

  const cleanFileName = fileName || `photo_${Date.now()}.jpg`;
  const cleanFileType = fileType || 'image/jpeg';

  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: cleanFileType,
    name: cleanFileName,
  } as any);

  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_URL, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
    },
  });

  const responseJson = await response.json();

  if (!response.ok || responseJson.error) {
    const errorMsg =
      responseJson.error?.message || `Lỗi tải ảnh lên Cloudinary (HTTP ${response.status})`;
    throw new Error(errorMsg);
  }

  const secureUrl = responseJson.secure_url || responseJson.url;
  if (!secureUrl) {
    throw new Error('Không nhận được đường dẫn ảnh từ Cloudinary.');
  }

  return {
    url: secureUrl,
    publicId: responseJson.public_id,
    width: responseJson.width,
    height: responseJson.height,
  };
};

