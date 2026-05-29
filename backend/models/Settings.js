import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    attachWelcomeKitWithReceipt: { type: Boolean, default: false },
    paymentRemindersEnabled: { type: Boolean, default: true },
    reminderDaysBeforeDue: { type: Number, default: 3, min: 0, max: 30 },
  },
  { timestamps: true }
);

const Settings = mongoose.model('Settings', settingsSchema);

/** Singleton app settings — created on first access */
export async function getAppSettings() {
  let doc = await Settings.findOne();
  if (!doc) {
    doc = await Settings.create({});
  }
  return doc;
}

export default Settings;
