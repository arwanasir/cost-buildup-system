import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
const uuidv4 = () => Math.random().toString(36).substring(7);

// This is an integration test designed to run against a live local MinIO container.
// Ensure MinIO is running on http://localhost:9000 with minioadmin:minioadmin
describe.skip('StorageService (Integration)', () => {
  let service: StorageService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService],
    }).compile();

    service = module.get<StorageService>(StorageService);

    // Ensure bucket is created (or checked) before tests run
    await service.onModuleInit();
  });

  it('should upload a file, fetch via signed URL with 200 OK, and delete', async () => {
    const testKey = `test-folder/test-file-${uuidv4()}.txt`;
    const testContent = 'Hello MinIO Integration Test';
    const buffer = Buffer.from(testContent, 'utf-8');

    // 1. Upload to MinIO
    const uploadedKey = await service.upload(buffer, testKey, 'text/plain');
    expect(uploadedKey).toBe(testKey);

    // 2. Generate Signed URL
    const signedUrl = await service.getSignedUrl(testKey, 60); // 60 seconds
    expect(signedUrl).toContain(testKey);
    expect(signedUrl).toContain('X-Amz-Signature');
    expect(signedUrl).toContain('X-Amz-Credential');

    // 3. Fetch from Signed URL (Node 18+ has native fetch)
    const response = await fetch(signedUrl);
    expect(response.status).toBe(200);
    const fetchedText = await response.text();
    expect(fetchedText).toBe(testContent);

    // 4. Delete the file
    await service.delete(testKey);

    // 5. Verify Deletion
    // Re-fetching the same signed URL should now yield a 404 Not Found since the object is gone.
    const deletedResponse = await fetch(signedUrl);
    expect(deletedResponse.status).toBe(404);
  });
});

describe('StorageService signed URL endpoint', () => {
  const originalEnv = {
    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
    MINIO_PUBLIC_ENDPOINT: process.env.MINIO_PUBLIC_ENDPOINT,
    MINIO_PORT: process.env.MINIO_PORT,
    MINIO_ROOT_USER: process.env.MINIO_ROOT_USER,
    MINIO_ROOT_PASSWORD: process.env.MINIO_ROOT_PASSWORD,
  };

  afterAll(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('signs view URLs with the browser-facing endpoint, not the Docker hostname', async () => {
    process.env.MINIO_ENDPOINT = 'minio';
    process.env.MINIO_PUBLIC_ENDPOINT = 'http://localhost:9000';
    process.env.MINIO_PORT = '9000';
    process.env.MINIO_ROOT_USER = 'minioadmin';
    process.env.MINIO_ROOT_PASSWORD = 'minioadmin_password';

    const service = new StorageService();
    const signedUrl = await service.getSignedUrl('shipments/demo/bl/demo.pdf');

    expect(new URL(signedUrl).origin).toBe('http://localhost:9000');
    expect(signedUrl).toContain('X-Amz-Signature');
    expect(signedUrl).toContain('shipments/demo/bl/demo.pdf');
  });
});
