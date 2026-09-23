import { collection, doc, writeBatch } from "firebase/firestore";

import { db } from "./firebase";

export const INITIAL_CAUSES = [
  {
    id: "humanitarian-relief",
    title: "Emergency Ration & Health Relief",
    description: "Month-long ration bags with Aata, Ghee, Daal, and Sugar for widows, elderly people, and daily-wage families facing rising prices.",
    active: true,
    status: "Urgent",
    displayOrder: 1,
    raisedAmount: 0,
    targetAmount: 500000,
  },
  {
    id: "education",
    title: "Village Primary Education",
    description: "School uniforms, books, school kits, and winter clothes for children in Mohar Kalan and nearby villages.",
    active: true,
    status: "In progress",
    displayOrder: 2,
    raisedAmount: 0,
    targetAmount: 350000,
  },
];

export const INITIAL_PLATFORM_SETTINGS = {
  id: "main",
  organizationName: "Noble Alliance",
  organizationTagline: "From Mohar Kalan to Every Door: Direct Care, Zero Overhead.",
  organizationDescription: "We are a grassroots team based in Mohar Kalan working hand-in-hand with rural families. 100% of your donation reaches the ground directly through verified, transparent local distribution.",
  contactEmail: "moharkalan@noblealliance.org",
  phoneNumber: "+92 300 1234567",
  currency: "PKR",
  volunteerCount: 48,
  projectsCompleted: 12,
  jazzCashAccountTitle: "Noble Alliance Mohar Kalan Relief",
  jazzCashNumber: "+92 300 1234567",
  easyPaisaAccountTitle: "Noble Alliance Mohar Kalan Relief",
  easyPaisaNumber: "+92 301 7654321",
  bankName: "Noble Alliance Relief Account",
  bankAccountTitle: "Noble Alliance Mohar Kalan Relief",
  bankAccountNumber: "001234567890",
  iban: "PK00 NCBK 0000 1234 5678 90",
};

export const DEMO_DONATION_RECEIPTS = [
  {
    id: "demo-receipt-001",
    causeId: "humanitarian-relief",
    amount: 15000,
    transactionId: "DEMO-JC-482910",
    screenshotUrl: "https://placehold.co/1200x800/e8f5ed/142b23?text=Demo+Payment+Screenshot",
    screenshotPath: "demo/donation-receipts/demo-receipt-001.png",
    status: "pending",
    donorName: "Amina Khan",
    donorEmail: "amina@example.com",
  },
  {
    id: "demo-receipt-002",
    causeId: "education",
    amount: 25000,
    transactionId: "DEMO-EP-731204",
    screenshotUrl: "https://placehold.co/1200x800/fff4d8/142b23?text=Demo+Payment+Screenshot",
    screenshotPath: "demo/donation-receipts/demo-receipt-002.png",
    status: "verified",
    donorName: "Bilal Ahmed",
    donorEmail: "bilal@example.com",
  },
];

export const DEMO_CONTACT_MESSAGES = [
  {
    id: "demo-contact-001",
    name: "Sara Malik",
    email: "sara@example.com",
    interest: "Volunteer in Mohar Kalan",
    message: "I can help pack school kits and visit families on weekends.",
    status: "new",
  },
  {
    id: "demo-contact-002",
    name: "Omar Hassan",
    email: "omar@example.com",
    interest: "Support school kits or ration bags",
    message: "I would like to help provide ration bags to widows and daily-wage families.",
    status: "contacted",
  },
];

/**
 * Creates or updates the public causes and platform settings seed data.
 * The caller must be signed in because Firestore rules protect writes.
 */
export async function seedFirestore({
  causes = INITIAL_CAUSES,
  platformSettings = INITIAL_PLATFORM_SETTINGS,
  includeDemoRecords = false,
} = {}) {
  const batch = writeBatch(db);

  causes.forEach(({ id, ...cause }) => {
    if (!id) {
      throw new Error("Each cause must include an id.");
    }

    batch.set(doc(collection(db, "causes"), id), cause, { merge: true });
  });

  const { id: settingsId = "main", ...settings } = platformSettings;
  batch.set(
    doc(collection(db, "platform_settings"), settingsId),
    settings,
    { merge: true },
  );

  if (includeDemoRecords) {
    DEMO_DONATION_RECEIPTS.forEach(({ id, ...receipt }) => {
      batch.set(doc(collection(db, "donation_receipts"), id), receipt, { merge: true });
    });

    DEMO_CONTACT_MESSAGES.forEach(({ id, ...submission }) => {
      batch.set(doc(collection(db, "contact_messages"), id), submission, { merge: true });
    });
  }

  await batch.commit();
}
