import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file BEFORE importing services
// When running with ts-node-dev, __dirname is src/, so go up one level to find .env
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🔍 Debug dotenv path:', path.join(__dirname, '../.env'));
console.log('📦 Environment Variables Loaded:');
console.log('   PORT:', process.env.PORT);
console.log('   CIRCLE_API_KEY:', process.env.CIRCLE_API_KEY ? `${process.env.CIRCLE_API_KEY.substring(0, 20)}...` : 'NOT SET');
console.log('   BLOCKCHAIN_NETWORK:', process.env.BLOCKCHAIN_NETWORK);
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('   USDC_TOKEN_ID:', process.env.USDC_TOKEN_ID);

import { createClient } from '@supabase/supabase-js';
import circlePaymentService from './services/circlePaymentService';
import paymentScheduler from './services/paymentScheduler';
import openaiService from './services/openaiService';
import elevenLabsService from './services/elevenLabsService';
import voiceNotificationScheduler from './services/voiceNotificationScheduler';
import applicationService from './services/applicationService';
import circleSigningService from './services/circleSigningService';
import solanaLeaseService from './services/solanaLeaseService';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
// Increase payload limit to 50MB to handle multiple compressed images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/audio', express.static(path.join(__dirname, '../audio')));

// Initialize Supabase with service key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!
);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    network: process.env.BLOCKCHAIN_NETWORK,
    deployer: process.env.DEPLOYER_ADDRESS,
    blockchain: {
      solana: solanaLeaseService.isReady(),
      circlePayments: circlePaymentService.isReady(),
    }
  });
});

