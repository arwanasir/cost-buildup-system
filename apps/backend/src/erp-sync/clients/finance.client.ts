import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FinanceClient {
  private readonly logger = new Logger(FinanceClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('ERP_FINANCE_URL') ||
      'http://erp-system.internal/api/v1/finance/journal-entries';
  }

  async postJournalEntry(
    journalId: string,
    sourceId: string,
    lines: any[],
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(this.baseUrl, {
          journal_id: journalId,
          source_type: 'grn',
          source_id: sourceId,
          lines,
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to post finance journal to ERP: ${error.message}`,
      );
      throw error;
    }
  }
}
