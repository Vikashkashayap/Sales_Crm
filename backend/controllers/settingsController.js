import { getAppSettings } from '../models/Settings.js';
import {
  ensureOnboardingDirs,
  listCatalogWithStatus,
} from '../utils/onboardingDocuments.js';

export const getSettings = async (req, res) => {
  try {
    const settings = await getAppSettings();
    res.json({
      attachWelcomeKitWithReceipt: Boolean(settings.attachWelcomeKitWithReceipt),
      paymentRemindersEnabled: Boolean(settings.paymentRemindersEnabled ?? true),
      reminderDaysBeforeDue: Number(settings.reminderDaysBeforeDue ?? 3),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settings = await getAppSettings();
    if (req.body.attachWelcomeKitWithReceipt !== undefined) {
      settings.attachWelcomeKitWithReceipt = Boolean(req.body.attachWelcomeKitWithReceipt);
    }
    if (req.body.paymentRemindersEnabled !== undefined) {
      settings.paymentRemindersEnabled = Boolean(req.body.paymentRemindersEnabled);
    }
    if (req.body.reminderDaysBeforeDue !== undefined) {
      const days = Number(req.body.reminderDaysBeforeDue);
      if (!Number.isFinite(days) || days < 0 || days > 30) {
        return res.status(400).json({ message: 'reminderDaysBeforeDue must be between 0 and 30' });
      }
      settings.reminderDaysBeforeDue = Math.round(days);
    }
    await settings.save();
    res.json({
      attachWelcomeKitWithReceipt: Boolean(settings.attachWelcomeKitWithReceipt),
      paymentRemindersEnabled: Boolean(settings.paymentRemindersEnabled),
      reminderDaysBeforeDue: Number(settings.reminderDaysBeforeDue),
      message: 'Settings updated',
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const listOnboardingDocuments = async (req, res) => {
  try {
    ensureOnboardingDirs();
    const documents = listCatalogWithStatus();
    const settings = await getAppSettings();
    res.json({
      documents,
      attachWelcomeKitWithReceipt: Boolean(settings.attachWelcomeKitWithReceipt),
      paymentRemindersEnabled: Boolean(settings.paymentRemindersEnabled ?? true),
      reminderDaysBeforeDue: Number(settings.reminderDaysBeforeDue ?? 3),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
