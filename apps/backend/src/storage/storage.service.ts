import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly signedUrlClient: S3Client;
  private readonly bucketName =
    process.env.MINIO_BUCKET || 'costbuildup-documents';

  constructor() {
    const endpoint = this.normalizeEndpoint(
      process.env.MINIO_ENDPOINT || 'localhost',
    );
    const publicEndpoint = this.normalizeEndpoint(
      process.env.MINIO_PUBLIC_ENDPOINT || endpoint,
    );

    const clientConfig = {
      region: 'us-east-1', // MinIO default
      credentials: {
        accessKeyId:
          process.env.MINIO_ACCESS_KEY ||
          process.env.MINIO_ROOT_USER ||
          'minioadmin',
        secretAccessKey:
          process.env.MINIO_SECRET_KEY ||
          process.env.MINIO_ROOT_PASSWORD ||
          'minioadmin_password',
      },
      forcePathStyle: true, // Required for MinIO
    };

    this.s3Client = new S3Client({ ...clientConfig, endpoint });
    this.signedUrlClient = new S3Client({
      ...clientConfig,
      endpoint: publicEndpoint,
    });
  }

  private normalizeEndpoint(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    const port = process.env.MINIO_PORT || '9000';
    return `${protocol}://${endpoint}:${port}`;
  }

  async onModuleInit() {
    try {
      await this.sendWithTimeout(
        new HeadBucketCommand({ Bucket: this.bucketName }),
      );
      this.logger.log(`Bucket '${this.bucketName}' already exists.`);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.logger.error(
          `Timed out checking bucket '${this.bucketName}'. Storage will be unavailable until MinIO is reachable.`,
        );
        return;
      }
      if (error.$metadata?.httpStatusCode === 404) {
        this.logger.log(
          `Bucket '${this.bucketName}' not found. Creating on boot...`,
        );
        try {
          await this.sendWithTimeout(
            new CreateBucketCommand({ Bucket: this.bucketName }),
          );
          this.logger.log(`Bucket '${this.bucketName}' created successfully.`);
        } catch (createError) {
          this.logger.error(
            `Failed to create bucket '${this.bucketName}'`,
            createError,
          );
        }
      } else {
        this.logger.error(`Error checking bucket '${this.bucketName}'`, error);
      }
    }
  }

  private async sendWithTimeout(
    command: HeadBucketCommand | CreateBucketCommand,
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      return await this.s3Client.send(command, {
        abortSignal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async upload(buffer: Buffer, key: string, mime: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mime,
    });

    await this.s3Client.send(command);
    return key;
  }

  async getSignedUrl(
    key: string,
    expirySeconds: number = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.signedUrlClient, command, {
      expiresIn: expirySeconds,
    });
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }
}
