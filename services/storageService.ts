import * as FileSystem from 'expo-file-system/legacy';

const CLOUD_NAME = 'dffc6u8z0';
const UPLOAD_PRESET = 'casa-da-crianca';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/** Faz upload de uma imagem local para o Cloudinary e retorna a URL pública. */
export async function uploadFoto(localUri: string): Promise<string> {
  const resultado = await FileSystem.uploadAsync(UPLOAD_URL, localUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    parameters: { upload_preset: UPLOAD_PRESET },
  });

  if (resultado.status !== 200 && resultado.status !== 201) {
    throw new Error(`Cloudinary ${resultado.status}: ${resultado.body}`);
  }

  const json = JSON.parse(resultado.body);
  if (!json.secure_url) throw new Error('Resposta inesperada do Cloudinary');
  return json.secure_url as string;
}
