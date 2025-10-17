import cron from 'node-cron';
import { EmailSyncService } from './email-sync-service';

export class SchedulerService {
  private emailSync: EmailSyncService;
  private isRunning = false;

  constructor() {
    this.emailSync = new EmailSyncService();
  }

  start(): void {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log('Starting email sync scheduler...');
    this.isRunning = true;

    // Run email sync every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      try {
        console.log('Running scheduled email sync...');
        await this.emailSync.syncJobApplicationStatuses();
        console.log('Scheduled email sync completed');
      } catch (error) {
        console.error('Scheduled email sync failed:', error);
      }
    });

    // Run email sync every day at 9 AM for more thorough processing
    cron.schedule('0 9 * * *', async () => {
      try {
        console.log('Running daily email sync...');
        await this.emailSync.syncJobApplicationStatuses();
        console.log('Daily email sync completed');
      } catch (error) {
        console.error('Daily email sync failed:', error);
      }
    });

    console.log('Email sync scheduler started');
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('Scheduler is not running');
      return;
    }

    cron.getTasks().forEach(task => task.destroy());
    this.isRunning = false;
    console.log('Email sync scheduler stopped');
  }

  async runNow(): Promise<void> {
    try {
      console.log('Running manual email sync...');
      await this.emailSync.syncJobApplicationStatuses();
      console.log('Manual email sync completed');
    } catch (error) {
      console.error('Manual email sync failed:', error);
      throw error;
    }
  }
}