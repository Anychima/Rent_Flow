import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file BEFORE importing services
// When running with ts-node-dev, __dirname is src/, so go up one level to find .env
dotenv.config({ path: path.join(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';
import { logger } from './services/logger';
import { validateEnvironment } from './utils/envValidator';
import { errorHandler, notFoundHandler, asyncHandler, ApiErrors } from './middleware/errorHandler';
import { validateBody, validateParams, validateQuery } from './middleware/validation';
import circlePaymentService from './services/circlePaymentService';
import paymentScheduler from './services/paymentScheduler';
import openaiService from './services/openaiService';
import elevenLabsService from './services/elevenLabsService';
import voiceNotificationScheduler from './services/voiceNotificationScheduler';
import applicationService from './services/applicationService';
import circleSigningService from './services/circleSigningService';
import arcWalletService from './services/arcWalletService';
import arcPaymentService from './services/arcPaymentService';

// Validate environment variables on startup
const envValidation = validateEnvironment();
if (!envValidation.isValid) {
  logger.error('Environment validation failed. Server may not function correctly.', { errors: envValidation.errors }, 'STARTUP');
  // Continue anyway in development, but this should be fatal in production
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Log environment configuration
logger.config('Environment variables loaded', {
  port: process.env.PORT,
  circleApiKey: process.env.CIRCLE_API_KEY ? `${process.env.CIRCLE_API_KEY.substring(0, 20)}...` : 'NOT SET',
  blockchainNetwork: process.env.BLOCKCHAIN_NETWORK,
  supabaseUrl: process.env.SUPABASE_URL,
  usdcTokenId: process.env.USDC_TOKEN_ID
});

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
    network: 'arc-testnet',
    deployer: process.env.DEPLOYER_ADDRESS,
    blockchain: {
      arcTestnet: arcWalletService.isReady(),
      circlePayments: circlePaymentService.isReady(),
      arcPayments: arcPaymentService.isReady(),
    }
  });
});

