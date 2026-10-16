import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { LoginPage } from './LoginPage';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';

const API_URL = 'http://localhost:3000/api/v1';

describe('LoginPage', () => {
  it('validates empty fields and invalid email', async () => {
    renderWithProviders(<LoginPage />);

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText('Please enter a valid email address'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Password is required')).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText('Please enter a valid email address'),
    ).toBeInTheDocument();
  });

  it('displays lockout message on 423 status', async () => {
    server.use(
      http.post(`${API_URL}/auth/login`, () => {
        return HttpResponse.json(
          {
            message:
              'Account is locked due to repeated failed login attempts. Please try again later.',
          },
          { status: 423 },
        );
      }),
    );

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByText(
        /Account is locked due to repeated failed login attempts/i,
      ),
    ).toBeInTheDocument();
  });
});
