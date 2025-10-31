import { createClient } from '@supabase/supabase-js';
import circlePaymentService from './circlePaymentService';
import { aiDecisionsContract } from './aiDecisionsContract';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!
);

/**
 * Autonomous AI Agent for Rent Payment Processing
 * This agent makes financial decisions and executes USDC payments without human intervention
 */
export class AutonomousPaymentAgent {
  /**
   * AI-driven autonomous rent payment processing
   * Evaluates lease terms, tenant history, and executes payments
   */
  async processAutonomousRentPayments() {
    console.log('🤖 [AI Agent] Starting autonomous rent payment cycle...');

    // 1. Find all leases with upcoming rent due (within 3 days)
    const { data: upcomingLeases, error } = await supabase
      .from('leases')
      .select(`
        *,
        tenant:users!leases_tenant_id_fkey(id, email, full_name, circle_wallet_id),
        landlord:users!leases_landlord_id_fkey(id, circle_wallet_id),
        property:properties(id, title, monthly_rent_usdc)
      `)
      .eq('status', 'active')
      .gte('next_rent_due_date', new Date().toISOString())
      .lte('next_rent_due_date', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString());

    if (error || !upcomingLeases?.length) {
      console.log('ℹ️ No upcoming rent payments found');
      return { success: true, processed: 0 };
    }

    const results = [];

    for (const lease of upcomingLeases) {
      try {
        // 2. AI Decision: Should this payment be auto-processed?
        const aiDecision = await this.evaluatePaymentEligibility(lease);

        if (!aiDecision.shouldProcess) {
          console.log(`⏭️ [AI Agent] Skipping lease ${lease.id}: ${aiDecision.reason}`);
          continue;
        }

        // 3. AI Action: Execute autonomous USDC payment
        const paymentResult = await this.executeAutonomousPayment(lease, aiDecision);

        results.push({
          leaseId: lease.id,
          tenantId: lease.tenant_id,
          amount: lease.property.monthly_rent_usdc,
          status: paymentResult.success ? 'executed' : 'failed',
          transactionHash: paymentResult.transactionHash,
          aiReasoning: aiDecision.reasoning
        });

        console.log(`✅ [AI Agent] Autonomous payment executed for lease ${lease.id}`);

      } catch (error) {
        console.error(`❌ [AI Agent] Failed to process lease ${lease.id}:`, error);
        results.push({
          leaseId: lease.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      success: true,
      processed: results.length,
      results
    };
  }

  /**
   * AI evaluates whether payment should be auto-processed
   */
  private async evaluatePaymentEligibility(lease: any) {
    // Check tenant wallet availability
    if (!lease.tenant?.circle_wallet_id) {
      return {
        shouldProcess: false,
        reason: 'Tenant wallet not connected',
        confidence: 0
      };
    }

    // Check landlord wallet availability
    if (!lease.landlord?.circle_wallet_id) {
      return {
        shouldProcess: false,
        reason: 'Landlord wallet not configured',
        confidence: 0
      };
    }

    // Get tenant payment history
    const { data: paymentHistory } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', lease.tenant_id)
      .order('created_at', { ascending: false })
      .limit(6);

    // AI Decision Logic
    const onTimePayments = paymentHistory?.filter((p: any) => p.status === 'completed').length || 0;
    const totalPayments = paymentHistory?.length || 0;
    const paymentReliability = totalPayments > 0 ? onTimePayments / totalPayments : 0;

    // AI confidence scoring
    const confidence = Math.min(paymentReliability * 100, 95);

    const shouldProcess = 
      paymentReliability >= 0.8 || // 80% payment success rate
      totalPayments === 0; // First payment (benefit of doubt)

    return {
      shouldProcess,
      confidence,
      reasoning: `Tenant has ${onTimePayments}/${totalPayments} successful payments (${(paymentReliability * 100).toFixed(1)}% reliability). AI confidence: ${confidence.toFixed(1)}%`,
      paymentReliability
    };
  }

  /**
   * Execute autonomous USDC payment via Circle API
   */
  private async executeAutonomousPayment(lease: any, aiDecision: any) {
    const amount = lease.property.monthly_rent_usdc;

    console.log(`💰 [AI Agent] Executing autonomous payment: ${amount} USDC`);
    console.log(`🧠 [AI Agent] Reasoning: ${aiDecision.reasoning}`);

    // 1. RECORD AI DECISION ON-CHAIN (before executing payment)
    let onChainDecisionId: string | undefined;
    try {
      const onChainResult = await aiDecisionsContract.recordPaymentDecision({
        tenant: lease.tenant.circle_wallet_id || lease.tenant_id,
        landlord: lease.landlord.circle_wallet_id || lease.landlord_id,
        amountUSDC: amount,
        approved: true,
        confidenceScore: aiDecision.confidence,
        reasoning: aiDecision.reasoning
      });
      
      onChainDecisionId = onChainResult.decisionId;
      console.log(`✅ [Blockchain] AI decision recorded on-chain: ${onChainDecisionId}`);
    } catch (error) {
      console.error('⚠️ [Blockchain] Failed to record decision on-chain, continuing with payment:', error);
    }

    // 2. Execute payment through Circle API  
    const paymentResult = await circlePaymentService.initiateTransfer(
      lease.tenant.circle_wallet_id,
      lease.landlord.circle_wallet_id,
      amount,
      {
        paymentId: `ai-auto-${Date.now()}`,
        leaseId: lease.id,
        purpose: `AI-Autonomous Rent Payment - ${lease.property.title} - ${new Date().toLocaleDateString()}`,
        gasless: false
      }
    );

    if (!paymentResult.success) {
      throw new Error(`Payment execution failed: ${paymentResult.error}`);
    }

    // 3. Mark payment as executed on-chain
    if (onChainDecisionId && paymentResult.transactionHash) {
      try {
        await aiDecisionsContract.markPaymentExecuted(
          onChainDecisionId,
          paymentResult.transactionHash
        );
        console.log(`✅ [Blockchain] Payment marked as executed on-chain`);
      } catch (error) {
        console.error('⚠️ [Blockchain] Failed to mark payment executed on-chain:', error);
      }
    }

    // 4. Record payment in database
    await supabase.from('payments').insert({
      lease_id: lease.id,
      tenant_id: lease.tenant_id,
      landlord_id: lease.landlord_id,
      amount_usdc: amount,
      payment_type: 'rent',
      status: 'completed',
      transaction_hash: paymentResult.transactionHash,
      payment_method: 'ai_autonomous',
      ai_processed: true,
      ai_confidence_score: aiDecision.confidence,
      ai_reasoning: aiDecision.reasoning,
      blockchain_decision_id: onChainDecisionId // Link to on-chain decision
    });

    // 5. Update lease next payment date
    const nextDueDate = new Date(lease.next_rent_due_date);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);

    await supabase
      .from('leases')
      .update({ 
        next_rent_due_date: nextDueDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', lease.id);

    return {
      success: true,
      transactionHash: paymentResult.transactionHash,
      blockchainDecisionId: onChainDecisionId,
      amount,
      nextDueDate
    };
  }
}

export const autonomousPaymentAgent = new AutonomousPaymentAgent();
