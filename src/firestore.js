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
  missionHeadline: "Rooted in Mohar Kalan.",
  missionDescription: "Noble Alliance began with neighbours helping neighbours. Our volunteers know the lanes, families, and local pressures across Mohar Kalan and surrounding villages.",
  howItWorksHeading: "Rooted in Mohar Kalan.",
  howItWorksIntro: "",
  howItWorksSteps: [
    { id: "identify", title: "A neighbour speaks", description: "A teacher, imam, neighbour, or volunteer tells us about a family facing a real need." },
    { id: "verify", title: "We verify the case", description: "Our volunteers visit personally, listen carefully, and confirm the household situation before aid is approved." },
    { id: "deliver", title: "Aid reaches the door", description: "We deliver school kits, uniforms, ration bags, or health support and keep a clear record for donors." },
  ],
  transparencyHeading: "See what care can do.",
  transparencyDescription: "We share the work, the numbers, and the people behind every contribution. Progress is something we build in the open.",
  transparencyPhotos: [
    { id: "photo1", url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1000&q=85", caption: "Learning together", alt: "Children smiling together outdoors" },
    { id: "photo2", url: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=85", caption: "People power", alt: "Volunteers joining hands in a circle" },
    { id: "photo3", url: "https://images.unsplash.com/photo-1594708767771-a7502209ff51?auto=format&fit=crop&w=800&q=85", caption: "Care in action", alt: "A child receiving care and support" },
  ],
  footerNavigation: [
    { label: "Our mission", target: "#mission" },
    { label: "Get involved", target: "#contact" },
    { label: "Admin", target: "admin" },
  ],
  footerCopyright: "",
  footerSocialLinks: [],
  contactEmail: "moharkalan@noblealliance.org",
  phoneNumber: "+92 300 1234567",
  currency: "PKR",
  volunteerCount: 48,
  projectsCompleted: 12,
  paymentMethods: [
    {
      id: "jazzcash",
      label: "JazzCash",
      description: "Open JazzCash, choose Send Money, enter this number, and keep the transaction ID for your receipt.",
      icon: "phone",
      enabled: true,
      order: 1,
    },
    {
      id: "easypaisa",
      label: "EasyPaisa",
      description: "Open EasyPaisa, choose Send Money, enter this number, and keep the transaction ID for your receipt.",
      icon: "phone",
      enabled: true,
      order: 2,
    },
    {
      id: "bank",
      label: "Bank transfer",
      description: "Use the account title and IBAN for a bank transfer, then keep your transfer reference for verification.",
      icon: "landmark",
      enabled: true,
      order: 3,
    },
  ],
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
