import { DataSource } from 'typeorm';
import { Category } from '../../entities/category.entity';

export class CategoriesSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const categoryRepository = dataSource.getRepository(Category);

    const defaultCategories = [
      {
        name: 'Personal Tasks',
        description: 'Personal to-dos, errands, and self-care activities',
        color: '#3B82F6',
        icon: 'user',
        sort_order: 1,
      },
      {
        name: 'Work & Business',
        description: 'Professional tasks, meetings, and business-related items',
        color: '#8B5CF6',
        icon: 'briefcase',
        sort_order: 2,
      },
      {
        name: 'Shopping & Purchases',
        description: 'Items to buy, shopping lists, and purchase reminders',
        color: '#10B981',
        icon: 'shopping-cart',
        sort_order: 3,
      },
      {
        name: 'Health & Wellness',
        description:
          'Medical appointments, fitness goals, and health reminders',
        color: '#EF4444',
        icon: 'heart',
        sort_order: 4,
      },
      {
        name: 'Finance & Bills',
        description: 'Bill payments, financial goals, and money-related tasks',
        color: '#F59E0B',
        icon: 'dollar-sign',
        sort_order: 5,
      },
      {
        name: 'Home & Family',
        description: 'Household chores, family events, and home maintenance',
        color: '#EC4899',
        icon: 'home',
        sort_order: 6,
      },
      {
        name: 'Travel & Events',
        description: 'Trip planning, event tickets, and travel arrangements',
        color: '#14B8A6',
        icon: 'map-pin',
        sort_order: 7,
      },
      {
        name: 'Learning & Development',
        description: 'Courses, books to read, and skill development',
        color: '#6366F1',
        icon: 'book-open',
        sort_order: 8,
      },
      {
        name: 'Social & Relationships',
        description:
          'Social events, relationship reminders, and friend activities',
        color: '#F97316',
        icon: 'users',
        sort_order: 9,
      },
      {
        name: 'Ideas & Inspiration',
        description: 'Creative ideas, inspiration, and future project concepts',
        color: '#84CC16',
        icon: 'lightbulb',
        sort_order: 10,
      },
      {
        name: 'Documents & Files',
        description: 'Important documents, files to organize, and paperwork',
        color: '#64748B',
        icon: 'file-text',
        sort_order: 11,
      },
      {
        name: 'Uncategorized',
        description: "Items that don't fit into other categories",
        color: '#6B7280',
        icon: 'help-circle',
        sort_order: 99,
      },
    ];

    // Check if categories already exist
    const existingCount = await categoryRepository.count();
    if (existingCount > 0) {
      console.log('Categories already seeded, skipping...');
      return;
    }

    // Insert default categories
    for (const categoryData of defaultCategories) {
      const category = categoryRepository.create(categoryData);
      await categoryRepository.save(category);
    }

    console.log(`Seeded ${defaultCategories.length} default categories`);
  }
}
