import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const E2E_CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  credentials: {
    learner: {
      email: process.env.TEST_LEARNER_EMAIL || 'learner@coursera.ai',
      password: process.env.TEST_LEARNER_PASSWORD || '123456',
    },
    instructor: {
      email: process.env.TEST_INSTRUCTOR_EMAIL || 'instructor@coursera.ai',
      password: process.env.TEST_INSTRUCTOR_PASSWORD || '123456',
    },
    ta: {
      email: process.env.TEST_TA_EMAIL || 'ta@coursera.ai',
      password: process.env.TEST_TA_PASSWORD || '123456',
    },
    admin: {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@coursera.ai',
      password: process.env.TEST_ADMIN_PASSWORD || '123456',
    },
    partner: {
      email: process.env.TEST_PARTNER_EMAIL || 'partner@coursera.ai',
      password: process.env.TEST_PARTNER_PASSWORD || '123456',
    },
  },
};
