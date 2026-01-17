import { Storage } from '@google-cloud/storage';
import * as core from '@actions/core';
import { v4 as uuidv4 } from 'uuid';
import { GCSConfig, ImageData } from './types';

export class GCSService {
  private storage: Storage;
  private bucketName: string;
  private signedUrlExpiry: number;

  constructor(config: GCSConfig) {
    try {
      // サービスアカウントキーをパース
      const serviceAccountKey = JSON.parse(config.serviceAccountKey);
      
      // Storageクライアントを初期化
      this.storage = new Storage({
        projectId: config.projectId,
        credentials: serviceAccountKey,
      });
      
      this.bucketName = config.bucketName;
      this.signedUrlExpiry = config.signedUrlExpiry;
      
      core.info(`GCS Service initialized for project: ${config.projectId}, bucket: ${config.bucketName}`);
    } catch (error) {
      core.error(`Failed to initialize GCS Service: ${error}`);
      throw new Error(`GCS initialization failed: ${error}`);
    }
  }

  /**
   * Base64エンコードされた画像データをGCSにアップロードし、署名付きURLを生成
   */
  async uploadImage(imageData: ImageData): Promise<string> {
    try {
      // ファイル名を生成（UUID v4で推測不可能にする）
      const extension = this.getExtensionFromMimeType(imageData.mimeType);
      const fileName = `${uuidv4()}${extension}`;
      
      core.info(`Uploading image to GCS: ${fileName}`);
      
      // Base64文字列をバイナリデータにデコード
      const buffer = Buffer.from(imageData.base64Data, 'base64');
      
      // バケットとファイルオブジェクトを取得
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);
      
      // ファイルをアップロード
      await file.save(buffer, {
        metadata: {
          contentType: imageData.mimeType,
        },
      });
      
      core.info(`Image uploaded successfully: ${fileName}`);
      
      // 署名付きURLを生成
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + this.signedUrlExpiry * 1000,
      });
      
      core.info(`Signed URL generated for: ${fileName}`);
      
      return signedUrl;
    } catch (error) {
      core.error(`Failed to upload image to GCS: ${error}`);
      throw error;
    }
  }

  /**
   * MIMEタイプから拡張子を取得
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
    };
    
    return mimeToExt[mimeType] || '.png';
  }
}
