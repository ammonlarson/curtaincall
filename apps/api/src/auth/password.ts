import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

/**
 * Hash a password using scrypt.
 * Format: hex(salt):hex(hash)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);

  const hash = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SCRYPT_PARAMS, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });

  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * Verify a password against a stored hash using timing-safe comparison.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;

  const [saltHex, hashHex] = parts as [string, string];

  let salt: Buffer;
  let existingHash: Buffer;
  try {
    salt = Buffer.from(saltHex, 'hex');
    existingHash = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }

  if (salt.length !== SALT_LENGTH || existingHash.length !== KEY_LENGTH) {
    return false;
  }

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SCRYPT_PARAMS, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });

  return timingSafeEqual(existingHash, derivedKey);
}
