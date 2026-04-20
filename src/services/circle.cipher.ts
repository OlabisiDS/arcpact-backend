import forge from 'node-forge';
import axios from 'axios';
import { ENV } from '../config/env';
import logger from '../utils/logger';

/**
 * generateEntitySecretCiphertext()
 *
 * Circle requires that every API transaction request includes an
 * "entitySecretCiphertext" — your entity secret, RSA-OAEP encrypted
 * with Circle's public key, then base64-encoded.
 *
 * CRITICAL: This must be generated FRESH for every single API call.
 * Reusing a ciphertext will cause Circle to reject the request as a
 * replay attack. A new encryption produces a new ciphertext each time
 * even though the underlying entity secret is the same.
 *
 * Process:
 * 1. Fetch Circle's RSA public key for your entity
 * 2. Convert your hex entity secret to bytes
 * 3. Encrypt with RSA-OAEP (SHA-256)
 * 4. Base64-encode the result
 */
export async function generateEntitySecretCiphertext(): Promise<string> {
  // ── Step 1: Fetch Circle's public key ────────────────────────────────────
  logger.info('[Cipher] Fetching Circle entity public key...');

  const publicKeyResponse = await axios.get<{ data: { publicKey: string } }>(
    `${ENV.CIRCLE_BASE_URL}/config/entity/publicKey`,
    {
      headers: {
        Authorization:  `Bearer ${ENV.CIRCLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const publicKeyPem = publicKeyResponse.data?.data?.publicKey;

  if (!publicKeyPem) {
    throw new Error('[Cipher] Failed to retrieve Circle entity public key');
  }

  // ── Step 2: Convert hex entity secret → raw bytes ────────────────────────
  const entitySecretBytes = forge.util.hexToBytes(ENV.CIRCLE_ENTITY_SECRET);

  // ── Step 3: Load public key and RSA-OAEP encrypt ─────────────────────────
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);

  const encryptedData = publicKey.encrypt(entitySecretBytes, 'RSA-OAEP', {
    md:   forge.md.sha256.create(),
    mgf1: { md: forge.md.sha256.create() },
  });

  // ── Step 4: Base64-encode and return ─────────────────────────────────────
  const ciphertext = forge.util.encode64(encryptedData);

  logger.info('[Cipher] Entity secret ciphertext generated successfully');

  return ciphertext;
}
