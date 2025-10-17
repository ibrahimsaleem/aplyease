import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { JobApplication } from '../shared/schema';

interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  snippet: string;
}

interface ParsedStatusUpdate {
  applicationId?: string;
  companyName: string;
  jobTitle: string;
  newStatus: JobApplication['status'];
  confidence: number;
  emailId: string;
  extractedInfo: {
    interviewDate?: string;
    rejectionReason?: string;
    offerDetails?: string;
    nextSteps?: string;
  };
}

export class EmailParserService {
  private gmail: any;
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    this.oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async fetchRecentEmails(daysBack: number = 7): Promise<EmailMessage[]> {
    try {
      const query = this.buildEmailQuery(daysBack);
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50
      });

      const messages = response.data.messages || [];
      const emailPromises = messages.map(msg => this.getEmailDetails(msg.id));
      const emails = await Promise.all(emailPromises);

      return emails.filter(email => this.isJobRelated(email));
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  private buildEmailQuery(daysBack: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const dateStr = date.toISOString().split('T')[0];

    return [
      `after:${dateStr}`,
      'from:(noreply OR careers OR recruiting OR hr OR talent)',
      'subject:(interview OR application OR job OR position OR hiring OR offer OR rejection OR thank you)',
      'has:attachment OR has:attachment'
    ].join(' ');
  }

  private async getEmailDetails(messageId: string): Promise<EmailMessage> {
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const headers = response.data.payload.headers;
    const getHeader = (name: string) => 
      headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const body = this.extractEmailBody(response.data.payload);
    
    return {
      id: messageId,
      threadId: response.data.threadId,
      subject: getHeader('subject'),
      from: getHeader('from'),
      to: getHeader('to'),
      date: getHeader('date'),
      body,
      snippet: response.data.snippet
    };
  }

  private extractEmailBody(payload: any): string {
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString();
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString();
        }
        if (part.parts) {
          const nestedBody = this.extractEmailBody(part);
          if (nestedBody) return nestedBody;
        }
      }
    }

    return '';
  }

  private isJobRelated(email: EmailMessage): boolean {
    const jobKeywords = [
      'application', 'interview', 'job', 'position', 'hiring', 'career',
      'recruiting', 'talent', 'offer', 'rejection', 'thank you', 'next steps',
      'schedule', 'meeting', 'phone screen', 'technical', 'onsite'
    ];

    const content = `${email.subject} ${email.snippet} ${email.body}`.toLowerCase();
    return jobKeywords.some(keyword => content.includes(keyword));
  }

  async parseStatusUpdate(email: EmailMessage): Promise<ParsedStatusUpdate | null> {
    try {
      // This would integrate with your LLM service (OpenAI, Anthropic, etc.)
      const llmResponse = await this.callLLMForParsing(email);
      
      if (!llmResponse || llmResponse.confidence < 0.7) {
        return null;
      }

      return {
        applicationId: llmResponse.applicationId,
        companyName: llmResponse.companyName,
        jobTitle: llmResponse.jobTitle,
        newStatus: llmResponse.newStatus,
        confidence: llmResponse.confidence,
        emailId: email.id,
        extractedInfo: llmResponse.extractedInfo
      };
    } catch (error) {
      console.error('Error parsing email:', error);
      return null;
    }
  }

  private async callLLMForParsing(email: EmailMessage): Promise<any> {
    // This is where you'd integrate with your LLM service
    // For now, using a simple pattern-based approach as fallback
    
    const content = `${email.subject}\n\n${email.body}`;
    const statusPatterns = {
      'Interview': /interview|meeting|schedule|phone screen|technical interview/i,
      'Offer': /offer|congratulations|welcome|accepted|salary|compensation/i,
      'Rejected': /unfortunately|not selected|not moving forward|rejection|decline/i,
      'Screening': /screening|initial|first round|phone call/i,
      'On Hold': /pause|hold|delayed|postponed/i
    };

    for (const [status, pattern] of Object.entries(statusPatterns)) {
      if (pattern.test(content)) {
        return {
          newStatus: status,
          confidence: 0.8,
          companyName: this.extractCompanyName(email.from),
          jobTitle: this.extractJobTitle(email.subject),
          extractedInfo: this.extractAdditionalInfo(content, status)
        };
      }
    }

    return null;
  }

  private extractCompanyName(from: string): string {
    // Extract company name from email address
    const match = from.match(/@([^.]+)\./);
    return match ? match[1] : 'Unknown Company';
  }

  private extractJobTitle(subject: string): string {
    // Simple extraction - could be improved with LLM
    const patterns = [
      /position[:\s]+([^,]+)/i,
      /role[:\s]+([^,]+)/i,
      /job[:\s]+([^,]+)/i
    ];

    for (const pattern of patterns) {
      const match = subject.match(pattern);
      if (match) return match[1].trim();
    }

    return 'Unknown Position';
  }

  private extractAdditionalInfo(content: string, status: string): any {
    const info: any = {};

    if (status === 'Interview') {
      const dateMatch = content.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
      if (dateMatch) info.interviewDate = dateMatch[1];
    }

    if (status === 'Rejected') {
      const reasonMatch = content.match(/unfortunately[^.]*\./i);
      if (reasonMatch) info.rejectionReason = reasonMatch[0];
    }

    if (status === 'Offer') {
      const salaryMatch = content.match(/\$[\d,]+/);
      if (salaryMatch) info.offerDetails = salaryMatch[0];
    }

    return info;
  }
}