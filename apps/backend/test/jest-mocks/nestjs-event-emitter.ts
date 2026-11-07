import { Module } from '@nestjs/common';

export class EventEmitter2 {
  emit() {
    return true;
  }

  emitAsync() {
    return Promise.resolve([]);
  }
}

export function OnEvent(): MethodDecorator {
  return () => undefined;
}

@Module({
  providers: [EventEmitter2],
  exports: [EventEmitter2],
})
class MockEventEmitterModule {
  static forRoot() {
    return MockEventEmitterModule;
  }
}

export const EventEmitterModule = MockEventEmitterModule;
