/**
 * Voice Notification Scheduler
 * Automates sending of voice notifications for various events
 */

import { createClient } from '@supabase/supabase-js';
import elevenLabsService from './elevenLabsService';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

class VoiceNotificationScheduler {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    console.log('🔔 Voice Notification Scheduler initialized');
  }

  /**
   * Start the scheduler
   */
  start(intervalMinutes: number = 60) {
    if (this.isRunning) {
      console.warn('⚠️  Voice notification scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log(`✅ Voice notification scheduler started (checking every ${intervalMinutes} minutes)`);

    // Run immediately
    this.checkAndSendNotifications();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.checkAndSendNotifications();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Voice notification scheduler stopped');
  }

  /**
   * Main function to check and send notifications
   */
  private async checkAndSendNotifications() {
    console.log(`🔍 [${new Date().toISOString()}] Checking for voice notifications to send...`);

    try {
      await this.sendRentReminders();
      await this.sendLeaseExpirationWarnings();
      await this.cleanupOldNotifications();
    } catch (error) {
      console.error('Error in voice notification scheduler:', error);
    }
  }

  /**
   * Send rent reminders for upcoming due payments
   */
  private async sendRentReminders() {
    try {
      const today = new Date();
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(today.getDate() + 3);

      // Get payments due in the next 3 days that haven't been paid
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          *,
          lease:leases(
            *,
            property:properties(*),
            tenant:users(*)
          )
        `)
        .eq('status', 'pending')
        .gte('due_date', today.toISOString())
        .lte('due_date', threeDaysFromNow.toISOString());

      if (error) throw error;

      if (!payments || payments.length === 0) {
        console.log('  No upcoming rent payments requiring reminders');
        return;
      }

      console.log(`  Found ${payments.length} upcoming rent payments`);

      for (const payment of payments) {
        // Check if we already sent a reminder recently
        const { data: existingNotification } = await supabase
          .from('voice_notifications')
          .select('*')
          .eq('user_id', payment.tenant_id)
          .eq('type', 'rent_reminder')
          .eq('related_id', payment.id)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (existingNotification) {
          console.log(`  Skipping rent reminder for payment ${payment.id} (already sent today)`);
          continue;
        }

        const lease = payment.lease as any;
        const tenant = lease.tenant;
        const property = lease.property;

        // Generate voice notification
        const result = await elevenLabsService.generateRentReminder(
          tenant.full_name,
          payment.amount_usdc,
          new Date(payment.due_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          }),
          property.address
        );

        if (result.success) {
          await supabase.from('voice_notifications').insert([{
            user_id: payment.tenant_id,
            type: 'rent_reminder',
            audio_url: result.audioUrl,
            related_id: payment.id,
            status: 'generated',
            sent_at: new Date().toISOString()
          }]);

          console.log(`  ✅ Generated rent reminder for ${tenant.full_name} (Payment: $${payment.amount_usdc})`);
        } else {
          console.error(`  ❌ Failed to generate rent reminder for payment ${payment.id}:`, result.error);
        }
      }
    } catch (error) {
      console.error('Error sending rent reminders:', error);
    }
  }

  /**
   * Send lease expiration warnings
   */
  private async sendLeaseExpirationWarnings() {
    try {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      // Get leases expiring in the next 30 days
      const { data: leases, error } = await supabase
        .from('leases')
        .select(`
          *,
          property:properties(*),
          tenant:users(*)
        `)
        .eq('status', 'active')
        .gte('end_date', today.toISOString())
        .lte('end_date', thirtyDaysFromNow.toISOString());

      if (error) throw error;

      if (!leases || leases.length === 0) {
        console.log('  No leases expiring in the next 30 days');
        return;
      }

      console.log(`  Found ${leases.length} leases expiring soon`);

      for (const lease of leases) {
        const endDate = new Date(lease.end_date);
        const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Send warnings at 30, 14, and 7 days before expiration
        if (![30, 14, 7].includes(daysRemaining)) {
          continue;
        }

        // Check if we already sent this specific warning
        const { data: existingNotification } = await supabase
          .from('voice_notifications')
          .select('*')
          .eq('user_id', lease.tenant_id)
          .eq('type', 'lease_expiration')
          .eq('related_id', lease.id)
          .gte('created_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (existingNotification) {
          console.log(`  Skipping lease expiration warning for lease ${lease.id} (already sent)`);
          continue;
        }

        const tenant = lease.tenant as any;
        const property = lease.property as any;

        // Generate voice notification
        const result = await elevenLabsService.generateLeaseExpirationWarning(
          tenant.full_name,
          endDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          }),
          property.address,
          daysRemaining
        );

        if (result.success) {
          await supabase.from('voice_notifications').insert([{
            user_id: lease.tenant_id,
            type: 'lease_expiration',
            audio_url: result.audioUrl,
            related_id: lease.id,
            status: 'generated',
            sent_at: new Date().toISOString()
          }]);

          console.log(`  ✅ Generated lease expiration warning for ${tenant.full_name} (${daysRemaining} days remaining)`);
        } else {
          console.error(`  ❌ Failed to generate lease expiration warning for lease ${lease.id}:`, result.error);
        }
      }
    } catch (error) {
      console.error('Error sending lease expiration warnings:', error);
    }
  }

  /**
   * Clean up old audio files and notifications
   */
  private async cleanupOldNotifications() {
    try {
      // Clean up audio files older than 30 days
      const deletedCount = elevenLabsService.cleanupOldAudioFiles(30);
      
      if (deletedCount > 0) {
        console.log(`  🧹 Cleaned up ${deletedCount} old audio files`);
      }

      // Mark old notifications as archived (keep for records)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count, error } = await supabase
        .from('voice_notifications')
        .update({ status: 'archived' })
        .eq('status', 'delivered')
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      if (count && count > 0) {
        console.log(`  📦 Archived ${count} old notifications`);
      }
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }

  /**
   * Send immediate notification for maintenance status change
   */
  async sendMaintenanceNotification(maintenanceId: string, customMessage?: string) {
    try {
      const { data: maintenance, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          requestor:users(*),
          property:properties(*)
        `)
        .eq('id', maintenanceId)
        .single();

      if (error || !maintenance) {
        console.error('Maintenance request not found:', maintenanceId);
        return { success: false, error: 'Maintenance request not found' };
      }

      const requestor = maintenance.requestor as any;
      const statusMessages: Record<string, string> = {
        pending: 'We have received your request and will review it shortly',
        approved: 'Your request has been approved and assigned to a contractor',
        in_progress: 'Work is currently in progress',
        completed: 'The maintenance work has been completed',
        cancelled: 'This request has been cancelled'
      };

      const message = customMessage || statusMessages[maintenance.status] || 'Status updated';

      const result = await elevenLabsService.generateMaintenanceUpdate(
        requestor.full_name,
        maintenance.title,
        maintenance.status.replace('_', ' '),
        message
      );

      if (result.success) {
        await supabase.from('voice_notifications').insert([{
          user_id: maintenance.requestor_id,
          type: 'maintenance_update',
          audio_url: result.audioUrl,
          related_id: maintenanceId,
          status: 'generated',
          sent_at: new Date().toISOString()
        }]);

        console.log(`✅ Generated maintenance notification for ${requestor.full_name}`);
        return { success: true, audioUrl: result.audioUrl };
      }

      return result;
    } catch (error) {
      console.error('Error sending maintenance notification:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send immediate notification for payment confirmation
   */
  async sendPaymentConfirmation(paymentId: string) {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select(`
          *,
          lease:leases(
            property:properties(*),
            tenant:users(*)
          )
        `)
        .eq('id', paymentId)
        .single();

      if (error || !payment) {
        console.error('Payment not found:', paymentId);
        return { success: false, error: 'Payment not found' };
      }

      if (!payment.transaction_hash) {
        return { success: false, error: 'Payment has no transaction hash' };
      }

      const lease = payment.lease as any;
      const tenant = lease.tenant;
      const property = lease.property;

      const result = await elevenLabsService.generatePaymentConfirmation(
        tenant.full_name,
        payment.amount_usdc,
        payment.transaction_hash,
        property.address
      );

      if (result.success) {
        await supabase.from('voice_notifications').insert([{
          user_id: payment.tenant_id,
          type: 'payment_confirmation',
          audio_url: result.audioUrl,
          related_id: paymentId,
          status: 'generated',
          sent_at: new Date().toISOString()
        }]);

        console.log(`✅ Generated payment confirmation for ${tenant.full_name}`);
        return { success: true, audioUrl: result.audioUrl };
      }

      return result;
    } catch (error) {
      console.error('Error sending payment confirmation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export default new VoiceNotificationScheduler();
