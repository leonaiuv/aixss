/**
 * API Key 加密/解密服务
 * 使用 crypto-js AES 加密
 */
import CryptoJS from 'crypto-js';

// 加密密钥（生产环境应使用环境变量）
const ENCRYPTION_KEY = 'aixss-manga-creator-2024';

/**
 * 加密字符串
 */
export function encrypt(text: string): string {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

/**
 * 解密字符串
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    console.error('解密失败');
    return '';
  }
}

/**
 * 安全存储 API Key
 */
export function secureStore(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  const encrypted = encrypt(value);
  localStorage.setItem(key, encrypted);
}

/**
 * 安全读取 API Key
 */
export function secureRetrieve(key: string): string {
  if (typeof window === 'undefined') return '';
  const encrypted = localStorage.getItem(key);
  if (!encrypted) return '';
  return decrypt(encrypted);
}
