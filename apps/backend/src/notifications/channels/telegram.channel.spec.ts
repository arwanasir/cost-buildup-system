import { ConfigService } from '@nestjs/config';
import i18next from 'i18next';
import { TelegramChannel } from './telegram.channel';
import en from '../templates/en.json';
import am from '../templates/am.json';

describe('TelegramChannel', () => {
  let channel: TelegramChannel;
  const fetchMock = jest.fn();

  beforeAll(async () => {
    await i18next.init({
      fallbackLng: 'en',
      resources: {
        en: { translation: en },
        am: { translation: am },
      },
    });
  });

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    global.fetch = fetchMock as any;
    channel = new TelegramChannel({
      get: (key: string) => (key === 'TELEGRAM_BOT_TOKEN' ? 'bot-token' : null),
    } as ConfigService);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('sends to a configured numeric chat ID using the user language', async () => {
    await channel.send(
      [{ chatId: '-1001234567890', language: 'am' }],
      'posting_failed',
      { entityName: 'GRN-001', reason: 'ERP timeout' },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toContain('/sendMessage');
    const payload = JSON.parse(request.body);
    expect(payload.chat_id).toBe('-1001234567890');
    expect(payload.text).toContain('የERP ማስተላለፍ አልተሳካም');
    expect(payload.text).toContain('GRN-001');
    expect(payload.parse_mode).toBeUndefined();
  });

  it('does not send database UUIDs as Telegram chat IDs', async () => {
    await channel.send(
      [{ chatId: '8f1d07ee-2c28-4c3a-a755-0edc7a2dba44', language: 'en' }],
      'posting_failed',
      {},
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
