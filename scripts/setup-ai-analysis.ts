#!/usr/bin/env ts-node
/**
 * RentFlow AI - Automated Maintenance Analysis Setup
 * 
 * This script sets up automated AI analysis for maintenance requests
 * by creating a cron job that periodically checks for new requests
 * and analyzes them using OpenAI.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import openaiService from '../backend/src/services/openaiService';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || ''
);

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  property_id: string;
  status: string;
  ai_analysis?: any;
  created_at: string;
}

async function analyzeMaintenanceRequests() {
  console.log('🔍 Checking for maintenance requests requiring AI analysis...');
  
  try {
    // Get unanalyzed maintenance requests (pending status, no AI analysis)
    const { data: requests, error } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('status', 'pending')
      .is('ai_analysis', null)
      .limit(10);

    if (error) {
      console.error('❌ Error fetching maintenance requests:', error);
      return;
    }

    if (!requests || requests.length === 0) {
      console.log('✅ No maintenance requests require AI analysis');
      return;
    }

    console.log(`📊 Found ${requests.length} maintenance requests to analyze`);

    // Process each request
    for (const request of requests) {
      try {
        console.log(`\n🤖 Analyzing request: ${request.title}`);
        
        // Get property type for better analysis
        const { data: property } = await supabase
          .from('properties')
          .select('property_type')
          .eq('id', request.property_id)
          .single();

        // Analyze with OpenAI
        const analysis = await openaiService.analyzeMaintenanceRequest(
          request.title,
          request.description,
          property?.property_type
        );

        // Save analysis to database
        const { error: updateError } = await supabase
          .from('maintenance_requests')
          .update({
            ai_analysis: analysis,
            priority: analysis.suggestedPriority,
            category: analysis.suggestedCategory,
            estimated_cost_usdc: analysis.estimatedCost.average,
            updated_at: new Date().toISOString()
          })
          .eq('id', request.id);

        if (updateError) {
          console.error(`❌ Failed to save analysis for request ${request.id}:`, updateError);
        } else {
          console.log(`✅ Analysis saved for request: ${request.title}`);
          
          // Log analysis summary
          console.log(`   Priority: ${analysis.suggestedPriority}`);
          console.log(`   Category: ${analysis.suggestedCategory}`);
          console.log(`   Estimated Cost: $${analysis.estimatedCost.average}`);
          console.log(`   Urgency Score: ${analysis.urgencyScore}/10`);
        }
      } catch (error) {
        console.error(`❌ Error analyzing request ${request.id}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error in maintenance analysis process:', error);
  }
}

async function setupCronJob() {
  console.log('⏰ Setting up automated AI analysis cron job...');
  
  // Run immediately
  await analyzeMaintenanceRequests();
  
  // Schedule to run every 15 minutes
  setInterval(async () => {
    console.log(`\n[${new Date().toISOString()}] Running scheduled maintenance analysis...`);
    await analyzeMaintenanceRequests();
  }, 15 * 60 * 1000); // 15 minutes
  
  console.log('✅ AI analysis cron job set up successfully');
  console.log('📝 The script will now run every 15 minutes to analyze new maintenance requests');
}

// Run the setup
if (require.main === module) {
  setupCronJob().catch(console.error);
}

export { analyzeMaintenanceRequests, setupCronJob };