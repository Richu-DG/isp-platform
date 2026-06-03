import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 16;
const TAG_LEN = 16;
const SALT = "isp-platform-enc"; // fixed salt — key stretching only, not password hashing

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly logger = new Logger(EncryptionService.name);

  constructor(config: ConfigService) {
    const secret = config.get<string>("ENCRYPTION_KEY");
    if (!secret || secret === "changeme") {
      this.logger.warn("ENCRYPTION_KEY not set or is default — router credentials are NOT encrypted");
    }
    // Derive a 32-byte key from the secret using scrypt
    this.key = scryptSync(secret ?? "insecure-default-key", SALT, 32);
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Format: iv(hex):tag(hex):ciphertext(hex)
    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
  }

  decrypt(ciphertext: string): string {
    // Handle plaintext values stored before encryption was added
    if (!ciphertext.includes(":")) return ciphertext;

    const parts = ciphertext.split(":");
    if (parts.length !== 3) return ciphertext;

    const [ivHex, tagHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const data = Buffer.from(dataHex, "hex");

    const decipher = createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data) + decipher.final("utf8");
  }

  isEncrypted(value: string): boolean {
    return value.split(":").length === 3;
  }
}
