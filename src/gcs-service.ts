import { Storage } from '@google-cloud/storage';
import * as core from '@actions/core';
import { v4 as uuidv4 } from 'uuid';
import { GCSConfig, ImageData, ImageUploadResult } from './types';

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
  async uploadImage(imageData: ImageData, repository: string, issueNumber: number): Promise<ImageUploadResult> {
    try {
      // ファイル名を生成（UUID v4で推測不可能にする）
      const extension = this.getExtensionFromMimeType(imageData.mimeType);
      const fileName = `${uuidv4()}${extension}`;
      
      // ファイルパスを/{repository}/{issue-number}/{uuid}.{extension}形式に生成
      const filePath = `${repository}/${issueNumber}/${fileName}`;
      
      // Base64文字列をバイナリデータにデコード
      const buffer = Buffer.from(imageData.base64Data, 'base64');
      const fileSizeKB = Math.round(buffer.length / 1024);
      
      // アップロード開始時の詳細ログ
      core.info(`Uploading image to GCS...`);
      core.info(`  File: ${filePath}`);
      core.info(`  MIME Type: ${imageData.mimeType}`);
      core.info(`  Size: ${fileSizeKB}KB`);
      core.info(`  Bucket: ${this.bucketName}`);
      
      // バケットとファイルオブジェクトを取得
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);
      
      // ファイルをアップロード
      await file.save(buffer, {
        metadata: {
          contentType: imageData.mimeType,
        },
      });
      
      // バケットパスを生成
      const bucketPath = `gs://${this.bucketName}/${filePath}`;
      
      // アップロード成功時のログ
      core.info(`Upload completed successfully`);
      core.info(`  GCS Path: ${bucketPath}`);
      
      // 署名付きURLを生成
      let signedUrl: string;
      let expiryDate: Date | undefined;
      
      if (this.signedUrlExpiry > 0) {
        expiryDate = new Date(Date.now() + this.signedUrlExpiry * 1000);
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + this.signedUrlExpiry * 1000,
        });
        signedUrl = url;
        
        // 署名付きURL生成時の詳細ログ
        const expiryDays = Math.round(this.signedUrlExpiry / 86400);
        core.info(`Signed URL generated`);
        core.info(`  URL: ${signedUrl}`);
        core.info(`  Expires: ${expiryDate.toISOString()} (${expiryDays} days)`);
      } else {
        // 有効期限が無制限の場合は公開URLを使用（バケットが公開設定の場合）
        signedUrl = file.publicUrl();
        core.info(`Public URL generated (no expiry)`);
        core.info(`  URL: ${signedUrl}`);
      }
      
      return {
        url: signedUrl,
        expiryDate: expiryDate,
        bucketPath: bucketPath,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      core.error(`Failed to upload image to GCS: ${errorMessage}`);
      if (errorStack) {
        core.error(`Error stack: ${errorStack}`);
      }
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
