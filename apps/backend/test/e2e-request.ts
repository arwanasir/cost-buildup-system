import supertest from 'supertest';

const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
]);

function apiPath(path: string) {
  if (path === '/') return '/api/v1/';
  return path.startsWith('/api/v1/') ? path : `/api/v1${path}`;
}

export default function request(server: any): any {
  const client = supertest(server);
  return new Proxy(client as any, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (HTTP_METHODS.has(String(property))) {
        return (path: string, ...args: unknown[]) =>
          value.call(target, apiPath(path), ...args);
      }
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
