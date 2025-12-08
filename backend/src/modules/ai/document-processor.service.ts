import { Injectable, Logger } from '@nestjs/common';
import { VisionService } from './vision.service';
import { EntityExtractionService } from './extraction.service';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
const { PDFParse } = require('pdf-parse');

export interface DocumentProcessingResult {
  documentType: DocumentType;
  extractedText: string;
  confidence: number;
  entities: DocumentEntities;
  structuredData: Record<string, any>;
  processingMetadata: {
    ocrConfidence: number;
    layoutAnalysis: LayoutAnalysis;
    detectedFields: string[];
    qualityScore: number;
  };
}

export enum DocumentType {
  RECEIPT = 'receipt',
  INVOICE = 'invoice',
  BILL = 'bill',
  BUSINESS_CARD = 'business_card',
  ID_DOCUMENT = 'id_document',
  FORM = 'form',
  CONTRACT = 'contract',
  STATEMENT = 'statement',
  MEMO = 'memo',
  HANDWRITTEN_NOTE = 'handwritten_note',
  UNKNOWN = 'unknown',
}

export interface DocumentEntities {
  // Financial information
  amounts?: Array<{
    value: number;
    currency: string;
    label?: string; // e.g., 'total', 'subtotal', 'tax'
  }>;

  // Date information
  dates?: Array<{
    date: Date;
    label?: string; // e.g., 'transaction_date', 'due_date', 'expiry'
  }>;

  // Contact information
  contacts?: Array<{
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    role?: string; // e.g., 'vendor', 'customer', 'merchant'
  }>;

  // Business information
  businesses?: Array<{
    name: string;
    address?: string;
    phone?: string;
    taxId?: string;
    website?: string;
  }>;

  // Item/Product information (for receipts/invoices)
  items?: Array<{
    name: string;
    quantity?: number;
    price?: number;
    category?: string;
  }>;

  // Account/Reference numbers
  references?: Array<{
    type: string; // e.g., 'invoice_number', 'account_number', 'reference_id'
    value: string;
  }>;
}

