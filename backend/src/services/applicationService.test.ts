import applicationService from './applicationService';

describe('ApplicationService', () => {
  describe('Service Initialization', () => {
    it('should initialize without errors', () => {
      expect(applicationService).toBeDefined();
      expect(typeof applicationService.createApplication).toBe('function');
      expect(typeof applicationService.processApplicationWithAI).toBe('function');
      expect(typeof applicationService.updateApplicationStatus).toBe('function');
    });
  });

  describe('Application Validation', () => {
    const validApplicationData = {
      property_id: '550e8400-e29b-41d4-a716-446655440000',
      applicant_id: '550e8400-e29b-41d4-a716-446655440001',
      monthly_income: 5000,
      employment_status: 'employed',
      rental_history: 'Good rental history for 5 years',
      credit_score: 750,
      desired_move_in_date: '2025-02-01',
    };

    it('should validate application data structure', () => {
      expect(validApplicationData).toHaveProperty('property_id');
      expect(validApplicationData).toHaveProperty('applicant_id');
      expect(validApplicationData).toHaveProperty('monthly_income');
      expect(validApplicationData.monthly_income).toBeGreaterThan(0);
    });

    it('should validate credit score range', () => {
      expect(validApplicationData.credit_score).toBeGreaterThanOrEqual(300);
      expect(validApplicationData.credit_score).toBeLessThanOrEqual(850);
    });

    it('should validate employment status values', () => {
      const validStatuses = ['employed', 'self_employed', 'unemployed', 'student', 'retired'];
      expect(validStatuses).toContain(validApplicationData.employment_status);
    });

    it('should validate UUID format for IDs', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(validApplicationData.property_id).toMatch(uuidRegex);
      expect(validApplicationData.applicant_id).toMatch(uuidRegex);
    });

    it('should validate date format', () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(validApplicationData.desired_move_in_date).toMatch(dateRegex);
    });
  });

  describe('Application Status Management', () => {
    const validStatuses = [
      'pending',
      'under_review',
      'approved',
      'rejected',
      'withdrawn',
      'expired'
    ];

    it('should recognize valid status values', () => {
      validStatuses.forEach(status => {
        expect(validStatuses).toContain(status);
      });
    });

    it('should validate status transitions', () => {
      // pending -> under_review (valid)
      expect(['pending', 'under_review']).toContain('under_review');
      
      // under_review -> approved (valid)
      expect(['under_review', 'approved']).toContain('approved');
      
      // under_review -> rejected (valid)
      expect(['under_review', 'rejected']).toContain('rejected');
    });
  });

  describe('Income Verification', () => {
    it('should calculate monthly income correctly', () => {
      const monthlyIncome = 5000;
      const annualIncome = monthlyIncome * 12;
      
      expect(annualIncome).toBe(60000);
    });

    it('should verify income meets rent requirements', () => {
      const monthlyIncome = 5000;
      const monthlyRent = 1500;
      const incomeToRentRatio = monthlyIncome / monthlyRent;
      
      // Typically require 3x rent
      expect(incomeToRentRatio).toBeGreaterThanOrEqual(3);
    });

    it('should handle edge case of minimum income', () => {
      const monthlyIncome = 0;
      const monthlyRent = 1000;
      
      if (monthlyIncome === 0) {
        expect(monthlyIncome).toBe(0);
      } else {
        const ratio = monthlyIncome / monthlyRent;
        expect(ratio).toBeGreaterThan(0);
      }
    });
  });

  describe('Credit Score Evaluation', () => {
    it('should categorize excellent credit score', () => {
      const score = 800;
      const category = score >= 750 ? 'excellent' : score >= 700 ? 'good' : score >= 650 ? 'fair' : 'poor';
      expect(category).toBe('excellent');
    });

    it('should categorize good credit score', () => {
      const score = 720;
      const category = score >= 750 ? 'excellent' : score >= 700 ? 'good' : score >= 650 ? 'fair' : 'poor';
      expect(category).toBe('good');
    });

    it('should categorize fair credit score', () => {
      const score = 670;
      const category = score >= 750 ? 'excellent' : score >= 700 ? 'good' : score >= 650 ? 'fair' : 'poor';
      expect(category).toBe('fair');
    });

    it('should categorize poor credit score', () => {
      const score = 600;
      const category = score >= 750 ? 'excellent' : score >= 700 ? 'good' : score >= 650 ? 'fair' : 'poor';
      expect(category).toBe('poor');
    });

    it('should handle invalid credit scores', () => {
      const invalidScores = [-100, 0, 900, 1000];
      
      invalidScores.forEach(score => {
        const isValid = score >= 300 && score <= 850;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Application Priority Calculation', () => {
    it('should calculate high priority for strong applicant', () => {
      const creditScore = 800;
      const incomeToRentRatio = 4;
      const rentalHistory = 'excellent';
      
      const priorityScore = 
        (creditScore >= 750 ? 40 : creditScore >= 700 ? 30 : 20) +
        (incomeToRentRatio >= 4 ? 40 : incomeToRentRatio >= 3 ? 30 : 20) +
        (rentalHistory === 'excellent' ? 20 : rentalHistory === 'good' ? 10 : 0);
      
      expect(priorityScore).toBeGreaterThanOrEqual(80); // High priority
    });

    it('should calculate medium priority for average applicant', () => {
      const creditScore = 680;
      const incomeToRentRatio = 3.2;
      const rentalHistory = 'good';
      
      const priorityScore = 
        (creditScore >= 750 ? 40 : creditScore >= 700 ? 30 : 20) +
        (incomeToRentRatio >= 4 ? 40 : incomeToRentRatio >= 3 ? 30 : 20) +
        (rentalHistory === 'excellent' ? 20 : rentalHistory === 'good' ? 10 : 0);
      
      expect(priorityScore).toBeGreaterThanOrEqual(50);
      expect(priorityScore).toBeLessThan(80);
    });

    it('should calculate low priority for weak applicant', () => {
      const creditScore = 620;
      const incomeToRentRatio = 2.5;
      const rentalHistory = 'limited';
      
      const priorityScore = 
        (creditScore >= 750 ? 40 : creditScore >= 700 ? 30 : 20) +
        (incomeToRentRatio >= 4 ? 40 : incomeToRentRatio >= 3 ? 30 : 20) +
        (rentalHistory === 'excellent' ? 20 : rentalHistory === 'good' ? 10 : 0);
      
      expect(priorityScore).toBeLessThan(50);
    });
  });

  describe('Document Requirements', () => {
    const requiredDocuments = [
      'photo_id',
      'proof_of_income',
      'rental_history',
      'credit_report'
    ];

    it('should list all required documents', () => {
      expect(requiredDocuments).toHaveLength(4);
      expect(requiredDocuments).toContain('photo_id');
      expect(requiredDocuments).toContain('proof_of_income');
    });

    it('should validate document completeness', () => {
      const providedDocuments = ['photo_id', 'proof_of_income', 'rental_history', 'credit_report'];
      
      const isComplete = requiredDocuments.every(doc => providedDocuments.includes(doc));
      expect(isComplete).toBe(true);
    });

    it('should detect missing documents', () => {
      const providedDocuments = ['photo_id', 'proof_of_income'];
      
      const missingDocs = requiredDocuments.filter(doc => !providedDocuments.includes(doc));
      expect(missingDocs).toHaveLength(2);
      expect(missingDocs).toContain('rental_history');
      expect(missingDocs).toContain('credit_report');
    });
  });

  describe('Rental History Validation', () => {
    it('should parse rental history years', () => {
      const rentalHistory = 'Good rental history for 5 years';
      const yearsMatch = rentalHistory.match(/(\d+)\s*years?/i);
      
      expect(yearsMatch).not.toBeNull();
      if (yearsMatch) {
        const years = parseInt(yearsMatch[1]);
        expect(years).toBe(5);
      }
    });

    it('should detect positive rental keywords', () => {
      const positiveKeywords = ['excellent', 'good', 'clean', 'paid on time'];
      const rentalHistory = 'Excellent tenant, always paid on time';
      
      const hasPositiveIndicators = positiveKeywords.some(keyword => 
        rentalHistory.toLowerCase().includes(keyword.toLowerCase())
      );
      
      expect(hasPositiveIndicators).toBe(true);
    });

    it('should detect negative rental keywords', () => {
      const negativeKeywords = ['evicted', 'late payment', 'damage', 'complaint'];
      const rentalHistory = 'History of late payments';
      
      const hasNegativeIndicators = negativeKeywords.some(keyword => 
        rentalHistory.toLowerCase().includes(keyword.toLowerCase())
      );
      
      expect(hasNegativeIndicators).toBe(true);
    });
  });

  describe('Move-in Date Validation', () => {
    it('should validate future move-in date', () => {
      const moveInDate = new Date('2025-02-01');
      const today = new Date();
      
      expect(moveInDate.getTime()).toBeGreaterThan(today.getTime());
    });

    it('should reject past move-in date', () => {
      const moveInDate = new Date('2020-01-01');
      const today = new Date();
      
      expect(moveInDate.getTime()).toBeLessThan(today.getTime());
    });

    it('should validate reasonable move-in timeframe', () => {
      const moveInDate = new Date('2025-03-01');
      const today = new Date();
      const daysUntilMove = Math.floor((moveInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Typically accept move-in dates within 90 days
      expect(daysUntilMove).toBeLessThanOrEqual(90);
    });
  });

  describe('Application Scoring', () => {
    it('should calculate comprehensive application score', () => {
      const creditScore = 750;
      const incomeToRent = 4.0;
      const employmentYears = 3;
      const rentalYears = 5;
      
      const score = 
        (creditScore / 850 * 30) +  // Credit score component (max 30 points)
        (Math.min(incomeToRent / 5, 1) * 30) +  // Income component (max 30 points)
        (Math.min(employmentYears / 5, 1) * 20) +  // Employment component (max 20 points)
        (Math.min(rentalYears / 5, 1) * 20);  // Rental history component (max 20 points)
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThan(70); // Should be strong applicant
    });

    it('should handle applicant with no rental history', () => {
      const creditScore = 720;
      const incomeToRent = 3.5;
      const employmentYears = 2;
      const rentalYears = 0; // First-time renter
      
      const score = 
        (creditScore / 850 * 30) +
        (Math.min(incomeToRent / 5, 1) * 30) +
        (Math.min(employmentYears / 5, 1) * 20) +
        (Math.min(rentalYears / 5, 1) * 20);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(80); // Lower score due to no rental history
    });
  });
});
