import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: SupabaseClient | null;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      this.client = createClient(url, key);
    } else {
      this.client = null;
      this.logger.warn('Supabase Storage disabled: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  private bucketName(): string {
    return process.env.SUPABASE_STORAGE_BUCKET || 'food-images';
  }

  async uploadPublicImage(params: {
    buffer: Buffer;
    filename: string;
    contentType: string;
  }): Promise<string | null> {
    if (!this.client) {
      return null;
    }
    const bucket = this.bucketName();
    const safeName = params.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `uploads/${Date.now()}-${safeName}`;
    const { error } = await this.client.storage.from(bucket).upload(path, params.buffer, {
      contentType: params.contentType,
      upsert: true,
    });
    if (error) {
      throw new BadRequestException(`Storage upload failed: ${error.message}`);
    }
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
