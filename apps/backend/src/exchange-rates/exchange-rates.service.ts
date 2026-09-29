import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE, DrizzleDB } from '@/db';
import { nbeExchangeRates } from '@/db/schema';
import { CreateExchangeRateDto } from './dto/exchange-rate.dto';
import { desc, eq } from 'drizzle-orm';

@Injectable()
export class ExchangeRatesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(createDto: CreateExchangeRateDto, userId: string) {
    const [rate] = await this.db
      .insert(nbeExchangeRates)
      .values({
        currency: createDto.currency.toUpperCase(),
        rateDate: createDto.rateDate,
        rate: createDto.rate.toString(),
        enteredBy: userId,
      })
      .returning();

    return rate;
  }

  async getLatestRate(currency: string) {
    const rate = await this.db.query.nbeExchangeRates.findFirst({
      where: eq(nbeExchangeRates.currency, currency.toUpperCase()),
      orderBy: [
        desc(nbeExchangeRates.rateDate),
        desc(nbeExchangeRates.createdAt),
      ],
    });

    if (!rate) {
      throw new NotFoundException(
        `No exchange rate found for currency: ${currency}`,
      );
    }

    return rate;
  }
}
