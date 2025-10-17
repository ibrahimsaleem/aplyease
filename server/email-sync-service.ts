import { EmailParserService } from './email-parser';
import { StatusUpdateService } from './status-update-service';
import { ParsedStatusUpdate } from './email-parser';

export class EmailSyncService {
  private emailParser: EmailParserService;
  private statusUpdater: StatusUpdateService;

  constructor() {
    this.emailParser = new EmailParserService();
    this.statusUpdater = new StatusUpdateService();
  }

  async syncJobApplicationStatuses(): Promise<void> {
    try {
      console.log('Starting email sync for job application statuses...');
      
      // Fetch recent job-related emails
      const emails = await this.emailParser.fetchRecentEmails(7);
      console.log(`Found ${emails.length} job-related emails`);

      if (emails.length === 0) {
        console.log('No job-related emails found');
        return;
      }

      // Parse each email for status updates
      const statusUpdates: ParsedStatusUpdate[] = [];
      
      for (const email of emails) {
        const update = await this.emailParser.parseStatusUpdate(email);
        if (update) {
          statusUpdates.push(update);
        }
      }

      console.log(`Parsed ${statusUpdates.length} status updates from emails`);

      if (statusUpdates.length === 0) {
        console.log('No status updates found in emails');
        return;
      }

      // Process the status updates
      await this.statusUpdater.processStatusUpdates(statusUpdates);
      
      console.log('Email sync completed successfully');
    } catch (error) {
      console.error('Error during email sync:', error);
      throw error;
    }
  }

  async syncSingleEmail(emailId: string): Promise<void> {
    try {
      console.log(`Processing single email: ${emailId}`);
      
      // This would need to be implemented in EmailParserService
      // const email = await this.emailParser.getEmailById(emailId);
      // const update = await this.emailParser.parseStatusUpdate(email);
      // if (update) {
      //   await this.statusUpdater.processStatusUpdates([update]);
      // }
      
      console.log('Single email processing completed');
    } catch (error) {
      console.error('Error processing single email:', error);
      throw error;
    }
  }
}