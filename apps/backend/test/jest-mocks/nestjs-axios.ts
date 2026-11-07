import { Module } from '@nestjs/common';
import axios from 'axios';
import { from } from 'rxjs';

export class HttpService {
  get(url: string, config?: any) {
    return from(axios.get(url, config));
  }

  post(url: string, data?: any, config?: any) {
    return from(axios.post(url, data, config));
  }

  put(url: string, data?: any, config?: any) {
    return from(axios.put(url, data, config));
  }
}

@Module({
  providers: [HttpService],
  exports: [HttpService],
})
class MockHttpModule {
  static register() {
    return MockHttpModule;
  }
}

export const HttpModule = MockHttpModule;
