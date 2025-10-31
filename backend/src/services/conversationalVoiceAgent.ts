import { createClient } from '@supabase/supabase-js';
import elevenLabsService from './elevenLabsService';
import openaiService from './openaiService';
import { aiDecisionsContract } from './aiDecisionsContract';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!
);

/**
 * Conversational Voice AI Agent
 * Handles natural language voice interactions for rent payments, lease queries, and maintenance
 * Built for ElevenLabs Hackathon Prize: "Best Use of Voice AI"
 */
export class ConversationalVoiceAgent {
  /**
   * Process voice query and return voice response
   * Example queries:
   * - "What's my rent status?"
   * - "When is my next payment due?"
   * - "I need to report a maintenance issue"
   */
  async processVoiceQuery(
    userId: string,
    voiceTranscript: string
  ): Promise<{
    success: boolean;
    audioUrl?: string;
    textResponse?: string;
    action?: string;
    error?: string;
  }> {
    try {
      console.log(`🎙️ [Voice Agent] Processing query from user ${userId}: "${voiceTranscript}"`);

      // Step 1: Get user context
      const userContext = await this.getUserContext(userId);

      // Step 2: Use OpenAI to understand intent and generate response
      const aiResponse = await this.generateIntelligentResponse(voiceTranscript, userContext);

      // Step 3: Generate voice response using ElevenLabs
      const voiceResult = await elevenLabsService.generateSpeech({
        text: aiResponse.textResponse
      });

      const audioUrl = voiceResult.audioUrl;

      console.log(`✅ [Voice Agent] Generated response for user ${userId}`);

      return {
        success: true,
        audioUrl,
        textResponse: aiResponse.textResponse,
        action: aiResponse.suggestedAction
      };
    } catch (error) {
      console.error('❌ [Voice Agent] Error processing voice query:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get comprehensive user context for AI
   */
  private async getUserContext(userId: string) {
    // Get user profile
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // Get active leases
    const { data: leases } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(title, address, monthly_rent_usdc)
      `)
      .eq('tenant_id', userId)
      .eq('status', 'active');

    // Get recent payments
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get maintenance requests
    const { data: maintenance } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('requested_by', userId)
      .order('created_at', { ascending: false })
      .limit(3);

    return {
      user,
      leases,
      payments,
      maintenance
    };
  }

  /**
   * Use OpenAI to generate intelligent, context-aware response
   */
  private async generateIntelligentResponse(
    query: string,
    context: any
  ): Promise<{ textResponse: string; suggestedAction?: string }> {
    const prompt = `You are RentFlow AI, a helpful voice assistant for property rental management.

USER QUERY: "${query}"

USER CONTEXT:
- Active Leases: ${context.leases?.length || 0}
${context.leases?.map((l: any) => 
  `  * ${l.property?.title}: $${l.property?.monthly_rent_usdc} USDC/month, Next due: ${l.next_rent_due_date || 'Not set'}`
).join('\n') || '  None'}

- Recent Payments: ${context.payments?.length || 0}
${context.payments?.map((p: any) => 
  `  * ${p.payment_type}: $${p.amount_usdc} USDC on ${new Date(p.created_at).toLocaleDateString()}`
).join('\n') || '  None'}

- Maintenance Requests: ${context.maintenance?.length || 0}
${context.maintenance?.map((m: any) => 
  `  * ${m.title} (${m.status})`
).join('\n') || '  None'}

Generate a friendly, helpful voice response (max 3 sentences). 
If the user wants to take action (pay rent, report issue, etc.), suggest it clearly.

Response format:
{
  "textResponse": "Your spoken response here",
  "suggestedAction": "pay_rent|report_maintenance|check_lease|none"
}`;

    try {
      const response = await openaiService.analyzeMaintenanceRequest(
        'Voice Query Processing',
        prompt
      );
      
      const aiResult = response.reasoning;
      
      // Try to parse JSON response
      try {
        // First check if response is already an object
        if (typeof aiResult === 'object' && aiResult !== null) {
          return {
            textResponse: (aiResult as any).textResponse || JSON.stringify(aiResult),
            suggestedAction: (aiResult as any).suggestedAction || 'none'
          };
        }
        
        const parsed = JSON.parse(aiResult as string);
        return {
          textResponse: parsed.textResponse,
          suggestedAction: parsed.suggestedAction
        };
      } catch {
        // Fallback if AI doesn't return JSON
        return {
          textResponse: aiResult,
          suggestedAction: 'none'
        };
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        textResponse: "I'm having trouble understanding right now. Please try asking me about your rent payments, lease details, or maintenance requests.",
        suggestedAction: 'none'
      };
    }
  }

  /**
   * Voice-activated payment processing
   * Example: "Pay my rent for this month"
   */
  async processVoicePayment(
    userId: string,
    voiceCommand: string
  ): Promise<{
    success: boolean;
    message: string;
    audioUrl?: string;
    paymentId?: string;
  }> {
    try {
      console.log(`💰 [Voice Payment] Processing command: "${voiceCommand}"`);

      // Get active lease
      const { data: lease } = await supabase
        .from('leases')
        .select(`
          *,
          property:properties(title, monthly_rent_usdc),
          tenant:users(circle_wallet_id),
          landlord:users(circle_wallet_id)
        `)
        .eq('tenant_id', userId)
        .eq('status', 'active')
        .single();

      if (!lease) {
        const errorMsg = "You don't have an active lease. Please contact your property manager.";
        const voiceResult = await elevenLabsService.generateSpeech({ text: errorMsg });
        const audioUrl = voiceResult.audioUrl;
        return { success: false, message: errorMsg, audioUrl };
      }

      // Check wallet availability
      if (!lease.tenant?.circle_wallet_id || !lease.landlord?.circle_wallet_id) {
        const errorMsg = "Wallet setup incomplete. Please connect your wallet first.";
        const voiceResult = await elevenLabsService.generateSpeech({ text: errorMsg });
        const audioUrl = voiceResult.audioUrl;
        return { success: false, message: errorMsg, audioUrl };
      }

      // Calculate amount from voice command using AI
      const amount = await this.extractPaymentAmount(voiceCommand, lease.property.monthly_rent_usdc);

      // RECORD VOICE AUTHORIZATION ON-CHAIN
      let onChainAuthId: string | undefined;
      try {
        const authResult = await aiDecisionsContract.recordVoiceAuthorization({
          user: lease.tenant.circle_wallet_id || userId,
          commandType: 'pay_rent',
          command: voiceCommand,
          authorized: true
        });
        
        onChainAuthId = authResult.authId;
        console.log(`✅ [Blockchain] Voice authorization recorded on-chain: ${onChainAuthId}`);
      } catch (error) {
        console.error('⚠️ [Blockchain] Failed to record voice authorization on-chain:', error);
      }

      // Create payment record
      const { data: payment } = await supabase
        .from('payments')
        .insert({
          lease_id: lease.id,
          tenant_id: userId,
          landlord_id: lease.landlord_id,
          amount_usdc: amount,
          payment_type: 'rent',
          status: 'pending',
          payment_method: 'voice_command',
          due_date: new Date().toISOString().split('T')[0],
          blockchain_auth_id: onChainAuthId // Link to on-chain authorization
        })
        .select()
        .single();

      const successMsg = `Great! I've initiated your rent payment of $${amount} USDC. You'll receive a confirmation shortly.`;
      const voiceResult = await elevenLabsService.generateSpeech({ text: successMsg });
      const audioUrl = voiceResult.audioUrl;

      return {
        success: true,
        message: successMsg,
        audioUrl,
        paymentId: payment?.id
      };
    } catch (error) {
      console.error('❌ [Voice Payment] Error:', error);
      const errorMsg = "Sorry, I couldn't process that payment. Please try again or use the app.";
      const voiceResult = await elevenLabsService.generateSpeech({ text: errorMsg });
      const audioUrl = voiceResult.audioUrl;
      return {
        success: false,
        message: errorMsg,
        audioUrl
      };
    }
  }

  /**
   * Extract payment amount from natural language
   */
  private async extractPaymentAmount(command: string, defaultAmount: number): Promise<number> {
    const lowerCommand = command.toLowerCase();
    
    // Check for explicit amounts
    const amountMatch = lowerCommand.match(/\$?(\d+(?:\.\d{2})?)/);
    if (amountMatch) {
      return parseFloat(amountMatch[1]);
    }

    // Check for keywords
    if (lowerCommand.includes('full') || lowerCommand.includes('rent') || lowerCommand.includes('month')) {
      return defaultAmount;
    }

    // Default to monthly rent
    return defaultAmount;
  }
}

export const conversationalVoiceAgent = new ConversationalVoiceAgent();