// Blockchain info endpoint
app.get('/api/blockchain/info', (_req: Request, res: Response) => {
  try {
    const networkInfo = solanaLeaseService.getNetworkInfo();
    res.json({
      success: true,
      data: {
        network: networkInfo.network,
        rpcUrl: networkInfo.rpcUrl,
        isConfigured: networkInfo.isConfigured,
        circlePaymentsEnabled: circlePaymentService.isReady(),
        features: {
          onChainLeaseStorage: solanaLeaseService.isReady(),
          onChainPayments: circlePaymentService.isReady(),
          signatureVerification: solanaLeaseService.isReady(),
        }
      }
    });
  } catch (error) {
    console.error('Error fetching blockchain info:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Verify lease on blockchain
app.get('/api/blockchain/verify-lease/:leaseHash', async (req: Request, res: Response) => {
  try {
    const { leaseHash } = req.params;

    if (!leaseHash) {
      return res.status(400).json({
        success: false,
        error: 'Lease hash is required'
      });
    }

    const result = await solanaLeaseService.verifyLeaseOnChain(leaseHash);

    res.json({
      success: result.success,
      verified: result.verified,
      error: result.error
    });
  } catch (error) {
    console.error('Error verifying lease:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get wallet balance
app.get('/api/blockchain/wallet/:address/balance', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const result = await solanaLeaseService.getWalletBalance(address);

    res.json(result);
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all properties (for managers - only their own)
app.get('/api/properties', async (req: Request, res: Response) => {
  try {
    const { manager_id } = req.query;

    let query = supabase
      .from('properties')
      .select('*')
      .eq('is_active', true);

    // Filter by manager_id if provided (for manager dashboard)
    if (manager_id) {
      console.log('🏛️ [Properties] Fetching properties for manager:', manager_id);
      query = query.eq('owner_id', manager_id);
    } else {
      console.log('⚠️ [Properties] No manager_id provided - returning all properties (public view)');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    console.log('✅ [Properties] Returned', data?.length || 0, 'properties');
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get public properties (no auth required) - MUST be before :id route
app.get('/api/properties/public', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching public properties:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Increment property view count
app.post('/api/properties/:id/view', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First get current view count
    const { data: currentData, error: fetchError } = await supabase
      .from('properties')
      .select('view_count')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Increment and update
    const newViewCount = (currentData?.view_count || 0) + 1;

    const { data, error } = await supabase
      .from('properties')
      .update({ view_count: newViewCount })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error incrementing view count:', error);
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
    const { manager_id } = req.query;

    console.log('📋 [Leases] Manager ID:', manager_id || 'ALL');

    let query = supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        tenant:users(*)
      `);

    // Filter by manager's properties if manager_id provided
    if (manager_id) {
      const { data: managerProps } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', manager_id);
      
      const propertyIds = managerProps?.map(p => p.id) || [];
      
      if (propertyIds.length > 0) {
        query = query.in('property_id', propertyIds);
      } else {
        // Manager has no properties, return empty
        query = query.eq('property_id', 'NONE');
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    console.log('✅ [Leases] Returned', data?.length || 0, 'leases');
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
// REMOVED: Duplicate route - see comprehensive version at line ~2960

// Get lease by application ID
app.get('/api/leases/by-application/:applicationId', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    
    console.log('🔍 [Get Lease by Application] Application ID:', applicationId);
    
    const { data, error } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        tenant:users(*)
      `)
      .eq('application_id', applicationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No lease found - this is okay, not an error
        console.log('ℹ️ [Get Lease by Application] No lease found for this application');
        return res.json({ success: true, data: null });
      }
      throw error;
    }

    console.log('✅ [Get Lease by Application] Lease found:', data.id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error fetching lease by application:', error);
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

    // Store lease hash on blockchain if wallet addresses available
    if (data.manager_wallet_address && data.tenant_wallet_address) {
      console.log('🔗 [Blockchain] Storing lease on-chain...');
      const blockchainResult = await solanaLeaseService.createLeaseOnChain({
        id: data.id,
        propertyId: data.property_id,
        managerId: data.property.owner_id,
        tenantId: data.tenant_id,
        managerWallet: data.manager_wallet_address,
        tenantWallet: data.tenant_wallet_address,
        monthlyRent: parseFloat(data.monthly_rent_usdc),
        securityDeposit: parseFloat(data.security_deposit_usdc),
        startDate: data.start_date,
        endDate: data.end_date
      });

      if (blockchainResult.success) {
        // Update lease with blockchain info
        await supabase
          .from('leases')
          .update({
            blockchain_tx_hash: blockchainResult.transactionHash,
            lease_hash: blockchainResult.leaseHash,
            on_chain: true
          })
          .eq('id', data.id);
        
        console.log('✅ [Blockchain] Lease stored on-chain:', blockchainResult.transactionHash);
      } else {
        console.warn('⚠️ [Blockchain] Failed to store lease on-chain:', blockchainResult.error);
      }
    }

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
    const { manager_id } = req.query;

    console.log('🔧 [Maintenance] Manager ID:', manager_id || 'ALL');

    let query = supabase
      .from('maintenance_requests')
      .select(`
        *,
        property:properties(*),
        requestor:users(*)
      `);

    // Filter by manager's properties if manager_id provided
    if (manager_id) {
      const { data: managerProps } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', manager_id);
      
      const propertyIds = managerProps?.map(p => p.id) || [];
      
      if (propertyIds.length > 0) {
        query = query.in('property_id', propertyIds);
      } else {
        // Manager has no properties, return empty
        query = query.eq('property_id', 'NONE');
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    console.log('✅ [Maintenance] Returned', data?.length || 0, 'requests');
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
    const required = ['property_id', 'requested_by', 'title', 'category']; // Changed requestor_id to requested_by
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
        requestor:users!maintenance_requests_requested_by_fkey(*) // Fixed the foreign key reference
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
    const { manager_id } = req.query;

    console.log('💳 [Payments] Manager ID:', manager_id || 'ALL');

    let query = supabase
      .from('rent_payments')
      .select(`
        *,
        lease:leases(
          *,
          property:properties(*)
        ),
        tenant:users(*)
      `);

    // Filter by manager's leases if manager_id provided
    if (manager_id) {
      const { data: managerProps } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', manager_id);
      
      const propertyIds = managerProps?.map(p => p.id) || [];
      
      if (propertyIds.length > 0) {
        // Get leases for these properties
        const { data: managerLeases } = await supabase
          .from('leases')
          .select('id')
          .in('property_id', propertyIds);
        
        const leaseIds = managerLeases?.map(l => l.id) || [];
        
        if (leaseIds.length > 0) {
          query = query.in('lease_id', leaseIds);
        } else {
          // Manager has no leases, return empty
          query = query.eq('lease_id', 'NONE');
        }
      } else {
        // Manager has no properties, return empty
        query = query.eq('lease_id', 'NONE');
      }
    }

    const { data, error } = await query
      .order('payment_date', { ascending: false })
      .limit(50);

    if (error) throw error;

    console.log('✅ [Payments] Returned', data?.length || 0, 'payments');
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
      .order('created_at', { ascending: false });

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
    
    console.log('💳 Payment creation request:', paymentData);
    
    // Validate required fields
    const required = ['lease_id', 'tenant_id', 'amount_usdc', 'due_date'];
    const missing = required.filter(field => !paymentData[field]);
    
    if (missing.length > 0) {
      console.log('❌ Missing required fields:', missing);
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`
      });
    }

    // Validate amount
    const amount = parseFloat(paymentData.amount_usdc);
    if (isNaN(amount) || amount <= 0) {
      console.log('❌ Invalid amount:', paymentData.amount_usdc);
      return res.status(400).json({
        success: false,
        error: 'Invalid payment amount. Must be a positive number greater than 0.'
      });
    }

    // Validate due date format
    const dueDate = new Date(paymentData.due_date);
    if (isNaN(dueDate.getTime())) {
      console.log('❌ Invalid due date:', paymentData.due_date);
      return res.status(400).json({
        success: false,
        error: 'Invalid due date format. Use YYYY-MM-DD.'
      });
    }

    // Verify lease exists
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('id, status')
      .eq('id', paymentData.lease_id)
      .single();

    if (leaseError || !lease) {
      console.log('❌ Lease not found:', paymentData.lease_id);
      return res.status(404).json({
        success: false,
        error: 'Lease not found'
      });
    }

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('users')
      .select('id')
      .eq('id', paymentData.tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.log('❌ Tenant not found:', paymentData.tenant_id);
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    // Set default status and payment date
    const payment = {
      ...paymentData,
      amount_usdc: amount, // Ensure it's a number
      status: paymentData.status || 'pending',
      payment_date: paymentData.payment_date || new Date().toISOString(),
      blockchain_network: 'solana',
    };

    // Only include payment_type if it exists in the request
    if (paymentData.payment_type) {
      (payment as any).payment_type = paymentData.payment_type;
    }

    console.log('💳 Creating payment record:', payment);

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

    if (error) {
      console.error('❌ Database error creating payment:', error);
      throw error;
    }

    console.log('✅ Payment created successfully:', data);

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('❌ Error creating payment:', error);
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

    console.log('💳 [Payment Complete] Marking payment as completed:', id);

    const { data, error } = await supabase
      .from('rent_payments')
      .update({ 
        status: 'completed',
        transaction_hash: transaction_hash || `SIMULATED_${Date.now()}`,
        payment_date: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('❌ [Payment Complete] Error updating payment:', error);
      throw error;
    }

    console.log('✅ [Payment Complete] Payment marked as completed:', data);

    // Check if all required payments are now complete
    const { data: allPayments } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('lease_id', data.lease_id)
      .in('payment_type', ['security_deposit', 'rent']);

    const allComplete = allPayments?.every(p => p.status === 'completed');

    console.log('💰 [Payment Complete] Payment status check:', {
      totalPayments: allPayments?.length,
      allComplete,
      payments: allPayments?.map(p => ({ type: p.payment_type, status: p.status }))
    });

    // If all required payments are complete, auto-activate lease
    if (allComplete && allPayments && allPayments.length >= 2) {
      console.log('🎉 [Payment Complete] All payments complete! Auto-activating lease...');
      
      // Update lease status to active
      const { error: activateError } = await supabase
        .from('leases')
        .update({
          lease_status: 'active',
          status: 'active',
          activated_at: new Date().toISOString()
        })
        .eq('id', data.lease_id);

      if (activateError) {
        console.error('❌ [Payment Complete] Error activating lease:', activateError);
      } else {
        console.log('✅ [Payment Complete] Lease activated!');

        // Get lease to find tenant_id
        const { data: lease } = await supabase
          .from('leases')
          .select('tenant_id')
          .eq('id', data.lease_id)
          .single();

        if (lease) {
          // Transition user from prospective_tenant to tenant
          const { error: roleError } = await supabase
            .from('users')
            .update({
              role: 'tenant',
              user_type: 'tenant'
            })
            .eq('id', lease.tenant_id);

          if (roleError) {
            console.error('❌ [Payment Complete] Error updating user role:', roleError);
          } else {
            console.log('✅ [Payment Complete] User role updated to tenant!');
          }
        }
      }
    }

    res.json({ 
      success: true, 
      data, 
      message: 'Payment completed successfully',
      lease_activated: allComplete && allPayments && allPayments.length >= 2
    });
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
        blockchain_tx_hash: transferResult.transactionHash,
        on_chain: true,
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
    const { manager_id } = req.query;

    console.log('📊 [Dashboard Stats] Manager ID:', manager_id || 'ALL');

    // Get properties count (filtered by manager if provided)
    let propertiesQuery = supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    if (manager_id) {
      propertiesQuery = propertiesQuery.eq('owner_id', manager_id);
    }
    
    const { count: propertiesCount, error: propError } = await propertiesQuery;

    if (propError) {
      console.error('Properties count error:', propError);
    }

    // Get manager's property IDs for filtering other stats
    let managerPropertyIds: string[] = [];
    if (manager_id) {
      const { data: managerProps } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', manager_id);
      managerPropertyIds = managerProps?.map(p => p.id) || [];
    }

    // Get active leases count (only for manager's properties)
    let leasesQuery = supabase
      .from('leases')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    if (manager_id && managerPropertyIds.length > 0) {
      leasesQuery = leasesQuery.in('property_id', managerPropertyIds);
    } else if (manager_id && managerPropertyIds.length === 0) {
      // Manager has no properties, so no leases
      leasesQuery = leasesQuery.eq('property_id', 'NONE');
    }

    const { count: leasesCount, error: leaseError } = await leasesQuery;

    if (leaseError) {
      console.error('Leases count error:', leaseError);
    }

    // Get pending maintenance count (only for manager's properties)
    let maintenanceQuery = supabase
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    if (manager_id && managerPropertyIds.length > 0) {
      maintenanceQuery = maintenanceQuery.in('property_id', managerPropertyIds);
    } else if (manager_id && managerPropertyIds.length === 0) {
      maintenanceQuery = maintenanceQuery.eq('property_id', 'NONE');
    }

    const { count: maintenanceCount, error: maintError } = await maintenanceQuery;

    if (maintError) {
      console.error('Maintenance count error:', maintError);
    }

    // Get total revenue from completed payments (only for manager's leases)
    let paymentsQuery = supabase
      .from('rent_payments')
      .select('amount_usdc, lease:leases!inner(property_id)')
      .eq('status', 'completed');
    
    if (manager_id && managerPropertyIds.length > 0) {
      paymentsQuery = paymentsQuery.in('lease.property_id', managerPropertyIds);
    } else if (manager_id && managerPropertyIds.length === 0) {
      paymentsQuery = paymentsQuery.eq('lease.property_id', 'NONE');
    }

    const { data: payments, error: payError } = await paymentsQuery;

    if (payError) {
      console.error('Payments error:', payError);
    }

    const totalRevenue = payments?.reduce((sum, p: any) => sum + parseFloat(p.amount_usdc || 0), 0) || 0;

    console.log('📊 [Dashboard Stats] Results:', {
      manager: manager_id || 'ALL',
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
    console.log('🔍 Tenant Dashboard Request - Tenant ID:', tenantId);

    // Get tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from('users')
      .select('*')
      .eq('id', tenantId)
      .eq('role', 'tenant')
      .single();

    if (tenantError) {
      console.error('❌ Tenant not found:', tenantError.message);
      throw tenantError;
    }

    console.log('✅ Found tenant:', tenant.email, 'ID:', tenant.id);

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
      console.error('❌ Lease error:', leaseError.message);
      throw leaseError;
    }

    if (lease) {
      console.log('✅ Found lease:', lease.id, 'for property:', (lease.property as any)?.title);
    } else {
      console.log('⚠️  No active lease found for tenant');
    }

    // Get maintenance requests using requested_by (not requestor_id)
    const { data: maintenanceRequests, error: maintenanceError } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        property:properties(*),
        requestor:users!maintenance_requests_requested_by_fkey(*)
      `)
      .eq('requested_by', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (maintenanceError) {
      console.error('⚠️  Maintenance error:', maintenanceError.message);
    }

    console.log('📝 Found', maintenanceRequests?.length || 0, 'maintenance requests');

    // Get payment history from rent_payments table
    const { data: payments, error: paymentsError } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('lease_id', lease?.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (paymentsError && lease) {
      console.error('⚠️  Payments error:', paymentsError.message);
    }

    console.log('💳 Found', payments?.length || 0, 'payments');

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
    console.error('❌ Error fetching tenant dashboard:', error);
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
    
    console.log('🔧 Maintenance request submission:', { tenantId, maintenanceData });

    // Validate tenant exists and has active lease
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('id, property_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single();

    if (leaseError || !lease) {
      console.log('❌ Lease validation failed:', leaseError?.message || 'No active lease');
      return res.status(400).json({
        success: false,
        error: 'No active lease found for this tenant'
      });
    }

    // Create maintenance request with requested_by (matches schema)
    const requestData = {
      title: maintenanceData.title,
      description: maintenanceData.description,
      category: maintenanceData.category || 'other',
      priority: maintenanceData.priority || 'medium',
      requested_by: tenantId,  // Use requested_by (schema column)
      property_id: lease.property_id,
      status: 'pending',
      estimated_cost_usdc: 0
    };
    
    console.log('🔧 Creating maintenance request:', requestData);

    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert([requestData])
      .select(`
        *,
        property:properties(*),
        requestor:users!maintenance_requests_requested_by_fkey(*)
      `)
      .single();

    if (error) {
      console.error('❌ Database error creating maintenance request:', error);
      throw error;
    }

    console.log('✅ Maintenance request created:', data);
    
    res.status(201).json({ 
      success: true, 
      data,
      message: 'Maintenance request submitted successfully'
    });
  } catch (error) {
    console.error('❌ Error submitting maintenance request:', error);
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

    // Get all payments for this lease from rent_payments table
    const { data: payments, error: paymentsError } = await supabase
      .from('rent_payments')
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

    // Get payment details from rent_payments table
    const { data: payment, error: paymentError } = await supabase
      .from('rent_payments')
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

    // Update payment status in rent_payments
    const { error: updateError } = await supabase
      .from('rent_payments')
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
      .from('rent_payments')
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
        user_id: maintenance.requested_by,
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
      .from('rent_payments')
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

// AI Agent Autonomy - Automated payment processing
app.post('/api/ai/process-payment', async (req: Request, res: Response) => {
  try {
    const { leaseId, amountUsdc, paymentType } = req.body;

    // Validate input
    if (!leaseId || !amountUsdc) {
      return res.status(400).json({
        success: false,
        error: 'Lease ID and amount are required'
      });
    }

    // Get lease and tenant details
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        tenant:users(*),
        property:properties(*)
      `)
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      return res.status(404).json({
        success: false,
        error: 'Lease not found'
      });
    }

    // AI decision logic for payment processing
    // In a real implementation, this would be more sophisticated
    const shouldProcess = await shouldProcessPaymentAutomatically(
      lease.tenant_id,
      amountUsdc,
      paymentType
    );

    if (!shouldProcess) {
      return res.json({
        success: true,
        message: 'AI determined that payment should be manually processed',
        processed: false
      });
    }

    // Get tenant wallet
    const tenantWallet = lease.tenant.wallet_address;
    if (!tenantWallet) {
      return res.status(400).json({
        success: false,
        error: 'Tenant wallet address not found'
      });
    }

    // Process payment through Circle
    const paymentResult = await circlePaymentService.initiateTransfer(
      tenantWallet, // In a real implementation, this would be the Circle wallet ID
      lease.landlord_wallet,
      amountUsdc,
      {
        paymentId: `ai_${Date.now()}`,
        leaseId,
        purpose: `AI processed ${paymentType || 'payment'}`,
        gasless: process.env.BLOCKCHAIN_NETWORK === 'arc' // Enable gasless for Arc
      }
    );

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: paymentResult.error || 'Payment processing failed'
      });
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('rent_payments')
      .insert([{
        lease_id: leaseId,
        tenant_id: lease.tenant_id,
        amount_usdc: amountUsdc,
        payment_type: paymentType || 'rent',
        due_date: new Date().toISOString().split('T')[0],
        status: 'processing',
        transaction_hash: paymentResult.transactionHash,
        blockchain_network: process.env.BLOCKCHAIN_NETWORK || 'solana'
      }])
      .select()
      .single();

    if (paymentError) throw paymentError;

    res.json({
      success: true,
      data: payment,
      message: 'Payment processed successfully by AI agent',
      processed: true
    });
  } catch (error) {
    console.error('Error in AI payment processing:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// =====================================
// PROPERTY APPLICATIONS & PUBLIC BROWSING
// =====================================

// Submit a property application (auth required)
app.post('/api/applications', async (req: Request, res: Response) => {
  try {
    const applicationData = req.body;
    
    console.log('📝 Received application:', applicationData);

    // Validate application
    const validation = applicationService.validateApplication(applicationData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    // Get property details for scoring
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', applicationData.property_id)
      .single();

    if (propertyError || !property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    // Calculate AI compatibility score
    console.log('🤖 Calculating compatibility score...');
    const scoring = await applicationService.scoreApplication(
      applicationData,
      {
        monthly_rent_usdc: property.monthly_rent_usdc,
        property_type: property.property_type,
        title: property.title
      }
    );

    // Prepare data for insertion, renaming 'references' to 'applicant_references' to avoid SQL keyword conflict
    const dbData: any = {
      ...applicationData,
      ai_compatibility_score: scoring.compatibilityScore,
      ai_risk_score: scoring.riskScore,
      ai_analysis: scoring.analysis,
      status: 'submitted',
      created_at: new Date().toISOString()
    };
    
    // Rename 'references' to 'applicant_references' to avoid SQL reserved keyword
    if (dbData.references) {
      dbData.applicant_references = dbData.references;
      delete dbData.references;
    }

    // Create application with AI scores
    const { data, error } = await supabase
      .from('property_applications')
      .insert([dbData])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Application created:', data.id);
    console.log('🎯 Compatibility Score:', scoring.compatibilityScore);
    console.log('⚠️  Risk Score:', scoring.riskScore);

    res.status(201).json({ 
      success: true, 
      data,
      scoring
    });
  } catch (error) {
    console.error('❌ Error creating application:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get all applications (Manager view - all applications across all properties)
app.get('/api/applications', async (req: Request, res: Response) => {
  try {
    const { manager_id } = req.query;
    
    console.log('📋 [Applications] Manager ID:', manager_id || 'ALL');

    let query = supabase
      .from('property_applications')
      .select(`
        *,
        properties!property_id(*),
        users!applicant_id(*)
      `);

    // Filter by manager's properties if manager_id provided
    if (manager_id) {
      const { data: managerProps } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', manager_id);
      
      const propertyIds = managerProps?.map(p => p.id) || [];
      
      if (propertyIds.length > 0) {
        query = query.in('property_id', propertyIds);
      } else {
        // Manager has no properties, return empty
        query = query.eq('property_id', 'NONE');
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error from Supabase:', error);
      throw error;
    }

    console.log(`✅ [Applications] Found ${data?.length || 0} applications`);
    
    // Transform data to match frontend expectations
    const transformedData = data?.map(app => ({
      ...app,
      property: app.properties || null,
      applicant: app.users || null
    })) || [];
    
    res.json({ success: true, data: transformedData });
  } catch (error) {
    console.error('❌ Error fetching all applications:', error);
    // Log the full error object to see all details
    console.error('Full error object:', JSON.stringify(error, null, 2));
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      fullError: error,
      hint: 'Did you run the database migration? Table property_applications might not exist.'
    });
  }
});

// Get user's applications
app.get('/api/applications/my-applications', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.query;

    console.log('🔍 [My Applications] Fetching applications for user:', user_id);

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const { data, error } = await supabase
      .from('property_applications')
      .select(`
        *,
        properties!property_id(*),
        users!applicant_id(*)
      `)
      .eq('applicant_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [My Applications] Supabase error:', error);
      throw error;
    }

    console.log(`✅ [My Applications] Found ${data?.length || 0} applications`);
    if (data && data.length > 0) {
      console.log('📦 [My Applications] Sample application structure:', {
        id: data[0].id,
        hasProperty: !!data[0].properties,
        propertyKeys: data[0].properties ? Object.keys(data[0].properties) : 'NO PROPERTY DATA'
      });
    }

    // Transform the data to match frontend expectations
    const transformedData = data?.map(app => ({
      ...app,
      property: app.properties || null // Ensure property field exists
    })) || [];

    res.json({ success: true, data: transformedData });
  } catch (error) {
    console.error('❌ [My Applications] Error fetching user applications:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get applications for a property (Manager only)
app.get('/api/applications/property/:propertyId', async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;

    const { data, error } = await supabase
      .from('property_applications')
      .select(`
        *,
        properties!property_id(*),
        users!applicant_id(*)
      `)
      .eq('property_id', propertyId)
      .order('ai_compatibility_score', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching property applications:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Update application status (Manager only)
app.put('/api/applications/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, manager_notes, reviewed_by } = req.body;

    console.log('📝 [Update Application Status] Request:', {
      id,
      status,
      has_notes: !!manager_notes,
      reviewed_by
    });

    const validStatuses = ['submitted', 'under_review', 'approved', 'rejected', 'withdrawn', 'lease_signed'];
    if (!validStatuses.includes(status)) {
      console.error('❌ Invalid status:', status);
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (manager_notes) {
      updates.manager_notes = manager_notes;
    }

    if (reviewed_by) {
      updates.reviewed_by = reviewed_by;
      updates.reviewed_at = new Date().toISOString();
    }

    console.log('📤 Sending update to Supabase:', updates);

    // First, do a simple update without joins
    const { data: updateData, error: updateError } = await supabase
      .from('property_applications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Supabase update error:', updateError);
      throw updateError;
    }

    console.log('✅ Basic update successful, now fetching with joins...');

    // Then fetch with joins for the response
    const { data, error } = await supabase
      .from('property_applications')
      .select(`
        *,
        properties!property_id(*),
        users!applicant_id(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Supabase fetch error:', error);
      // Return the update data even if fetch fails
      console.log('⚠️ Returning basic data without joins');
      return res.json({ success: true, data: updateData, message: `Application ${status}` });
    }

    console.log('✅ Application status updated successfully with joins');
    res.json({ success: true, data, message: `Application ${status}` });
  } catch (error) {
    console.error('❌ Error updating application status:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error // Include full error details for debugging
    });
  }
});

// =====================================
// LEASE MANAGEMENT
// =====================================

// Generate lease from approved application
app.post('/api/leases/generate', async (req: Request, res: Response) => {
  try {
    const { application_id } = req.body;

    console.log('📝 [Generate Lease] Request for application:', application_id);

    if (!application_id) {
      return res.status(400).json({
        success: false,
        error: 'Application ID is required'
      });
    }

    // Get application details with property and applicant info
    console.log('📤 Fetching application with ID:', application_id);
    const { data: application, error: appError } = await supabase
      .from('property_applications')
      .select(`
        *,
        properties!property_id(*),
        users!applicant_id(*)
      `)
      .eq('id', application_id)
      .single();

    if (appError || !application) {
      console.error('❌ Application not found:', appError);
      console.error('❌ Error details:', JSON.stringify(appError, null, 2));
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        details: appError
      });
    }

    console.log('✅ Application found:', application.id);
    console.log('   Property:', application.properties?.title);
    console.log('   Applicant:', application.users?.full_name);

    // Verify application is approved
    if (application.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Only approved applications can generate leases'
      });
    }

    // Check if lease already exists for this application
    const { data: existingLease } = await supabase
      .from('leases')
      .select('*')
      .eq('application_id', application_id)
      .single();

    if (existingLease) {
      console.log('ℹ️ Lease already exists for this application');
      return res.json({
        success: true,
        data: existingLease,
        message: 'Lease already exists for this application'
      });
    }

    // Calculate lease dates
    const startDate = new Date(application.requested_move_in_date);
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1); // Default 1-year lease

    // Get property details
    const property = application.properties;
    const tenant = application.users;

    // Generate lease terms
    const leaseTerms = {
      propertyAddress: `${property.address}, ${property.city}, ${property.state} ${property.zip_code}`,
      tenantName: tenant.full_name,
      tenantEmail: tenant.email,
      landlordName: 'RentFlow Property Management',
      monthlyRent: property.monthly_rent_usdc,
      securityDeposit: property.security_deposit_usdc,
      leaseDuration: '12 months',
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      rentDueDay: 1,
      lateFeeAmount: property.monthly_rent_usdc * 0.05, // 5% late fee
      lateFeeGracePeriod: 5, // days
      propertyDetails: {
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: property.square_feet,
        propertyType: property.property_type,
        amenities: property.amenities
      },
      standardClauses: [
        'Tenant agrees to maintain the property in good condition',
        'No subletting without written permission from landlord',
        'Tenant responsible for all utilities unless otherwise specified',
        'Property to be used for residential purposes only',
        'Landlord reserves right to inspect property with 24-hour notice',
        'Security deposit refundable within 30 days of lease termination',
        'Early termination requires 60-day written notice'
      ]
    };

    // Create special terms from application data
    const specialTerms: any = {};
    
    if (application.has_pets) {
      specialTerms.petPolicy = 'Pet allowed as disclosed in application. Additional pet deposit required.';
    }
    
    if (property.amenities?.includes('parking')) {
      specialTerms.parking = 'One parking spot included with rental';
    }

    // Create lease record
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .insert([{
        application_id: application_id,
        property_id: application.property_id,
        tenant_id: application.applicant_id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        monthly_rent_usdc: property.monthly_rent_usdc,
        security_deposit_usdc: property.security_deposit_usdc,
        rent_due_day: 1,
        lease_status: 'pending_tenant',
        status: 'pending',
        lease_terms: leaseTerms,
        special_terms: specialTerms,
        generated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (leaseError) {
      console.error('❌ Error creating lease:', leaseError);
      throw leaseError;
    }

    console.log('✅ Lease generated successfully:', lease.id);

    res.status(201).json({
      success: true,
      data: lease,
      message: 'Lease generated successfully'
    });
  } catch (error) {
    console.error('❌ Error generating lease:', error);
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

    const { data: lease, error } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        tenant:users!tenant_id(*),
        application:property_applications(*)
      `)
      .eq('id', id)
      .single();

    if (error || !lease) {
      return res.status(404).json({
        success: false,
        error: 'Lease not found'
      });
    }

    res.json({ success: true, data: lease });
  } catch (error) {
    console.error('❌ Error fetching lease:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get leases for a tenant
app.get('/api/leases/tenant/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const { data: leases, error } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        application:property_applications(*)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: leases || [] });
  } catch (error) {
    console.error('❌ Error fetching tenant leases:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Circle Wallet: Get wallet for user
app.get('/api/circle/wallet/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.query;

    if (!role || (role !== 'manager' && role !== 'tenant')) {
      return res.status(400).json({
        success: false,
        error: 'role query parameter required (manager or tenant)'
      });
    }

    console.log('💼 [Circle Wallet] Getting wallet for user:', userId, 'role:', role);

    // Get or create wallet with REAL address from Circle API
    const walletInfo = await circleSigningService.getOrCreateUserWallet(
      userId, 
      role as 'manager' | 'tenant'
    );

    if (walletInfo.error) {
      return res.status(500).json({
        success: false,
        error: walletInfo.error
      });
    }

    console.log('✅ [Circle Wallet] Returning real wallet:', {
      walletId: walletInfo.walletId,
      address: walletInfo.address
    });

    res.json({
      success: true,
      data: {
        walletId: walletInfo.walletId,
        address: walletInfo.address,  // REAL Solana address
        userId,
        role
      }
    });
  } catch (error) {
    console.error('❌ Error getting Circle wallet:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Circle Wallet: Sign message
app.post('/api/circle/sign-message', async (req: Request, res: Response) => {
  try {
    const { walletId, message } = req.body;

    if (!walletId || !message) {
      return res.status(400).json({
        success: false,
        error: 'walletId and message are required'
      });
    }

    console.log('🔐 [Circle Sign] Request to sign message with wallet:', walletId);

    const result = await circleSigningService.signMessageWithCircleWallet(walletId, message);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error signing message with Circle:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Sign lease (tenant or landlord)
app.post('/api/leases/:id/sign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      signer_id, 
      signature, 
      signer_type,
      wallet_address,  // NEW: Real wallet address for payment routing
      wallet_type,     // NEW: 'phantom' or 'circle'
      wallet_id        // NEW: Circle wallet ID (if using Circle)
    } = req.body;

    console.log('✍️ [Sign Lease] Request:', { 
      id, 
      signer_id, 
      signer_type,
      wallet_address,
      wallet_type 
    });

    if (!signer_id || !signature || !signer_type) {
      return res.status(400).json({
        success: false,
        error: 'signer_id, signature, and signer_type are required'
      });
    }

    if (!['tenant', 'landlord'].includes(signer_type)) {
      return res.status(400).json({
        success: false,
        error: 'signer_type must be either "tenant" or "landlord"'
      });
    }

    // Get current lease
    const { data: lease, error: fetchError } = await supabase
      .from('leases')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !lease) {
      return res.status(404).json({
        success: false,
        error: 'Lease not found'
      });
    }

    // Prepare update data
    const updates: any = {};
    let newLeaseStatus = lease.lease_status;

    if (signer_type === 'tenant') {
      // Verify signer is the tenant
      if (signer_id !== lease.tenant_id) {
        return res.status(403).json({
          success: false,
          error: 'Only the tenant can sign as tenant'
        });
      }

      updates.tenant_signature = signature;
      updates.tenant_signature_date = new Date().toISOString();
      
      // Store tenant wallet info for payment routing
      if (wallet_address) {
        updates.tenant_wallet_address = wallet_address;
        updates.tenant_wallet_type = wallet_type || 'phantom';
        if (wallet_id) {
          updates.tenant_wallet_id = wallet_id;
        }
        console.log('💳 [Wallet] Tenant wallet stored:', { wallet_address, wallet_type });
      }
      
      // If landlord already signed, lease is fully signed
      if (lease.landlord_signature) {
        newLeaseStatus = 'fully_signed';
      } else {
        newLeaseStatus = 'pending_landlord';
      }
    } else {
      // Landlord signing
      updates.landlord_signature = signature;
      updates.landlord_signature_date = new Date().toISOString();
      
      // Store manager wallet info for receiving payments
      if (wallet_address) {
        updates.manager_wallet_address = wallet_address;
        updates.manager_wallet_type = wallet_type || 'phantom';
        if (wallet_id) {
          updates.manager_wallet_id = wallet_id;
        }
        console.log('💰 [Wallet] Manager wallet stored:', { wallet_address, wallet_type });
      }
      
      // If tenant already signed, lease is fully signed
      if (lease.tenant_signature) {
        newLeaseStatus = 'fully_signed';
      } else {
        newLeaseStatus = 'pending_tenant';
      }
    }

    updates.lease_status = newLeaseStatus;

    // Update lease
    const { data: updatedLease, error: updateError } = await supabase
      .from('leases')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(`✅ Lease signed by ${signer_type}. New status: ${newLeaseStatus}`);

    // Store signature on blockchain
    if (wallet_address && solanaLeaseService.isReady()) {
      console.log('🔗 [Blockchain] Recording signature on-chain...');
      const signatureResult = await solanaLeaseService.signLeaseOnChain({
        leaseId: id,
        signerWallet: wallet_address,
        signature,
        signedAt: new Date().toISOString()
      });

      if (signatureResult.success) {
        // Update lease with blockchain signature transaction
        const txHashField = signer_type === 'tenant' 
          ? 'tenant_signature_tx_hash' 
          : 'manager_signature_tx_hash';
        
        await supabase
          .from('leases')
          .update({ [txHashField]: signatureResult.transactionHash })
          .eq('id', id);
        
        console.log('✅ [Blockchain] Signature recorded on-chain:', signatureResult.transactionHash);
      } else {
        console.warn('⚠️ [Blockchain] Failed to record signature on-chain:', signatureResult.error);
      }
    }

    // If lease is now fully signed, create initial payment records
    if (newLeaseStatus === 'fully_signed') {
      console.log('🚀 [Payment Setup] Lease fully signed, creating initial payment records...');
      
      try {
        // AUTO-MIGRATE CHAT: Move application chat to lease
        if (lease.application_id) {
          console.log('🔄 [Chat Migration] Auto-migrating application chat to lease...');
          const { data: migratedMessages, error: migrationError } = await supabase
            .from('messages')
            .update({ lease_id: id })
            .eq('application_id', lease.application_id)
            .select();

          if (migrationError) {
            console.error('❌ Error migrating chat:', migrationError);
          } else {
            console.log(`✅ Migrated ${migratedMessages?.length || 0} messages from application to lease`);
          }
        }

        // Create security deposit payment
        const { error: securityError } = await supabase
          .from('rent_payments')
          .insert({
            lease_id: id,
            tenant_id: lease.tenant_id,
            amount_usdc: lease.security_deposit_usdc,
            payment_type: 'security_deposit',
            due_date: new Date().toISOString().split('T')[0],
            status: 'pending',
            notes: 'Initial security deposit payment required for lease activation',
            blockchain_network: 'solana'
          });

        if (securityError) {
          console.error('❌ Error creating security deposit payment:', securityError);
        } else {
          console.log('✅ Security deposit payment record created');
        }

        // Create first month's rent payment
        const { error: rentError } = await supabase
          .from('rent_payments')
          .insert({
            lease_id: id,
            tenant_id: lease.tenant_id,
            amount_usdc: lease.monthly_rent_usdc,
            payment_type: 'rent',
            due_date: lease.start_date,
            status: 'pending',
            notes: 'First month rent payment required for lease activation',
            blockchain_network: 'solana'
          });

        if (rentError) {
          console.error('❌ Error creating rent payment:', rentError);
        } else {
          console.log('✅ First month rent payment record created');
        }

        // Get updated lease with new status
        const { data: leasWithPayments } = await supabase
          .from('leases')
          .select('*')
          .eq('id', id)
          .single();

        res.json({
          success: true,
          data: leasWithPayments || updatedLease,
          message: `Lease signed by ${signer_type} successfully. Please complete initial payments to activate lease.`,
          requires_payment: true,
          chat_migrated: !!lease.application_id,
          payment_info: {
            security_deposit: lease.security_deposit_usdc,
            first_month_rent: lease.monthly_rent_usdc,
            total: lease.security_deposit_usdc + lease.monthly_rent_usdc,
            instructions: 'Complete both security deposit and first month rent payments to activate your lease and access the tenant dashboard.'
          }
        });
      } catch (paymentError) {
        console.error('❌ Error in payment setup:', paymentError);
        // Still return success for signing, but note payment setup issue
        res.json({
          success: true,
          data: updatedLease,
          message: `Lease signed by ${signer_type} successfully`,
          warning: 'Payment records could not be created automatically. Please contact property manager.'
        });
      }
    } else {
      res.json({
        success: true,
        data: updatedLease,
        message: `Lease signed by ${signer_type} successfully`
      });
    }
  } catch (error) {
    console.error('❌ Error signing lease:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Activate lease (transition tenant role)
app.post('/api/leases/:id/activate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('✅ [Activate Lease] Request for lease:', id);

    // Get lease with full details
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('*')
      .eq('id', id)
      .single();

    if (leaseError || !lease) {
      return res.status(404).json({
        success: false,
        error: 'Lease not found'
      });
    }

    // Verify lease is fully signed
    if (lease.lease_status !== 'fully_signed') {
      return res.status(400).json({
        success: false,
        error: 'Lease must be fully signed before activation'
      });
    }

    // NEW: Verify required payments are completed
    console.log('💰 [Payment Verification] Checking if initial payments are completed...');
    
    const { data: payments, error: paymentsError } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('lease_id', id)
      .in('payment_type', ['security_deposit', 'rent']);

    if (paymentsError) {
      console.error('❌ Error fetching payments:', paymentsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify payments'
      });
    }

    // Check if both required payments exist and are completed
    const securityPaid = payments?.some(p => 
      p.payment_type === 'security_deposit' && p.status === 'completed'
    );
    const rentPaid = payments?.some(p => 
      p.payment_type === 'rent' && p.status === 'completed'
    );

    if (!securityPaid || !rentPaid) {
      const missingPayments = [];
      if (!securityPaid) missingPayments.push('Security Deposit');
      if (!rentPaid) missingPayments.push('First Month Rent');
      
      console.warn('⚠️ Payments not completed:', { securityPaid, rentPaid });
      
      return res.status(400).json({
        success: false,
        error: `Cannot activate lease: The following payments must be completed: ${missingPayments.join(', ')}`,
        missing_payments: missingPayments,
        payment_details: {
          security_deposit: {
            required: true,
            completed: securityPaid,
            amount: lease.security_deposit_usdc
          },
          first_month_rent: {
            required: true,
            completed: rentPaid,
            amount: lease.monthly_rent_usdc
          }
        }
      });
    }

    console.log('✅ [Payment Verification] All required payments completed');


    // Update lease status to active
    const { error: updateLeaseError } = await supabase
      .from('leases')
      .update({
        lease_status: 'active',
        status: 'active',
        activated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateLeaseError) throw updateLeaseError;

    // Transition user from prospective_tenant to tenant
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        role: 'tenant',
        user_type: 'tenant'
      })
      .eq('id', lease.tenant_id);

    if (updateUserError) throw updateUserError;

    console.log(`✅ User ${lease.tenant_id} transitioned from prospective_tenant to tenant`);

    // Get updated lease
    const { data: activatedLease } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        tenant:users!tenant_id(*)
      `)
      .eq('id', id)
      .single();

    res.json({
      success: true,
      data: activatedLease,
      message: 'Lease activated and tenant role updated successfully'
    });
  } catch (error) {
    console.error('❌ Error activating lease:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// =====================================
// AI-POWERED FEATURES
// =====================================

// Predictive maintenance scheduling based on historical data
app.post('/api/ai/predictive-maintenance', async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.body;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: 'Property ID is required'
      });
    }

    // Get property details
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    // Get historical maintenance data for this property
    const { data: maintenanceHistory, error: historyError } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: true });

    if (historyError) throw historyError;

    // AI analysis to predict maintenance needs
    const predictions = await predictMaintenanceNeeds(maintenanceHistory);

    // Create maintenance requests based on predictions
    const createdRequests = [];
    for (const prediction of predictions) {
      const { data: request, error: requestError } = await supabase
        .from('maintenance_requests')
        .insert([{
          property_id: propertyId,
          requested_by: property.owner_id, // Property manager initiates
          title: prediction.title,
          description: prediction.description,
          category: prediction.category,
          priority: prediction.priority,
          status: 'pending',
          estimated_cost_usdc: prediction.estimatedCost,
          ai_analysis: prediction.analysis,
          ai_priority_score: prediction.priorityScore
        }])
        .select(`
          *,
          property:properties(*)
        `)
        .single();

      if (!requestError && request) {
        createdRequests.push(request);
      }
    }

    res.json({
      success: true,
      data: createdRequests,
      message: `AI created ${createdRequests.length} predictive maintenance requests`,
      predictionsCount: createdRequests.length
    });
  } catch (error) {
    console.error('Error in predictive maintenance:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Micropayment feature for property listing services
app.post('/api/micropayments', async (req: Request, res: Response) => {
  try {
    const { fromUserId, toUserId, amountUsdc, purpose } = req.body;

    console.log('💵 Micropayment request:', { fromUserId, toUserId, amountUsdc, purpose });

    // Validate input
    if (!fromUserId || !toUserId || !amountUsdc || !purpose) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: fromUserId, toUserId, amountUsdc, purpose'
      });
    }

    // Validate amount is a number
    const amount = parseFloat(amountUsdc);
    if (isNaN(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount format. Must be a number.'
      });
    }

    // Validate amount range (0.01 to 10 USDC for micropayments)
    if (amount <= 0 || amount > 10) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be between $0.01 and $10 USDC'
      });
    }

    // Validate purpose is not empty
    if (!purpose.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Purpose cannot be empty'
      });
    }

    // Verify users exist
    const { data: fromUser, error: fromUserError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', fromUserId)
      .single();

    if (fromUserError || !fromUser) {
      console.log('❌ Sender user not found:', fromUserId);
      return res.status(404).json({
        success: false,
        error: 'Sender user not found'
      });
    }

    const { data: toUser, error: toUserError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', toUserId)
      .single();

    if (toUserError || !toUser) {
      console.log('❌ Recipient user not found:', toUserId);
      return res.status(404).json({
        success: false,
        error: 'Recipient user not found'
      });
    }

    // Prevent self-payment
    if (fromUserId === toUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot send micropayment to yourself'
      });
    }

    console.log('✅ Processing micropayment through Circle API...');
    console.log('   From User ID:', fromUserId);
    console.log('   To User ID:', toUserId);
    console.log('   To Solana Address:', toUser.wallet_address);

    // Determine which Circle wallet to use based on sender
    // For testing: We have Circle wallet IDs for tenant (John Doe) and manager
    let senderWalletId: string;
    
    // Check if sender is the tenant (John Doe)
    if (fromUserId === 'a0000000-0000-0000-0000-000000000003') {
      // Use tenant's Circle wallet
      senderWalletId = process.env.TENANT_WALLET_ID || '';
      console.log('   Sender: Tenant (John Doe)');
    } else {
      // Use deployer wallet for other users
      senderWalletId = process.env.DEPLOYER_WALLET_ID || '';
      console.log('   Sender: Using Deployer Wallet');
    }
    
    if (!senderWalletId) {
      console.error('❌ Circle wallet ID not found in environment');
      return res.status(500).json({
        success: false,
        error: 'Circle wallet configuration missing. Contact system administrator.'
      });
    }

    console.log('   Using Circle Wallet ID:', senderWalletId);

    // Process micropayment through Circle with gasless transaction support
    // Note: First parameter must be Circle wallet ID (UUID), second is blockchain address
    const paymentResult = await circlePaymentService.initiateTransfer(
      senderWalletId,  // Circle wallet ID (UUID format)
      toUser.wallet_address,  // Destination Solana address (Base58)
      amount,
      {
        paymentId: `micro_${Date.now()}`,
        leaseId: '', // Use empty string instead of null
        purpose: purpose.trim(),
        gasless: process.env.BLOCKCHAIN_NETWORK === 'arc' // Enable gasless for Arc
      }
    );

    if (!paymentResult.success) {
      console.log('❌ Circle payment failed:', paymentResult.error);
      return res.status(400).json({
        success: false,
        error: paymentResult.error || 'Micropayment processing failed'
      });
    }

    console.log('✅ Circle payment successful, creating database record...');

    // Create micropayment record
    const { data: micropayment, error: paymentError } = await supabase
      .from('micropayments')
      .insert([{
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount_usdc: amount,
        purpose: purpose.trim(),
        transaction_hash: paymentResult.transactionHash,
        status: 'completed',
        blockchain_network: process.env.BLOCKCHAIN_NETWORK || 'solana'
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Database error creating micropayment:', paymentError);
      throw paymentError;
    }

    console.log('✅ Micropayment completed successfully:', micropayment);

    res.status(201).json({
      success: true,
      data: micropayment,
      message: 'Micropayment processed successfully'
    });
  } catch (error) {
    console.error('❌ Error processing micropayment:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get micropayments for a specific user
app.get('/api/micropayments/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    console.log('📊 Fetching micropayments for user:', userId);

    // Get all micropayments where user is sender or recipient
    const { data: micropayments, error } = await supabase
      .from('micropayments')
      .select(`
        *,
        from_user:users!micropayments_from_user_id_fkey(
          id,
          full_name,
          email
        ),
        to_user:users!micropayments_to_user_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching micropayments:', error);
      throw error;
    }

    console.log(`✅ Found ${micropayments?.length || 0} micropayments for user ${userId}`);

    res.json({
      success: true,
      data: micropayments || [],
      count: micropayments?.length || 0
    });
  } catch (error) {
    console.error('❌ Error fetching user micropayments:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all micropayments (admin)
app.get('/api/micropayments', async (req: Request, res: Response) => {
  try {
    const { data: micropayments, error } = await supabase
      .from('micropayments')
      .select(`
        *,
        from_user:users!micropayments_from_user_id_fkey(
          id,
          full_name,
          email
        ),
        to_user:users!micropayments_to_user_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json({
      success: true,
      data: micropayments || []
    });
  } catch (error) {
    console.error('Error fetching micropayments:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cross-chain payment capability using CCTP
// TODO: Re-implement when needed
/*
app.post('/api/payments/cross-chain', async (req: Request, res: Response) => {
  try {
    const { fromWalletId, toAddress, amountUsdc, sourceChain, destinationChain } = req.body;

    // Validate input
    if (!fromWalletId || !toAddress || !amountUsdc || !sourceChain || !destinationChain) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: fromWalletId, toAddress, amountUsdc, sourceChain, destinationChain'
      });
    }

    // Process cross-chain transfer through Circle CCTP
    const transferResult = await circlePaymentService.initiateCrossChainTransfer(
      fromWalletId,
      toAddress,
      amountUsdc,
      sourceChain,
      destinationChain,
      {
        paymentId: `cctp_${Date.now()}`,
        leaseId: '', // Use empty string instead of null
        purpose: 'Cross-chain transfer'
      }
    );

    if (!transferResult.success) {
      return res.status(400).json({
        success: false,
        error: transferResult.error || 'Cross-chain transfer failed'
      });
    }

    res.json({
      success: true,
      data: transferResult,
      message: 'Cross-chain transfer initiated successfully'
    });
  } catch (error) {
    console.error('Error in cross-chain transfer:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});
*/

// AI helper function to determine if payment should be processed automatically
async function shouldProcessPaymentAutomatically(
  tenantId: string,
  amountUsdc: number,
  paymentType: string
): Promise<boolean> {
  try {
    // Get tenant's payment history
    const { data: paymentHistory, error } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    // Simple AI logic - in a real implementation, this would be more sophisticated
    // For now, we'll approve if:
    // 1. Tenant has a good payment history (no late payments in last 3 months)
    // 2. Payment amount is within expected range
    // 3. Payment type is regular rent (not unusual amounts)

    const recentPayments = paymentHistory || [];
    const latePayments = recentPayments.filter(p => p.status === 'late');
    
    // If no late payments and payment is standard rent amount, approve
    if (latePayments.length === 0 && paymentType === 'rent') {
      return true;
    }

    // For other cases, require manual approval
    return false;
  } catch (error) {
    console.error('Error in AI payment decision:', error);
    // Default to manual processing if there's an error
    return false;
  }
}

// AI helper function to predict maintenance needs
async function predictMaintenanceNeeds(maintenanceHistory: any[]): Promise<any[]> {
  // Simple predictive logic - in a real implementation, this would use ML models
  const predictions = [];
  
  // Analyze historical data to identify patterns
  const categoryFrequency: Record<string, number> = {};
  const timeBetweenIssues: Record<string, number[]> = {};
  
  // Count frequency of each maintenance category
  maintenanceHistory.forEach(request => {
    categoryFrequency[request.category] = (categoryFrequency[request.category] || 0) + 1;
    
    // Calculate time between similar issues
    if (!timeBetweenIssues[request.category]) {
      timeBetweenIssues[request.category] = [];
    }
  });
  
  // Predict based on frequency and time patterns
  const currentDate = new Date();
  
  // If a category occurs frequently, predict it might happen again
  Object.entries(categoryFrequency).forEach(([category, count]) => {
    if (count >= 2) { // If this type of issue has occurred 2+ times
      predictions.push({
        title: `Predicted ${category.replace('_', ' ')} Maintenance`,
        description: `AI analysis of historical data suggests ${category} maintenance may be needed soon based on recurring patterns.`,
        category: category,
        priority: count > 3 ? 'high' : 'medium',
        estimatedCost: category === 'plumbing' ? 150 : category === 'electrical' ? 200 : 100,
        priorityScore: count / 10,
        analysis: {
          frequency: count,
          pattern: 'recurring_issue',
          confidence: Math.min(0.9, count / 5)
        }
      });
    }
  });
  
  // Add seasonal predictions
  const month = currentDate.getMonth();
  if (month >= 5 && month <= 8) { // Summer months
    predictions.push({
      title: 'Air Conditioning System Check',
      description: 'AI recommends checking HVAC systems before peak summer usage to prevent breakdowns.',
      category: 'hvac',
      priority: 'medium',
      estimatedCost: 200,
      priorityScore: 0.7,
      analysis: {
        season: 'summer',
        recommendation: 'preventive_maintenance',
        confidence: 0.8
      }
    });
  } else if (month >= 11 || month <= 2) { // Winter months
    predictions.push({
      title: 'Heating System Maintenance',
      description: 'AI recommends checking heating systems before peak winter usage to prevent breakdowns.',
      category: 'hvac',
      priority: 'medium',
      estimatedCost: 250,
      priorityScore: 0.75,
      analysis: {
        season: 'winter',
        recommendation: 'preventive_maintenance',
        confidence: 0.85
      }
    });
  }
  
  return predictions;
}

// ==================== CHAT/MESSAGING ENDPOINTS ====================

// Get conversation messages for an application
app.get('/api/applications/:applicationId/messages', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;

    console.log('💬 [Get Messages] Application ID:', applicationId);

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id(id, full_name, email, role),
        recipient:users!recipient_id(id, full_name, email, role)
      `)
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching messages:', error);
      throw error;
    }

    console.log(`✅ Found ${messages?.length || 0} messages`);

    res.json({ success: true, data: messages || [] });
  } catch (error) {
    console.error('❌ Error getting messages:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send a new message
app.post('/api/applications/:applicationId/messages', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const { sender_id, recipient_id, message_body } = req.body;

    console.log('📤 [Send Message] Application:', applicationId);
    console.log('   From:', sender_id);
    console.log('   To:', recipient_id);

    if (!sender_id || !recipient_id || !message_body) {
      return res.status(400).json({
        success: false,
        error: 'sender_id, recipient_id, and message_body are required'
      });
    }

    // CRITICAL: Verify both users exist in the users table BEFORE inserting message
    console.log('🔍 [Send Message] Checking if users exist...');
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', sender_id)
      .single();

    if (senderError || !sender) {
      console.error('❌ [Send Message] Sender not found in users table:', sender_id);
      console.error('   Error:', senderError);
      return res.status(404).json({
        success: false,
        error: `Sender user not found. User ID ${sender_id} does not exist in the database.`,
        details: 'This user needs to be synced from auth.users to public.users table.'
      });
    }

    const { data: recipient, error: recipientError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', recipient_id)
      .single();

    if (recipientError || !recipient) {
      console.error('❌ [Send Message] Recipient not found in users table:', recipient_id);
      console.error('   Error:', recipientError);
      return res.status(404).json({
        success: false,
        error: `Recipient user not found. User ID ${recipient_id} does not exist in the database.`,
        details: 'This user needs to be synced from auth.users to public.users table.'
      });
    }

    console.log('✅ [Send Message] Both users exist:');
    console.log('   Sender:', sender.email, '(' + sender.role + ')');
    console.log('   Recipient:', recipient.email, '(' + recipient.role + ')');

    // Get application details to link property
    const { data: application } = await supabase
      .from('property_applications')
      .select('property_id')
      .eq('id', applicationId)
      .single();

    // Now insert message - FK constraints should pass since we verified users exist
    const { data: message, error } = await supabase
      .from('messages')
      .insert([{
        application_id: applicationId,
        property_id: application?.property_id || null,
        sender_id,
        recipient_id,
        message_body,
        message_type: 'in_app',
        is_read: false
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error inserting message:', error);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      throw error;
    }

    console.log('✅ Message sent successfully');

    // Return message with minimal data (avoid FK joins)
    res.status(201).json({ 
      success: true, 
      data: {
        ...message,
        sender: { id: sender_id, email: sender.email, role: sender.role },
        recipient: { id: recipient_id, email: recipient.email, role: recipient.role }
      }
    });
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error // Include full error for debugging
    });
  }
});

// Mark messages as read
app.put('/api/messages/mark-read', async (req: Request, res: Response) => {
  try {
    const { message_ids, user_id } = req.body;

    console.log('👁️ [Mark Read] User:', user_id, 'Messages:', message_ids?.length);

    if (!message_ids || !Array.isArray(message_ids)) {
      return res.status(400).json({
        success: false,
        error: 'message_ids array is required'
      });
    }

    const { data, error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .in('id', message_ids)
      .eq('recipient_id', user_id)
      .select();

    if (error) {
      console.error('❌ Error marking messages as read:', error);
      throw error;
    }

    console.log(`✅ Marked ${data?.length || 0} messages as read`);

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get unread message count for a user
app.get('/api/users/:userId/unread-count', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ success: true, count: count || 0 });
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== LEASE CHAT ENDPOINTS ====================

// Get conversation messages for a lease
app.get('/api/leases/:leaseId/messages', async (req: Request, res: Response) => {
  try {
    const { leaseId } = req.params;

    console.log('💬 [Get Lease Messages] Lease ID:', leaseId);

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id(id, full_name, email, role),
        recipient:users!recipient_id(id, full_name, email, role)
      `)
      .eq('lease_id', leaseId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching lease messages:', error);
      throw error;
    }

    console.log(`✅ Found ${messages?.length || 0} lease messages`);

    res.json({ success: true, data: messages || [] });
  } catch (error) {
    console.error('❌ Error getting lease messages:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send a new message to a lease conversation
app.post('/api/leases/:leaseId/messages', async (req: Request, res: Response) => {
  try {
    const { leaseId } = req.params;
    const { sender_id, recipient_id, message_body } = req.body;

    console.log('📤 [Send Lease Message] Lease:', leaseId);
    console.log('   From:', sender_id);
    console.log('   To:', recipient_id);

    if (!sender_id || !recipient_id || !message_body) {
      return res.status(400).json({
        success: false,
        error: 'sender_id, recipient_id, and message_body are required'
      });
    }

    // Verify users exist
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', sender_id)
      .single();

    if (senderError || !sender) {
      console.error('❌ [Send Lease Message] Sender not found:', sender_id);
      return res.status(404).json({
        success: false,
        error: `Sender user not found`
      });
    }

    const { data: recipient, error: recipientError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', recipient_id)
      .single();

    if (recipientError || !recipient) {
      console.error('❌ [Send Lease Message] Recipient not found:', recipient_id);
      return res.status(404).json({
        success: false,
        error: `Recipient user not found`
      });
    }

    // Get lease details to link property
    const { data: lease } = await supabase
      .from('leases')
      .select('property_id')
      .eq('id', leaseId)
      .single();

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert([{
        lease_id: leaseId,
        property_id: lease?.property_id || null,
        sender_id,
        recipient_id,
        message_body,
        message_type: 'in_app',
        is_read: false
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error inserting lease message:', error);
      throw error;
    }

    console.log('✅ Lease message sent successfully');

    res.status(201).json({ 
      success: true, 
      data: {
        ...message,
        sender: { id: sender_id, email: sender.email, role: sender.role },
        recipient: { id: recipient_id, email: recipient.email, role: recipient.role }
      }
    });
  } catch (error) {
    console.error('❌ Error sending lease message:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Migrate application chat to lease
app.post('/api/leases/:leaseId/migrate-chat', async (req: Request, res: Response) => {
  try {
    const { leaseId } = req.params;
    const { applicationId } = req.body;

    console.log('🔄 [Migrate Chat] Application:', applicationId, '→ Lease:', leaseId);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        error: 'applicationId is required'
      });
    }

    // Update all messages from the application to also reference the lease
    const { data, error } = await supabase
      .from('messages')
      .update({ lease_id: leaseId })
      .eq('application_id', applicationId)
      .select();

    if (error) {
      console.error('❌ Error migrating chat:', error);
      throw error;
    }

    console.log(`✅ Migrated ${data?.length || 0} messages to lease`);

    res.json({ 
      success: true, 
      migrated: data?.length || 0,
      message: `Chat conversation migrated from application to lease`
    });
  } catch (error) {
    console.error('❌ Error migrating chat:', error);
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
