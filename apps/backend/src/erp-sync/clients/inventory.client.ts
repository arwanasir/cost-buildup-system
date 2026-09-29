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
    this.baseUrl =
      this.configService.get<string>('ERP_INVENTORY_URL') ||
      'http://erp-system.internal/api/v1/inventory/receipts';
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
