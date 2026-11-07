import { Module } from '@nestjs/common';

export class JwtService {
  sign() {
    return 'test-token';
  }

  signAsync() {
    return Promise.resolve('test-token');
  }

  verify() {
    return {};
  }

  verifyAsync() {
    return Promise.resolve({});
  }
}

@Module({
  providers: [JwtService],
  exports: [JwtService],
})
class MockJwtModule {
  static register() {
    return MockJwtModule;
  }
}

export const JwtModule = MockJwtModule;
