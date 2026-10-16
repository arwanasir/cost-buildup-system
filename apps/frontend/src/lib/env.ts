import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().url().default('http://localhost:3000/api/v1'),
});

const parseEnv = () => {
  try {
    return envSchema.parse(import.meta.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(
        'Invalid environment variables:',
        error.flatten().fieldErrors,
      );
    }
    throw new Error('Invalid environment variables', { cause: error });
  }
};

export const env = parseEnv();
