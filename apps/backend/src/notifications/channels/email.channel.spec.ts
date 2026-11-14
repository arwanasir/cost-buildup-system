import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { EmailChannel } from './email.channel';

describe('EmailChannel SMTP transport security', () => {
  const db = {} as any;
  let createTransport: jest.SpyInstance;

  beforeEach(() => {
    createTransport = jest
      .spyOn(nodemailer, 'createTransport')
      .mockReturnValue({} as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const makeConfig = (values: Record<string, unknown>) =>
    ({
      get: (key: string) => values[key],
    }) as ConfigService;

  it('requires TLS 1.3 for production SMTP connections', () => {
    new EmailChannel(
      makeConfig({
        SMTP_HOST: 'smtp.example.test',
        SMTP_PORT: 587,
        SMTP_SECURE: false,
        NODE_ENV: 'production',
      }),
      db,
    );

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.test',
        port: 587,
        secure: false,
        requireTLS: true,
        tls: { minVersion: 'TLSv1.3' },
      }),
    );
  });

  it('keeps local Mailpit usable without TLS in development', () => {
    new EmailChannel(
      makeConfig({
        SMTP_HOST: '127.0.0.1',
        SMTP_PORT: 1025,
        SMTP_SECURE: false,
        NODE_ENV: 'development',
      }),
      db,
    );

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: '127.0.0.1',
        port: 1025,
        secure: false,
        requireTLS: false,
      }),
    );
    expect(createTransport.mock.calls[0][0]).not.toHaveProperty('tls');
  });
});
