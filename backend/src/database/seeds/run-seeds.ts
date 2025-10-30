import { CategoriesSeed } from './categories.seed';
import { AppDataSource } from '../../../data-source';

async function runSeeds() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    console.log('Running database seeds...');

    await CategoriesSeed.run(AppDataSource);

    console.log('Database seeding completed successfully');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error running seeds:', error);
    process.exit(1);
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
runSeeds();
