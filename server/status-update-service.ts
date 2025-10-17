import { storage } from './storage';
import { JobApplication } from '../shared/schema';
import { ParsedStatusUpdate } from './email-parser';

export class StatusUpdateService {
  async processStatusUpdates(updates: ParsedStatusUpdate[]): Promise<void> {
    for (const update of updates) {
      try {
        await this.updateApplicationStatus(update);
        console.log(`Updated application status: ${update.companyName} - ${update.newStatus}`);
      } catch (error) {
        console.error(`Failed to update status for ${update.companyName}:`, error);
      }
    }
  }

  private async updateApplicationStatus(update: ParsedStatusUpdate): Promise<void> {
    // Find matching application
    const application = await this.findMatchingApplication(update);
    
    if (!application) {
      console.log(`No matching application found for ${update.companyName} - ${update.jobTitle}`);
      return;
    }

    // Check if status update is valid
    if (!this.isValidStatusTransition(application.status, update.newStatus)) {
      console.log(`Invalid status transition: ${application.status} → ${update.newStatus}`);
      return;
    }

    // Update the application
    await storage.updateJobApplication(application.id, {
      status: update.newStatus,
      notes: this.buildStatusUpdateNote(application.notes, update)
    });

    // Log the update for audit trail
    await this.logStatusUpdate(application.id, update);
  }

  private async findMatchingApplication(update: ParsedStatusUpdate): Promise<JobApplication | null> {
    // First try to find by applicationId if provided
    if (update.applicationId) {
      return await storage.getJobApplication(update.applicationId);
    }

    // Otherwise, search by company name and job title
    const filters = {
      search: `${update.companyName} ${update.jobTitle}`,
      limit: 10
    };

    const { applications } = await storage.listJobApplications(filters);
    
    // Find best match using fuzzy matching
    return this.findBestMatch(applications, update);
  }

  private findBestMatch(applications: JobApplication[], update: ParsedStatusUpdate): JobApplication | null {
    let bestMatch: JobApplication | null = null;
    let bestScore = 0;

    for (const app of applications) {
      const companyScore = this.calculateSimilarity(
        app.companyName.toLowerCase(), 
        update.companyName.toLowerCase()
      );
      
      const titleScore = this.calculateSimilarity(
        app.jobTitle.toLowerCase(), 
        update.jobTitle.toLowerCase()
      );

      const totalScore = (companyScore * 0.7) + (titleScore * 0.3);
      
      if (totalScore > bestScore && totalScore > 0.6) {
        bestScore = totalScore;
        bestMatch = app;
      }
    }

    return bestMatch;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private isValidStatusTransition(currentStatus: JobApplication['status'], newStatus: JobApplication['status']): boolean {
    // Define valid status transitions
    const validTransitions: Record<JobApplication['status'], JobApplication['status'][]> = {
      'Applied': ['Screening', 'Interview', 'Rejected', 'On Hold'],
      'Screening': ['Interview', 'Rejected', 'On Hold'],
      'Interview': ['Offer', 'Rejected', 'On Hold'],
      'Offer': ['Hired', 'Rejected'],
      'Hired': [], // Terminal state
      'Rejected': [], // Terminal state
      'On Hold': ['Applied', 'Screening', 'Interview', 'Rejected']
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private buildStatusUpdateNote(currentNotes: string | null, update: ParsedStatusUpdate): string {
    const timestamp = new Date().toISOString();
    const statusNote = `[${timestamp}] Status updated to ${update.newStatus} via email parsing (confidence: ${update.confidence})`;
    
    let additionalInfo = '';
    if (update.extractedInfo.interviewDate) {
      additionalInfo += `\nInterview scheduled: ${update.extractedInfo.interviewDate}`;
    }
    if (update.extractedInfo.rejectionReason) {
      additionalInfo += `\nRejection reason: ${update.extractedInfo.rejectionReason}`;
    }
    if (update.extractedInfo.offerDetails) {
      additionalInfo += `\nOffer details: ${update.extractedInfo.offerDetails}`;
    }

    return currentNotes 
      ? `${currentNotes}\n\n${statusNote}${additionalInfo}`
      : `${statusNote}${additionalInfo}`;
  }

  private async logStatusUpdate(applicationId: string, update: ParsedStatusUpdate): Promise<void> {
    // This could be extended to log to a separate audit table
    console.log(`Status update logged: ${applicationId} → ${update.newStatus} (${update.emailId})`);
  }
}