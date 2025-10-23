/**
 * Property Application Service
 * Handles rental applications with AI-powered scoring
 */

import openaiService from './openaiService';

interface ApplicationData {
  property_id: string;
  applicant_id: string;
  employment_status?: string;
  employer_name?: string;
  monthly_income_usdc?: number;
  years_at_current_job?: number;
  previous_landlord_name?: string;
  previous_landlord_contact?: string;
  years_at_previous_address?: number;
  reason_for_moving?: string;
  references?: any[];
  cover_letter?: string;
  pets_description?: string;
  emergency_contact?: any;
  requested_move_in_date?: string;
}

interface PropertyData {
  monthly_rent_usdc: number;
  property_type: string;
  title: string;
}

class ApplicationService {
  /**
   * Calculate AI compatibility score for an application
   */
  async scoreApplication(
    applicationData: ApplicationData,
    propertyData: PropertyData
  ): Promise<{
    compatibilityScore: number;
    riskScore: number;
    analysis: any;
  }> {
    try {
      console.log('🤖 Calculating AI compatibility score...');

      const monthlyIncome = applicationData.monthly_income_usdc || 0;
      const monthlyRent = propertyData.monthly_rent_usdc;
      const incomeToRentRatio = monthlyIncome > 0 ? monthlyIncome / monthlyRent : 0;

      // Base scoring factors
      let compatibilityScore = 50; // Start at neutral
      let riskScore = 50; // Lower is better
      const factors: string[] = [];

      // Income-to-Rent Ratio (40% weight)
      if (incomeToRentRatio >= 3.5) {
        compatibilityScore += 20;
        riskScore -= 15;
        factors.push('✅ Excellent income-to-rent ratio (3.5x or higher)');
      } else if (incomeToRentRatio >= 3.0) {
        compatibilityScore += 15;
        riskScore -= 10;
        factors.push('✅ Good income-to-rent ratio (3x)');
      } else if (incomeToRentRatio >= 2.5) {
        compatibilityScore += 8;
        riskScore -= 5;
        factors.push('⚠️  Adequate income-to-rent ratio (2.5x)');
      } else if (incomeToRentRatio > 0) {
        compatibilityScore -= 10;
        riskScore += 15;
        factors.push('❌ Below recommended income-to-rent ratio');
      }

      // Employment Stability (25% weight)
      const yearsAtJob = applicationData.years_at_current_job || 0;
      if (yearsAtJob >= 2) {
        compatibilityScore += 12;
        riskScore -= 8;
        factors.push('✅ Stable employment (2+ years)');
      } else if (yearsAtJob >= 1) {
        compatibilityScore += 6;
        riskScore -= 4;
        factors.push('✅ Recent employment (1+ year)');
      } else if (yearsAtJob > 0) {
        riskScore += 5;
        factors.push('⚠️  New employment (less than 1 year)');
      }

      // Rental History (20% weight)
      const yearsAtPrevious = applicationData.years_at_previous_address || 0;
      if (yearsAtPrevious >= 2) {
        compatibilityScore += 10;
        riskScore -= 5;
        factors.push('✅ Long-term rental history');
      } else if (yearsAtPrevious >= 1) {
        compatibilityScore += 5;
        riskScore -= 2;
        factors.push('✅ Rental history provided');
      }

      // References (10% weight)
      if (applicationData.references && applicationData.references.length >= 2) {
        compatibilityScore += 5;
        riskScore -= 3;
        factors.push('✅ Multiple references provided');
      }

      // Cover Letter (5% weight)
      if (applicationData.cover_letter && applicationData.cover_letter.length > 100) {
        compatibilityScore += 3;
        riskScore -= 2;
        factors.push('✅ Detailed cover letter');
      }

      // Normalize scores to 0-100 range
      compatibilityScore = Math.max(0, Math.min(100, compatibilityScore));
      riskScore = Math.max(0, Math.min(100, riskScore));

      // Use OpenAI for advanced analysis if available
      let aiInsights = null;
      if (openaiService.isReady()) {
        try {
          const completionMessage = await openaiService.generateCompletionMessage(
            `Application for ${propertyData.title}`,
            compatibilityScore,
            riskScore
          );
          
          aiInsights = completionMessage;
        } catch (error) {
          console.error('Error getting AI insights:', error);
        }
      }

      const analysis = {
        incomeToRentRatio: incomeToRentRatio.toFixed(2),
        incomeVerification: monthlyIncome > 0 ? 'Provided' : 'Missing',
        employmentStability: yearsAtJob >= 2 ? 'Stable' : yearsAtJob >= 1 ? 'Recent' : 'New',
        rentalHistory: yearsAtPrevious >= 2 ? 'Long-term' : yearsAtPrevious > 0 ? 'Short-term' : 'None provided',
        referencesCount: applicationData.references?.length || 0,
        factors,
        aiInsights,
        recommendation: compatibilityScore >= 75 ? 'Highly Recommended' :
                       compatibilityScore >= 60 ? 'Recommended' :
                       compatibilityScore >= 45 ? 'Consider with Caution' :
                       'Not Recommended'
      };

      console.log('✅ Compatibility Score:', compatibilityScore);
      console.log('✅ Risk Score:', riskScore);
      console.log('✅ Recommendation:', analysis.recommendation);

      return {
        compatibilityScore,
        riskScore,
        analysis
      };

    } catch (error) {
      console.error('Error scoring application:', error);
      // Return neutral scores on error
      return {
        compatibilityScore: 50,
        riskScore: 50,
        analysis: {
          error: 'Failed to calculate score',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Validate application data
   */
  validateApplication(data: ApplicationData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.property_id) {
      errors.push('Property ID is required');
    }

    if (!data.applicant_id) {
      errors.push('Applicant ID is required');
    }

    if (!data.monthly_income_usdc || data.monthly_income_usdc <= 0) {
      errors.push('Monthly income is required and must be greater than 0');
    }

    if (!data.employment_status) {
      errors.push('Employment status is required');
    }

    if (!data.requested_move_in_date) {
      errors.push('Requested move-in date is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate application summary for notifications
   */
  generateApplicationSummary(
    applicationData: ApplicationData,
    applicantName: string,
    propertyTitle: string
  ): string {
    return `
📋 New Rental Application

Property: ${propertyTitle}
Applicant: ${applicantName}

Employment: ${applicationData.employment_status || 'Not specified'}
Monthly Income: $${applicationData.monthly_income_usdc?.toLocaleString() || 'Not provided'} USDC
Move-in Date: ${applicationData.requested_move_in_date || 'Not specified'}

${applicationData.cover_letter ? `\n"${applicationData.cover_letter.substring(0, 200)}..."` : ''}
    `.trim();
  }
}

export default new ApplicationService();