export interface LayoutAnalysis {
  structure: 'single_column' | 'multi_column' | 'table' | 'form' | 'mixed';
  hasHeader: boolean;
  hasFooter: boolean;
  hasTable: boolean;
  hasSignature: boolean;
  hasLogo: boolean;
  textRegions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    confidence: number;
  }>;
}

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);

  constructor(
    private readonly visionService: VisionService,
    private readonly entityExtractionService: EntityExtractionService,
  ) {}

  /**
   * Process a document and extract structured information
   * Supports: images (OCR), PDFs, Word documents, Excel spreadsheets
   */
  async processDocument(
    documentBuffer: Buffer,
    mimeType: string,
  ): Promise<DocumentProcessingResult> {
    try {
      this.logger.log(`Processing document with mime type: ${mimeType}`);

      let extractedText: string;
      let confidence: number;
      let layoutAnalysis: LayoutAnalysis;
      let documentTypeResult: { type: DocumentType; confidence: number };

      // Handle different document types
      if (mimeType === 'application/pdf') {
        // PDF processing
        this.logger.log('Processing PDF document');
        extractedText = await this.extractTextFromPDF(documentBuffer);
        confidence = 0.9; // High confidence for PDF text extraction
        documentTypeResult = { type: DocumentType.UNKNOWN, confidence: 0.8 };
        layoutAnalysis = this.createDefaultLayout();
      } else if (
        mimeType ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        // Word document processing
        this.logger.log('Processing Word document');
        extractedText = await this.extractTextFromWord(documentBuffer);
        confidence = 0.95; // Very high confidence for Word extraction
        documentTypeResult = { type: DocumentType.MEMO, confidence: 0.9 };
        layoutAnalysis = this.createDefaultLayout();
      } else if (
        mimeType ===
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.ms-excel'
      ) {
        // Excel spreadsheet processing
        this.logger.log('Processing Excel spreadsheet');
        extractedText = await this.extractTextFromExcel(documentBuffer);
        confidence = 0.9; // High confidence for Excel extraction
        documentTypeResult = { type: DocumentType.STATEMENT, confidence: 0.85 };
        layoutAnalysis = this.createDefaultLayout();
      } else if (mimeType.startsWith('image/')) {
        // Image processing with OCR
        this.logger.log('Processing image with OCR');
        documentTypeResult = await this.detectDocumentType(
          documentBuffer,
          mimeType,
        );
        const ocrResult = await this.visionService.extractTextFromImage(
          documentBuffer,
          mimeType,
        );
        extractedText = ocrResult.text;
        confidence = ocrResult.confidence;
        layoutAnalysis = this.analyzeLayout(documentBuffer, ocrResult);
      } else {
        throw new Error(`Unsupported document type: ${mimeType}`);
      }

      // Extract structured data based on document type
      const structuredData = this.extractStructuredData(
        documentTypeResult.type,
        extractedText,
        layoutAnalysis,
      );

      // Extract entities specific to document type
      const entities = this.extractDocumentEntities(
        documentTypeResult.type,
        extractedText,
        structuredData,
      );

      // Calculate quality score
      const qualityScore = extractedText.length > 0 ? 0.8 : 0.3;
      const overallConfidence =
        (documentTypeResult.confidence + confidence + qualityScore) / 3;

      const result: DocumentProcessingResult = {
        documentType: documentTypeResult.type,
        extractedText,
        confidence: overallConfidence,
        entities,
        structuredData,
        processingMetadata: {
          ocrConfidence: confidence,
          layoutAnalysis,
          detectedFields: Object.keys(structuredData),
          qualityScore,
        },
      };

      this.logger.log(
        `Document processed: ${documentTypeResult.type} (confidence: ${Math.round(overallConfidence * 100)}%)`,
      );

      return result;
    } catch (error) {
      this.logger.error('Error processing document:', error);
      throw error;
    }
  }

  /**
   * Extract text from PDF document
   */
  private async extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
    try {
      const data = await PDFParse(pdfBuffer);
      return data.text.trim();
    } catch (error) {
      this.logger.error(`Failed to extract text from PDF: ${error.message}`);
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text from Word document (.docx or .doc)
   */
  private async extractTextFromWord(wordBuffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer: wordBuffer });
      return result.value.trim();
    } catch (error) {
      this.logger.error(`Failed to extract text from Word: ${error.message}`);
      throw new Error(`Word extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text from Excel spreadsheet (.xlsx or .xls)
   */
  private async extractTextFromExcel(excelBuffer: Buffer): Promise<string> {
    try {
      const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
      const allText: string[] = [];

      // Process all sheets
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        allText.push(`Sheet: ${sheetName}\n`);

        // Convert sheet to CSV format for text extraction
        const csvData = XLSX.utils.sheet_to_csv(sheet);
        allText.push(csvData);
        allText.push('\n');
      });

      return allText.join('\n').trim();
    } catch (error) {
      this.logger.error(`Failed to extract text from Excel: ${error.message}`);
      throw new Error(`Excel extraction failed: ${error.message}`);
    }
  }

  /**
   * Create default layout analysis for non-image documents
   */
  private createDefaultLayout(): LayoutAnalysis {
    return {
      structure: 'single_column',
      hasHeader: false,
      hasFooter: false,
      hasTable: false,
      hasSignature: false,
      hasLogo: false,
      textRegions: [],
    };
  }

  /**
   * Detect the type of document
   */
  private async detectDocumentType(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<{
    type: DocumentType;
    confidence: number;
  }> {
    try {
      // Use vision service for initial detection
      const visionResult = await this.visionService.detectDocumentType(
        imageBuffer,
        mimeType,
      );

      // Map vision service results to our document types
      let documentType = DocumentType.UNKNOWN;
      let confidence = 0.5;

      if (visionResult.type === 'receipt') {
        documentType = DocumentType.RECEIPT;
        confidence = visionResult.confidence;
      } else if (visionResult.type === 'invoice') {
        documentType = DocumentType.INVOICE;
        confidence = visionResult.confidence;
      } else if (visionResult.type === 'document') {
        documentType = DocumentType.FORM;
        confidence = visionResult.confidence * 0.8; // Lower confidence for generic documents
      }

      return { type: documentType, confidence };
    } catch (error) {
      this.logger.error('Error detecting document type:', error);
      return { type: DocumentType.UNKNOWN, confidence: 0.3 };
    }
  }

  /**
   * Analyze document layout and structure
   */
  private analyzeLayout(
    imageBuffer: Buffer,
    ocrResult: { text: string; confidence: number; boundingBoxes?: any[] },
  ): LayoutAnalysis {
    // Simplified layout analysis - in a real implementation, this would use
    // more sophisticated computer vision techniques

    const text = ocrResult.text.toLowerCase();

    return {
      structure: this.determineStructure(text),
      hasHeader: this.hasHeader(text),
      hasFooter: this.hasFooter(text),
      hasTable: this.hasTable(text),
      hasSignature: this.hasSignature(text),
      hasLogo: this.hasLogo(text),
      textRegions: this.extractTextRegions(ocrResult.boundingBoxes || []),
    };
  }

  /**
   * Extract structured data based on document type
   */
  private extractStructuredData(
    documentType: DocumentType,
    text: string,
    layout: LayoutAnalysis,
  ): Record<string, any> {
    const structuredData: Record<string, any> = {};

    switch (documentType) {
      case DocumentType.RECEIPT:
        return this.extractReceiptData(text);

      case DocumentType.INVOICE:
        return this.extractInvoiceData(text);

      case DocumentType.BILL:
        return this.extractBillData(text);

      case DocumentType.BUSINESS_CARD:
        return this.extractBusinessCardData(text);

      default:
        return this.extractGenericDocumentData(text);
    }
  }

  /**
   * Extract entities specific to the document type
   */
  private extractDocumentEntities(
    documentType: DocumentType,
    text: string,
    structuredData: Record<string, any>,
  ): DocumentEntities {
    const entities: DocumentEntities = {};

    // Extract amounts
    entities.amounts = this.extractAmounts(text);

    // Extract dates
    entities.dates = this.extractDates(text);

    // Extract contacts
    entities.contacts = this.extractContacts(text);

    // Extract business information
    entities.businesses = this.extractBusinesses(text);

    // Extract items (for receipts/invoices)
    if (
      documentType === DocumentType.RECEIPT ||
      documentType === DocumentType.INVOICE
    ) {
      entities.items = this.extractItems(text);
    }

    // Extract reference numbers
    entities.references = this.extractReferences(text, documentType);

    return entities;
  }

  private extractReceiptData(text: string): Record<string, any> {
    return {
      merchant: this.extractMerchantName(text),
      total: this.extractTotal(text),
      tax: this.extractTax(text),
      date: this.extractTransactionDate(text),
      paymentMethod: this.extractPaymentMethod(text),
      items: this.extractLineItems(text),
    };
  }

  private extractInvoiceData(text: string): Record<string, any> {
    return {
      invoiceNumber: this.extractInvoiceNumber(text),
      vendor: this.extractVendorInfo(text),
      customer: this.extractCustomerInfo(text),
      total: this.extractTotal(text),
      dueDate: this.extractDueDate(text),
      items: this.extractLineItems(text),
    };
  }

  private extractBillData(text: string): Record<string, any> {
    return {
      billingPeriod: this.extractBillingPeriod(text),
      accountNumber: this.extractAccountNumber(text),
      amountDue: this.extractAmountDue(text),
      dueDate: this.extractDueDate(text),
      serviceProvider: this.extractServiceProvider(text),
    };
  }

  private extractBusinessCardData(text: string): Record<string, any> {
    return {
      name: this.extractPersonName(text),
      title: this.extractJobTitle(text),
      company: this.extractCompanyName(text),
      email: this.extractEmail(text),
      phone: this.extractPhoneNumber(text),
      website: this.extractWebsite(text),
    };
  }

  private extractGenericDocumentData(text: string): Record<string, any> {
    return {
      title: this.extractDocumentTitle(text),
      summary: text.substring(0, 200),
      keyTerms: this.extractKeyTerms(text),
    };
  }

  // Helper methods for specific data extraction
  private extractAmounts(
    text: string,
  ): Array<{ value: number; currency: string; label?: string }> {
    const amounts: Array<{ value: number; currency: string; label?: string }> =
      [];

    // Regular expressions for common currency formats
    const patterns = [
      /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g, // USD format
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*USD/g, // Amount USD
      /€(\d+(?:,\d{3})*(?:\.\d{2})?)/g, // EUR format
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const value = Number.parseFloat(match[1].replace(/,/g, ''));
        if (!Number.isNaN(value)) {
          amounts.push({
            value,
            currency: pattern.source.includes('€') ? 'EUR' : 'USD',
          });
        }
      }
    }

    return amounts;
  }

  private extractDates(text: string): Array<{ date: Date; label?: string }> {
    const dates: Array<{ date: Date; label?: string }> = [];

    // Simple date extraction patterns
    const patterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/g,
      /(\d{1,2}-\d{1,2}-\d{4})/g,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const dateStr = match[1] || match[0];
        const parsedDate = new Date(dateStr);

        if (!Number.isNaN(parsedDate.getTime())) {
          dates.push({ date: parsedDate });
        }
      }
    }

    return dates;
  }

  private extractContacts(
    text: string,
  ): Array<{ name?: string; email?: string; phone?: string }> {
    const contacts: Array<{ name?: string; email?: string; phone?: string }> =
      [];

    const emails =
      text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const phones =
      text.match(
        /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
      ) || [];

    // Create contact entries
    for (const email of emails) {
      contacts.push({ email });
    }

    for (const phone of phones) {
      contacts.push({ phone });
    }

    return contacts;
  }

  private extractBusinesses(
    text: string,
  ): Array<{ name: string; address?: string }> {
    // Simplified business extraction - would need more sophisticated NLP
    const businesses: Array<{ name: string; address?: string }> = [];

    // Look for patterns that might indicate business names
    const lines = text.split('\n');
    for (const line of lines.slice(0, 5)) {
      // Check first few lines
      if (line.trim().length > 3 && line.match(/^[A-Z][A-Za-z\s&,.-]+$/)) {
        businesses.push({ name: line.trim() });
        break; // Usually the first valid line is the business name
      }
    }

    return businesses;
  }

  private extractItems(
    text: string,
  ): Array<{ name: string; quantity?: number; price?: number }> {
    const items: Array<{ name: string; quantity?: number; price?: number }> =
      [];

    // Look for line items with prices
    const lines = text.split('\n');
    for (const line of lines) {
      const priceMatch = line.match(/(.+?)\s+(\d+(?:\.\d{2})?)\s*$/);
      if (priceMatch) {
        items.push({
          name: priceMatch[1].trim(),
          price: Number.parseFloat(priceMatch[2]),
        });
      }
    }

    return items.slice(0, 20); // Limit to 20 items
  }

  private extractReferences(
    text: string,
    documentType: DocumentType,
  ): Array<{ type: string; value: string }> {
    const references: Array<{ type: string; value: string }> = [];

    // Extract common reference patterns based on document type
    if (documentType === DocumentType.INVOICE) {
      const invoiceMatch = text.match(/(?:invoice|inv)\s*#?\s*([A-Z0-9-]+)/i);
      if (invoiceMatch) {
        references.push({ type: 'invoice_number', value: invoiceMatch[1] });
      }
    }

    // Extract order numbers
    const orderMatch = text.match(/(?:order|po)\s*#?\s*([A-Z0-9-]+)/i);
    if (orderMatch) {
      references.push({ type: 'order_number', value: orderMatch[1] });
    }

    return references;
  }

  // Utility methods for layout analysis
  private determineStructure(text: string): LayoutAnalysis['structure'] {
    if (text.includes('\t') || text.match(/\s{4,}/)) return 'table';
    if (text.split('\n').length > 20) return 'multi_column';
    return 'single_column';
  }

  private hasHeader(text: string): boolean {
    const lines = text.split('\n');
    return lines.length > 0 && lines[0].trim().length > 0;
  }

  private hasFooter(text: string): boolean {
    return text.toLowerCase().includes('page') || text.includes('©');
  }

  private hasTable(text: string): boolean {
    return (
      text.includes('\t') || text.match(/\s{3,}\d+(?:\.\d{2})?\s*$/m) !== null
    );
  }

  private hasSignature(text: string): boolean {
    return (
      text.toLowerCase().includes('signature') ||
      text.toLowerCase().includes('signed')
    );
  }

  private hasLogo(text: string): boolean {
    // In a real implementation, this would analyze the image for logo detection
    return false;
  }

  private extractTextRegions(
    boundingBoxes: any[],
  ): LayoutAnalysis['textRegions'] {
    // Simplified - would use actual bounding box data from OCR
    return [];
  }

  private calculateQualityScore(
    ocrResult: { confidence: number },
    layout: LayoutAnalysis,
  ): number {
    let score = ocrResult.confidence;

    // Adjust score based on layout analysis
    if (layout.structure === 'table') score *= 0.9; // Tables are harder to process
    if (layout.hasHeader && layout.hasFooter) score *= 1.1; // Well-structured documents

    return Math.max(0, Math.min(1, score));
  }

  // Placeholder extraction methods - would be implemented with more sophisticated logic
  private extractMerchantName(text: string): string | undefined {
    return text.split('\n')[0]?.trim();
  }

  private extractTotal(text: string): number | undefined {
    const totalMatch = text.match(/total\s*:?\s*\$?(\d+(?:\.\d{2})?)/i);
    return totalMatch ? Number.parseFloat(totalMatch[1]) : undefined;
  }

  private extractTax(text: string): number | undefined {
    const taxMatch = text.match(/tax\s*:?\s*\$?(\d+(?:\.\d{2})?)/i);
    return taxMatch ? Number.parseFloat(taxMatch[1]) : undefined;
  }

  private extractTransactionDate(text: string): string | undefined {
    const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    return dateMatch ? dateMatch[1] : undefined;
  }

  private extractPaymentMethod(text: string): string | undefined {
    if (text.toLowerCase().includes('visa')) return 'Visa';
    if (text.toLowerCase().includes('mastercard')) return 'Mastercard';
    if (text.toLowerCase().includes('cash')) return 'Cash';
    return undefined;
  }

  private extractLineItems(text: string): string[] {
    return text
      .split('\n')
      .slice(1, -3)
      .filter((line) => line.trim().length > 0);
  }

  private extractInvoiceNumber(text: string): string | undefined {
    const match = text.match(/(?:invoice|inv)\s*#?\s*([A-Z0-9-]+)/i);
    return match ? match[1] : undefined;
  }

  private extractVendorInfo(text: string): string | undefined {
    return text.split('\n')[0]?.trim();
  }

  private extractCustomerInfo(text: string): string | undefined {
    // Would implement customer info extraction logic
    return undefined;
  }

  private extractDueDate(text: string): string | undefined {
    const dueDateMatch = text.match(
      /due\s+date\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    );
    return dueDateMatch ? dueDateMatch[1] : undefined;
  }

  private extractBillingPeriod(text: string): string | undefined {
    // Would implement billing period extraction
    return undefined;
  }

  private extractAccountNumber(text: string): string | undefined {
    const accountMatch = text.match(/account\s*#?\s*([A-Z0-9-]+)/i);
    return accountMatch ? accountMatch[1] : undefined;
  }

  private extractAmountDue(text: string): number | undefined {
    const amountMatch = text.match(/amount\s+due\s*:?\s*\$?(\d+(?:\.\d{2})?)/i);
    return amountMatch ? Number.parseFloat(amountMatch[1]) : undefined;
  }

  private extractServiceProvider(text: string): string | undefined {
    return text.split('\n')[0]?.trim();
  }

  private extractPersonName(text: string): string | undefined {
    // Would implement name extraction logic
    return undefined;
  }

  private extractJobTitle(text: string): string | undefined {
    // Would implement job title extraction
    return undefined;
  }

  private extractCompanyName(text: string): string | undefined {
    return text.split('\n')[0]?.trim();
  }

  private extractEmail(text: string): string | undefined {
    const emailMatch = text.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    );
    return emailMatch ? emailMatch[0] : undefined;
  }

  private extractPhoneNumber(text: string): string | undefined {
    const phoneMatch = text.match(
      /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/,
    );
    return phoneMatch ? phoneMatch[0] : undefined;
  }

  private extractWebsite(text: string): string | undefined {
    const websiteMatch = text.match(
      /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/,
    );
    return websiteMatch ? websiteMatch[0] : undefined;
  }

  private extractDocumentTitle(text: string): string | undefined {
    return text.split('\n')[0]?.trim();
  }

  private extractKeyTerms(text: string): string[] {
    // Simple key term extraction - would use NLP for better results
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3)
      .slice(0, 10);
  }
}
