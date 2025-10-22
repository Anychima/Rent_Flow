/**
 * Automated Payment Scheduler
 * Run this script via cron job to automate payment generation and reminders
 * 
 * Recommended Schedule:
 * - Generate monthly payments: 0 0 1 * * (1st of every month at midnight)
 * - Mark overdue payments: 0 2 * * * (Daily at 2 AM)
 * - Send reminders: 0 9 * * * (Daily at 9 AM)
 */

import dotenv from 'dotenv';
import paymentScheduler from '../services/paymentScheduler';

dotenv.config();

interface SchedulerResults {
  task: string;
  success: boolean;
  details: any;
  timestamp: string;
}

class AutomatedPaymentScheduler {
  private results: SchedulerResults[] = [];

  /**
   * Run all automated tasks
   */
  async runAll(): Promise<void> {
    console.log('🤖 Starting Automated Payment Scheduler');
    console.log('=====================================');
    console.log(`⏰ Time: ${new Date().toLocaleString()}`);
    console.log('=====================================\n');

    await this.generateMonthlyPayments();
    await this.markOverduePayments();
    await this.sendPaymentReminders();

    this.printSummary();
  }

  /**
   * Generate monthly payments for all active leases
   */
  async generateMonthlyPayments(): Promise<void> {
    console.log('📅 Task 1: Generating Monthly Payments...');
    try {
      const results = await paymentScheduler.generateMonthlyPayments();
      
      this.results.push({
        task: 'Generate Monthly Payments',
        success: results.errors === 0,
        details: results,
        timestamp: new Date().toISOString()
      });

      console.log(`   ✅ Created: ${results.created} payment(s)`);
      console.log(`   ❌ Errors: ${results.errors}`);
      
      if (results.details.length > 0) {
        console.log('   Details:');
        results.details.forEach(detail => console.log(`      - ${detail}`));
      }
      console.log('');
    } catch (error) {
      console.error('   ❌ Error:', error);
      this.results.push({
        task: 'Generate Monthly Payments',
        success: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString()
      });
      console.log('');
    }
  }

  /**
   * Mark overdue payments as late
   */
  async markOverduePayments(): Promise<void> {
    console.log('⏰ Task 2: Marking Overdue Payments...');
    try {
      const results = await paymentScheduler.markOverduePayments();
      
      this.results.push({
        task: 'Mark Overdue Payments',
        success: !results.error,
        details: results,
        timestamp: new Date().toISOString()
      });

      if (results.error) {
        console.log(`   ❌ Error: ${results.error}`);
      } else {
        console.log(`   ✅ Marked: ${results.updated} payment(s) as late`);
      }
      console.log('');
    } catch (error) {
      console.error('   ❌ Error:', error);
      this.results.push({
        task: 'Mark Overdue Payments',
        success: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString()
      });
      console.log('');
    }
  }

  /**
   * Send payment reminders to tenants
   */
  async sendPaymentReminders(): Promise<void> {
    console.log('📧 Task 3: Sending Payment Reminders...');
    try {
      const results = await paymentScheduler.sendPaymentReminders();
      
      this.results.push({
        task: 'Send Payment Reminders',
        success: results.errors === 0,
        details: results,
        timestamp: new Date().toISOString()
      });

      console.log(`   ✅ Sent: ${results.sent} reminder(s)`);
      console.log(`   ❌ Errors: ${results.errors}`);
      
      if (results.details.length > 0 && results.details.length <= 10) {
        console.log('   Details:');
        results.details.forEach(detail => console.log(`      - ${detail}`));
      } else if (results.details.length > 10) {
        console.log('   Details (showing first 10):');
        results.details.slice(0, 10).forEach(detail => console.log(`      - ${detail}`));
        console.log(`      ... and ${results.details.length - 10} more`);
      }
      console.log('');
    } catch (error) {
      console.error('   ❌ Error:', error);
      this.results.push({
        task: 'Send Payment Reminders',
        success: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString()
      });
      console.log('');
    }
  }

  /**
   * Print summary of all tasks
   */
  private printSummary(): void {
    console.log('=====================================');
    console.log('📊 Summary');
    console.log('=====================================');
    
    const totalTasks = this.results.length;
    const successfulTasks = this.results.filter(r => r.success).length;
    const failedTasks = totalTasks - successfulTasks;

    console.log(`Total Tasks: ${totalTasks}`);
    console.log(`Successful: ${successfulTasks} ✅`);
    console.log(`Failed: ${failedTasks} ❌`);
    console.log('');

    this.results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.task}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    });

    console.log('');
    console.log('=====================================');
    console.log('✨ Scheduler Completed');
    console.log('=====================================\n');
  }
}

// Run the scheduler
async function main() {
  const scheduler = new AutomatedPaymentScheduler();
  await scheduler.runAll();
  process.exit(0);
}

// Execute if run directly
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Fatal Error:', error);
    process.exit(1);
  });
}

export default AutomatedPaymentScheduler;
