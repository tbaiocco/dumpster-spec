import { Injectable, Logger } from '@nestjs/common';
import templates from '../../config/whatsapp-templates.json';

export interface TemplateEntry {
  language: string;
  contentSid?: string;
  body: string;
  name: string;
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  getTemplate(name: string, language?: string): TemplateEntry | null {
    const entry = (templates as any)[name] as TemplateEntry | undefined;
    if (!entry) return null;
    if (language && entry.language && entry.language !== language) {
      this.logger.debug(`Template ${name} has language ${entry.language} not ${language}`);
    }
    entry.name = name;
    return entry;
  }

  getTemplateBody(name: string, language?: string): string | null {
    const t = this.getTemplate(name, language);
    return t ? t.body : null;
  }

  getContentSid(name: string): string | null {
    const t = this.getTemplate(name);
    return t && t.contentSid ? t.contentSid : null;
  }

  render(templateBody: string, vars: string[]): string {
    if (!templateBody) return '';
    return templateBody.replace(/\{\{(\d+)\}\}/g, (_, n) => {
      const i = Number(n) - 1;
      return typeof vars[i] !== 'undefined' && vars[i] !== null
        ? String(vars[i])
        : '';
    });
  }

  truncate(text: string, len = 100): string {
    if (!text) return '';
    if (text.length <= len) return text;
    return text.slice(0, len);
  }
}
