import { Injectable } from '@nestjs/common';

@Injectable()
export class HelpCommand {
  execute(platform: 'telegram' | 'whatsapp' = 'telegram'): string {
    if (platform === 'whatsapp') {
      return (
        '🔧 *Available Commands:*\n\n' +
        '/start - Welcome message and introduction\n' +
        '/help - Show this help message\n' +
        '/recent - Show your 5 most recent items\n' +
        '/upcoming - Show upcoming reminders (next 24h)\n' +
        '/search [query] - Search your content\n' +
        '/report [issue] - Report a problem or feedback\n\n' +
        '📝 *What you can send me:*\n' +
        '• Text messages (notes, reminders, ideas)\n' +
        '• Voice messages (I\'ll transcribe them)\n' +
        '• Photos (I\'ll extract text and information)\n' +
        '• Documents (bills, receipts, etc.)\n\n' +
        '🤖 *What I do:*\n' +
        '• Categorize your content automatically\n' +
        '• Extract important information (dates, amounts, etc.)\n' +
        '• Make it searchable with natural language\n' +
        '• Help you find things when you need them\n\n' +
        '_Just send me anything to get started!_'
      );
    }

    // Telegram HTML format
    return (
      '🔧 <b>Available Commands:</b>\n\n' +
      '/start - Welcome message and introduction\n' +
      '/help - Show this help message\n' +
      '/recent - Show your 5 most recent items\n' +
      '/upcoming - Show upcoming reminders (next 24h)\n' +
      '/search [query] - Search your content\n' +
      '/report [issue] - Report a problem or feedback\n\n' +
      '📝 <b>What you can send me:</b>\n' +
      '• Text messages (notes, reminders, ideas)\n' +
      "• Voice messages (I'll transcribe them)\n" +
      "• Photos (I'll extract text and information)\n" +
      '• Documents (bills, receipts, etc.)\n\n' +
      '🤖 <b>What I do:</b>\n' +
      '• Categorize your content automatically\n' +
      '• Extract important information (dates, amounts, etc.)\n' +
      '• Make it searchable with natural language\n' +
      '• Help you find things when you need them\n\n' +
      '<i>Just send me anything to get started!</i>'
    );
  }
}
