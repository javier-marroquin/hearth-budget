import '../load-env.js';
import { config } from '../config.js';
import { withUserContext } from '../db/pool.js';
import {
  createUserWithProfile,
  findUserByEmail,
} from '../auth/service.js';

const DEMO_EMAIL = 'demo@local.dev';
const DEMO_PASSWORD = 'demo1234';

async function seed() {
  await withUserContext(null, async (client) => {
    const existing = await findUserByEmail(client, DEMO_EMAIL);
    if (existing) {
      console.log('[seed] demo user already exists:', DEMO_EMAIL);
      return;
    }

    const { user, profile } = await createUserWithProfile(client, {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      fullName: 'Usuario Demo',
      locale: 'es',
    });

    console.log('[seed] created demo user');
    console.log('  email:', DEMO_EMAIL);
    console.log('  password:', DEMO_PASSWORD);
    console.log('  id:', user.id, profile.full_name);
  });
}

if (config.SEED_DEMO_USER) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] failed', err);
      process.exit(1);
    });
} else {
  console.log('[seed] skipped (SEED_DEMO_USER=false)');
  process.exit(0);
}
