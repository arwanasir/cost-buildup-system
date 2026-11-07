import { HttpException, ValidationPipe } from '@nestjs/common';
import { ReportFilterDto } from './report-filter.dto';

describe('ReportFilterDto query validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  });

  const transformQuery = (value: Record<string, string>) =>
    pipe.transform(value, {
      type: 'query',
      metatype: ReportFilterDto,
      data: '',
    });

  it('accepts supported report filters without export-only parameters', async () => {
    await expect(
      transformQuery({ date_from: '2025-01-01', period: 'quarter' }),
    ).resolves.toMatchObject({
      date_from: '2025-01-01',
      period: 'quarter',
    });
  });

  it('rejects export format when incorrectly sent as a filter query', async () => {
    try {
      await transformQuery({ format: 'excel' });
      throw new Error('Expected unknown query property to be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(JSON.stringify((error as HttpException).getResponse())).toContain(
        'property format should not exist',
      );
    }
  });
});
