import { Module } from '@nestjs/common';

export function Cron(): MethodDecorator {
  return () => undefined;
}

@Module({})
class MockScheduleModule {
  static forRoot() {
    return MockScheduleModule;
  }
}

export const ScheduleModule = MockScheduleModule;
