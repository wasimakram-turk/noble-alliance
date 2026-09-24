import { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  FileImage,
  HeartHandshake,
  Landmark,
  Mail,
  Menu,
  Plus,
  Send,
  ShieldCheck,
  WalletCards,
  Upload,
  X,
} from "lucide-react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";
const Admin = lazy(() => import("./Admin"));
import Button from "./components/Button";
import CopyButton from "./components/CopyButton";
import educationImage from "./assets/Education.jfif";
import humanitarianImage from "./assets/Human.jfif";
import communityImage from "./assets/releif.jfif";

const appBaseUrl = import.meta.env.BASE_URL;
const adminPath = `${appBaseUrl}?admin=1`;
const legacyAdminPath = `${appBaseUrl}admin`;

const fallbackPaymentMethods = [
  {
    id: "jazzcash",
    label: "JazzCash",
    description: "Open JazzCash, choose Send Money, enter this number, and keep the transaction ID for your receipt.",
    icon: "phone",
    enabled: true,
    order: 1,
    iconComponent: WalletCards,
    mark: "JC",
    color: "bg-[#e8f5ed] text-[#177245]",
    fields: [
      ["Account title", ["jazzCashAccountTitle", "jazzcashAccountTitle"]],
      ["Mobile number", ["jazzCashNumber", "jazzcashNumber"]],
    ],
  },
  {
    id: "easypaisa",
    label: "EasyPaisa",
    description: "Open EasyPaisa, choose Send Money, enter this number, and keep the transaction ID for your receipt.",
    icon: "phone",
    enabled: true,
    order: 2,
    iconComponent: WalletCards,
    mark: "EP",
    color: "bg-[#fff4d8] text-[#a86c00]",
    fields: [
      ["Account title", ["easyPaisaAccountTitle", "easypaisaAccountTitle"]],
      ["Mobile number", ["easyPaisaNumber", "easypaisaNumber"]],
    ],
  },
  {
    id: "bank",
    label: "Bank transfer",
    description: "Use the account title and IBAN for a bank transfer, then keep your transfer reference for verification.",
    icon: "landmark",
    enabled: true,
    order: 3,
    iconComponent: Landmark,
    mark: "BK",
    color: "bg-[#e9eef9] text-[#274b87]",
    fields: [
      ["Bank", ["bankName"]],
      ["Account title", ["bankAccountTitle", "accountTitle"]],
      ["Account number", ["bankAccountNumber", "accountNumber"]],
      ["IBAN", ["iban", "bankIban"]],
    ],
  },
];

const paymentIconMap = {
  phone: WalletCards,
  landmark: Landmark,
};

function getPaymentMethods(settings) {
  const configured = Array.isArray(settings?.paymentMethods) && settings.paymentMethods.length > 0
    ? settings.paymentMethods
    : fallbackPaymentMethods;

  return configured
    .map((config) => {
      const fallback = fallbackPaymentMethods.find((method) => method.id === config.id);
      if (!fallback) return null;
      return {
        ...fallback,
        ...config,
        label: String(config.label || fallback.label).trim() || fallback.label,
        description: String(config.description || fallback.description).trim() || fallback.description,
        icon: paymentIconMap[config.icon] || fallback.iconComponent,
      };
    })
    .filter((method) => method && method.enabled === true)
    .sort((first, second) => Number(first.order) - Number(second.order));
}

function getPaymentValue(settings, keys) {
  const key = keys.find((candidate) => settings?.[candidate] !== undefined && settings?.[candidate] !== null);
  return key ? String(settings[key]) : "Not configured yet";
}

function getCauseValue(cause, keys, fallback = 0) {
  const key = keys.find((candidate) => cause?.[candidate] !== undefined);
  return key ? cause[key] : fallback;
}

const safeHeroTargets = new Set([
  "#donate",
  "#causes",
  "#mission",
  "#how-it-works",
  "#impact",
  "#contact",
  "#payment",
  "#rooted",
  "#transparency",
]);

function getSafeHeroTarget(value, fallback) {
  const target = String(value || "").trim();
  if (safeHeroTargets.has(target)) return target;
  if (target.startsWith("/") && !target.startsWith("//")) return target;
  return fallback;
}