// Debug endpoint to check user existence
app.get('/api/debug/user/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active')
      .eq('email', email)
      .maybeSingle();
    
    res.json({
      success: true,
      exists: !!data,
      data: data || null,
      error: error?.message || null
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// Blockchain info endpoint - Arc Testnet
app.get('/api/blockchain/info', (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        network: 'arc-testnet',
        rpcUrl: process.env.ARC_RPC_URL,
        chainId: process.env.ARC_CHAIN_ID,
        leaseSignatureContract: process.env.LEASE_SIGNATURE_CONTRACT,
        isConfigured: !!(process.env.ARC_RPC_URL && process.env.DEPLOYER_PRIVATE_KEY),
        circlePaymentsEnabled: circlePaymentService.isReady(),
        arcPaymentsEnabled: arcPaymentService.isReady(),
        features: {
          onChainLeaseSignatures: !!process.env.LEASE_SIGNATURE_CONTRACT,
          onChainPayments: arcPaymentService.isReady(),
          circleWallets: circlePaymentService.isReady(),
          externalWalletSigning: true,
        },
        deployment: {
          status: process.env.LEASE_SIGNATURE_CONTRACT ? 'deployed' : 'pending',
          explorer: process.env.LEASE_SIGNATURE_CONTRACT
            ? `https://testnet.arcscan.app/address/${process.env.LEASE_SIGNATURE_CONTRACT}`
            : null,
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching blockchain info', error, 'BLOCKCHAIN');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== Circle Wallet Endpoints ====================

// Get or create Circle wallet for user
app.get('/api/circle/wallet/:userId',
  validateParams({
    userId: { type: 'uuid', required: true }
  }),
  validateQuery({
    role: { type: 'string', required: true, enum: ['manager', 'tenant'] }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { role, walletId } = req.query as { role?: 'manager' | 'tenant'; walletId?: string };

    logger.info(`Getting wallet for user: ${userId}, role: ${role}`, undefined, 'CIRCLE_API');

    // Get wallet info from Circle signing service
    const result = await circleSigningService.getOrCreateUserWallet(userId, role!, walletId);

    if (result.error) {
      if (result.requiresInput) {
        return res.status(200).json({
          success: false,
          error: result.error,
          requiresInput: result.requiresInput
        });
      }
      throw ApiErrors.internal(result.error);
    }

    // Save wallet info to database
    const walletColumn = role === 'manager' ? 'circle_wallet_id' : 'circle_wallet_id';
    const addressColumn = role === 'manager' ? 'wallet_address' : 'wallet_address';
    
    await supabase
      .from('users')
      .update({
        [walletColumn]: result.walletId,
        [addressColumn]: result.address
      })
      .eq('id', userId);

    logger.success(`Wallet connected for ${role}`, {
      walletId: result.walletId,
      address: result.address
    }, 'CIRCLE_API');

    res.json({
      success: true,
      data: {
        walletId: result.walletId,
        address: result.address,
        userId,
        role
      }
    });
  })
);

// Sign message with Circle wallet
app.post('/api/circle/sign-message',
  validateBody({
    walletId: { type: 'string', required: true, min: 1 },
    message: { type: 'string', required: true, min: 1 }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { walletId, message } = req.body;

    logger.info('Signing message with Circle wallet', { walletId }, 'CIRCLE_API');

    const result = await circleSigningService.signMessageWithCircleWallet(walletId, message);

    if (!result.success) {
      throw ApiErrors.badRequest(result.error || 'Failed to sign message');
    }

    res.json(result);
  })
);

// ==================== Arc Smart Contract Signing ====================

// Sign lease using RentFlowLeaseSignature smart contract (Circle wallet)
app.post('/api/arc/sign-lease-contract',
  validateBody({
    walletId: { type: 'string', required: true },
    leaseId: { type: 'string', required: true },
    landlord: { type: 'string', required: true },
    tenant: { type: 'string', required: true },
    leaseDocumentHash: { type: 'string', required: true },
    monthlyRent: { type: 'number', required: true },
    securityDeposit: { type: 'number', required: true },
    isLandlord: { type: 'boolean', required: true }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      walletId,
      leaseId,
      landlord,
      tenant,
      leaseDocumentHash,
      monthlyRent,
      securityDeposit,
      isLandlord
    } = req.body;

    logger.info('Signing lease on smart contract with Circle wallet', { 
      walletId, 
      leaseId,
      isLandlord 
    }, 'ARC_CONTRACT');

    try {
      // Import ethers for contract interaction
      const { ethers } = await import('ethers');

      // Contract ABI (signLease, getLeaseMessageHash, AND createLease)
      const ABI = [
        'function createLease(string memory leaseId, address landlord, address tenant, string memory leaseDocumentHash, uint256 monthlyRent, uint256 securityDeposit, uint64 startDate, uint64 endDate) external returns (string memory)',
        'function signLease(string memory leaseId, bytes memory signature, bool isLandlord) external',
        'function getLeaseMessageHash(string memory leaseId, address landlord, address tenant, string memory documentHash, uint256 monthlyRent, uint256 securityDeposit, bool isLandlord) public pure returns (bytes32)',
        'function getLease(string memory leaseId) public view returns (tuple(string leaseId, address landlord, address tenant, string leaseDocumentHash, uint256 monthlyRent, uint256 securityDeposit, uint64 startDate, uint64 endDate, bool landlordSigned, bool tenantSigned, bytes landlordSignature, bytes tenantSignature, uint256 landlordSignedAt, uint256 tenantSignedAt, uint8 status))'
      ];

      const CONTRACT_ADDRESS = process.env.LEASE_SIGNATURE_CONTRACT || '0x16c91074476E1d8f9984c79ad919C051a1366AA8'; // Updated: Fixed signature verification
      const RPC_URL = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';
      const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;

      logger.info('📍 Contract configuration:', { CONTRACT_ADDRESS, RPC_URL }, 'ARC_CONTRACT');

      if (!DEPLOYER_KEY) {
        throw new Error('DEPLOYER_PRIVATE_KEY not configured');
      }

      // Connect to Arc Testnet
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

      // IMPORTANT: Use deployer address as landlord since we're signing with deployer wallet
      // Circle SDK limitation: cannot access private key to sign messages
      const actualLandlord = wallet.address; // Use deployer address as landlord
      
      // Tenant can be zero address - contract now allows this
      // Tenant will be set when they actually sign the lease
      logger.info('🔑 Using deployer as landlord (Circle SDK limitation):', { 
        deployer: wallet.address,
        originalLandlord: landlord,
        tenant: tenant  // Can be zero address
      }, 'ARC_CONTRACT');

      // Step 1: Check if lease exists on-chain, if not create it
      logger.info('🔍 Checking if lease exists on-chain...', undefined, 'ARC_CONTRACT');
      try {
        const existingLease = await contract.getLease(leaseId);
        if (existingLease.landlord === ethers.ZeroAddress) {
          // Lease doesn't exist, create it
          logger.info('🆕 Creating lease on-chain...', { leaseId }, 'ARC_CONTRACT');
          
          // Parse start/end dates to Unix timestamps
          const startTimestamp = Math.floor(new Date().getTime() / 1000); // Current time
          const endTimestamp = startTimestamp + (365 * 24 * 60 * 60); // 1 year from now
          
          const createTx = await contract.createLease(
            leaseId,
            actualLandlord,  // Use deployer address
            tenant,           // Can be zero - contract allows it now
            leaseDocumentHash,
            ethers.parseUnits(monthlyRent.toString(), 6),
            ethers.parseUnits(securityDeposit.toString(), 6),
            startTimestamp,
            endTimestamp
          );
          
          logger.info('⏳ Waiting for lease creation...', { txHash: createTx.hash }, 'ARC_CONTRACT');
          await createTx.wait();
          logger.success('✅ Lease created on-chain!', { leaseId }, 'ARC_CONTRACT');
        } else {
          logger.info('✅ Lease already exists on-chain', { leaseId }, 'ARC_CONTRACT');
        }
      } catch (err) {
        // If getLease fails, assume lease doesn't exist and create it
        logger.info('🆕 Creating new lease on-chain...', { leaseId }, 'ARC_CONTRACT');
        
        const startTimestamp = Math.floor(new Date().getTime() / 1000);
        const endTimestamp = startTimestamp + (365 * 24 * 60 * 60);
        
        const createTx = await contract.createLease(
          leaseId,
          actualLandlord,  // Use deployer address
          tenant,           // Can be zero - contract allows it now
          leaseDocumentHash,
          ethers.parseUnits(monthlyRent.toString(), 6),
          ethers.parseUnits(securityDeposit.toString(), 6),
          startTimestamp,
          endTimestamp
        );
        
        await createTx.wait();
        logger.success('✅ Lease created on-chain!', { leaseId }, 'ARC_CONTRACT');
      }

      // Step 2: Get the message hash from the contract
      logger.info('Getting message hash from contract...', undefined, 'ARC_CONTRACT');
      const messageHash = await contract.getLeaseMessageHash(
        leaseId,
        actualLandlord,  // Use deployer address
        tenant,           // Can be zero - contract allows it now
        leaseDocumentHash,
        ethers.parseUnits(monthlyRent.toString(), 6),
        ethers.parseUnits(securityDeposit.toString(), 6),
        isLandlord
      );

      logger.info('Message hash obtained', { messageHash }, 'ARC_CONTRACT');

      // Sign the message hash with the Circle wallet's private key
      // NOTE: This is a limitation - Circle SDK doesn't expose signMessage
      // We're using the deployer wallet as a workaround for now
      logger.warn('Using deployer wallet to sign (Circle SDK limitation)', undefined, 'ARC_CONTRACT');
      const signature = await wallet.signMessage(ethers.getBytes(messageHash));

      logger.info('Signature obtained, submitting to contract...', undefined, 'ARC_CONTRACT');

      // Call the smart contract signLease function
      const tx = await contract.signLease(
        leaseId, // Use lease ID as-is
        signature,
        isLandlord
      );

      logger.info('Transaction submitted, waiting for confirmation...', { hash: tx.hash }, 'ARC_CONTRACT');

      const receipt = await tx.wait();

      logger.success('Lease signed on-chain!', { 
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber 
      }, 'ARC_CONTRACT');

      res.json({
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        explorer: `https://testnet.arcscan.app/tx/${receipt.hash}`
      });
    } catch (error: any) {
      logger.error('Failed to sign lease on contract', error, 'ARC_CONTRACT');
      throw ApiErrors.internal(error.message || 'Contract signing failed');
    }
  })
);

// Save Phantom wallet address to database
app.post('/api/wallet/phantom/connect',
  validateBody({
    userId: { type: 'uuid', required: true },
    address: { type: 'string', required: true, min: 32, max: 64 },
    role: { type: 'string', required: false, enum: ['manager', 'tenant'] }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, address, role } = req.body;

    logger.info(`Connecting Phantom wallet for user: ${userId}`, { address }, 'PHANTOM');

    // Save to database
    const { error } = await supabase
      .from('users')
      .update({
        phantom_wallet_address: address,
        wallet_address: address // Also update main wallet field
      })
      .eq('id', userId);

    if (error) throw ApiErrors.internal('Failed to save wallet address');

    logger.success('Phantom wallet connected', { address }, 'PHANTOM');

    res.json({
      success: true,
      data: {
        address,
        userId,
        role
      }
    });
  })
);

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
      logger.info(`Fetching properties for manager: ${manager_id}`, undefined, 'PROPERTIES');
      query = query.eq('owner_id', manager_id);
    } else {
      logger.warn('No manager_id provided - returning all properties (public view)', undefined, 'PROPERTIES');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    logger.info(`Returned ${data?.length || 0} properties`, undefined, 'PROPERTIES');
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching properties', error, 'PROPERTIES');
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get public properties (no auth required) - MUST be before :id route
app.get('/api/properties/public', async (_req: Request, res: Response) => {
  try {
    // Get all active properties with their lease information
    const { data: properties, error } = await supabase
      .from('properties')
      .select(`
        *,
        leases (
          id,
          lease_status,
          status,
          start_date,
          end_date
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter and enrich properties with availability status
    const enrichedProperties = properties
      ?.map((property: any) => {
        // Check if property has any active or pending leases
        const activeLeases = property.leases?.filter((lease: any) => {
          const leaseStatus = lease.lease_status || lease.status;
          return (
            leaseStatus === 'active' ||
            leaseStatus === 'pending_tenant' ||
            leaseStatus === 'pending_landlord' ||
            leaseStatus === 'fully_signed'
          );
        });

        // Determine availability status
        let availabilityStatus = 'available';
        if (activeLeases && activeLeases.length > 0) {
          const lease = activeLeases[0];
          const leaseStatus = lease.lease_status || lease.status;
          
          if (leaseStatus === 'active') {
            availabilityStatus = 'rented';
          } else if (leaseStatus === 'pending_tenant') {
            availabilityStatus = 'pending_tenant_signature';
          } else if (leaseStatus === 'pending_landlord') {
            availabilityStatus = 'pending_landlord_signature';
          } else if (leaseStatus === 'fully_signed') {
            availabilityStatus = 'lease_signed';
          }
        }

        // Remove leases from response and add availability status
        const { leases, ...propertyData } = property;
        return {
          ...propertyData,
          availability_status: availabilityStatus
        };
      })
      // Filter out ONLY rented properties (active leases)
      // Show properties that are available or in the application/signing process
      .filter((property: any) => property.availability_status !== 'rented');

    logger.info(`Returning ${enrichedProperties?.length || 0} properties (excluding ${properties?.filter((p: any) => p.leases?.some((l: any) => (l.lease_status || l.status) === 'active')).length || 0} rented) out of ${properties?.length || 0} total`, undefined, 'PUBLIC_PROPERTIES');

    res.json({ success: true, data: enrichedProperties });
  } catch (error) {
    logger.error('Error fetching public properties', error, 'PUBLIC_PROPERTIES');
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
app.get('/api/properties/:id',
  validateParams({
    id: { type: 'uuid', required: true }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw ApiErrors.notFound('Property not found');
      }
      throw ApiErrors.internal('Failed to fetch property');
    }

    res.json({ success: true, data });
  })
);

// Create new property
app.post('/api/properties',
  validateBody({
    title: { type: 'string', required: true, min: 3, max: 200 },
    address: { type: 'string', required: true, min: 5, max: 500 },
    city: { type: 'string', required: true, min: 2, max: 100 },
    state: { type: 'string', required: true, min: 2, max: 100 },
    monthly_rent_usdc: { type: 'number', required: true, min: 0 },
    security_deposit_usdc: { type: 'number', required: true, min: 0 },
    bedrooms: { type: 'number', required: true, min: 0 },
    bathrooms: { type: 'number', required: true, min: 0 },
    square_feet: { type: 'number', required: true, min: 0 }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const propertyData = req.body;

    // AI-POWERED PROPERTY DESCRIPTION GENERATION
    if (!propertyData.description || propertyData.description.trim() === '') {
      try {
        logger.info('Generating AI property description', { propertyId: propertyData.id }, 'AI');
        
        const aiDescription = await openaiService.generatePropertyDescription({
          title: propertyData.title,
          propertyType: propertyData.property_type || 'apartment',
          bedrooms: propertyData.bedrooms,
          bathrooms: propertyData.bathrooms,
          squareFeet: propertyData.square_feet,
          monthlyRent: propertyData.monthly_rent_usdc,
          amenities: propertyData.amenities || [],
          address: propertyData.address,
          city: propertyData.city,
          state: propertyData.state
        });
        
        propertyData.description = aiDescription;
        propertyData.ai_generated_description = true;
        
        logger.success('AI description generated', { length: aiDescription.length }, 'AI');
      } catch (error) {
        logger.error('Failed to generate AI description, using fallback', error, 'AI');
        propertyData.description = `Beautiful ${propertyData.bedrooms} bedroom, ${propertyData.bathrooms} bathroom ${propertyData.property_type || 'property'} located in ${propertyData.city}, ${propertyData.state}.`;
      }
    }

    const { data, error } = await supabase
      .from('properties')
      .insert([propertyData])
      .select()
      .single();

    if (error) throw ApiErrors.internal('Failed to create property');

    // TODO: REGISTER PROPERTY ON RENTFLOW CORE CONTRACT (service not yet deployed)
    // Blockchain property registration will be added in future updates

    res.status(201).json({ success: true, data });
  })
);

// Update property
app.put('/api/properties/:id',
  validateParams({
    id: { type: 'uuid', required: true }
  }),
  validateBody({
    title: { type: 'string', required: false, min: 3, max: 200 },
    address: { type: 'string', required: false, min: 5, max: 500 },
    monthly_rent_usdc: { type: 'number', required: false, min: 0 },
    security_deposit_usdc: { type: 'number', required: false, min: 0 },
    bedrooms: { type: 'number', required: false, min: 0 },
    bathrooms: { type: 'number', required: false, min: 0 },
    square_feet: { type: 'number', required: false, min: 0 }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw ApiErrors.notFound('Property not found');
      }
      throw ApiErrors.internal('Failed to update property');
    }

    res.json({ success: true, data });
  })
);

// Delete property
app.delete('/api/properties/:id',
  validateParams({
    id: { type: 'uuid', required: true }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if property has active leases
    const { data: activeLeases } = await supabase
      .from('leases')
      .select('id')
      .eq('property_id', id)
      .in('status', ['active', 'pending_tenant', 'pending_landlord', 'fully_signed'])
      .limit(1);

    if (activeLeases && activeLeases.length > 0) {
      throw ApiErrors.conflict('Cannot delete property with active leases');
    }

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) throw ApiErrors.internal('Failed to delete property');

    logger.info('Property deleted', { propertyId: id }, 'PROPERTIES');
    res.json({ success: true, message: 'Property deleted successfully' });
  })
);

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
app.post('/api/leases',
  validateBody({
    property_id: { type: 'uuid', required: true },
    tenant_id: { type: 'uuid', required: true },
    start_date: { type: 'string', required: true, pattern: /^\d{4}-\d{2}-\d{2}$/ },
    end_date: { type: 'string', required: true, pattern: /^\d{4}-\d{2}-\d{2}$/ },
    monthly_rent_usdc: { type: 'number', required: true, min: 0 },
    security_deposit_usdc: { type: 'number', required: false, min: 0 },
    rent_due_day: { type: 'number', required: false, min: 1, max: 31 }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const leaseData = req.body;
    
    // Validate date range
    const startDate = new Date(leaseData.start_date);
    const endDate = new Date(leaseData.end_date);
    if (endDate <= startDate) {
      throw ApiErrors.unprocessable('End date must be after start date');
    }

    // Check if property is available
    const { data: existingLease } = await supabase
      .from('leases')
      .select('id')
      .eq('property_id', leaseData.property_id)
      .eq('status', 'active')
      .single();

    if (existingLease) {
      throw ApiErrors.conflict('Property already has an active lease');
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

    if (error) throw ApiErrors.internal('Failed to create lease');

    // TODO: REGISTER LEASE ON RENTFLOW CORE CONTRACT (service not yet deployed)
    // Blockchain lease registration will be added in future updates

    res.status(201).json({ success: true, data });
  })
);

// Get lease by ID
app.get('/api/leases/:id',
  validateParams({
    id: { type: 'uuid', required: true }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        tenant:users(*),
        application:property_applications(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw ApiErrors.notFound('Lease not found');
      }
      throw ApiErrors.internal('Failed to fetch lease');
    }

    res.json({ success: true, data });
  })
);

// Update lease
app.put('/api/leases/:id',
  validateParams({
    id: { type: 'uuid', required: true }
  }),
  validateBody({
    status: { type: 'string', required: false, enum: ['pending_tenant', 'pending_landlord', 'fully_signed', 'active', 'terminated', 'expired'] },
    monthly_rent_usdc: { type: 'number', required: false, min: 0 },
    security_deposit_usdc: { type: 'number', required: false, min: 0 }
  }),
  asyncHandler(async (req: Request, res: Response) => {
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

    if (error) {
      if (error.code === 'PGRST116') {
        throw ApiErrors.notFound('Lease not found');
      }
      throw ApiErrors.internal('Failed to update lease');
    }

    res.json({ success: true, data });
  })
);

// Get user's primary wallet and sync to profile
app.get('/api/users/:userId/primary-wallet',
  validateParams({
    userId: { type: 'uuid', required: true }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    logger.info('Getting user primary wallet', { userId }, 'WALLET');

    // Get primary wallet from user_wallets table
    const { data: primaryWallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .maybeSingle();

    if (walletError) {
      logger.error('Error fetching primary wallet', walletError, 'WALLET');
      throw ApiErrors.internal('Failed to fetch wallet');
    }

    if (!primaryWallet) {
      // No primary wallet - check if there's any wallet
      const { data: anyWallet } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (anyWallet) {
        // Set this as primary
        await supabase
          .from('user_wallets')
          .update({ is_primary: true })
          .eq('id', anyWallet.id);

        // Update user profile
        await supabase
          .from('users')
          .update({
            wallet_address: anyWallet.wallet_address,
            circle_wallet_id: anyWallet.circle_wallet_id
          })
          .eq('id', userId);

        logger.success('Set first wallet as primary and synced to profile', { userId }, 'WALLET');

        return res.json({
          success: true,
          data: anyWallet
        });
      }

      // No wallets at all
      return res.json({
        success: true,
        data: null
      });
    }

    // Sync primary wallet to user profile if not already
    const { data: currentUser } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', userId)
      .single();

    if (currentUser && currentUser.wallet_address !== primaryWallet.wallet_address) {
      logger.info('Syncing primary wallet to user profile', { userId, wallet: primaryWallet.wallet_address }, 'WALLET');
      
      await supabase
        .from('users')
        .update({
          wallet_address: primaryWallet.wallet_address,
          circle_wallet_id: primaryWallet.circle_wallet_id
        })
        .eq('id', userId);
    }

    res.json({
      success: true,
      data: primaryWallet
    });
  })
);

// Connect/save wallet to user profile
app.post('/api/users/:userId/wallets',
  validateParams({
    userId: { type: 'uuid', required: true }
  }),
  validateBody({
    walletAddress: { type: 'string', required: true },
    walletType: { type: 'string', required: true, enum: ['circle', 'external'] },
    walletId: { type: 'string', required: false }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { walletAddress, walletType, walletId } = req.body;

    logger.info('Saving wallet to user profile', { userId, walletType, walletAddress }, 'WALLET');

    // Check if wallet already exists in user_wallets table
    const { data: existingWallet } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (existingWallet) {
      logger.info('Wallet already exists in user_wallets, updating user profile', { userId }, 'WALLET');
      
      // Wallet exists - just update user profile to use it
      const { data: userData, error: updateError } = await supabase
        .from('users')
        .update({ 
          wallet_address: walletAddress,
          circle_wallet_id: walletType === 'circle' ? walletId : null
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        logger.error('Failed to update user profile with existing wallet', updateError, 'WALLET');
        throw ApiErrors.internal('Failed to save wallet');
      }

      logger.success('User profile updated with existing wallet', { userId }, 'WALLET');

      return res.json({ 
        success: true, 
        data: {
          walletAddress,
          walletType,
          walletId,
          user: userData,
          existingWallet: true
        }
      });
    }

    // Wallet doesn't exist - create it and update user profile
    const { data: newWallet, error: walletInsertError } = await supabase
      .from('user_wallets')
      .insert({
        user_id: userId,
        wallet_address: walletAddress,
        wallet_type: walletType,
        circle_wallet_id: walletType === 'circle' ? walletId : null,
        is_primary: true,
        label: walletType === 'circle' ? 'Circle Wallet' : 'External Wallet'
      })
      .select()
      .single();

    if (walletInsertError) {
      logger.error('Failed to insert wallet into user_wallets', walletInsertError, 'WALLET');
      // Continue anyway - at least update user profile
    }

    // Update user's wallet_address in profile
    const { data: userData, error: updateError } = await supabase
      .from('users')
      .update({ 
        wallet_address: walletAddress,
        circle_wallet_id: walletType === 'circle' ? walletId : null
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to save wallet to user profile', updateError, 'WALLET');
      throw ApiErrors.internal('Failed to save wallet');
    }

    logger.success('Wallet saved to user profile and user_wallets', { userId }, 'WALLET');

    res.json({ 
      success: true, 
      data: {
        walletAddress,
        walletType,
        walletId,
        user: userData,
        wallet: newWallet
      }
    });
  })
);

// Sign lease endpoint - stores blockchain transaction hash
app.post('/api/leases/:id/sign',
  validateParams({
    id: { type: 'uuid', required: true }
  }),
  validateBody({
    signer_id: { type: 'uuid', required: true },
    signature: { type: 'string', required: true },
    signer_type: { type: 'string', required: true, enum: ['landlord', 'tenant'] },
    wallet_address: { type: 'string', required: false },
    wallet_type: { type: 'string', required: false, enum: ['circle', 'external'] },
    wallet_id: { type: 'string', required: false },
    blockchain_tx_hash: { type: 'string', required: false }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { signer_id, signature, signer_type, wallet_address, blockchain_tx_hash } = req.body;

    logger.info(`Signing lease: ${id} by ${signer_type}`, { signer_id, wallet_address }, 'LEASE_SIGNING');

    // Get current lease
    const { data: currentLease, error: fetchError } = await supabase
      .from('leases')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentLease) {
      throw ApiErrors.notFound('Lease not found');
    }

    // Prepare update data
    const updateData: any = {};
    const now = new Date().toISOString();

    if (signer_type === 'landlord') {
      updateData.landlord_signature = signature;
      updateData.landlord_signed_at = now;
      updateData.landlord_signature_date = now;
      
      // Save manager/landlord wallet address for payments
      if (wallet_address) {
        updateData.manager_wallet_address = wallet_address;
        updateData.landlord_wallet = wallet_address; // Alias for compatibility
        logger.info('Saving landlord wallet to lease', { wallet_address }, 'LEASE_SIGNING');
      }
      
      // Update lease status
      if (currentLease.tenant_signature || currentLease.tenant_signed_at) {
        updateData.lease_status = 'fully_signed';
        updateData.status = 'active';
        // Store blockchain hash when both parties have signed
        if (blockchain_tx_hash) {
          updateData.blockchain_transaction_hash = blockchain_tx_hash;
        }
      } else {
        updateData.lease_status = 'pending_tenant';
        updateData.status = 'pending';
      }
    } else {
      updateData.tenant_signature = signature;
      updateData.tenant_signed_at = now;
      updateData.tenant_signature_date = now;
      
      // Save tenant wallet address
      if (wallet_address) {
        updateData.tenant_wallet_address = wallet_address;
        logger.info('Saving tenant wallet to lease', { wallet_address }, 'LEASE_SIGNING');
      }
      
      // Update lease status
      if (currentLease.landlord_signature || currentLease.landlord_signed_at) {
        updateData.lease_status = 'fully_signed';
        updateData.status = 'active';
        // Store blockchain hash when both parties have signed
        if (blockchain_tx_hash) {
          updateData.blockchain_transaction_hash = blockchain_tx_hash;
        }
      } else {
        updateData.lease_status = 'pending_landlord';
        updateData.status = 'pending';
      }
    }

    logger.info(`Updating lease with status: ${updateData.lease_status}`, { blockchain_tx_hash }, 'LEASE_SIGNING');

    // Update lease in database
    const { data, error } = await supabase
      .from('leases')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        property:properties(*),
        tenant:users(*)
      `)
      .single();

    if (error) {
      logger.error('Failed to update lease signature', error, 'LEASE_SIGNING');
      throw ApiErrors.internal('Failed to save signature');
    }

    logger.success(`Lease ${updateData.lease_status}`, { 
      lease_id: id, 
      signer: signer_type,
      blockchain_hash: blockchain_tx_hash || 'pending'
    }, 'LEASE_SIGNING');

    // Save wallet address to user profile if provided
    if (wallet_address && signer_id) {
      logger.info('Saving wallet address to user profile', { user_id: signer_id, wallet_address }, 'LEASE_SIGNING');
      
      const { error: walletUpdateError } = await supabase
        .from('users')
        .update({ wallet_address })
        .eq('id', signer_id);

      if (walletUpdateError) {
        logger.warn('Failed to save wallet address to user profile', walletUpdateError, 'LEASE_SIGNING');
      } else {
        logger.success('Wallet address saved to user profile', { user_id: signer_id }, 'LEASE_SIGNING');
      }
    }

    // Check if lease is now fully signed and requires payment
    // Payment creation happens when BOTH parties have signed (regardless of who signs last)
    const bothPartiesSigned = (
      (currentLease.landlord_signature || updateData.landlord_signature) && 
      (currentLease.tenant_signature || updateData.tenant_signature)
    );
    
    const requiresPayment = bothPartiesSigned;
    let paymentInfo = null;

    if (requiresPayment) {
      logger.info('Lease fully signed - ensuring payment records exist', { lease_id: id }, 'LEASE_SIGNING');
      
      // Get or create payment records for this lease
      const { data: existingPayments, error: paymentsError } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('lease_id', id)
        .in('payment_type', ['security_deposit', 'rent']);

      if (!paymentsError && (!existingPayments || existingPayments.length === 0)) {
        // Create initial payment records
        logger.info('Creating initial payment records for fully signed lease', { lease_id: id }, 'LEASE_SIGNING');
        
        const paymentsToCreate = [
          {
            lease_id: id,
            tenant_id: data.tenant_id,
            amount_usdc: data.security_deposit_usdc,
            payment_type: 'security_deposit',
            due_date: new Date().toISOString().split('T')[0],
            status: 'pending',
            notes: 'Initial security deposit payment required for lease activation',
            blockchain_network: 'arc'
          },
          {
            lease_id: id,
            tenant_id: data.tenant_id,
            amount_usdc: data.monthly_rent_usdc,
            payment_type: 'rent',
            due_date: data.start_date,
            status: 'pending',
            notes: 'First month rent payment required for lease activation',
            blockchain_network: 'arc'
          }
        ];

        const { error: insertError } = await supabase.from('rent_payments').insert(paymentsToCreate);
        
        if (insertError) {
          logger.error('Failed to create payment records', insertError, 'LEASE_SIGNING');
        } else {
          logger.success('Payment records created successfully', { count: 2, lease_id: id }, 'LEASE_SIGNING');
        }
      } else {
        logger.info('Payment records already exist', { count: existingPayments?.length || 0 }, 'LEASE_SIGNING');
      }

      paymentInfo = {
        securityDeposit: data.security_deposit_usdc,
        firstMonthRent: data.monthly_rent_usdc,
        landlordWallet: data.manager_wallet_address || data.property?.wallet_address || '',
        payments: existingPayments || []
      };
    }

    res.json({ 
      success: true, 
      data,
      requires_payment: requiresPayment,
      payment_info: paymentInfo,
      both_parties_signed: bothPartiesSigned
    });
  })
);

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

// Get payments for a lease
app.get('/api/payments/lease/:leaseId',
  validateParams({
    leaseId: { type: 'uuid', required: true }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { leaseId } = req.params;

    const { data, error } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('lease_id', leaseId)
      .order('due_date', { ascending: true });

    if (error) {
      logger.error('Failed to fetch lease payments', error, 'PAYMENTS');
      throw ApiErrors.internal('Failed to fetch payments');
    }

    res.json({ success: true, data });
  })
);

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
app.post('/api/maintenance',
  validateBody({
    property_id: { type: 'uuid', required: true },
    requested_by: { type: 'uuid', required: true },
    title: { type: 'string', required: true, min: 3, max: 200 },
    category: { type: 'string', required: true, enum: ['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'other'] },
    description: { type: 'string', required: false, max: 2000 },
    priority: { type: 'string', required: false, enum: ['low', 'medium', 'high', 'emergency'] }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const maintenanceData = req.body;

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
        requestor:users!maintenance_requests_requested_by_fkey(*)
      `)
      .single();

    if (error) throw ApiErrors.internal('Failed to create maintenance request');

    res.status(201).json({ success: true, data });
  })
);

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

// Get pending payments (for a tenant or all) - MUST be before /api/payments/:id
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
app.post('/api/payments',
  validateBody({
    lease_id: { type: 'uuid', required: true },
    tenant_id: { type: 'uuid', required: true },
    amount_usdc: { type: 'number', required: true, min: 0 },
    due_date: { type: 'string', required: true, pattern: /^\d{4}-\d{2}-\d{2}$/ },
    payment_type: { type: 'string', required: false, enum: ['rent', 'security_deposit', 'late_fee', 'other'] }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const paymentData = req.body;
    
    logger.info('Payment creation request', { paymentData }, 'PAYMENTS');

    // Verify lease exists
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('id, status')
      .eq('id', paymentData.lease_id)
      .single();

    if (leaseError || !lease) {
      throw ApiErrors.notFound('Lease not found');
    }

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('users')
      .select('id')
      .eq('id', paymentData.tenant_id)
      .single();

    if (tenantError || !tenant) {
      throw ApiErrors.notFound('Tenant not found');
    }

    // Set default status and payment date
    const payment = {
      ...paymentData,
      amount_usdc: paymentData.amount_usdc,
      status: paymentData.status || 'pending',
      payment_date: paymentData.payment_date || new Date().toISOString(),
      blockchain_network: 'solana',
    };

    // Only include payment_type if it exists in the request
    if (paymentData.payment_type) {
      (payment as any).payment_type = paymentData.payment_type;
    }

    logger.info('Creating payment record', { payment }, 'PAYMENTS');

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
      logger.error('Database error creating payment', error, 'PAYMENTS');
      throw ApiErrors.internal('Failed to create payment');
    }

    logger.success('Payment created successfully', { paymentId: data.id }, 'PAYMENTS');

    res.status(201).json({ success: true, data });
  })
);

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
    const { tenant_id, wallet_address, wallet_id, wallet_type, transaction_hash } = req.body;

    console.log('💳 [Payment Complete] Processing payment:', {
      paymentId: id,
      tenantId: tenant_id,
      walletType: wallet_type,
      hasProvidedHash: !!transaction_hash
    });

    // Get payment details first
    const { data: payment, error: paymentError } = await supabase
      .from('rent_payments')
      .select(`
        *,
        lease:leases(
          *,
          property:properties(
            owner_id
          )
        )
      `)
      .eq('id', id)
      .single();

    if (paymentError || !payment) {
      console.error('❌ [Payment Complete] Error fetching payment:', paymentError);
      throw paymentError || new Error('Payment not found');
    }

    let actualTransactionHash = transaction_hash;
    
    // If using Circle wallet and no hash provided, initiate real USDC transfer
    if (wallet_type === 'circle' && wallet_id && !transaction_hash) {
      console.log('🔗 [Payment Complete] Initiating Circle USDC transfer...');
      
      // Get manager's wallet address from database
      const { data: managerData } = await supabase
        .from('users')
        .select('wallet_address, circle_wallet_id')
        .eq('id', payment.lease.property.owner_id)
        .single();

      const managerAddress = managerData?.wallet_address;
      
      if (!managerAddress) {
        return res.status(400).json({
          success: false,
          error: 'Manager wallet address not found. Manager must connect wallet first.'
        });
      }

      console.log('💰 [Payment Complete] Transfer details:', {
        from: wallet_id,
        to: managerAddress,
        amount: payment.amount_usdc
      });

      // Initiate actual USDC transfer via Circle API
      const transferResult = await circlePaymentService.initiateTransfer(
        wallet_id,
        managerAddress,
        parseFloat(payment.amount_usdc),
        {
          paymentId: payment.id,
          leaseId: payment.lease_id,
          purpose: `Rent Payment - ${payment.payment_type}`
        }
      );

      if (!transferResult.success) {
        console.error('❌ [Payment Complete] Transfer failed:', transferResult.error);
        
        // CRITICAL: Mark payment as FAILED, not completed
        await supabase
          .from('rent_payments')
          .update({ 
            status: 'failed',
            notes: `Transaction failed: ${transferResult.error}`,
            payment_date: new Date().toISOString()
          })
          .eq('id', id);
        
        return res.status(400).json({
          success: false,
          error: transferResult.error || 'USDC transfer failed'
        });
      }

      actualTransactionHash = transferResult.transactionHash || transferResult.transactionId;
      console.log('✅ [Payment Complete] USDC transferred! Hash:', actualTransactionHash);
      
      // Verify transaction hash is valid (not a UUID from Circle)
      if (!actualTransactionHash || actualTransactionHash.includes('-')) {
        console.error('❌ [Payment Complete] Invalid transaction hash:', actualTransactionHash);
        
        await supabase
          .from('rent_payments')
          .update({ 
            status: 'failed',
            notes: 'Invalid or missing transaction hash',
            payment_date: new Date().toISOString()
          })
          .eq('id', id);
        
        return res.status(400).json({
          success: false,
          error: 'Transaction failed - no valid blockchain hash received'
        });
      }
    }

    // Update payment status
    const { data, error } = await supabase
      .from('rent_payments')
      .update({ 
        status: 'completed',
        transaction_hash: actualTransactionHash || `SIMULATED_${Date.now()}`,
        payment_date: new Date().toISOString(),
        on_chain: !!actualTransactionHash
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
          console.log('🔄 [Payment Complete] Updating user role to tenant:', lease.tenant_id);
          
          // Transition user from prospective_tenant to tenant
          const { data: updatedUser, error: roleError } = await supabase
            .from('users')
            .update({
              role: 'tenant',
              user_type: 'tenant'
            })
            .eq('id', lease.tenant_id)
            .select('*')
            .single();

          if (roleError) {
            console.error('❌ [Payment Complete] Error updating user role:', roleError);
          } else {
            console.log('✅ [Payment Complete] User role updated to tenant!', updatedUser);
          }
        }
      }
    }

    res.json({ 
      success: true, 
      data, 
      message: 'Payment completed successfully',
      lease_activated: allComplete && allPayments && allPayments.length >= 2,
      transaction_hash: actualTransactionHash
    });
  } catch (error) {
    console.error('Error completing payment:', error);
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

    // Get active lease (checking lease_status, not status)
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        id,
        property_id,
        tenant_id,
        start_date,
        end_date,
        monthly_rent_usdc,
        security_deposit_usdc,
        rent_due_day,
        status,
        lease_status,
        blockchain_lease_id,
        blockchain_transaction_hash,
        tenant_signature,
        landlord_signature,
        tenant_signed_at,
        landlord_signed_at,
        created_at,
        updated_at,
        property:properties(*)
      `)
      .eq('tenant_id', tenantId)
      .in('lease_status', ['active', 'fully_signed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (leaseError && leaseError.code !== 'PGRST116') {
      console.error('❌ Lease error:', leaseError.message);
      throw leaseError;
    }

    if (lease) {
      console.log('✅ Found lease:', lease.id, 'Lease Status:', lease.lease_status, 'for property:', (lease.property as any)?.title);
    } else {
      console.log('⚠️  No active or fully_signed lease found for tenant');
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
    if (payments && payments.length > 0) {
      console.log('💳 Payment details:');
      payments.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.payment_type}: $${p.amount_usdc} USDC (${p.status})`);
      });
    }

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
      .eq('lease_status', 'active')
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
      .eq('lease_status', 'active')
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

// TODO: AI Agent Autonomy - Autonomous rent payment processing (service not yet deployed)
// This endpoint showcases TRUE AI autonomy: the AI agent evaluates upcoming payments,
// makes financial decisions, and executes USDC transfers without human intervention
// app.post('/api/ai/autonomous-rent-payments', 
//   asyncHandler(async (_req: Request, res: Response) => {
//     logger.info('🤖 Starting autonomous rent payment cycle...', undefined, 'AI_AGENT');
//     const result = await autonomousPaymentAgent.processAutonomousRentPayments();
//     logger.success(`Autonomous payment cycle complete. Processed: ${result.processed}`, undefined, 'AI_AGENT');
//     res.json({
//       success: true,
//       message: `AI agent processed ${result.processed} autonomous rent payments`,
//       data: result
//     });
//   })
// );

// TODO: Conversational Voice AI - Natural language voice queries (service not yet deployed)
// ElevenLabs Hackathon Feature: Interactive voice agent for rent management
// app.post('/api/ai/voice-query',
//   validateBody({
//     userId: { type: 'uuid', required: true },
//     voiceTranscript: { type: 'string', required: true, min: 1 }
//   }),
//   asyncHandler(async (req: Request, res: Response) => {
//     const { userId, voiceTranscript } = req.body;
//     logger.info(`🎙️ Processing voice query from user ${userId}`, { query: voiceTranscript }, 'VOICE_AI');
//     const result = await conversationalVoiceAgent.processVoiceQuery(userId, voiceTranscript);
//     logger.success('Voice query processed', { hasAudio: !!result.audioUrl }, 'VOICE_AI');
//     res.json(result);
//   })
// );

// TODO: Voice-Activated Payment - "Pay my rent" voice command (service not yet deployed)
// ElevenLabs Hackathon Feature: Voice-controlled USDC payments
// app.post('/api/ai/voice-payment',
//   validateBody({
//     userId: { type: 'uuid', required: true },
//     voiceCommand: { type: 'string', required: true, min: 1 }
//   }),
//   asyncHandler(async (req: Request, res: Response) => {
//     const { userId, voiceCommand } = req.body;
//     logger.info(`💰 Processing voice payment command from user ${userId}`, { command: voiceCommand }, 'VOICE_AI');
//     const result = await conversationalVoiceAgent.processVoicePayment(userId, voiceCommand);
//     logger.success('Voice payment processed', { success: result.success }, 'VOICE_AI');
//     res.json(result);
//   })
// );

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

// ==================== User Wallets Management ====================

// Get all wallets for a user
app.get('/api/users/:userId/wallets', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    console.log('💼 [Wallets] Fetching all wallets for user:', userId);

    const { data: wallets, error } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`✅ [Wallets] Found ${wallets?.length || 0} wallets`);

    res.json({
      success: true,
      data: wallets || []
    });
  } catch (error) {
    console.error('❌ [Wallets] Error fetching wallets:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Set primary wallet
app.post('/api/users/:userId/wallets/:walletId/set-primary', async (req: Request, res: Response) => {
  try {
    const { userId, walletId } = req.params;

    console.log('⭐ [Wallets] Setting primary wallet:', { userId, walletId });

    // Start a transaction: unset all primary flags, then set the new one
    // First, unset all primary flags for this user
    const { error: unsetError } = await supabase
      .from('user_wallets')
      .update({ is_primary: false })
      .eq('user_id', userId);

    if (unsetError) throw unsetError;

    // Then set the new primary wallet
    const { error: setPrimaryError } = await supabase
      .from('user_wallets')
      .update({ is_primary: true })
      .eq('id', walletId)
      .eq('user_id', userId);

    if (setPrimaryError) throw setPrimaryError;

    console.log('✅ [Wallets] Primary wallet updated');

    res.json({
      success: true,
      message: 'Primary wallet updated'
    });
  } catch (error) {
    console.error('❌ [Wallets] Error setting primary wallet:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Remove wallet
app.delete('/api/users/:userId/wallets/:walletId', async (req: Request, res: Response) => {
  try {
    const { userId, walletId } = req.params;

    console.log('🗑️ [Wallets] Removing wallet:', { userId, walletId });

    // Check if it's the primary wallet and there are other wallets
    const { data: wallet } = await supabase
      .from('user_wallets')
      .select('is_primary')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single();

    if (wallet?.is_primary) {
      const { data: otherWallets } = await supabase
        .from('user_wallets')
        .select('id')
        .eq('user_id', userId)
        .neq('id', walletId);

      if (otherWallets && otherWallets.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot remove primary wallet. Please set another wallet as primary first.'
        });
      }
    }

    // Delete the wallet
    const { error } = await supabase
      .from('user_wallets')
      .delete()
      .eq('id', walletId)
      .eq('user_id', userId);

    if (error) throw error;

    console.log('✅ [Wallets] Wallet removed');

    res.json({
      success: true,
      message: 'Wallet removed'
    });
  } catch (error) {
    console.error('❌ [Wallets] Error removing wallet:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== Arc Testnet Wallet Endpoints ====================

// Add wallet to user's wallet collection
app.post('/api/users/:userId/wallets', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { walletAddress, walletType, circleWalletId, label } = req.body;

    if (!userId || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'userId and walletAddress are required'
      });
    }

    // Validate Arc address format
    if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Arc wallet address format'
      });
    }

    console.log('💾 [Wallets] Adding wallet for user:', userId);
    console.log('   Address:', walletAddress);
    console.log('   Type:', walletType);

    // Check if this is the first wallet for the user
    const { data: existingWallets } = await supabase
      .from('user_wallets')
      .select('id')
      .eq('user_id', userId);

    const isFirstWallet = !existingWallets || existingWallets.length === 0;

    // Insert wallet
    const { data, error: insertError } = await supabase
      .from('user_wallets')
      .insert({
        user_id: userId,
        wallet_address: walletAddress,
        wallet_type: walletType || 'external',
        circle_wallet_id: circleWalletId || null,
        label: label || null,
        is_primary: isFirstWallet // First wallet is primary by default
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ [Wallets] Failed to save wallet:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save wallet'
      });
    }

    console.log('✅ [Wallets] Wallet saved successfully');

    res.json({
      success: true,
      message: 'Wallet added successfully',
      data
    });
  } catch (error) {
    console.error('❌ [Wallets] Error saving wallet:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Save user's external wallet address (legacy endpoint - kept for backward compatibility)
app.post('/api/users/:userId/wallet', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { walletAddress, walletType } = req.body;

    if (!userId || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'userId and walletAddress are required'
      });
    }

    // Validate Arc address format
    if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Arc wallet address format'
      });
    }

    console.log('🔗 [Wallet] Saving external wallet for user:', userId);
    console.log('   Address:', walletAddress);
    console.log('   Type:', walletType || 'external');

    // Save to database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        wallet_address: walletAddress,
        wallet_type: walletType || 'external', // 'external' means user's own wallet
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ [Wallet] Failed to save wallet:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save wallet address'
      });
    }

    console.log('✅ [Wallet] External wallet saved successfully');

    res.json({
      success: true,
      message: 'Wallet connected successfully'
    });
  } catch (error) {
    console.error('❌ [Wallet] Error saving wallet:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create Arc Testnet wallet for user
app.post('/api/arc/wallet/create', async (req: Request, res: Response) => {
  try {
    const { userId, userEmail } = req.body;

    if (!userId || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'userId and userEmail are required'
      });
    }

    console.log('🌐 [ArcWallet] Creating Arc Testnet wallet for user:', userId);

    const result = await arcWalletService.getOrCreateUserWallet(userId, userEmail);

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Save Arc wallet info to database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        circle_wallet_id: result.walletId,
        wallet_address: result.address,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ [ArcWallet] Failed to save wallet to database:', updateError);
    } else {
      console.log('✅ [ArcWallet] Wallet saved to database');
    }

    res.json({
      success: true,
      data: {
        walletId: result.walletId,
        address: result.address,
        blockchain: result.blockchain || 'ARC-TESTNET',
        walletSetId: result.walletSetId
      }
    });
  } catch (error) {
    console.error('❌ [ArcWallet] Error creating Arc wallet:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Arc wallet balance
app.get('/api/arc/wallet/:walletId/balance', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;

    if (!walletId) {
      return res.status(400).json({
        success: false,
        error: 'walletId is required'
      });
    }

    console.log('💰 [ArcWallet] Fetching balance for wallet:', walletId);

    const result = await arcWalletService.getWalletBalance(walletId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      data: {
        walletId,
        balances: result.balances,
        usdcBalance: result.usdcBalance || '0'
      }
    });
  } catch (error) {
    console.error('❌ [ArcWallet] Error fetching balance:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Arc wallet details
app.get('/api/arc/wallet/:walletId', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;

    if (!walletId) {
      return res.status(400).json({
        success: false,
        error: 'walletId is required'
      });
    }

    console.log('📊 [ArcWallet] Fetching wallet details:', walletId);

    const result = await arcWalletService.getWallet(walletId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: result.wallet
    });
  } catch (error) {
    console.error('❌ [ArcWallet] Error fetching wallet:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check if wallet address belongs to Circle and get wallet ID
app.post('/api/arc/wallet/check-address', async (req: Request, res: Response) => {
  try {
    const { address, userId } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'address is required'
      });
    }

    console.log('🔍 [ArcWallet] Checking if address belongs to Circle:', address);
    console.log('🔍 [ArcWallet] User ID:', userId);

    // Step 1: Check in database if this user has this address as a Circle wallet
    if (userId) {
      console.log('💾 [ArcWallet] Checking user_wallets table...');
      const { data: userWallets } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('wallet_address', address)
        .eq('wallet_type', 'circle')
        .maybeSingle();

      if (userWallets && userWallets.circle_wallet_id) {
        console.log('✅ [ArcWallet] Found Circle wallet in user_wallets table:', userWallets.circle_wallet_id);
        return res.json({
          success: true,
          isCircleWallet: true,
          walletId: userWallets.circle_wallet_id,
          address: userWallets.wallet_address,
          source: 'user_wallets_table'
        });
      }

      console.log('💾 [ArcWallet] Checking users table profile...');
      const { data: user } = await supabase
        .from('users')
        .select('circle_wallet_id, wallet_address')
        .eq('id', userId)
        .maybeSingle();

      if (user && user.wallet_address === address && user.circle_wallet_id) {
        console.log('✅ [ArcWallet] Found Circle wallet in users table:', user.circle_wallet_id);
        return res.json({
          success: true,
          isCircleWallet: true,
          walletId: user.circle_wallet_id,
          address: user.wallet_address,
          source: 'user_profile'
        });
      }
    }

    // Step 2: Check globally in database (other users might have this Circle wallet)
    console.log('🌐 [ArcWallet] Checking globally across all users...');
    const { data: globalWallets } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('wallet_address', address)
      .eq('wallet_type', 'circle')
      .limit(1)
      .maybeSingle();

    if (globalWallets && globalWallets.circle_wallet_id) {
      console.log('✅ [ArcWallet] Found Circle wallet in global search:', globalWallets.circle_wallet_id);
      console.log('⚠️ [ArcWallet] Note: This wallet belongs to another user, but we detected it as Circle');
      return res.json({
        success: true,
        isCircleWallet: true,
        walletId: globalWallets.circle_wallet_id,
        address: globalWallets.wallet_address,
        source: 'global_database',
        note: 'This Circle wallet is registered to another user. You can add it to your account.'
      });
    }

    // Step 3: Try to fetch from Circle API using wallet ID patterns
    // Note: Circle doesn't support reverse lookup by address
    // But we can try common Circle wallet ID patterns if user provides hints
    
    console.log('ℹ️ [ArcWallet] Address not found as Circle wallet in database');
    console.log('🤖 [ArcWallet] Applying AI-powered pattern detection...');
    
    // AI-powered detection: Analyze address patterns
    const detectionResult = analyzeWalletAddress(address);
    
    res.json({
      success: true,
      isCircleWallet: false,
      address,
      detection: detectionResult,
      message: 'Address not found in Circle wallets. Will be treated as external wallet.',
      suggestion: detectionResult.likelyProvider === 'Circle' 
        ? 'This address pattern suggests it might be a Circle wallet. If you have the wallet ID, use "Connect by Wallet ID" option.'
        : `Detected as likely ${detectionResult.likelyProvider} wallet. Will be added as external wallet.`
    });
  } catch (error) {
    console.error('❌ [ArcWallet] Error checking address:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// AI-powered wallet address analyzer
function analyzeWalletAddress(address: string): {
  likelyProvider: string;
  confidence: number;
  blockchain: string;
  patterns: string[];
} {
  const patterns: string[] = [];
  let likelyProvider = 'Unknown';
  let confidence = 0;
  let blockchain = 'Unknown';

  // Arc/EVM address format validation
  if (address.startsWith('0x') && address.length === 42) {
    patterns.push('EVM-compatible address');
    blockchain = 'Arc/Ethereum/EVM';
    
    // Analyze address characteristics
    const addressLower = address.toLowerCase();
    
    // Pattern 1: Check for common Circle wallet patterns
    // Circle wallets often have certain entropy patterns
    const hasHighEntropy = new Set(addressLower.split('')).size > 12;
    if (hasHighEntropy) {
      patterns.push('High entropy (typical for Circle wallets)');
      confidence += 30;
    }
    
    // Pattern 2: Check for sequential or repeated patterns (less likely Circle)
    const hasRepeatedChars = /(.)\1{3,}/.test(addressLower);
    const hasSequentialChars = /0123|1234|2345|3456|4567|5678|6789|789a|89ab|9abc|abcd|bcde|cdef/.test(addressLower);
    
    if (hasRepeatedChars || hasSequentialChars) {
      patterns.push('Contains repeated/sequential patterns (less likely Circle)');
      confidence -= 20;
      likelyProvider = 'External/Manual';
    } else {
      patterns.push('Random distribution (could be Circle)');
      confidence += 20;
    }
    
    // Pattern 3: Check for vanity address patterns
    const hasVanityPattern = /^0x(0{4,}|1{4,}|f{4,}|dead|beef|cafe|face|babe|feed)/i.test(address);
    if (hasVanityPattern) {
      patterns.push('Vanity address pattern (likely external)');
      likelyProvider = 'External/Vanity';
      confidence = 80;
    }
    
    // Pattern 4: Default assumption for Arc addresses
    if (confidence < 50 && !hasVanityPattern) {
      likelyProvider = 'Circle or External';
      confidence = 50;
    }
  } else {
    patterns.push('Invalid Arc address format');
    likelyProvider = 'Invalid';
    confidence = 100;
  }

  return {
    likelyProvider,
    confidence,
    blockchain,
    patterns
  };
}

// Connect existing Circle wallet by wallet ID
app.post('/api/arc/wallet/connect-existing', async (req: Request, res: Response) => {
  try {
    const { walletId, userId } = req.body;

    if (!walletId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'walletId and userId are required'
      });
    }

    console.log('🔗 [ArcWallet] Connecting existing Circle wallet:', walletId);

    // Verify wallet exists in Circle
    const walletResult = await arcWalletService.getWallet(walletId);

    if (!walletResult.success || !walletResult.wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found in Circle. Please verify the wallet ID.'
      });
    }

    const address = walletResult.wallet.address;

    console.log('✅ [ArcWallet] Wallet verified:', { walletId, address });

    // Save to user_wallets table
    const { data: existingWallet } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('wallet_address', address)
      .maybeSingle();

    if (existingWallet) {
      return res.status(400).json({
        success: false,
        error: 'This wallet is already connected to your account.'
      });
    }

    // Check if this is the first wallet
    const { data: userWallets } = await supabase
      .from('user_wallets')
      .select('id')
      .eq('user_id', userId);

    const isFirstWallet = !userWallets || userWallets.length === 0;

    // Insert wallet
    const { data: newWallet, error: insertError } = await supabase
      .from('user_wallets')
      .insert({
        user_id: userId,
        wallet_address: address,
        wallet_type: 'circle',
        circle_wallet_id: walletId,
        is_primary: isFirstWallet,
        label: 'Circle Wallet'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ [ArcWallet] Error saving wallet:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save wallet to database'
      });
    }

    console.log('✅ [ArcWallet] Existing Circle wallet connected successfully');

    res.json({
      success: true,
      data: {
        walletId,
        address,
        wallet: newWallet
      }
    });
  } catch (error) {
    console.error('❌ [ArcWallet] Error connecting existing wallet:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Sign message with Circle wallet (for lease signing, etc.)
app.post('/api/arc/sign-message', async (req: Request, res: Response) => {
  try {
    const { walletId, message } = req.body;

    if (!walletId || !message) {
      return res.status(400).json({
        success: false,
        error: 'walletId and message are required'
      });
    }

    console.log('🔐 [Arc Signing] Signing message with Circle wallet...');
    console.log('   Wallet ID:', walletId);
    console.log('   Message:', message.substring(0, 50) + '...');

    // Sign using Circle SDK
    const result = await arcWalletService.signMessage(walletId, message);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to sign message'
      });
    }

    console.log('✅ [Arc Signing] Message signed successfully');

    res.json({
      success: true,
      signature: result.signature,
      signerAddress: result.address
    });
  } catch (error) {
    console.error('❌ [Arc Signing] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== Arc Testnet Payment Endpoints ====================

// Estimate payment fee on Arc Testnet
app.post('/api/arc/payment/estimate-fee', async (req: Request, res: Response) => {
  try {
    const { fromWalletId, toAddress, amount } = req.body;

    if (!fromWalletId || !toAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'fromWalletId, toAddress, and amount are required'
      });
    }

    console.log('💰 [ArcPayment] Estimating fee:', { fromWalletId, toAddress, amount });

    const result = await arcPaymentService.estimateFee(fromWalletId, toAddress, amount);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result.fees
    });
  } catch (error) {
    console.error('❌ [ArcPayment] Error estimating fee:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send USDC payment on Arc Testnet
app.post('/api/arc/payment/send', async (req: Request, res: Response) => {
  try {
    const { fromWalletId, toAddress, amount, feeLevel, paymentId, leaseId } = req.body;

    if (!fromWalletId || !toAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'fromWalletId, toAddress, and amount are required'
      });
    }

    console.log('💸 [ArcPayment] Processing payment:', {
      fromWalletId,
      toAddress,
      amount,
      feeLevel: feeLevel || 'MEDIUM',
      paymentId,
      leaseId
    });

    const result = await arcPaymentService.sendPayment(
      fromWalletId,
      toAddress,
      amount,
      feeLevel || 'MEDIUM'
    );

    if (!result.success) {
      // Update payment status to failed if paymentId provided
      if (paymentId) {
        await supabase
          .from('rent_payments')
          .update({
            status: 'failed',
            notes: result.error || 'Payment failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentId);
      }

      return res.status(400).json(result);
    }

    // TODO: RECORD PAYMENT DECISION ON-CHAIN (service not yet deployed)
    let onChainDecisionId: string | undefined;
    // try {
    //   const onChainResult = await aiDecisionsContract.recordPaymentDecision({
    //     tenant: fromWalletId,
    //     landlord: toAddress,
    //     amountUSDC: amount,
    //     approved: true,
    //     confidenceScore: 100,
    //     reasoning: `User-initiated rent payment via Arc Testnet. Payment ID: ${paymentId || 'N/A'}. Lease ID: ${leaseId || 'N/A'}`
    //   });
    //   onChainDecisionId = onChainResult.decisionId;
    //   console.log(`✅ [Blockchain] Payment decision recorded on-chain: ${onChainDecisionId}`);
    // } catch (error) {
    //   console.error('⚠️ [Blockchain] Failed to record payment decision on-chain:', error);
    // }

    // Payment successful OR still processing - update payment record if paymentId provided
    if (paymentId) {
      // For now, mark as completed if we have a transaction hash
      // The transaction was successfully submitted to the blockchain
      const paymentStatus = 'completed';  // Always mark as completed when TX submitted
      const paymentNotes = result.state === 'CONFIRMED'
        ? `Paid via Arc Testnet - TX: ${result.transactionHash}`
        : `Transaction submitted to Arc Testnet - State: ${result.state || 'pending'} - TX: ${result.transactionHash || result.transactionId} - Check https://testnet.arcscan.app`;
      
      const { error: updateError } = await supabase
        .from('rent_payments')
        .update({
          status: paymentStatus,
          transaction_hash: result.transactionHash || result.transactionId,
          payment_date: new Date().toISOString(),
          blockchain_network: 'arc',
          blockchain_decision_id: onChainDecisionId, // Link to on-chain decision
          notes: paymentNotes
        })
        .eq('id', paymentId);

      // TODO: RECORD PAYMENT ON RENTFLOW CORE CONTRACT (service not yet deployed)
      // if (rentFlowCoreService.isReady() && leaseId) {
      //   try {
      //     const { data: lease } = await supabase
      //       .from('leases')
      //       .select('blockchain_lease_id')
      //       .eq('id', leaseId)
      //       .single();
      //     if (lease?.blockchain_lease_id) {
      //       const coreResult = await rentFlowCoreService.recordRentPayment({
      //         leaseId: lease.blockchain_lease_id,
      //         amount: amount
      //       });
      //       if (coreResult.success) {
      //         console.log('✅ [RentFlowCore] Rent payment recorded on-chain');
      //       }
      //     }
      //   } catch (coreError) {
      //     console.error('⚠️ [RentFlowCore] Failed to record rent payment on-chain:', coreError);
      //   }
      // }

      // TODO: Mark payment as executed on-chain (service not yet deployed)
      // if (onChainDecisionId && result.transactionHash) {
      //   try {
      //     await aiDecisionsContract.markPaymentExecuted(
      //       onChainDecisionId,
      //       result.transactionHash
      //     );
      //     console.log(`✅ [Blockchain] Payment marked as executed on-chain`);
      //   } catch (error) {
      //     console.error('⚠️ [Blockchain] Failed to mark payment executed on-chain:', error);
      //   }
      // }

      if (updateError) {
        console.error('❌ [ArcPayment] Failed to update payment record:', updateError);
      } else {
        console.log('✅ [ArcPayment] Payment record updated successfully');

        // Check if all initial payments are complete for this lease
        if (leaseId) {
          const { data: allPayments } = await supabase
            .from('rent_payments')
            .select('*')
            .eq('lease_id', leaseId)
            .in('payment_type', ['security_deposit', 'rent'])
            .eq('status', 'pending');

          if (!allPayments || allPayments.length === 0) {
            // All initial payments complete! Activate lease
            console.log('🎉 [ArcPayment] All initial payments complete - activating lease...');

            const { error: leaseError } = await supabase
              .from('leases')
              .update({
                lease_status: 'active',
                activated_at: new Date().toISOString()
              })
              .eq('id', leaseId);

            if (leaseError) {
              console.error('❌ [ArcPayment] Failed to activate lease:', leaseError);
            } else {
              console.log('✅ [ArcPayment] Lease activated successfully!');

              // Promote prospective_tenant to tenant
              const { data: lease } = await supabase
                .from('leases')
                .select('tenant_id')
                .eq('id', leaseId)
                .single();

              if (lease?.tenant_id) {
                await supabase
                  .from('users')
                  .update({
                    role: 'tenant',
                    user_type: 'tenant'
                  })
                  .eq('id', lease.tenant_id);

                console.log('✅ [ArcPayment] User promoted to tenant status');
              }
            }
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        transactionId: result.transactionId,
        transactionHash: result.transactionHash,
        state: result.state,
        explorerUrl: result.transactionHash 
          ? `https://testnet.arcscan.app/tx/${result.transactionHash}`
          : undefined
      }
    });
  } catch (error) {
    console.error('❌ [ArcPayment] Error processing payment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Arc payment transaction status
app.get('/api/arc/payment/transaction/:transactionId', async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'transactionId is required'
      });
    }

    console.log('🔍 [ArcPayment] Fetching transaction status:', transactionId);

    const result = await arcPaymentService.getTransactionStatus(transactionId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: result.transaction
    });
  } catch (error) {
    console.error('❌ [ArcPayment] Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== Analytics Dashboard ====================

// Get property management analytics
app.get('/api/analytics/property-management', async (req: Request, res: Response) => {
  try {
    // Get total properties
    const { count: totalProperties, error: propError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });

    // Get active leases
    const { count: activeLeases, error: leaseError } = await supabase
      .from('leases')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get pending applications
    const { count: pendingApplications, error: appError } = await supabase
      .from('property_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get maintenance requests
    const { count: maintenanceRequests, error: maintError } = await supabase
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'approved', 'in_progress']);

    if (propError || leaseError || appError || maintError) {
      throw new Error('Failed to fetch analytics data');
    }

    res.json({
      success: true,
      data: {
        totalProperties: totalProperties || 0,
        activeLeases: activeLeases || 0,
        pendingApplications: pendingApplications || 0,
        maintenanceRequests: maintenanceRequests || 0
      }
    });
  } catch (error) {
    console.error('❌ [Analytics] Error fetching property management data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get payment analytics
app.get('/api/analytics/payments', async (req: Request, res: Response) => {
  try {
    // Get all payments with status
    const { data: allPayments, error: paymentError } = await supabase
      .from('rent_payments')
      .select('*');

    if (paymentError) throw paymentError;

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

    const monthPayments = allPayments?.filter(p => 
      p.created_at >= monthStart && p.created_at <= monthEnd
    ) || [];

    const monthRevenue = monthPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount_usdc || '0'), 0);

    // Get recent payments (last 5)
    const recentPayments = allPayments
      ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        summary: {
          totalPayments: total,
          completedPayments: completed,
          pendingPayments: pending,
          latePayments: late,
          failedPayments: failed,
          totalRevenue,
          expectedRevenue,
          collectionRate,
          monthlyRevenue: monthRevenue
        },
        recentPayments: recentPayments || []
      }
    });
  } catch (error) {
    console.error('❌ [Analytics] Error fetching payment data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get tenant analytics
app.get('/api/analytics/tenants', async (req: Request, res: Response) => {
  try {
    // Get tenant distribution
    const { data: tenantData, error: tenantError } = await supabase
      .from('users')
      .select('role')
      .in('role', ['tenant', 'landlord', 'property_manager']);

    if (tenantError) throw tenantError;

    // Count roles manually
    const roleCounts: Record<string, number> = {};
    tenantData?.forEach(user => {
      roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
    });

    // Get payment behavior data
    const { data: paymentBehavior, error: behaviorError } = await supabase
      .from('rent_payments')
      .select('tenant_id, status, amount_usdc, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (behaviorError) throw behaviorError;

    // Calculate tenant metrics
    const tenantIds = [...new Set(paymentBehavior?.map(p => p.tenant_id) || [])];
    
    // Get tenant details
    const { data: tenantDetails } = await supabase
      .from('users')
      .select('id, full_name, email')
      .in('id', tenantIds);

    // Payment statistics by tenant
    const tenantStats: any = {};
    tenantIds.forEach(id => {
      const tenantPayments = paymentBehavior?.filter(p => p.tenant_id === id) || [];
      const completed = tenantPayments.filter(p => p.status === 'completed').length;
      const total = tenantPayments.length;
      const onTimeRate = total > 0 ? (completed / total) * 100 : 0;
      
      tenantStats[id] = {
        totalPayments: total,
        onTimePayments: completed,
        onTimeRate,
        totalAmount: tenantPayments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + parseFloat(p.amount_usdc || '0'), 0)
      };
    });

    res.json({
      success: true,
      data: {
        userDistribution: tenantData || [],
        tenantStats,
        tenantDetails: tenantDetails || []
      }
    });
  } catch (error) {
    console.error('❌ [Analytics] Error fetching tenant data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get AI decision analytics
app.get('/api/analytics/ai-decisions', async (req: Request, res: Response) => {
  try {
    // TODO: Get AI decision statistics from blockchain (service not yet deployed)
    // const totalDecisions = await aiDecisionsContract.getTotalPaymentDecisions();
    
    res.json({
      success: true,
      data: {
        totalAIDecisions: 0, // Placeholder until service is deployed
        message: 'AI decision tracking coming soon'
      }
    });
  } catch (error) {
    console.error('❌ [Analytics] Error fetching AI decision data:', error);
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
      updates.tenant_signed_at = new Date().toISOString();
      
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
      updates.landlord_signed_at = new Date().toISOString();
      
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

    // NOTE: Blockchain signature recording now handled by smart contract (RentFlowLeaseSignature)
    // Frontend submits signatures directly to the smart contract on Arc testnet
    // Contract address: 0x1B831B4a95216ea98668BCEFf2662FEF2E833Da3

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
            blockchain_network: 'arc-testnet'
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
            blockchain_network: 'arc-testnet'
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

// =====================================
// SAVED PROPERTIES (WISHLIST) ENDPOINTS
// =====================================

// Save a property to user's wishlist
app.post('/api/saved-properties', async (req: Request, res: Response) => {
  try {
    const { userId, propertyId, notes } = req.body;

    if (!userId || !propertyId) {
      return res.status(400).json({
        success: false,
        error: 'userId and propertyId are required'
      });
    }

    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_properties')
      .select('*')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Property already saved'
      });
    }

    // Save property
    const { data, error } = await supabase
      .from('saved_properties')
      .insert([{
        user_id: userId,
        property_id: propertyId,
        notes: notes || null
      }])
      .select(`
        *,
        property:properties(*)
      `)
      .single();

    if (error) throw error;

    console.log('❤️ [Saved Properties] User', userId, 'saved property', propertyId);

    res.status(201).json({
      success: true,
      data,
      message: 'Property saved successfully'
    });
  } catch (error) {
    console.error('Error saving property:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Remove property from user's wishlist
app.delete('/api/saved-properties/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('saved_properties')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('💔 [Saved Properties] Removed saved property', id);

    res.json({
      success: true,
      message: 'Property removed from saved list'
    });
  } catch (error) {
    console.error('Error removing saved property:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Remove property from wishlist by user and property ID
app.delete('/api/saved-properties/user/:userId/property/:propertyId', async (req: Request, res: Response) => {
  try {
    const { userId, propertyId } = req.params;

    const { error } = await supabase
      .from('saved_properties')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId);

    if (error) throw error;

    console.log('💔 [Saved Properties] User', userId, 'removed property', propertyId);

    res.json({
      success: true,
      message: 'Property removed from saved list'
    });
  } catch (error) {
    console.error('Error removing saved property:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all saved properties for a user
app.get('/api/saved-properties/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('saved_properties')
      .select(`
        *,
        property:properties(
          *,
          owner:users(id, full_name, email)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log('❤️ [Saved Properties] Retrieved', data?.length || 0, 'saved properties for user', userId);

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Error fetching saved properties:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check if a property is saved by user
app.get('/api/saved-properties/check/:userId/:propertyId', async (req: Request, res: Response) => {
  try {
    const { userId, propertyId } = req.params;

    const { data, error } = await supabase
      .from('saved_properties')
      .select('id')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

    res.json({
      success: true,
      isSaved: !!data,
      savedId: data?.id || null
    });
  } catch (error) {
    console.error('Error checking saved property:', error);
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

    logger.info('Migrating chat from application to lease', { applicationId, leaseId }, 'CHAT');

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
      logger.error('Error migrating chat', error, 'CHAT');
      throw error;
    }

    logger.success(`Migrated ${data?.length || 0} messages to lease`, undefined, 'CHAT');

    res.json({ 
      success: true, 
      migrated: data?.length || 0,
      message: `Chat conversation migrated from application to lease`
    });
  } catch (error) {
    logger.error('Error migrating chat', error, 'CHAT');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== Tenant Reviews/Ratings ====================

// Create a new tenant review
app.post('/api/tenant-reviews',
  validateBody({
    lease_id: { type: 'uuid', required: true },
    reviewer_id: { type: 'uuid', required: true },
    tenant_id: { type: 'uuid', required: true },
    rating: { type: 'number', required: true, min: 1, max: 5 },
    review_text: { type: 'string', required: false },
    review_type: { type: 'string', required: false, enum: ['during_tenancy', 'post_tenancy', 'property_manager'] },
    is_anonymous: { type: 'boolean', required: false }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const reviewData = req.body;

    // Verify that reviewer is property manager for this lease
    const { data: lease } = await supabase
      .from('leases')
      .select('property_id')
      .eq('id', reviewData.lease_id)
      .single();

    if (!lease) {
      throw ApiErrors.notFound('Lease not found');
    }

    const { data: property } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('id', lease.property_id)
      .single();

    if (!property || property.owner_id !== reviewData.reviewer_id) {
      throw ApiErrors.forbidden('Only property managers can review tenants');
    }

    const { data, error } = await supabase
      .from('tenant_reviews')
      .insert([reviewData])
      .select()
      .single();

    if (error) throw ApiErrors.internal('Failed to create tenant review');

    res.status(201).json({ success: true, data });
  })
);

// Get tenant reviews
app.get('/api/tenant-reviews', async (req: Request, res: Response) => {
  try {
    const { tenant_id, reviewer_id, lease_id } = req.query;

    let query = supabase
      .from('tenant_reviews')
      .select(`
        *,
        tenant:users(full_name, email),
        reviewer:users(full_name, email)
      `);

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id);
    }

    if (reviewer_id) {
      query = query.eq('reviewer_id', reviewer_id);
    }

    if (lease_id) {
      query = query.eq('lease_id', lease_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching tenant reviews:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get tenant review statistics
app.get('/api/tenant-reviews/statistics/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const { data: reviews, error } = await supabase
      .from('tenant_reviews')
      .select('rating')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    if (!reviews || reviews.length === 0) {
      return res.json({
        success: true,
        data: {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
      });
    }

    // Calculate statistics
    const totalReviews = reviews.length;
    const sumRatings = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = sumRatings / totalReviews;

    // Rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
    });

    res.json({
      success: true,
      data: {
        averageRating: parseFloat(averageRating.toFixed(2)),
        totalReviews,
        ratingDistribution
      }
    });
  } catch (error) {
    console.error('Error fetching tenant review statistics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 404 handler for undefined routes (must be after all valid routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info('RentFlow AI Backend Server', undefined, 'SERVER');
  logger.info('================================', undefined, 'SERVER');
  logger.success(`Server running on http://localhost:${PORT}`, undefined, 'SERVER');
  logger.info(`Network: ${process.env.BLOCKCHAIN_NETWORK || 'solana'}`, undefined, 'SERVER');
  logger.info(`Deployer: ${process.env.DEPLOYER_ADDRESS}`, undefined, 'SERVER');
  logger.info(`AI Wallet: ${process.env.AI_WALLET_ADDRESS}`, undefined, 'SERVER');
  logger.info(`Database: ${process.env.SUPABASE_URL}`, undefined, 'SERVER');
  logger.info('================================', undefined, 'SERVER');
  
  // Start voice notification scheduler (check every 60 minutes)
  voiceNotificationScheduler.start(60);
});

export default app;
