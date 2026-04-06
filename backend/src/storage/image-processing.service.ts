import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

/** Input types we normalize to WebP (sharp supports JPEG/PNG; GIF/WebP handled separately if needed). */
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png']);

const MAX_WIDTH = 500;
const WEBP_QUALITY = 80;

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  validateImageMimeType(mimetype: string | undefined): void {
    const m = String(mimetype ?? '')
      .toLowerCase()
      .trim();
    if (!ALLOWED_MIMES.has(m)) {
      throw new BadRequestException('Only JPEG and PNG images are allowed');
    }
  }

  /**
   * Resize to max width 500px (aspect ratio preserved), convert to WebP quality 80.
   * Returns processed buffer.
   */
  async processToWebpBuffer(input: Buffer): Promise<Buffer> {
    if (!input || input.length === 0) {
      throw new BadRequestException('Empty file');
    }
    try {
      return await sharp(input)
        .rotate()
        .resize({
          width: MAX_WIDTH,
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Image processing failed: ${msg}`);
      throw new BadRequestException('Could not process image. File may be corrupt or not a valid image.');
    }
  }
}