function formatAmount(amount) {
  return new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function progressFor(cause) {
  const raised = Number(getCauseValue(cause, ["raisedAmount", "currentAmount", "raised"], 0));
  const target = Number(getCauseValue(cause, ["targetAmount", "goalAmount", "target"], 0));
  return {
    raised,
    target,
    percent: target > 0 ? Math.min(Math.round((raised / target) * 100), 100) : 0,
  };
}

const causeFallbackImages = {
  education: educationImage,
  "community-development": communityImage,
  "humanitarian-relief": humanitarianImage,
};

function compressReceiptImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not decode the image."));
      image.onload = () => {
        const maxDimension = 1200;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const fallbackTransparencyPhotos = [
  {
    id: "photo1",
    src: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1000&q=85",
    alt: "Children smiling together outdoors",
    label: "Learning together",
    className: "md:col-span-2 md:row-span-2",
  },
  {
    id: "photo2",
    src: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=85",
    alt: "Volunteers joining hands in a circle",
    label: "People power",
    className: "",
  },
  {
    id: "photo3",
    src: "https://images.unsplash.com/photo-1594708767771-a7502209ff51?auto=format&fit=crop&w=800&q=85",
    alt: "A child receiving care and support",
    label: "Care in action",
    className: "",
  },
];

const fallbackFooterNavigation = [
  { label: "Our mission", target: "#mission" },
  { label: "Get involved", target: "#contact" },
  { label: "Admin", target: "admin" },
];

const fallbackHowItWorksSteps = [
  { id: "identify", title: "A neighbour speaks", description: "A teacher, imam, neighbour, or volunteer tells us about a family facing a real need." },
  { id: "verify", title: "We verify the case", description: "Our volunteers visit personally, listen carefully, and confirm the household situation before aid is approved." },
  { id: "deliver", title: "Aid reaches the door", description: "We deliver school kits, uniforms, ration bags, or health support and keep a clear record for donors." },
];

function PaymentCard({ method, settings, copiedValue, onCopy }) {
  const Icon = method.icon;

  return (
    <article className="interactive-card border-t border-[#d9d4c9] pt-5">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className={`relative flex h-11 w-11 items-center justify-center rounded-2xl ${method.color}`}>
          <Icon size={21} strokeWidth={1.8} />
          <span className="absolute -bottom-1 -right-1 rounded-md bg-[#142b23] px-1 text-[8px] font-black leading-4 tracking-tight text-white">{method.mark}</span>
        </div>
        <h3 className="font-serif text-2xl text-[#142b23]">{method.label}</h3>
      </div>
      <div className="space-y-4 p-5">
        {method.fields.map(([label, keys]) => {
          const value = getPaymentValue(settings, keys);
          const isAccountTitle = label === "Account title";
          return (
            <div key={label} className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${isAccountTitle ? "text-[#b27618]" : "text-[#827d72]"}`}>
                  {label}
                </p>
                <p className={`truncate ${isAccountTitle ? "font-semibold text-base text-[#142b23]" : "text-sm font-medium text-[#313d36]"} ${value === "Not configured yet" ? "italic text-[#aaa398]" : ""}`}>
                  {value}
                </p>
              </div>
              <CopyButton
                value={value}
                copied={copiedValue === value}
                onCopy={onCopy}
              />
            </div>
          );
        })}
        <p className="border-t border-[#e5e0d5] pt-4 text-xs leading-5 text-[#5f685f]">{method.description}</p>
      </div>
    </article>
  );
}

function CauseCard({ cause, currency, onSubmitReceipt }) {
  const progress = progressFor(cause);
  const title = cause.title || cause.name || "Community support";
  const description = cause.description || "Your support helps this work reach more people.";
  const status = cause.status || "Active";
  const imageUrl = cause.imageUrl || cause.image || causeFallbackImages[cause.id] || "";

  return (
    <article className="interactive-card flex min-h-[20rem] flex-col overflow-hidden rounded-[1.75rem] border border-[#e5e0d5] bg-white/55 transition hover:-translate-y-1 hover:border-[#c9b47f] hover:shadow-[0_18px_45px_rgba(20,43,35,0.07)]">
      <div className="relative h-36 overflow-hidden bg-[#dce8d8]">
        {imageUrl ? <img src={imageUrl} alt="" loading="lazy" decoding="async" width="640" height="360" className="h-full w-full object-cover object-center transition duration-500 hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_30%,#f0bd4c_0_8%,transparent_9%),linear-gradient(135deg,#dce8d8,#bed2b8)]"><HeartHandshake className="text-[#31573e]" size={38} strokeWidth={1.4} /></div>}
        <span className="absolute right-5 top-5 rounded-full bg-white/85 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-[#39704e]">{status}</span>
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-7">
      <div className="mb-8 flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0bd4c]/25 text-[#9c6812]"><HeartHandshake size={21} /></span>
      </div>
      <h3 className="font-serif text-3xl leading-tight text-[#142b23]">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-[#6c716a]">{description}</p>
      <div className="mt-7">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#5f685f]"><span>{currency} {formatAmount(progress.raised)} raised</span><span>{progress.percent}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-[#e6e4dc]"><div className="h-full rounded-full bg-[#d49c2e] transition-all" style={{ width: `${progress.percent}%` }} /></div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-[#918d83]"><span>Progress</span><span>Goal: {currency} {formatAmount(progress.target)}</span></div>
      </div>
      <button type="button" onClick={() => onSubmitReceipt(cause)} className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-[#142b23] px-4 py-2.5 text-sm font-bold text-[#142b23] transition hover:bg-[#142b23] hover:text-white">Submit payment receipt <ArrowRight size={15} /></button>
      </div>
    </article>
  );
}

function ReceiptModal({ causes, selectedCause, currency, onClose, onSuccess }) {
  const [causeId, setCauseId] = useState(selectedCause?.id || "");
  const [transactionId, setTransactionId] = useState("");
  const [amount, setAmount] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageSource, setImageSource] = useState("file");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!causeId || !transactionId.trim() || !amount || (imageSource === "file" && !screenshot) || (imageSource === "url" && !imageUrl.trim())) {
      setError("Please complete every field and provide a payment screenshot or image URL.");
      return;
    }

    if (imageSource === "file" && (!screenshot.type.startsWith("image/") || screenshot.size > 5 * 1024 * 1024)) {
      setError("Please choose an image smaller than 5 MB.");
      return;
    }

    setStatus("submitting");
    setError("");
    try {
      const screenshotUrl = imageSource === "file"
        ? await compressReceiptImage(screenshot)
        : imageUrl.trim();
      if (screenshotUrl.length > 900000) {
        throw new Error("Receipt image is too large after compression.");
      }
      await addDoc(collection(db, "donation_receipts"), {
        causeId,
        amount: Number(amount),
        transactionId: transactionId.trim(),
        screenshotUrl,
        screenshotSource: imageSource,
        status: "pending",
        submittedAt: serverTimestamp(),
      });
      setStatus("success");
      onSuccess("Your receipt was submitted for review.");
    } catch (submissionError) {
      setStatus("idle");
      setError(submissionError.message === "Receipt image is too large after compression."
        ? "This image is still too large for Firestore. Choose a smaller image."
        : "We could not submit your receipt. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#142b23]/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-[#f8f6f0] p-6 shadow-2xl sm:rounded-[2rem] sm:p-8">
        <div className="mb-8 flex items-start justify-between gap-5"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#b27618]">Thank you for supporting Mohar Kalan</p><h2 id="receipt-title" className="font-serif text-4xl leading-none">Send your payment proof</h2></div><button type="button" onClick={onClose} aria-label="Close receipt form" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9d4c9] text-[#5f685f] transition hover:bg-[#142b23] hover:text-white"><X size={18} /></button></div>
        {status === "success" ? (
          <div className="rounded-2xl bg-[#e8f5ed] p-6 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#39704e] text-white"><Check size={24} /></span><h3 className="mt-4 font-serif text-2xl">Your proof is with us</h3><p className="mt-2 text-sm leading-6 text-[#5f685f]">We will check the transfer and match it to the Mohar Kalan case you selected.</p><button type="button" onClick={onClose} className="mt-6 rounded-full bg-[#142b23] px-5 py-3 text-sm font-bold text-white">Close</button></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-[#827d72]">Choose a cause</span><select value={causeId} onChange={(event) => setCauseId(event.target.value)} className="w-full rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm text-[#313d36] outline-none focus:border-[#b27618]" required><option value="">Select an active cause</option>{causes.map((cause) => <option key={cause.id} value={cause.id}>{cause.title || cause.name}</option>)}</select></label>
            <div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-[#827d72]">Transaction ID</span><input value={transactionId} onChange={(event) => setTransactionId(event.target.value)} placeholder="Enter transaction ID" className="w-full rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm outline-none placeholder:text-[#aaa398] focus:border-[#b27618]" required /></label><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-[#827d72]">Amount ({currency})</span><input type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Enter amount" className="w-full rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm outline-none placeholder:text-[#aaa398] focus:border-[#b27618]" required /></label></div>
            <div><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.15em] text-[#827d72]">Payment proof</span><div className="flex gap-1 rounded-full bg-[#ebe7dc] p-1 text-xs"><button type="button" onClick={() => setImageSource("file")} className={`rounded-full px-3 py-1.5 font-semibold ${imageSource === "file" ? "bg-white text-[#142b23] shadow-sm" : "text-[#827d72]"}`}>Upload image</button><button type="button" onClick={() => setImageSource("url")} className={`rounded-full px-3 py-1.5 font-semibold ${imageSource === "url" ? "bg-white text-[#142b23] shadow-sm" : "text-[#827d72]"}`}>Use image URL</button></div></div>{imageSource === "file" ? <label className="block"><span className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#c9c1b2] bg-white px-4 py-4 text-sm text-[#6c716a] transition hover:border-[#b27618]"><Upload size={18} className="text-[#b27618]" /><span className="min-w-0 flex-1 truncate">{screenshot ? screenshot.name : "Choose an image, up to 5 MB"}</span><input type="file" accept="image/*" onChange={(event) => setScreenshot(event.target.files?.[0] || null)} className="sr-only" /></span></label> : <input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://example.com/receipt.jpg" className="w-full rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm outline-none placeholder:text-[#aaa398] focus:border-[#b27618]" />}</div>
            {error && <p className="rounded-xl bg-[#fff0e8] px-4 py-3 text-sm text-[#9d4f35]">{error}</p>}
            <Button type="submit" disabled={status === "submitting"} className="w-full">{status === "submitting" ? "Submitting receipt..." : "Submit receipt"}<ArrowRight size={16} /></Button>
            <p className="flex items-center justify-center gap-2 text-center text-xs text-[#918d83]"><FileImage size={14} /> Images are compressed in your browser and saved with the receipt.</p>
          </form>
        )}
      </div>
    </div>
  );
}

function ContactSection({ contactEmail, onSuccess }) {
  const [form, setForm] = useState({ name: "", email: "", interest: "Volunteer in Mohar Kalan", message: "" });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please complete your name, email address, and message.");
      setStatus("idle");
      return;
    }

    setStatus("submitting");
    setError("");
    try {
      await addDoc(collection(db, "contact_messages"), {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
        status: "new",
        submittedAt: serverTimestamp(),
      });
      setForm({ name: "", email: "", interest: "Volunteer in Mohar Kalan", message: "" });
      setStatus("success");
      onSuccess("Thanks for reaching out. We will be in touch soon.");
    } catch {
      setStatus("idle");
      setError("We could not send your message. Please try again.");
    }
  }

  return (
    <section id="contact" className="border-t border-[#e5e0d5] bg-[#eee9dd]">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-28">
        <div><p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-[#b27618]">Mohar Kalan community desk</p><h2 className="font-serif text-5xl leading-none tracking-[-0.03em]">Come alongside<br />your neighbours.</h2><p className="mt-6 max-w-sm text-sm leading-7 text-[#6c716a]">Visit our community desk in Mohar Kalan or reach out directly on WhatsApp. We welcome volunteers, local referrals, and honest questions from donors in Pakistan and abroad.</p>{contactEmail && contactEmail !== "Not configured yet" && <a href={`mailto:${contactEmail}`} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#142b23] underline decoration-[#c9b47f] underline-offset-4"><Mail size={16} /> {contactEmail}</a>}</div>
        <form onSubmit={handleSubmit} className="rounded-[1.75rem] bg-[#f8f6f0] p-6 shadow-[0_18px_45px_rgba(20,43,35,0.06)] sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-[#827d72]">Your name</span><input name="name" value={form.name} onChange={updateField} className="w-full rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#b27618]" required /></label><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-[#827d72]">Email address</span><input name="email" type="email" value={form.email} onChange={updateField} className="w-full rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#b27618]" required /></label></div>
          <label className="mt-5 block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-[#827d72]">I would like to</span><select name="interest" value={form.interest} onChange={updateField} className="w-full rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#b27618]"><option>Volunteer in Mohar Kalan</option><option>Refer a family needing help</option><option>Support school kits or ration bags</option><option>Ask a question</option></select></label>
          <label className="mt-5 block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-[#827d72]">Your message</span><textarea name="message" value={form.message} onChange={updateField} rows="4" className="w-full resize-none rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#b27618]" required /></label>
          <button type="submit" disabled={status === "submitting"} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#142b23] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#25483a] disabled:cursor-wait disabled:opacity-60">{status === "submitting" ? "Sending..." : "Send message"} <Send size={15} /></button>
          {error && <p className="mt-4 rounded-xl bg-[#fff0e8] px-4 py-3 text-sm text-[#9d4f35]" role="alert">{error}</p>}
          {status === "success" && <p className="mt-4 rounded-xl bg-[#e8f5ed] px-4 py-3 text-sm text-[#39704e]" role="status">Your message has been sent successfully.</p>}
        </form>
      </div>
    </section>
  );
}

function PublicHome() {
  const [settings, setSettings] = useState({});
  const [causes, setCauses] = useState([]);
  const [copiedValue, setCopiedValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsError, setSettingsError] = useState(false);
  const [causesLoading, setCausesLoading] = useState(true);
  const [causesError, setCausesError] = useState(false);
  const [receiptCause, setReceiptCause] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const snapshot = await getDoc(doc(db, "platform_settings", "main"));
        if (snapshot.exists()) {
          setSettings(snapshot.data());
        }
      } catch {
        setSettingsError(true);
      }
    }

    loadSettings();
  }, []);

  useEffect(() => {
    async function loadCauses() {
      try {
        const snapshot = await getDocs(collection(db, "causes"));
        const activeCauses = snapshot.docs
          .map((causeDocument) => ({ id: causeDocument.id, ...causeDocument.data() }))
          .filter((cause) => cause.active !== false)
          .sort((first, second) => (first.displayOrder || 0) - (second.displayOrder || 0));
        setCauses(activeCauses);
      } catch {
        setCausesError(true);
      } finally {
        setCausesLoading(false);
      }
    }

    loadCauses();
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handleMenuKeyDown(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", handleMenuKeyDown);
    return () => window.removeEventListener("keydown", handleMenuKeyDown);
  }, [menuOpen]);

  async function handleCopy(value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      showNotice("Payment detail copied.");
      window.setTimeout(() => setCopiedValue(""), 1800);
    } catch {
      setCopiedValue("");
    }
  }

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4500);
  }

  const currency = getPaymentValue(settings, ["currency"]);
  const organizationName = getPaymentValue(settings, ["organizationName"]);
  const tagline = getPaymentValue(settings, ["organizationTagline"]);
  const organizationDescription = String(settings?.organizationDescription || "We are a grassroots team based in Mohar Kalan working hand-in-hand with rural families. 100% of your donation reaches the ground directly through verified, transparent local distribution.").trim();
  const contactEmail = getPaymentValue(settings, ["contactEmail"]);
  const heroHeadline = String(settings?.heroHeadline || "").trim() || "Small acts.\nLasting good.";
  const heroDescription = String(settings?.heroDescription || "").trim() || organizationDescription;
  const primaryCtaLabel = String(settings?.primaryCtaLabel || "").trim() || "See where help is needed";
  const primaryCtaTarget = getSafeHeroTarget(settings?.primaryCtaTarget, "#causes");
  const secondaryCtaLabel = String(settings?.secondaryCtaLabel || "").trim() || "How we work";
  const secondaryCtaTarget = getSafeHeroTarget(settings?.secondaryCtaTarget, "#rooted");
  const configuredPaymentMethods = getPaymentMethods(settings);
  const totalRaised = causes.reduce((total, cause) => total + progressFor(cause).raised, 0);
  const volunteerCount = getCauseValue(settings, ["volunteerCount", "volunteers", "activeVolunteers"], "-");
  const projectCount = getCauseValue(settings, ["projectsCompleted", "completedProjects"], "-");
  const featuredCause = causes[0];
  const featuredCauseTitle = featuredCause?.title || featuredCause?.name || "Help should reach the doorstep.";
  const featuredCauseDescription = featuredCause?.description || "Local needs, reviewed and shared clearly.";
  const featuredCauseStatus = featuredCause?.status || "Local support";
  const missionHeadline = String(settings?.missionHeadline || "").trim() || "Rooted in Mohar Kalan.";
  const missionDescription = String(settings?.missionDescription || "").trim() || "Noble Alliance began with neighbours helping neighbours. Our volunteers know the lanes, families, and local pressures across Mohar Kalan and surrounding villages.";
  const howItWorksHeading = String(settings?.howItWorksHeading || "").trim() || "Rooted in Mohar Kalan.";
  const howItWorksIntro = String(settings?.howItWorksIntro || "").trim();
  const howItWorksSteps = fallbackHowItWorksSteps.map((fallback) => {
    const configured = Array.isArray(settings?.howItWorksSteps)
      ? settings.howItWorksSteps.find((step) => step.id === fallback.id)
      : null;
    return {
      ...fallback,
      title: String(configured?.title || "").trim() || fallback.title,
      description: String(configured?.description || "").trim() || fallback.description,
    };
  });
  const transparencyHeading = String(settings?.transparencyHeading || "").trim() || "See what care can do.";
  const transparencyDescription = String(settings?.transparencyDescription || "").trim() || "We share the work, the numbers, and the people behind every contribution. Progress is something we build in the open.";
  const transparencyPhotos = fallbackTransparencyPhotos.map((fallback) => {
    const configured = Array.isArray(settings?.transparencyPhotos)
      ? settings.transparencyPhotos.find((photo) => photo.id === fallback.id)
      : null;
    return {
      ...fallback,
      src: String(configured?.url || "").trim() || fallback.src,
      label: String(configured?.caption || "").trim() || fallback.label,
      alt: String(configured?.alt || "").trim() || fallback.alt,
    };
  });
  const footerNavigation = Array.isArray(settings?.footerNavigation) && settings.footerNavigation.length > 0
    ? settings.footerNavigation.filter((link) => String(link.label || "").trim() && String(link.target || "").trim())
    : fallbackFooterNavigation;
  const footerSocialLinks = Array.isArray(settings?.footerSocialLinks)
    ? settings.footerSocialLinks.filter((link) => String(link.label || "").trim() && String(link.url || "").trim())
    : [];
  const footerCopyright = String(settings?.footerCopyright || "").trim() || `© ${new Date().getFullYear()} ${organizationName}. All rights reserved.`;

  return (
    <main className="min-h-screen bg-[#f8f6f0] text-[#142b23]">
      <header className="sticky top-0 z-40 border-b border-[#e5e0d5] bg-[#f8f6f0]/95 shadow-[0_4px_18px_rgba(20,43,35,0.06)] backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-12">
          <a href="#top" className="flex items-center gap-2.5" aria-label={`${organizationName} home`}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#142b23] text-[#f6c75c]">
              <HeartHandshake size={19} strokeWidth={1.8} />
            </span>
            <span className="font-serif text-xl font-semibold tracking-tight">{organizationName}</span>
          </a>
          <nav id="primary-navigation" aria-label="Primary navigation" className={`${menuOpen ? "absolute left-0 right-0 top-full flex border-b border-[#e5e0d5] bg-[#f8f6f0] px-6 py-5" : "hidden"} flex-col gap-5 text-sm text-[#5f685f] md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0`}>
            <a href="#mission" onClick={() => setMenuOpen(false)} className="transition hover:text-[#142b23]">Our Mission</a>
            <a href="#rooted" onClick={() => setMenuOpen(false)} className="transition hover:text-[#142b23]">How It Works</a>
            <a href="#causes" onClick={() => setMenuOpen(false)} className="transition hover:text-[#142b23]">Our Work</a>
            <a href="#transparency" onClick={() => setMenuOpen(false)} className="transition hover:text-[#142b23]">Our Impact</a>
            <a href="#contact" onClick={() => setMenuOpen(false)} className="transition hover:text-[#142b23]">Contact</a>
            <a href="#payment" onClick={() => setMenuOpen(false)} className="inline-flex items-center gap-2 rounded-full bg-[#142b23] px-5 py-2.5 font-semibold text-white transition hover:bg-[#25483a]">Give Support <ArrowRight size={15} /></a>
          </nav>
          <button type="button" aria-label={menuOpen ? "Close primary navigation" : "Open primary navigation"} aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen(!menuOpen)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9d4c9] md:hidden">
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </header>

      <section id="top" className="mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:px-12 lg:pb-32 lg:pt-28">
        <div className="animate-[fadeUp_700ms_ease-out_both]">
          <p className="mb-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.24em] text-[#b27618]"><span className="h-px w-8 bg-[#b27618]" /> {organizationName} · Mohar Kalan, Abbottabad</p>
          <h1 className="max-w-3xl whitespace-pre-line font-serif text-5xl leading-[0.96] tracking-[-0.04em] text-[#142b23] sm:text-7xl lg:text-[6.7rem]">{heroHeadline}</h1>
          <p className="mt-8 max-w-lg text-lg leading-8 text-[#5f685f]">{heroDescription}</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button as="a" href={primaryCtaTarget} variant="amber" size="lg" className="gap-3">{primaryCtaLabel} <ArrowRight size={17} /></Button>
            <a href={secondaryCtaTarget} className="inline-flex items-center rounded-full border border-[#142b23] px-5 py-3.5 text-sm font-bold text-[#142b23] transition hover:bg-[#142b23] hover:text-white">{secondaryCtaLabel}</a>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md animate-[fadeUp_700ms_200ms_ease-out_both] lg:mb-2">
          <div className="absolute -right-3 -top-3 h-24 w-24 rounded-full border border-[#d8a640]" />
          <div className="relative overflow-hidden rounded-[2.5rem] bg-[#dce8d8] px-8 pb-8 pt-12">
            <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-[#bed2b8]" />
            <div className="relative z-10">
              <div className="mb-14 flex items-center justify-between text-[#31573e]"><span className="text-sm font-semibold">Mohar Kalan / KPK</span><span className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">{featuredCauseStatus}</span></div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#527156]">Current community need</p>
              <p className="max-w-[18rem] font-serif text-4xl leading-tight text-[#1d4933]">{featuredCauseTitle}</p>
              <p className="mt-5 max-w-sm text-sm leading-6 text-[#31573e]">{featuredCauseDescription}</p>
              <a href={primaryCtaTarget} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#1d4933] underline decoration-[#8da889] underline-offset-4">{primaryCtaLabel} <ArrowRight size={15} /></a>
              <div className="mt-10 flex items-center justify-between border-t border-[#a9c0a4] pt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#527156]"><span>Local needs</span><span>Direct care</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="causes" className="reveal-section mx-auto max-w-7xl px-6 py-20 lg:px-12 lg:py-28">
        <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-[#b27618]">Mohar Kalan and nearby villages</p><h2 className="font-serif text-5xl leading-none tracking-[-0.03em]">Where help is needed.</h2></div><p className="max-w-sm text-sm leading-6 text-[#6c716a]">Choose a local need, send support directly, and share the payment proof so every rupee can be checked and recorded.</p></div>
        {causesLoading && <div className="grid gap-6 md:grid-cols-3"><div className="h-80 animate-pulse rounded-[1.75rem] bg-[#ece9df]" /><div className="hidden h-80 animate-pulse rounded-[1.75rem] bg-[#ece9df] md:block" /><div className="hidden h-80 animate-pulse rounded-[1.75rem] bg-[#ece9df] md:block" /></div>}
        {causesError && <p className="rounded-2xl bg-[#fff0e8] px-5 py-4 text-sm text-[#9d4f35]">We could not load active causes right now. Please refresh and try again.</p>}
        {!causesLoading && !causesError && causes.length === 0 && <div className="rounded-[1.75rem] border border-dashed border-[#c9c1b2] px-6 py-12 text-center text-sm text-[#827d72]"><Plus className="mx-auto mb-3 text-[#b27618]" size={22} />New causes will appear here soon.</div>}
        {!causesLoading && !causesError && causes.length > 0 && <div className="grid gap-6 md:grid-cols-3">{causes.map((cause) => <CauseCard key={cause.id} cause={cause} currency={currency} onSubmitReceipt={setReceiptCause} />)}</div>}
      </section>

      <section id="mission" className="reveal-section border-y border-[#e5e0d5] bg-[#142b23] text-[#f8f6f0]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.75fr_1.25fr] lg:px-12 lg:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f0bd4c]">Our mission</p>
          <div><h2 className="max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">{missionHeadline}</h2><p className="mt-6 max-w-xl leading-7 text-[#b9c7ba]">{missionDescription}</p></div>
        </div>
      </section>

      <section id="rooted" className="reveal-section mx-auto max-w-7xl px-6 py-20 lg:px-12 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div><p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-[#b27618]">How local trust works</p><h2 className="font-serif text-5xl leading-none tracking-[-0.03em]">{howItWorksHeading}</h2>{howItWorksIntro && <p className="mt-5 max-w-xl text-sm leading-6 text-[#6c716a]">{howItWorksIntro}</p>}</div>
          <div className="grid gap-5 sm:grid-cols-3">{howItWorksSteps.map((step, index) => <div key={step.id} className="rounded-2xl border border-[#e5e0d5] bg-white/55 p-5"><span className="font-serif text-3xl text-[#b27618]">{String(index + 1).padStart(2, "0")}</span><h3 className="mt-5 font-serif text-2xl">{step.title}</h3><p className="mt-3 text-sm leading-6 text-[#6c716a]">{step.description}</p></div>)}</div>
        </div>
      </section>

      <section id="transparency" className="reveal-section mx-auto max-w-7xl px-6 py-20 lg:px-12 lg:py-28">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-[#b27618]">Transparency & past work</p><h2 className="font-serif text-5xl leading-none tracking-[-0.03em]">{transparencyHeading}</h2></div><p className="max-w-sm text-sm leading-6 text-[#6c716a]">{transparencyDescription}</p></div>
        <div className="grid gap-4 md:grid-cols-4 md:grid-rows-2">
          {transparencyPhotos.map((photo) => <figure key={photo.id} className={`group relative min-h-56 overflow-hidden rounded-[1.5rem] ${photo.className}`}><img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" width="800" height="600" className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#142b23]/75 to-transparent px-5 pb-5 pt-16"><figcaption className="text-sm font-semibold text-white">{photo.label}</figcaption></div></figure>)}
          <div className="flex flex-col justify-between rounded-[1.5rem] bg-[#f0bd4c] p-6 md:col-span-2"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6f5114]">Impact to date</p><div className="mt-10 grid grid-cols-3 gap-4"><div><p className="font-serif text-3xl text-[#142b23]">{formatAmount(totalRaised)}</p><p className="mt-1 text-xs text-[#6f5114]">{currency} raised</p></div><div><p className="font-serif text-3xl text-[#142b23]">{projectCount}</p><p className="mt-1 text-xs text-[#6f5114]">Projects</p></div><div><p className="font-serif text-3xl text-[#142b23]">{volunteerCount}</p><p className="mt-1 text-xs text-[#6f5114]">Volunteers</p></div></div></div>
        </div>
      </section>

      <section id="payment" className="reveal-section mx-auto max-w-7xl px-6 py-20 lg:px-12 lg:py-28">
        <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div><p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-[#b27618]">Direct support for Mohar Kalan</p><h2 className="font-serif text-5xl leading-none tracking-[-0.03em]">Send help straight to the ground.</h2></div>
          <div className="flex max-w-xs gap-3 text-sm leading-6 text-[#6c716a]"><ShieldCheck className="mt-1 shrink-0 text-[#b27618]" size={19} /><p>Transfer through JazzCash, EasyPaisa, or bank. Then send your proof so our local team can verify it.</p></div>
        </div>
        {settingsError && <p className="mb-8 rounded-2xl bg-[#fff0e8] px-5 py-4 text-sm text-[#9d4f35]">Payment details are temporarily unavailable. Please check back shortly.</p>}
        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {configuredPaymentMethods.map((method) => <PaymentCard key={method.id} method={method} settings={settings} copiedValue={copiedValue} onCopy={handleCopy} />)}
        </div>
        <p className="mt-12 text-center text-xs text-[#89857b]">Every transfer is checked against a local distribution record.</p>
      </section>

      <ContactSection contactEmail={contactEmail} onSuccess={showNotice} />
      <footer className="border-t border-[#e5e0d5] bg-[#142b23] text-[#f8f6f0]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.25fr_0.75fr] lg:px-12 lg:py-16">
          <div>
            <a href="#top" className="inline-flex items-center gap-3" aria-label={`${organizationName} home`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f0bd4c] text-[#142b23]"><HeartHandshake size={21} strokeWidth={1.8} /></span>
              <span className="font-serif text-2xl font-semibold tracking-tight">{organizationName}</span>
            </a>
            <p className="mt-6 max-w-md text-sm leading-7 text-[#b9c7ba]">{tagline}. Local care, clear records, and direct support for families in Mohar Kalan and nearby villages.</p>
          </div>
          <div className="flex flex-col justify-between gap-7 lg:items-end">
            <p className="max-w-xs text-sm leading-6 text-[#b9c7ba] lg:text-right">Every contribution helps turn a local need into practical, visible support.</p>
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              {footerNavigation.map((link, index) => <a key={`${link.label}-${index}`} href={link.target === "admin" ? adminPath : link.target} className={`${link.target === "admin" ? "rounded-full bg-[#f0bd4c] text-[#142b23] hover:bg-[#e5aa2f]" : "rounded-full border border-[#527156] text-[#f8f6f0] hover:border-[#f0bd4c] hover:text-[#f0bd4c]"} px-4 py-2.5 transition`}>{link.label}</a>)}
            </div>
            {footerSocialLinks.length > 0 && <div className="mt-4 flex flex-wrap gap-4 text-sm"><span className="text-[#b9c7ba]">Connect</span>{footerSocialLinks.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="text-[#f0bd4c] hover:text-white">{link.label}</a>)}</div>}
          </div>
        </div>
        <div className="border-t border-[#31573e]">
          <div className="mx-auto flex max-w-7xl justify-center px-6 py-5 text-center text-xs text-[#b9c7ba] lg:px-12">
            <span>{footerCopyright}</span>
          </div>
        </div>
      </footer>
      {notice && <div className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#142b23] px-5 py-3 text-sm font-semibold text-white shadow-xl" role="status"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f0bd4c] text-[#142b23]"><Check size={14} /></span>{notice}</div>}
      {receiptCause && <ReceiptModal causes={causes} selectedCause={receiptCause} currency={currency} onClose={() => setReceiptCause(null)} onSuccess={showNotice} />}
    </main>
  );
}

export default function App() {
  const currentPath = window.location.pathname.replace(/\/$/, "");
  const isAdminQuery = new URLSearchParams(window.location.search).get("admin") === "1";
  const isLegacyAdminPath = currentPath === legacyAdminPath.replace(/\/$/, "");
  return isAdminQuery || isLegacyAdminPath ? <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#142b23] text-white">Loading admin...</main>}><Admin /></Suspense> : <PublicHome />;
}
