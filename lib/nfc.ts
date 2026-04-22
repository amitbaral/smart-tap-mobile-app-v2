import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * NFC Service
 * 
 * This service handles NFC interactions. It is designed to be safe to import
 * in environments without native NFC support (like Expo Go or Web).
 */

class NfcService {
  private isSupported: boolean = false;
  private NfcManager: any = null;

  constructor() {
    this.init();
  }

  async init() {
    // 1. Skip if on Web
    if (Platform.OS === 'web') return;

    // 2. Skip if in Expo Go (Native module won't be found and might crash if required)
    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo) {
      console.log('NFC: Running in Expo Go - Native module disabled for safety.');
      return;
    }
    
    try {
      // Lazy load only if NOT in Expo Go and NOT on Web
      const manager = require('react-native-nfc-manager').default;
      if (manager) {
        this.NfcManager = manager;
        this.isSupported = await this.NfcManager.isSupported();
        if (this.isSupported) {
          await this.NfcManager.start();
        }
      }
    } catch (ex) {
      console.warn('NFC: Native module could not be loaded.', ex);
      this.isSupported = false;
    }
  }

  async writeProfileUrl(profileId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isSupported || !this.NfcManager) {
      return { 
        success: false, 
        error: 'NFC hardware not detected or unavailable in this environment. Please use a physical device with a Development Build.' 
      };
    }

    try {
      const { NfcTech, Ndef } = require('react-native-nfc-manager');
      const url = `https://app.smarttap.au/user/${profileId}`;
      
      await this.NfcManager.requestTechnology(NfcTech.Ndef);
      const bytes = Ndef.encodeMessage([Ndef.uriRecord(url)]);

      if (!bytes) throw new Error('Failed to encode URL');

      await this.NfcManager.ndefHandler.writeNdefMessage(bytes);
      return { success: true };
    } catch (ex: any) {
      console.warn('NFC Write Error:', ex);
      return { 
        success: false, 
        error: ex === 'cancelled' ? 'Write cancelled.' : 'Error writing to tag.' 
      };
    } finally {
      try {
        await this.NfcManager.cancelTechnologyRequest();
      } catch {}
    }
  }

  async isEnabled(): Promise<boolean> {
    if (!this.isSupported || !this.NfcManager) return false;
    try {
      return await this.NfcManager.isEnabled();
    } catch {
      return false;
    }
  }

  openSettings() {
    if (this.isSupported && this.NfcManager && Platform.OS === 'android') {
      this.NfcManager.goToNfcSetting();
    }
  }
}

export const nfcService = new NfcService();
