/**
 * ElevenLabs Voice Service
 * Handles text-to-speech generation for voice notifications
 * Documentation: https://elevenlabs.io/docs
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface VoiceGenerationOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speakerBoost?: boolean;
}

interface VoiceInfo {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
}

class ElevenLabsService {
  private apiKey: string;
  private baseUrl: string;
  private isConfigured: boolean;
  private defaultVoiceId: string;
  private audioOutputDir: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.isConfigured = !!this.apiKey;
    
    // Default voice: Rachel (clear, professional female voice)
    this.defaultVoiceId = '21m00Tcm4TlvDq8ikWAM';
    
    // Audio output directory
    this.audioOutputDir = path.join(__dirname, '../../audio');
    
    // Create audio directory if it doesn't exist
    if (!fs.existsSync(this.audioOutputDir)) {
      fs.mkdirSync(this.audioOutputDir, { recursive: true });
    }

    if (!this.isConfigured) {
      console.warn('⚠️  ElevenLabs API not configured. Voice generation will be simulated.');
    } else {
      console.log('✅ ElevenLabs service initialized successfully');
    }
  }

  /**
   * Check if ElevenLabs API is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Generate speech audio from text
   */
  async generateSpeech(options: VoiceGenerationOptions): Promise<{
    success: boolean;
    audioPath?: string;
    audioUrl?: string;
    duration?: number;
    error?: string;
  }> {
    if (!this.isConfigured) {
      // Simulate voice generation in development
      const simulatedPath = path.join(this.audioOutputDir, `simulated_${Date.now()}.mp3`);
      fs.writeFileSync(simulatedPath, 'SIMULATED AUDIO FILE');
      
      return {
        success: true,
        audioPath: simulatedPath,
        audioUrl: `/audio/${path.basename(simulatedPath)}`,
        duration: options.text.length * 0.1, // Rough estimate: 0.1s per character
      };
    }

    try {
      const voiceId = options.voiceId || this.defaultVoiceId;
      const modelId = options.modelId || 'eleven_multilingual_v2';

      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          text: options.text,
          model_id: modelId,
          voice_settings: {
            stability: options.stability ?? 0.5,
            similarity_boost: options.similarityBoost ?? 0.75,
            style: options.style ?? 0.0,
            use_speaker_boost: options.speakerBoost ?? true,
          },
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          responseType: 'arraybuffer',
        }
      );

      // Save audio file
      const timestamp = Date.now();
      const fileName = `voice_${timestamp}.mp3`;
      const filePath = path.join(this.audioOutputDir, fileName);

      fs.writeFileSync(filePath, response.data);

      // Calculate approximate duration (ElevenLabs doesn't return this)
      const duration = options.text.length * 0.1;

      return {
        success: true,
        audioPath: filePath,
        audioUrl: `/audio/${fileName}`,
        duration,
      };
    } catch (error) {
      console.error('ElevenLabs API error:', error);

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get list of available voices
   */
  async getAvailableVoices(): Promise<{
    success: boolean;
    voices?: VoiceInfo[];
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        success: true,
        voices: [
          {
            voice_id: '21m00Tcm4TlvDq8ikWAM',
            name: 'Rachel (Default)',
            category: 'premade',
            description: 'Clear, professional female voice',
          },
          {
            voice_id: 'simulated',
            name: 'Simulated Voice',
            category: 'test',
            description: 'Development mode simulation',
          },
        ],
      };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      return {
        success: true,
        voices: response.data.voices,
      };
    } catch (error) {
      console.error('Error fetching voices:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate rent reminder notification
   */
  async generateRentReminder(
    tenantName: string,
    amountDue: number,
    dueDate: string,
    propertyAddress: string
  ): Promise<{ success: boolean; audioPath?: string; audioUrl?: string; error?: string }> {
    const text = `Hello ${tenantName}, this is a friendly reminder from RentFlow AI. 
    Your rent payment of ${amountDue} USDC for ${propertyAddress} is due on ${dueDate}. 
    Please ensure timely payment to avoid late fees. 
    You can make your payment through the RentFlow tenant portal. 
    Thank you for being a valued tenant!`;

    const result = await this.generateSpeech({
      text,
      stability: 0.6,
      similarityBoost: 0.8,
      style: 0.2,
    });

    return result;
  }

  /**
   * Generate maintenance update notification
   */
  async generateMaintenanceUpdate(
    tenantName: string,
    maintenanceTitle: string,
    status: string,
    message: string
  ): Promise<{ success: boolean; audioPath?: string; audioUrl?: string; error?: string }> {
    const text = `Hello ${tenantName}, this is an update from RentFlow AI regarding your maintenance request: ${maintenanceTitle}. 
    The current status is: ${status}. 
    ${message}. 
    You can track your maintenance request status in the tenant portal. 
    Thank you for your patience!`;

    const result = await this.generateSpeech({
      text,
      stability: 0.6,
      similarityBoost: 0.8,
    });

    return result;
  }

  /**
   * Generate payment confirmation notification
   */
  async generatePaymentConfirmation(
    tenantName: string,
    amount: number,
    transactionHash: string,
    propertyAddress: string
  ): Promise<{ success: boolean; audioPath?: string; audioUrl?: string; error?: string }> {
    const txShort = transactionHash.substring(0, 8);
    
    const text = `Hello ${tenantName}, this is a payment confirmation from RentFlow AI. 
    We have successfully received your payment of ${amount} USDC for ${propertyAddress}. 
    Your transaction ID is ${txShort}. 
    Thank you for your prompt payment! 
    A receipt has been sent to your email address.`;

    const result = await this.generateSpeech({
      text,
      stability: 0.6,
      similarityBoost: 0.8,
      style: 0.1,
    });

    return result;
  }

  /**
   * Generate lease expiration warning
   */
  async generateLeaseExpirationWarning(
    tenantName: string,
    expirationDate: string,
    propertyAddress: string,
    daysRemaining: number
  ): Promise<{ success: boolean; audioPath?: string; audioUrl?: string; error?: string }> {
    const text = `Hello ${tenantName}, this is an important notice from RentFlow AI. 
    Your lease agreement for ${propertyAddress} will expire on ${expirationDate}, 
    which is ${daysRemaining} days from now. 
    Please contact your landlord to discuss lease renewal options. 
    You can also manage your lease through the RentFlow tenant portal. 
    Thank you!`;

    const result = await this.generateSpeech({
      text,
      stability: 0.6,
      similarityBoost: 0.8,
      style: 0.3,
    });

    return result;
  }

  /**
   * Generate custom notification
   */
  async generateCustomNotification(
    recipientName: string,
    message: string,
    voiceSettings?: Partial<VoiceGenerationOptions>
  ): Promise<{ success: boolean; audioPath?: string; audioUrl?: string; error?: string }> {
    const text = `Hello ${recipientName}, ${message}`;

    const result = await this.generateSpeech({
      text,
      ...voiceSettings,
    });

    return result;
  }

  /**
   * Delete audio file
   */
  deleteAudioFile(audioPath: string): boolean {
    try {
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting audio file:', error);
      return false;
    }
  }

  /**
   * Clean up old audio files (older than specified days)
   */
  cleanupOldAudioFiles(daysOld: number = 7): number {
    try {
      const files = fs.readdirSync(this.audioOutputDir);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      files.forEach((file) => {
        const filePath = path.join(this.audioOutputDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });

      console.log(`🧹 Cleaned up ${deletedCount} old audio files`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up audio files:', error);
      return 0;
    }
  }
}

export default new ElevenLabsService();
