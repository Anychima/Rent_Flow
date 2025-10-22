-- Voice Notifications Table
-- Stores generated voice notifications for tenants and landlords

CREATE TABLE IF NOT EXISTS voice_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('rent_reminder', 'maintenance_update', 'payment_confirmation', 'lease_expiration', 'custom')),
  audio_url TEXT NOT NULL,
  audio_path TEXT,
  related_id UUID, -- References payment_id, maintenance_id, or lease_id depending on type
  status VARCHAR(20) DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'delivered', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_voice_notifications_user_id ON voice_notifications(user_id);
CREATE INDEX idx_voice_notifications_type ON voice_notifications(type);
CREATE INDEX idx_voice_notifications_status ON voice_notifications(status);
CREATE INDEX idx_voice_notifications_created_at ON voice_notifications(created_at DESC);

-- RLS Policies
ALTER TABLE voice_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY voice_notifications_select_own ON voice_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Managers can view all notifications
CREATE POLICY voice_notifications_select_manager ON voice_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('manager', 'admin')
    )
  );

-- Service role can insert/update
CREATE POLICY voice_notifications_service_all ON voice_notifications
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_voice_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_voice_notifications_updated_at
  BEFORE UPDATE ON voice_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_notifications_updated_at();

-- Comments
COMMENT ON TABLE voice_notifications IS 'Stores AI-generated voice notifications for users';
COMMENT ON COLUMN voice_notifications.type IS 'Type of notification: rent_reminder, maintenance_update, payment_confirmation, lease_expiration, custom';
COMMENT ON COLUMN voice_notifications.audio_url IS 'Public URL to access the audio file';
COMMENT ON COLUMN voice_notifications.related_id IS 'Foreign key to related entity (payment, maintenance, lease) depending on type';
COMMENT ON COLUMN voice_notifications.status IS 'Delivery status: generated, sent, delivered, failed';
