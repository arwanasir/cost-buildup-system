import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuditModule } from './audit/audit.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SettingsModule } from './settings/settings.module';
import { CostCategoriesModule } from './cost-categories/cost-categories.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { TariffsModule } from './tariffs/tariffs.module';
import { NumberingModule } from './core/numbering/numbering.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ItemsModule } from './items/items.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { LettersOfCreditModule } from './letters-of-credit/letters-of-credit.module';
import { StorageModule } from './storage/storage.module';
import { ImportShipmentsModule } from './import-shipments/import-shipments.module';
import { CommercialInvoicesModule } from './commercial-invoices/commercial-invoices.module';
import { CustomsModule } from './customs/customs.module';
import { CostRegisterModule } from './cost-register/cost-register.module';
import { AllocationModule } from './allocation/allocation.module';
import { LandedCostModule } from './landed-cost/landed-cost.module';
import { LineageModule } from './lineage/lineage.module';
import { GoodsReceiptsModule } from './goods-receipts/goods-receipts.module';
import { ErpSyncModule } from './erp-sync/erp-sync.module';
import { VariancesModule } from './variances/variances.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    AuditModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        libraryOptions: {
          allowUnknown: true,
          abortEarly: false,
        },
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    HealthModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    SettingsModule,
    CostCategoriesModule,
    ExchangeRatesModule,
    TariffsModule,
    NumberingModule,
    SuppliersModule,
    ItemsModule,
    PurchaseOrdersModule,
    LettersOfCreditModule,
    StorageModule,
    ImportShipmentsModule,
    CommercialInvoicesModule,
    CustomsModule,
    CostRegisterModule,
    AllocationModule,
    LandedCostModule,
    LineageModule,
    GoodsReceiptsModule,
    ErpSyncModule,
    VariancesModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    AppService,
  ],
})
export class AppModule {}
