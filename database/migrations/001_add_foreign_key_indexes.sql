-- Migration: Add missing indexes on foreign keys
-- This significantly improves JOIN performance and foreign key constraint checks
-- Run this in Supabase SQL Editor

-- 1. lease_documents table
CREATE INDEX IF NOT EXISTS idx_lease_documents_lease_id ON public.lease_documents(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_documents_uploaded_by ON public.lease_documents(uploaded_by);

-- 2. maintenance_requests table
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property_id ON public.maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_requested_by ON public.maintenance_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assigned_to ON public.maintenance_requests(assigned_to);

-- 3. messages table
CREATE INDEX IF NOT EXISTS idx_messages_application_id ON public.messages(application_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- 4. property_applications table
CREATE INDEX IF NOT EXISTS idx_property_applications_property_id ON public.property_applications(property_id);
CREATE INDEX IF NOT EXISTS idx_property_applications_applicant_id ON public.property_applications(applicant_id);

-- 5. rent_payments table
CREATE INDEX IF NOT EXISTS idx_rent_payments_lease_id ON public.rent_payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_tenant_id ON public.rent_payments(tenant_id);

-- 6. voice_notifications table
CREATE INDEX IF NOT EXISTS idx_voice_notifications_user_id ON public.voice_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_notifications_payment_id ON public.voice_notifications(payment_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_rent_payments_status_due_date ON public.rent_payments(status, due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status_priority ON public.maintenance_requests(status, priority);
CREATE INDEX IF NOT EXISTS idx_property_applications_status_created ON public.property_applications(status, created_at DESC);

COMMENT ON INDEX idx_lease_documents_lease_id IS 'Foreign key index for lease_documents.lease_id';
COMMENT ON INDEX idx_maintenance_requests_property_id IS 'Foreign key index for maintenance_requests.property_id';
COMMENT ON INDEX idx_messages_application_id IS 'Foreign key index for messages.application_id';
COMMENT ON INDEX idx_property_applications_property_id IS 'Foreign key index for property_applications.property_id';
COMMENT ON INDEX idx_rent_payments_lease_id IS 'Foreign key index for rent_payments.lease_id';
COMMENT ON INDEX idx_voice_notifications_user_id IS 'Foreign key index for voice_notifications.user_id';
