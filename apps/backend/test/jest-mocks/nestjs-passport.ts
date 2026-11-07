export function AuthGuard(): any {
  return class MockAuthGuard {
    canActivate() {
      return true;
    }
  };
}
