/**
 * Payment Scheduler Service
 * Automatically generates monthly rent payments for active leases
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || ''
);

interface Lease {
  id: string;
  tenant_id: string;
  property_id: string;
  monthly_rent_usdc: number;
  rent_due_day: number;
  start_date: string;
  end_date: string;
  status: string;
}

class PaymentScheduler {
  /**
   * Generate monthly payments for all active leases
   * Should be run daily via cron job
   */
  async generateMonthlyPayments(): Promise<{
    created: number;
    errors: number;
    details: string[];
  }> {
    const results = {
      created: 0,
      errors: 0,
      details: [] as string[],
    };

    try {
      // Get all active leases
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select('*')
        .eq('status', 'active');

      if (leasesError) {
        results.errors++;
        results.details.push(`Failed to fetch leases: ${leasesError.message}`);
        return results;
      }

      if (!leases || leases.length === 0) {
        results.details.push('No active leases found');
        return results;
      }

      // Process each lease
      for (const lease of leases as Lease[]) {
        try {
          const paymentsCreated = await this.generatePaymentsForLease(lease);
          results.created += paymentsCreated;
          if (paymentsCreated > 0) {
            results.details.push(
              `Created ${paymentsCreated} payment(s) for lease ${lease.id}`
            );
          }
        } catch (error) {
          results.errors++;
          results.details.push(
            `Error processing lease ${lease.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      return results;
    } catch (error) {
      results.errors++;
      results.details.push(
        `Scheduler error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return results;
    }
  }

  /**
   * Generate payments for a specific lease
   * Creates payments for current month and next 2 months if they don't exist
   */
  private async generatePaymentsForLease(lease: Lease): Promise<number> {
    let created = 0;
    const today = new Date();
    const rentDueDay = lease.rent_due_day || 1;

    // Validate lease data
    if (!lease.id || !lease.tenant_id || !lease.property_id) {
      console.error('Invalid lease data - missing required fields:', lease);
      return 0;
    }

    if (!lease.monthly_rent_usdc || lease.monthly_rent_usdc <= 0) {
      console.error('Invalid rent amount for lease:', lease.id);
      return 0;
    }

    // Generate for current month + next 2 months
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const targetDate = new Date(
        today.getFullYear(),
        today.getMonth() + monthOffset,
        rentDueDay
      );

      // Skip if date is before lease start or after lease end
      if (
        targetDate < new Date(lease.start_date) ||
        targetDate > new Date(lease.end_date)
      ) {
        continue;
      }

      // Check if payment already exists for this month
      const { data: existingPayment } = await supabase
        .from('rent_payments')
        .select('id')
        .eq('lease_id', lease.id)
        .gte('due_date', new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).toISOString())
        .lt('due_date', new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1).toISOString())
        .single();

      if (existingPayment) {
        continue; // Payment already exists
      }

      // Create payment with validated amount
      const { error } = await supabase.from('rent_payments').insert({
        lease_id: lease.id,
        tenant_id: lease.tenant_id,
        amount_usdc: parseFloat(lease.monthly_rent_usdc.toString()),
        due_date: targetDate.toISOString().split('T')[0],
        status: 'pending',
        payment_date: targetDate.toISOString(),
        blockchain_network: 'solana',
        notes: `Auto-generated monthly rent payment`,
      });

      if (!error) {
        created++;
      } else {
        console.error('Error creating payment for lease:', lease.id, error);
      }
    }

    return created;
  }

  /**
   * Mark overdue payments as late
   * Should be run daily
   */
  async markOverduePayments(): Promise<{
    updated: number;
    error?: string;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('rent_payments')
        .update({ status: 'late' })
        .eq('status', 'pending')
        .lt('due_date', today)
        .select();

      if (error) {
        return { updated: 0, error: error.message };
      }

      return { updated: data?.length || 0 };
    } catch (error) {
      return {
        updated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get upcoming payments (due within next 7 days)
   */
  async getUpcomingPayments(daysAhead: number = 7): Promise<any[]> {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + daysAhead);

      const { data, error } = await supabase
        .from('rent_payments')
        .select(`
          *,
          lease:leases(
            *,
            property:properties(*)
          ),
          tenant:users(*)
        `)
        .eq('status', 'pending')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', futureDate.toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching upcoming payments:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUpcomingPayments:', error);
      return [];
    }
  }

  /**
   * Send payment reminders for upcoming due dates
   * Should be run daily
   */
  async sendPaymentReminders(): Promise<{
    sent: number;
    errors: number;
    details: string[];
  }> {
    const results = {
      sent: 0,
      errors: 0,
      details: [] as string[],
    };

    try {
      // Get payments due in 3 days or 1 day
      const upcomingPayments = await this.getUpcomingPayments(3);

      for (const payment of upcomingPayments) {
        const dueDate = new Date(payment.due_date);
        const today = new Date();
        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Send reminder if due in 3 days or 1 day
        if (daysUntilDue === 3 || daysUntilDue === 1) {
          // TODO: Integrate with email service or notification system
          // For now, just log
          console.log(
            `📧 Reminder: Payment ${payment.id} due in ${daysUntilDue} day(s) for ${payment.tenant?.email}`
          );
          results.sent++;
          results.details.push(
            `Reminder sent to ${payment.tenant?.email} for payment due ${payment.due_date}`
          );
        }
      }

      return results;
    } catch (error) {
      results.errors++;
      results.details.push(
        `Reminder error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return results;
    }
  }
}

export default new PaymentScheduler();
