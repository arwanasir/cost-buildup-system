import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { EmailChannel } from './channels/email.channel';
import { TelegramChannel } from './channels/telegram.channel';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../db';
import * as http from 'http';

describe('NotificationsService Integration', () => {
  let service: NotificationsService;
  let dbMock: any;
  let telegramLoggerSpy: jest.SpyInstance;

  beforeAll(async () => {
    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([
        {
          id: 'user-123',
          email: 'test-mailpit@local.dev',
          preferredLanguage: 'am',
          role: 'system_admin',
        },
      ]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockResolvedValue([{ id: 'mock-insert-id' }]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        EmailChannel,
        TelegramChannel,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'SMTP_HOST') return '127.0.0.1';
              if (key === 'SMTP_PORT') return 1025;
              if (key === 'TELEGRAM_BOT_TOKEN') return ''; // Unset -> trigger stub
              return null;
            },
          },
        },
        {
          provide: DRIZZLE,
          useValue: dbMock,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    const telegramChannel = module.get<TelegramChannel>(TelegramChannel);
    telegramLoggerSpy = jest.spyOn((telegramChannel as any).logger, 'warn');

    await service.onModuleInit();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should render bilingually, resolve recipient by role, send via Mailpit and stub Telegram', async () => {
    // 1. Trigger notification
    await service.notifyRoles(
      'posting_failed',
      { type: 'test_entity', id: 'entity-1' },
      { entityName: 'Test Invoice', reason: 'ERP Timeout' },
    );

    // 2. Recipient resolution by role (mock DB was called)
    expect(dbMock.select).toHaveBeenCalled();
    expect(dbMock.where).toHaveBeenCalled();

    // 3. Bilingual rendering verify
    expect(dbMock.values).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 'user-123',
          type: 'posting_failed',
          titleEn: 'ERP Posting Failed', // From en.json
          titleAm: expect.any(String), // From am.json
          bodyEn: expect.stringContaining('Test Invoice'),
          bodyAm: expect.stringContaining('Test Invoice'),
        }),
      ]),
    );

    // 4. Telegram Stub No-Op
    expect(telegramLoggerSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'TELEGRAM_BOT_TOKEN is unset. Stubbing telegram notification',
      ),
    );

    // 5. Email delivery to Mailpit API
    // Wait slightly to ensure SMTP completes asynchronously
    await new Promise((r) => setTimeout(r, 1500));

    const checkMailpit = (): Promise<any> => {
      return new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:8025/api/v1/messages', (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
      });
    };

    try {
      const data = await checkMailpit();
      const msg = data.messages.find(
        (m: any) => m.To[0].Address === 'test-mailpit@local.dev',
      );
      expect(msg).toBeDefined();
      // Since preferredLanguage is 'am', Subject should be the Amharic title
      expect(msg.Subject).toBe(
        'Ã¡â€¹Â¨ERP Ã¡Ë†â€ºÃ¡Ë†ÂµÃ¡â€°Â°Ã¡Ë†â€¹Ã¡Ë†Ë†Ã¡ÂÂ Ã¡Å Â Ã¡Ë†ÂÃ¡â€°Â°Ã¡Ë†Â³Ã¡Å Â«Ã¡Ë†Â',
      );
    } catch (e: any) {
      if (e.code === 'ECONNREFUSED') {
        console.warn(
          'Mailpit is not running locally. Skipping physical SMTP delivery check.',
        );
      } else {
        throw e;
      }
    }
  });
});
