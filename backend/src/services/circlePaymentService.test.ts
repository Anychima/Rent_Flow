import circlePaymentService from './circlePaymentService';

describe('CirclePaymentService', () => {
  describe('Service Status', () => {
    it('should report ready status when API key is configured', () => {
      const originalApiKey = process.env.CIRCLE_API_KEY;
      const originalSecret = process.env.ENTITY_SECRET;
      process.env.CIRCLE_API_KEY = 'test-api-key-12345';
      process.env.ENTITY_SECRET = 'test-entity-secret';

      const isReady = circlePaymentService.isReady();
      
      process.env.CIRCLE_API_KEY = originalApiKey;
      process.env.ENTITY_SECRET = originalSecret;
      expect(isReady).toBe(true);
    });

    it('should report not ready when API key is missing', () => {
      const originalApiKey = process.env.CIRCLE_API_KEY;
      delete process.env.CIRCLE_API_KEY;

      const isReady = circlePaymentService.isReady();
      
      process.env.CIRCLE_API_KEY = originalApiKey;
      expect(isReady).toBe(false);
    });
  });

  describe('Transfer Initiation', () => {
    it('should return error when service is not configured', async () => {
      const originalApiKey = process.env.CIRCLE_API_KEY;
      delete process.env.CIRCLE_API_KEY;

      const result = await circlePaymentService.initiateTransfer(
        'wallet-id',
        'destination-address',
        100,
        { 
          paymentId: 'payment-123', 
          leaseId: 'lease-123', 
          purpose: 'test' 
        }
      );

      process.env.CIRCLE_API_KEY = originalApiKey;
      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should validate positive amount', async () => {
      const result = await circlePaymentService.initiateTransfer(
        'wallet-id',
        'destination-address',
        -10,
        { 
          paymentId: 'payment-123', 
          leaseId: 'lease-123', 
          purpose: 'test' 
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('greater than 0');
    });

    it('should validate required wallet ID', async () => {
      const result = await circlePaymentService.initiateTransfer(
        '',
        'destination-address',
        100,
        { 
          paymentId: 'payment-123', 
          leaseId: 'lease-123', 
          purpose: 'test' 
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should validate required destination address', async () => {
      const result = await circlePaymentService.initiateTransfer(
        'wallet-id',
        '',
        100,
        { 
          paymentId: 'payment-123', 
          leaseId: 'lease-123', 
          purpose: 'test' 
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const originalApiKey = process.env.CIRCLE_API_KEY;
      process.env.CIRCLE_API_KEY = 'invalid-api-key';

      const result = await circlePaymentService.initiateTransfer(
        'wallet-id',
        'destination-address',
        100,
        { 
          paymentId: 'payment-123', 
          leaseId: 'lease-123', 
          purpose: 'test' 
        }
      );

      process.env.CIRCLE_API_KEY = originalApiKey;
      // Should return error result, not throw
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
    });
  });

  describe('Service Methods', () => {
    it('should have initiateTransfer method', () => {
      expect(typeof circlePaymentService.initiateTransfer).toBe('function');
    });

    it('should have isReady method', () => {
      expect(typeof circlePaymentService.isReady).toBe('function');
    });

    it('should validate transfer amount is positive', async () => {
      const result = await circlePaymentService.initiateTransfer(
        'wallet-id',
        'destination',
        0,
        { 
          paymentId: 'payment-123', 
          leaseId: 'lease-123', 
          purpose: 'test' 
        }
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });
});
