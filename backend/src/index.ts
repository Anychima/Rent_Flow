import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import circlePaymentService from './services/circlePaymentService';
import paymentScheduler from './services/paymentScheduler';
import openaiService from './services/openaiService';
import elevenLabsService from './services/elevenLabsService';
import voiceNotificationScheduler from './services/voiceNotificationScheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/audio', express.static(path.join(__dirname, '../audio')));

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    network: process.env.BLOCKCHAIN_NETWORK,
    deployer: process.env.DEPLOYER_ADDRESS
  });
});

// Get all properties
app.get('/api/properties', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get property by ID
app.get('/api/properties/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Create new property
app.post('/api/properties', async (req: Request, res: Response) => {
  try {
    const propertyData = req.body;
    
    // Validate required fields
    const required = ['title', 'address', 'city', 'state', 'monthly_rent_usdc', 'security_deposit_usdc'];
    const missing = required.filter(field => !propertyData[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`
      });
    }

    const { data, error } = await supabase
      .from('properties')
      .insert([propertyData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Update property
app.put('/api/properties/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Delete property
app.delete('/api/properties/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get all leases
app.get('/api/leases', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        tenant:users(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching leases:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get lease by ID
app.get('/api/leases/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        tenant:users(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching lease:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Create new lease
app.post('/api/leases', async (req: Request, res: Response) => {
  try {
    const leaseData = req.body;
    
    // Validate required fields
    const required = ['property_id', 'tenant_id', 'start_date', 'end_date', 'monthly_rent_usdc'];
    const missing = required.filter(field => !leaseData[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`
      });
    }

    // Check if property is available
    const { data: existingLease } = await supabase
      .from('leases')
      .select('id')
      .eq('property_id', leaseData.property_id)
      .eq('status', 'active')
      .single();

    if (existingLease) {
      return res.status(400).json({
        success: false,
        error: 'Property already has an active lease'
      });
    }

    const { data, error } = await supabase
      .from('leases')
      .insert([leaseData])
      .select(`
        *,
        property:properties(*),
        tenant:users(*)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating lease:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Update lease
app.put('/api/leases/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('leases')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        property:properties(*),
        tenant:users(*)
      `)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating lease:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Terminate lease
app.post('/api/leases/:id/terminate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('leases')
      .update({ status: 'terminated' })
      .eq('id', id)
      .select(`
        *,
        property:properties(*),
        tenant:users(*)
      `)
      .single();

    if (error) throw error;

    res.json({ success: true, data, message: 'Lease terminated successfully' });
  } catch (error) {
    console.error('Error terminating lease:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Delete lease
app.delete('/api/leases/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('leases')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Lease deleted successfully' });
  } catch (error) {
    console.error('Error deleting lease:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get maintenance requests
app.get('/api/maintenance', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        property:properties(*),
        requestor:users(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get maintenance request by ID
app.get('/api/maintenance/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        property:properties(*),
        requestor:users(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching maintenance request:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Create maintenance request
app.post('/api/maintenance', async (req: Request, res: Response) => {
  try {
    const maintenanceData = req.body;
    
    // Validate required fields
    const required = ['property_id', 'requestor_id', 'title', 'category'];
    const missing = required.filter(field => !maintenanceData[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`
      });
    }

    // Set defaults
    const request = {
      ...maintenanceData,
      status: maintenanceData.status || 'pending',
      priority: maintenanceData.priority || 'medium',
      estimated_cost_usdc: maintenanceData.estimated_cost_usdc || 0,
      actual_cost_usdc: maintenanceData.actual_cost_usdc || 0,
    };

    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert([request])
      .select(`
        *,
        property:properties(*),
        requestor:users(*)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Update maintenance request
app.put('/api/maintenance/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('maintenance_requests')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        property:properties(*),
        requestor:users(*)
      `)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating maintenance request:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Update maintenance status
app.post('/api/maintenance/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'approved', 'in_progress', 'completed', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const { data, error } = await supabase
      .from('maintenance_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        property:properties(*),
        requestor:users(*)
      `)
      .single();

    if (error) throw error;

    res.json({ success: true, data, message: `Status updated to ${status}` });
  } catch (error) {
    console.error('Error updating maintenance status:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Assign contractor to maintenance request
app.post('/api/maintenance/:id/assign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { assigned_to, estimated_cost_usdc } = req.body;

    const updates: any = {
      assigned_to,
      updated_at: new Date().toISOString()
    };

    if (estimated_cost_usdc !== undefined) {
      updates.estimated_cost_usdc = estimated_cost_usdc;
    }

    const { data, error } = await supabase
      .from('maintenance_requests')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        property:properties(*),
        requestor:users(*)
      `)
      .single();

    if (error) throw error;

    res.json({ success: true, data, message: 'Contractor assigned successfully' });
  } catch (error) {
    console.error('Error assigning contractor:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Complete maintenance request with actual cost
app.post('/api/maintenance/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actual_cost_usdc, completion_notes } = req.body;

    const updates: any = {
      status: 'completed',
      actual_cost_usdc: actual_cost_usdc || 0,
      updated_at: new Date().toISOString()
    };

    if (completion_notes) {
      updates.notes = completion_notes;
    }

    const { data, error } = await supabase
      .from('maintenance_requests')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        property:properties(*),
        requestor:users(*)
      `)
      .single();

    if (error) throw error;

    res.json({ success: true, data, message: 'Maintenance request completed' });
  } catch (error) {
    console.error('Error completing maintenance request:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Delete maintenance request
app.delete('/api/maintenance/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('maintenance_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Maintenance request deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance request:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// =====================================
// AI-POWERED MAINTENANCE ANALYSIS
// =====================================

// Analyze maintenance request with AI
app.post('/api/maintenance/analyze', async (req: Request, res: Response) => {
  try {
    const { title, description, propertyType } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required for AI analysis'
      });
    }

    // Get AI analysis
    const analysis = await openaiService.analyzeMaintenanceRequest(
      title,
      description,
      propertyType
    );

    res.json({
      success: true,
      data: analysis,
      message: openaiService.isReady() 
        ? 'AI analysis completed successfully'
        : 'Simulated analysis (OpenAI not configured)'
    });
  } catch (error) {
    console.error('Error analyzing maintenance request:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Save AI analysis to maintenance request
app.post('/api/maintenance/:id/ai-analysis', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { analysis } = req.body;

    // Store AI analysis in the ai_analysis_cache table
    const { error: cacheError } = await supabase
      .from('ai_analysis_cache')
      .insert([{
        request_id: id,
        request_type: 'maintenance',
        analysis_data: analysis,
        model_used: openaiService.isReady() ? 'gpt-4' : 'simulated',
        created_at: new Date().toISOString()
      }]);

    if (cacheError) {
      console.warn('Failed to cache AI analysis:', cacheError);
    }

    // Update maintenance request with AI suggestions
    const { data, error } = await supabase
      .from('maintenance_requests')
      .update({
        priority: analysis.suggestedPriority,
        category: analysis.suggestedCategory,
        estimated_cost_usdc: analysis.estimatedCost.average,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        property:properties(*),
        requestor:users(*)
      `)
      .single();

    if (error) throw error;

    res.json({ 
      success: true, 
      data,
      message: 'AI suggestions applied successfully'
    });
  } catch (error) {
    console.error('Error saving AI analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get rent payments
app.get('/api/payments', async (req: Request, res: Response) => {
  try {
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
      .order('payment_date', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get payment by ID
app.get('/api/payments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get payments for a specific lease
app.get('/api/leases/:leaseId/payments', async (req: Request, res: Response) => {
  try {
    const { leaseId } = req.params;
    const { data, error } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('lease_id', leaseId)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching lease payments:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Create payment (initiate)
app.post('/api/payments', async (req: Request, res: Response) => {
  try {
    const paymentData = req.body;
    
    // Validate required fields
    const required = ['lease_id', 'tenant_id', 'amount_usdc', 'due_date'];
    const missing = required.filter(field => !paymentData[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`
      });
    }

    // Set default status and payment date
    const payment = {
      ...paymentData,
      status: paymentData.status || 'pending',
      payment_date: paymentData.payment_date || new Date().toISOString(),
      blockchain_network: 'solana',
    };

    const { data, error } = await supabase
      .from('rent_payments')
      .insert([payment])
      .select(`
        *,
        lease:leases(
          *,
          property:properties(*)
        ),
        tenant:users(*)
      `)
      .single();

    if (error) throw error;

    // TODO: Integrate with Circle API for actual USDC transfer
    // This would involve:
    // 1. Creating a transfer request to Circle API
    // 2. Getting transaction signature
    // 3. Updating payment record with transaction_hash

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Update payment status
app.put('/api/payments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('rent_payments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        lease:leases(
          *,
          property:properties(*)
        ),
        tenant:users(*)
      `)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Mark payment as completed
app.post('/api/payments/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { transaction_hash } = req.body;

    const { data, error } = await supabase
      .from('rent_payments')
      .update({ 
        status: 'completed',
        transaction_hash: transaction_hash || `SIMULATED_${Date.now()}`,
        payment_date: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        lease:leases(
          *,
          property:properties(*)
        ),
        tenant:users(*)
      `)
      .single();

    if (error) throw error;

    // Update lease total_paid
    if (data.lease_id) {
      const { data: lease } = await supabase
        .from('leases')
        .select('total_paid_usdc')
        .eq('id', data.lease_id)
        .single();

      if (lease) {
        await supabase
          .from('leases')
          .update({ 
            total_paid_usdc: (lease.total_paid_usdc || 0) + parseFloat(data.amount_usdc),
            last_payment_date: new Date().toISOString()
          })
          .eq('id', data.lease_id);
      }
    }

    res.json({ success: true, data, message: 'Payment completed successfully' });
  } catch (error) {
    console.error('Error completing payment:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get pending payments (for a tenant or all)
app.get('/api/payments/pending', async (req: Request, res: Response) => {
  try {
    const { tenant_id } = req.query;

    let query = supabase
      .from('rent_payments')
      .select(`
        *,
        lease:leases(
          *,
          property:properties(*)
        ),
        tenant:users(*)
      `)
      .eq('status', 'pending');

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Check for overdue payments
app.get('/api/payments/overdue', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

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
      .in('status', ['pending', 'late'])
      .lt('due_date', today)
      .order('due_date', { ascending: true });

    if (error) throw error;

    // Mark as late if not already
    const overdueIds = data?.filter(p => p.status === 'pending').map(p => p.id) || [];
    if (overdueIds.length > 0) {
      await supabase
        .from('rent_payments')
        .update({ status: 'late' })
        .in('id', overdueIds);
    }

    res.json({ success: true, data, count: data?.length || 0 });
  } catch (error) {
    console.error('Error fetching overdue payments:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// =====================================
// ENHANCED PAYMENT ENDPOINTS
// =====================================

// Initiate USDC payment with Circle API
app.post('/api/payments/:id/initiate-transfer', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fromWalletId, toAddress } = req.body;

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('rent_payments')
      .select(`
        *,
        lease:leases(*)
      `)
      .eq('id', id)
      .single();

    if (paymentError) throw paymentError;

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    if (payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Payment already completed'
      });
    }

    // Initiate Circle transfer
    const transferResult = await circlePaymentService.initiateTransfer(
      fromWalletId,
      toAddress,
      parseFloat(payment.amount_usdc),
      {
        paymentId: payment.id,
        leaseId: payment.lease_id,
        purpose: 'Monthly Rent Payment'
      }
    );

    if (!transferResult.success) {
      return res.status(400).json({
        success: false,
        error: transferResult.error || 'Transfer failed'
      });
    }

    // Update payment with transaction hash
    const { data: updatedPayment, error: updateError } = await supabase
      .from('rent_payments')
      .update({
        status: 'processing',
        transaction_hash: transferResult.transactionHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        lease:leases(
          *,
          property:properties(*)
        ),
        tenant:users(*)
      `)
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      data: updatedPayment,
      message: 'Payment transfer initiated successfully'
    });
  } catch (error) {
    console.error('Error initiating payment transfer:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate monthly payments for all active leases
app.post('/api/payments/generate-monthly', async (req: Request, res: Response) => {
  try {
    const results = await paymentScheduler.generateMonthlyPayments();

    res.json({
      success: true,
      data: results,
      message: `Generated ${results.created} payment(s) with ${results.errors} error(s)`
    });
  } catch (error) {
    console.error('Error generating monthly payments:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get upcoming payments (for reminders)
app.get('/api/payments/upcoming', async (req: Request, res: Response) => {
  try {
    const daysAhead = parseInt(req.query.days as string) || 7;
    const payments = await paymentScheduler.getUpcomingPayments(daysAhead);

    res.json({
      success: true,
      data: payments,
      count: payments.length
    });
  } catch (error) {
    console.error('Error fetching upcoming payments:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send payment reminders
app.post('/api/payments/send-reminders', async (req: Request, res: Response) => {
  try {
    const results = await paymentScheduler.sendPaymentReminders();

    res.json({
      success: true,
      data: results,
      message: `Sent ${results.sent} reminder(s) with ${results.errors} error(s)`
    });
  } catch (error) {
    console.error('Error sending payment reminders:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mark overdue payments as late (scheduled task)
app.post('/api/payments/mark-overdue', async (req: Request, res: Response) => {
  try {
    const result = await paymentScheduler.markOverduePayments();

    if (result.error) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: { updated: result.updated },
      message: `Marked ${result.updated} payment(s) as late`
    });
  } catch (error) {
    console.error('Error marking overdue payments:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get payment analytics
app.get('/api/payments/analytics', async (req: Request, res: Response) => {
  try {
    // Get all payments
    const { data: allPayments } = await supabase
      .from('rent_payments')
      .select('*');

    // Calculate analytics
    const total = allPayments?.length || 0;
    const completed = allPayments?.filter(p => p.status === 'completed').length || 0;
    const pending = allPayments?.filter(p => p.status === 'pending').length || 0;
    const late = allPayments?.filter(p => p.status === 'late').length || 0;
    const failed = allPayments?.filter(p => p.status === 'failed').length || 0;

    const totalRevenue = allPayments
      ?.filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount_usdc || '0'), 0) || 0;

    const expectedRevenue = allPayments
      ?.reduce((sum, p) => sum + parseFloat(p.amount_usdc || '0'), 0) || 0;

    const collectionRate = total > 0 ? (completed / total) * 100 : 0;

    // Get this month's data
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const { data: monthPayments } = await supabase
      .from('rent_payments')
      .select('*')
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd);

    const monthRevenue = monthPayments
      ?.filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount_usdc || '0'), 0) || 0;

    res.json({
      success: true,
      data: {
        total,
        byStatus: {
          completed,
          pending,
          late,
          failed
        },
        revenue: {
          total: totalRevenue.toFixed(2),
          expected: expectedRevenue.toFixed(2),
          thisMonth: monthRevenue.toFixed(2)
        },
        metrics: {
          collectionRate: collectionRate.toFixed(2),
          averagePayment: total > 0 ? (totalRevenue / completed).toFixed(2) : '0.00'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Bulk complete payments
app.post('/api/payments/bulk-complete', async (req: Request, res: Response) => {
  try {
    const { paymentIds, transaction_hash_prefix } = req.body;

    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment IDs array is required'
      });
    }

    const results = {
      completed: 0,
      failed: 0,
      details: [] as string[]
    };

    for (const paymentId of paymentIds) {
      try {
        const { data, error } = await supabase
          .from('rent_payments')
          .update({
            status: 'completed',
            transaction_hash: `${transaction_hash_prefix || 'BULK'}_${Date.now()}_${paymentId.substring(0, 8)}`,
            payment_date: new Date().toISOString()
          })
          .eq('id', paymentId)
          .select()
          .single();

        if (error) {
          results.failed++;
          results.details.push(`Failed ${paymentId}: ${error.message}`);
        } else {
          results.completed++;
          results.details.push(`Completed ${paymentId}`);

          // Update lease total_paid
          if (data.lease_id) {
            const { data: lease } = await supabase
              .from('leases')
              .select('total_paid_usdc')
              .eq('id', data.lease_id)
              .single();

            if (lease) {
              await supabase
                .from('leases')
                .update({
                  total_paid_usdc: (lease.total_paid_usdc || 0) + parseFloat(data.amount_usdc),
                  last_payment_date: new Date().toISOString()
                })
                .eq('id', data.lease_id);
            }
          }
        }
      } catch (err) {
        results.failed++;
        results.details.push(`Exception ${paymentId}: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Completed ${results.completed} payment(s), failed ${results.failed}`
    });
  } catch (error) {
    console.error('Error bulk completing payments:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get dashboard stats
app.get('/api/dashboard/stats', async (req: Request, res: Response) => {
  try {
    // Get properties count
    const { count: propertiesCount, error: propError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (propError) {
      console.error('Properties count error:', propError);
    }

    // Get active leases count
    const { count: leasesCount, error: leaseError } = await supabase
      .from('leases')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (leaseError) {
      console.error('Leases count error:', leaseError);
    }

    // Get pending maintenance count
    const { count: maintenanceCount, error: maintError } = await supabase
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (maintError) {
      console.error('Maintenance count error:', maintError);
    }

    // Get total revenue from completed payments
    const { data: payments, error: payError } = await supabase
      .from('rent_payments')
      .select('amount_usdc')
      .eq('status', 'completed');

    if (payError) {
      console.error('Payments error:', payError);
    }

    const totalRevenue = payments?.reduce((sum, p: any) => sum + parseFloat(p.amount_usdc || 0), 0) || 0;

    console.log('Dashboard Stats:', {
      properties: propertiesCount,
      leases: leasesCount,
      maintenance: maintenanceCount,
      revenue: totalRevenue
    });

    res.json({
      success: true,
      data: {
        totalProperties: propertiesCount || 0,
        activeLeases: leasesCount || 0,
        pendingMaintenance: maintenanceCount || 0,
        totalRevenue: totalRevenue.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get wallet info
app.get('/api/wallet/info', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      network: process.env.BLOCKCHAIN_NETWORK || 'solana',
      deployer: process.env.DEPLOYER_ADDRESS,
      aiWallet: process.env.AI_WALLET_ADDRESS,
      walletSetId: process.env.WALLET_SET_ID
    }
  });
});

// Get available tenants (users with tenant role)
app.get('/api/tenants', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_type', 'tenant')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get available properties (active, not leased)
app.get('/api/properties/available', async (req: Request, res: Response) => {
  try {
    // Get all active properties
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('is_active', true);

    if (propError) throw propError;

    // Get all active leases
    const { data: activeLeases, error: leaseError } = await supabase
      .from('leases')
      .select('property_id')
      .eq('status', 'active');

    if (leaseError) throw leaseError;

    // Filter out properties with active leases
    const leasedPropertyIds = new Set(activeLeases?.map(l => l.property_id) || []);
    const available = properties?.filter(p => !leasedPropertyIds.has(p.id)) || [];

    res.json({ success: true, data: available });
  } catch (error) {
    console.error('Error fetching available properties:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// ============================================
// TENANT PORTAL ENDPOINTS
// ============================================

// Tenant Login
app.post('/api/tenant/login', async (req: Request, res: Response) => {
  try {
    const { email, wallet_address } = req.body;

    if (!email && !wallet_address) {
      return res.status(400).json({
        success: false,
        error: 'Email or wallet address is required'
      });
    }

    // Find tenant by email or wallet
    let query = supabase
      .from('users')
      .select('*')
      .eq('role', 'tenant')
      .eq('is_active', true);

    if (email) {
      query = query.eq('email', email);
    } else if (wallet_address) {
      query = query.eq('wallet_address', wallet_address);
    }

    const { data: tenant, error } = await query.single();

    if (error || !tenant) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Get active lease for tenant
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*)
      `)
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
      .single();

    if (leaseError && leaseError.code !== 'PGRST116') {
      throw leaseError;
    }

    res.json({ 
      success: true, 
      data: {
        tenant,
        lease: lease || null
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Error during tenant login:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get Tenant Dashboard Data
app.get('/api/tenant/:tenantId/dashboard', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    // Get tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from('users')
      .select('*')
      .eq('id', tenantId)
      .eq('role', 'tenant')
      .single();

    if (tenantError) throw tenantError;

    // Get active lease
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single();

    if (leaseError && leaseError.code !== 'PGRST116') {
      throw leaseError;
    }

    // Get maintenance requests
    const { data: maintenanceRequests, error: maintenanceError } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (maintenanceError) throw maintenanceError;

    // Get payment history
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('lease_id', lease?.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (paymentsError && lease) throw paymentsError;

    res.json({
      success: true,
      data: {
        tenant,
        lease: lease || null,
        maintenanceRequests: maintenanceRequests || [],
        payments: payments || []
      }
    });
  } catch (error) {
    console.error('Error fetching tenant dashboard:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Tenant Submit Maintenance Request
app.post('/api/tenant/:tenantId/maintenance', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const maintenanceData = req.body;

    // Validate tenant exists and has active lease
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('id, property_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single();

    if (leaseError || !lease) {
      return res.status(400).json({
        success: false,
        error: 'No active lease found for this tenant'
      });
    }

    // Create maintenance request
    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert([{
        ...maintenanceData,
        tenant_id: tenantId,
        property_id: lease.property_id,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ 
      success: true, 
      data,
      message: 'Maintenance request submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting maintenance request:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get Tenant Payments
app.get('/api/tenant/:tenantId/payments', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    // Get tenant's active lease
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single();

    if (leaseError) {
      return res.json({ success: true, data: [] });
    }

    // Get all payments for this lease
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('lease_id', lease.id)
      .order('created_at', { ascending: false });

    if (paymentsError) throw paymentsError;

    res.json({ success: true, data: payments || [] });
  } catch (error) {
    console.error('Error fetching tenant payments:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Initiate Tenant Payment
app.post('/api/tenant/:tenantId/payments/initiate', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { paymentId, fromAddress } = req.body;

    if (!paymentId || !fromAddress) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID and wallet address are required'
      });
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        lease:leases(
          tenant_id,
          landlord_wallet
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // Verify tenant owns this payment
    if ((payment.lease as any).tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Process payment through Circle
    const paymentResult = await circlePaymentService.initiateTransfer(
      fromAddress, // In reality, this should be the Circle wallet ID
      (payment.lease as any).landlord_wallet,
      payment.amount_usdc,
      {
        paymentId,
        leaseId: payment.lease_id,
        purpose: `Rent payment for ${payment.payment_type}`
      }
    );

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: paymentResult.error || 'Payment processing failed'
      });
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'processing',
        transaction_hash: paymentResult.transactionHash,
        paid_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (updateError) throw updateError;

    res.json({
      success: true,
      data: paymentResult,
      message: 'Payment initiated successfully'
    });
  } catch (error) {
    console.error('Error initiating tenant payment:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// ============================================
// VOICE NOTIFICATION ENDPOINTS
// ============================================

// Get available voices
app.get('/api/voice/voices', async (req: Request, res: Response) => {
  try {
    const result = await elevenLabsService.getAvailableVoices();

    if (result.success) {
      res.json({ success: true, data: result.voices });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Generate rent reminder voice notification
app.post('/api/voice/rent-reminder', async (req: Request, res: Response) => {
  try {
    const { tenantId, paymentId } = req.body;

    if (!tenantId || !paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID and Payment ID are required'
      });
    }

    // Get payment and tenant details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        lease:leases(
          *,
          property:properties(*),
          tenant:users(*)
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
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
      // Store notification record
      await supabase.from('voice_notifications').insert([{
        user_id: tenantId,
        type: 'rent_reminder',
        audio_url: result.audioUrl,
        related_id: paymentId,
        status: 'generated'
      }]);

      res.json({ 
        success: true, 
        data: {
          audioUrl: result.audioUrl,
          audioPath: result.audioPath
        },
        message: 'Rent reminder generated successfully'
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error generating rent reminder:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Generate maintenance update voice notification
app.post('/api/voice/maintenance-update', async (req: Request, res: Response) => {
  try {
    const { maintenanceId, customMessage } = req.body;

    if (!maintenanceId) {
      return res.status(400).json({
        success: false,
        error: 'Maintenance ID is required'
      });
    }

    // Get maintenance request details
    const { data: maintenance, error: maintenanceError } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        requestor:users(*),
        property:properties(*)
      `)
      .eq('id', maintenanceId)
      .single();

    if (maintenanceError || !maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Maintenance request not found'
      });
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

    // Generate voice notification
    const result = await elevenLabsService.generateMaintenanceUpdate(
      requestor.full_name,
      maintenance.title,
      maintenance.status.replace('_', ' '),
      message
    );

    if (result.success) {
      // Store notification record
      await supabase.from('voice_notifications').insert([{
        user_id: maintenance.requestor_id,
        type: 'maintenance_update',
        audio_url: result.audioUrl,
        related_id: maintenanceId,
        status: 'generated'
      }]);

      res.json({ 
        success: true, 
        data: {
          audioUrl: result.audioUrl,
          audioPath: result.audioPath
        },
        message: 'Maintenance update notification generated successfully'
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error generating maintenance update:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Generate payment confirmation voice notification
app.post('/api/voice/payment-confirmation', async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID is required'
      });
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
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

    if (paymentError || !payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    const lease = payment.lease as any;
    const tenant = lease.tenant;
    const property = lease.property;

    if (!payment.transaction_hash) {
      return res.status(400).json({
        success: false,
        error: 'Payment has no transaction hash'
      });
    }

    // Generate voice notification
    const result = await elevenLabsService.generatePaymentConfirmation(
      tenant.full_name,
      payment.amount_usdc,
      payment.transaction_hash,
      property.address
    );

    if (result.success) {
      // Store notification record
      await supabase.from('voice_notifications').insert([{
        user_id: payment.tenant_id,
        type: 'payment_confirmation',
        audio_url: result.audioUrl,
        related_id: paymentId,
        status: 'generated'
      }]);

      res.json({ 
        success: true, 
        data: {
          audioUrl: result.audioUrl,
          audioPath: result.audioPath
        },
        message: 'Payment confirmation generated successfully'
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error generating payment confirmation:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Generate lease expiration warning
app.post('/api/voice/lease-expiration', async (req: Request, res: Response) => {
  try {
    const { leaseId } = req.body;

    if (!leaseId) {
      return res.status(400).json({
        success: false,
        error: 'Lease ID is required'
      });
    }

    // Get lease details
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        tenant:users(*)
      `)
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      return res.status(404).json({
        success: false,
        error: 'Lease not found'
      });
    }

    const tenant = lease.tenant as any;
    const property = lease.property as any;
    const endDate = new Date(lease.end_date);
    const now = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

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
      // Store notification record
      await supabase.from('voice_notifications').insert([{
        user_id: lease.tenant_id,
        type: 'lease_expiration',
        audio_url: result.audioUrl,
        related_id: leaseId,
        status: 'generated'
      }]);

      res.json({ 
        success: true, 
        data: {
          audioUrl: result.audioUrl,
          audioPath: result.audioPath,
          daysRemaining
        },
        message: 'Lease expiration warning generated successfully'
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error generating lease expiration warning:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Generate custom voice notification
app.post('/api/voice/custom', async (req: Request, res: Response) => {
  try {
    const { userId, message, voiceSettings } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        success: false,
        error: 'User ID and message are required'
      });
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate voice notification
    const result = await elevenLabsService.generateCustomNotification(
      user.full_name,
      message,
      voiceSettings
    );

    if (result.success) {
      // Store notification record
      await supabase.from('voice_notifications').insert([{
        user_id: userId,
        type: 'custom',
        audio_url: result.audioUrl,
        status: 'generated'
      }]);

      res.json({ 
        success: true, 
        data: {
          audioUrl: result.audioUrl,
          audioPath: result.audioPath
        },
        message: 'Custom notification generated successfully'
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error generating custom notification:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get voice notifications for a user
app.get('/api/voice/notifications/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('voice_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching voice notifications:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 RentFlow AI Backend Server');
  console.log('================================');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🌐 Network: ${process.env.BLOCKCHAIN_NETWORK || 'solana'}`);
  console.log(`📍 Deployer: ${process.env.DEPLOYER_ADDRESS}`);
  console.log(`🤖 AI Wallet: ${process.env.AI_WALLET_ADDRESS}`);
  console.log(`🗄️  Database: ${process.env.SUPABASE_URL}`);
  console.log('================================\n');
  
  // Start voice notification scheduler (check every 60 minutes)
  voiceNotificationScheduler.start(60);
});

export default app;
