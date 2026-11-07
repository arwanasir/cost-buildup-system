import { Module } from '@nestjs/common';

export class ConfigService {
  get<T = string>(key: string, defaultValue?: T): T | undefined {
    const testDefaults: Record<string, string> = {
      ERP_INVENTORY_URL: 'http://localhost:3001/inventory/postings',
      ERP_FINANCE_URL: 'http://localhost:3001/finance/journal-entries',
    };
    if (key in testDefaults) return testDefaults[key] as T;
    return (process.env[key] as T | undefined) ?? defaultValue;
  }
}

@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
class MockConfigModule {
  static forRoot() {
    return MockConfigModule;
  }
}

export const ConfigModule = MockConfigModule;
