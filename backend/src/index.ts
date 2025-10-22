import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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

// Get rent payments
app.get('/api/payments', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('rent_payments')
      .select(`
        *,
        lease:leases(*),
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
});

export default app;
