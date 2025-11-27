import { Injectable } from '@nestjs/common';

@Injectable()
export class HelpCommand {
  execute(): string {
    return (
      '🔧 <b>Available Commands:</b>\n\n' +
      '/start - Welcome message and introduction\n' +
      '/help - Show this help message\n' +
      '/recent - Show your 5 most recent items\n' +
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
