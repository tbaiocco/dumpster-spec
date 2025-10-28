import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables from config directory
config({ 
  path: [
    `config/environments/.env.${process.env.NODE_ENV}`,
    'config/environments/.env.development',
    'config/environments/.env'
  ].filter(Boolean)
});

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number.parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'clutter_ai_dev',
  url: process.env.DATABASE_URL,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});