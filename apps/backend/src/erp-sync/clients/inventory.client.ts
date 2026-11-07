import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InventoryClient {
  private readonly logger = new Logger(InventoryClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const erpBaseUrl =
      this.configService.get<string>('ERP_BASE_URL') || 'http://localhost:3001';
    const configuredUrl = this.configService.get<string>('ERP_INVENTORY_URL');
    const baseUsesContainerNetwork =
      !/localhost|127\.0\.0\.1|\[::1\]/i.test(erpBaseUrl);
    const configuredUrlUsesLocalhost =
      configuredUrl && /localhost|127\.0\.0\.1|\[::1\]/i.test(configuredUrl);
    this.baseUrl =
      configuredUrl && !(baseUsesContainerNetwork && configuredUrlUsesLocalhost)
        ? configuredUrl
        : `${erpBaseUrl.replace(/\/+$/, '')}/inventory/postings`;
  }

  async postReceipt(payloads: any[]): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(this.baseUrl, { items: payloads }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to post inventory receipt to ERP: ${error.message}`,
      );
      throw error;
    }
  }
}
