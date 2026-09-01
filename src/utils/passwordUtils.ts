/**
 * Secure Local Password Hashing Utility using Web Crypto API SHA-256
 * Ensures passwords are never stored in plain text.
 */

// Simple SHA-256 helper using Web Crypto API
export async function hashPassword(password: string, salt: string = 'nnepef_salt_2026'): Promise<string> {
  if (!password) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${salt}:${password}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `sha256$${salt}$${hashHex}`;
  } catch (err) {
    // Fallback pseudo-hash if crypto.subtle is restricted
    let hash = 0;
    const str = `${salt}:${password}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `local$${salt}$${Math.abs(hash).toString(16)}`;
  }
}

/**
 * Verify if plain text password matches stored hashed password
 */
export async function verifyPassword(password: string, storedHash?: string): Promise<boolean> {
  if (!storedHash) return false;
  if (!storedHash.includes('$')) {
    // Legacy plain text check migration support
    return password === storedHash;
  }
  const parts = storedHash.split('$');
  if (parts.length < 3) return false;
  const salt = parts[1];
  const computedHash = await hashPassword(password, salt);
  return computedHash === storedHash;
}

/**
 * Generate a random reset token or temporary OTP
 */
export function generateResetToken(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
