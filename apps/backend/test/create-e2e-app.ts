import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

export async function createE2eApp() {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication();
  // Honor test-provided X-Forwarded-For values so auth throttling is isolated
  // by simulated client, as it is behind the production reverse proxy.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  // Keep Supertest bound to a live server address. An initialized but
  // unlistened Nest server can be closed/restarted between long workflow
  // tests, leaving Supertest with a null server.address() during dispatch.
  await app.listen(0);
  return app;
}
