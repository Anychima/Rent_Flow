/**
 * OpenAI Service for AI-Powered Maintenance Analysis
 * Analyzes maintenance requests and provides intelligent suggestions
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.join(__dirname, '../../../.env') });

interface MaintenanceAnalysis {
  suggestedPriority: 'low' | 'medium' | 'high' | 'urgent';
  suggestedCategory: string;
  estimatedCost: {
    min: number;
    max: number;
    average: number;
  };
  reasoning: string;
  urgencyScore: number; // 1-10
  recommendedActions: string[];
}

class OpenAIService {
  private client: OpenAI | null = null;
  private isConfigured: boolean = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (apiKey && apiKey.length > 0) {
      this.client = new OpenAI({ apiKey });
      this.isConfigured = true;
      console.log('✅ OpenAI service initialized successfully');
    } else {
      console.warn('⚠️  OpenAI API key not configured. AI features will be simulated.');
    }
  }

  /**
   * Check if OpenAI is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Analyze a maintenance request and provide intelligent suggestions
   */
  async analyzeMaintenanceRequest(
    title: string,
    description: string,
    propertyType?: string
  ): Promise<MaintenanceAnalysis> {
    if (!this.isConfigured || !this.client) {
      // Return simulated analysis
      return this.simulateAnalysis(title, description);
    }

    try {
      const prompt = this.buildAnalysisPrompt(title, description, propertyType);
      
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert property maintenance analyst with 20+ years of experience. You analyze maintenance requests and provide accurate cost estimates, priority levels, and categorization. Respond ONLY with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        max_tokens: 500,
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      const analysis = JSON.parse(responseText);

      return this.validateAnalysis(analysis);
    } catch (error) {
      console.error('OpenAI analysis error:', error);
      // Fallback to simulated analysis
      return this.simulateAnalysis(title, description);
    }
  }

  /**
   * Build the analysis prompt
   */
  private buildAnalysisPrompt(
    title: string,
    description: string,
    propertyType?: string
  ): string {
    return `
Analyze this property maintenance request and provide a detailed assessment:

**Request Title:** ${title}
**Description:** ${description}
${propertyType ? `**Property Type:** ${propertyType}` : ''}

Please analyze and respond with ONLY a JSON object in this exact format:
{
  "suggestedPriority": "low" | "medium" | "high" | "urgent",
  "suggestedCategory": "plumbing" | "electrical" | "hvac" | "appliance" | "structural" | "pest_control" | "landscaping" | "security" | "cleaning" | "other",
  "estimatedCost": {
    "min": <number>,
    "max": <number>,
    "average": <number>
  },
  "reasoning": "<brief explanation of your assessment>",
  "urgencyScore": <1-10>,
  "recommendedActions": ["<action 1>", "<action 2>", "<action 3>"]
}

Consider:
- Safety hazards warrant "urgent" priority
- Water/electrical issues are typically high priority
- Cosmetic issues are low priority
- Estimate costs in USD based on typical contractor rates
- Provide 3-5 specific recommended actions
`.trim();
  }

  /**
   * Validate and normalize the AI response
   */
  private validateAnalysis(analysis: any): MaintenanceAnalysis {
    return {
      suggestedPriority: this.normalizePriority(analysis.suggestedPriority),
      suggestedCategory: this.normalizeCategory(analysis.suggestedCategory),
      estimatedCost: {
        min: Math.max(0, parseFloat(analysis.estimatedCost?.min) || 50),
        max: Math.max(0, parseFloat(analysis.estimatedCost?.max) || 500),
        average: Math.max(0, parseFloat(analysis.estimatedCost?.average) || 250),
      },
      reasoning: analysis.reasoning || 'AI analysis completed',
      urgencyScore: Math.min(10, Math.max(1, parseInt(analysis.urgencyScore) || 5)),
      recommendedActions: Array.isArray(analysis.recommendedActions) 
        ? analysis.recommendedActions.slice(0, 5)
        : ['Contact a professional contractor', 'Schedule inspection'],
    };
  }

  /**
   * Normalize priority to valid values
   */
  private normalizePriority(priority: string): 'low' | 'medium' | 'high' | 'urgent' {
    const normalized = priority?.toLowerCase();
    if (['low', 'medium', 'high', 'urgent'].includes(normalized)) {
      return normalized as 'low' | 'medium' | 'high' | 'urgent';
    }
    return 'medium';
  }

  /**
   * Normalize category to valid values
   */
  private normalizeCategory(category: string): string {
    const validCategories = [
      'plumbing', 'electrical', 'hvac', 'appliance', 'structural',
      'pest_control', 'landscaping', 'security', 'cleaning', 'other'
    ];
    const normalized = category?.toLowerCase()?.replace(/\s+/g, '_');
    return validCategories.includes(normalized) ? normalized : 'other';
  }

  /**
   * Simulate AI analysis when OpenAI is not configured
   */
  private simulateAnalysis(title: string, description: string): MaintenanceAnalysis {
    const text = `${title} ${description}`.toLowerCase();
    
    // Simple keyword-based simulation
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    let category = 'other';
    let urgencyScore = 5;
    let estimatedCost = { min: 100, max: 500, average: 300 };

    // Detect urgent issues
    if (text.includes('leak') || text.includes('flood') || text.includes('fire') || 
        text.includes('gas') || text.includes('emergency')) {
      priority = 'urgent';
      urgencyScore = 9;
    } else if (text.includes('broken') || text.includes('not working')) {
      priority = 'high';
      urgencyScore = 7;
    } else if (text.includes('cosmetic') || text.includes('paint')) {
      priority = 'low';
      urgencyScore = 3;
    }

    // Detect category
    if (text.includes('water') || text.includes('faucet') || text.includes('toilet') || text.includes('pipe')) {
      category = 'plumbing';
      estimatedCost = { min: 100, max: 800, average: 400 };
    } else if (text.includes('electric') || text.includes('outlet') || text.includes('wiring')) {
      category = 'electrical';
      estimatedCost = { min: 150, max: 1000, average: 500 };
    } else if (text.includes('heat') || text.includes('ac') || text.includes('hvac') || text.includes('air')) {
      category = 'hvac';
      estimatedCost = { min: 200, max: 1500, average: 700 };
    } else if (text.includes('appliance') || text.includes('refrigerator') || text.includes('stove')) {
      category = 'appliance';
      estimatedCost = { min: 100, max: 600, average: 300 };
    } else if (text.includes('pest') || text.includes('bug') || text.includes('mouse') || text.includes('rat')) {
      category = 'pest_control';
      estimatedCost = { min: 150, max: 400, average: 250 };
    }

    return {
      suggestedPriority: priority,
      suggestedCategory: category,
      estimatedCost,
      reasoning: `SIMULATED: Based on keywords in description, this appears to be a ${category} issue with ${priority} priority.`,
      urgencyScore,
      recommendedActions: [
        'Contact a licensed contractor',
        'Schedule inspection',
        priority === 'urgent' ? 'Address immediately' : 'Schedule within 1-2 weeks'
      ],
    };
  }

  /**
   * Generate a completion estimate message
   */
  async generateCompletionMessage(
    requestTitle: string,
    actualCost: number,
    estimatedCost: number
  ): Promise<string> {
    if (!this.isConfigured || !this.client) {
      const variance = ((actualCost - estimatedCost) / estimatedCost * 100).toFixed(1);
      return `Work completed on "${requestTitle}". Actual cost: $${actualCost} (${variance}% vs estimate)`;
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: `Generate a brief professional completion message for this maintenance work:
            
Task: ${requestTitle}
Estimated Cost: $${estimatedCost}
Actual Cost: $${actualCost}

Keep it to 1-2 sentences. Be professional and informative.`
          }
        ],
        temperature: 0.7,
        max_tokens: 100,
      });

      return completion.choices[0]?.message?.content || 
        `Work completed on "${requestTitle}". Actual cost: $${actualCost}`;
    } catch (error) {
      console.error('OpenAI completion message error:', error);
      return `Work completed on "${requestTitle}". Actual cost: $${actualCost}`;
    }
  }
}

export default new OpenAIService();
export type { MaintenanceAnalysis };
