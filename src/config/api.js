export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL;

if (!API_BASE_URL || !IMAGE_BASE_URL) {
  throw new Error(
    'Faltan variables de entorno VITE_API_BASE_URL / VITE_IMAGE_BASE_URL. Revisa tu archivo .env (ver .env.example).'
  );
}
