import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Check,
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
import Hero from "./components/Hero";
import { AnimatedBar, CountUp, ImageReveal, MaskReveal, Reveal, ScrollProgress, ScrollWords, StepsTrack } from "./components/motion";
import { givingAmounts, registration, stories, team, whatsapp } from "./siteContent";
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

function stripTrailingPeriod(value) {
  return String(value || "").trim().replace(/\.+$/, "");
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
const teamImageUrls = import.meta.glob("./assets/team/*.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});
const storyImageUrls = import.meta.glob("./assets/stories/*.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});
const heroPhotoUrls = import.meta.glob("./assets/hero-photo.webp", {
  eager: true,
  query: "?url",
  import: "default",
});
const heroImage = Object.values(heroPhotoUrls)[0] || "";

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
          <span className="absolute -bottom-1 -right-1 rounded-md bg-[#142b23] px-1 text-xs font-black leading-4 tracking-tight text-white">{method.mark}</span>
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
                <p className={`mb-1 text-xs font-semibold uppercase tracking-[0.1em] ${isAccountTitle ? "text-[#b27618]" : "text-[#5f685f]"}`}>
                  {label}
                </p>
                <p className={`truncate ${isAccountTitle ? "font-semibold text-base text-[#142b23]" : "text-sm font-medium text-[#313d36]"} ${value === "Not configured yet" ? "italic text-[#6c716a]" : ""}`}>
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
        <p className="border-t border-[#e5e0d5] pt-4 text-sm leading-6 text-[#5f685f]">{method.description}</p>
      </div>
    </article>
  );
}

function CauseCard({ cause, currency, index = 0, onSubmitReceipt }) {
  const progress = progressFor(cause);
  const title = cause.title || cause.name || "Community support";
  const description = String(cause.description || "").trim() || "Learn more about this community need.";
  const status = cause.status || "Active";
  const imageUrl = cause.imageUrl || cause.image || causeFallbackImages[cause.id] || "";

  return (
    <Reveal className="grid" delay={index * 0.1}>
    <article className="group interactive-card flex min-h-[20rem] flex-col overflow-hidden rounded-[1.75rem] border border-[#e5e0d5] bg-white/55 transition hover:-translate-y-1 hover:border-[#c9b47f] hover:shadow-[0_18px_45px_rgba(20,43,35,0.07)]">
      <div className="relative h-50 overflow-hidden bg-[#dce8d8]">
        {imageUrl ? <ImageReveal src={imageUrl} width={640} height={360} /> : <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_30%,#f0bd4c_0_8%,transparent_9%),linear-gradient(135deg,#dce8d8,#bed2b8)]"><HeartHandshake className="text-[#31573e]" size={38} strokeWidth={1.4} /></div>}
        <span className="absolute right-5 top-5 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#31573e]">{status}</span>
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0bd4c]/25 text-[#9c6812]"><HeartHandshake size={21} /></span>
      </div>
      <h3 className="font-serif text-3xl leading-tight text-[#142b23]">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-[#5f685f]">{description}</p>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-[#5f685f]">
          {progress.percent < 10
            ? <span className="num">Rs <CountUp value={progress.raised} format={formatAmount} /> raised so far</span>
            : <><span>{currency} <span className="num"><CountUp value={progress.raised} format={formatAmount} /></span> raised</span><span className="num"><CountUp value={progress.percent} />%</span></>}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#e6e4dc]"><AnimatedBar percent={progress.percent < 10 ? Math.max(progress.percent, 4) : progress.percent} /></div>
        <div className="mt-2 flex items-center justify-between text-sm text-[#5f685f]"><span>Progress</span><span>Goal: {currency} {formatAmount(progress.target)}</span></div>
      </div>
      <button type="button" onClick={() => onSubmitReceipt(cause)} className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-[#142b23] px-4 py-2.5 text-sm font-bold text-[#142b23] transition hover:bg-[#142b23] hover:text-white">Submit payment receipt <ArrowRight size={15} /></button>
      </div>
    </article>
    </Reveal>
  );
}

function ReceiptModal({ causes, selectedCause, currency, onClose, onSuccess }) {
  const [causeId, setCauseId] = useState(selectedCause?.id || "");
  const [donorName, setDonorName] = useState("");
  const [amount, setAmount] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "success") return undefined;
    const timer = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timer);
  }, [status, onClose]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (status === "submitting") return;
    if (!donorName.trim() || !causeId || !amount || !screenshot) {
      setError("Please complete every field and provide a payment screenshot.");
      return;
    }
    if (donorName.trim().length > 100) {
      setError("Sender name must be 100 characters or fewer.");
      return;
    }

    if (!screenshot.type.startsWith("image/") || screenshot.size > 5 * 1024 * 1024) {
      setError("Please choose an image smaller than 5 MB.");
      return;
    }

    setStatus("submitting");
    setError("");
    try {
      const screenshotUrl = await compressReceiptImage(screenshot);
      if (screenshotUrl.length > 900000) {
        throw new Error("Receipt image is too large after compression.");
      }
      await addDoc(collection(db, "donation_receipts"), {
        causeId,
        donorName: donorName.trim(),
        amount: Number(amount),
        transactionId: "",
        screenshotUrl,
        screenshotSource: "file",
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="fixed inset-0 z-50 flex items-end justify-center bg-[#142b23]/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
      <motion.div initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-[#f8f6f0] p-6 shadow-2xl sm:rounded-[2rem] sm:p-8">
        <div className="mb-8 flex items-start justify-between gap-5"><div><p className="mb-2 text-[13px] font-semibold tracking-[0.02em] text-[#5f685f]">Thank you for supporting Mohar Kalan</p><h2 id="receipt-title" className="font-serif text-4xl leading-none">Send your payment proof</h2></div><button type="button" onClick={onClose} aria-label="Close receipt form" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9d4c9] text-[#5f685f] transition hover:bg-[#142b23] hover:text-white"><X size={18} /></button></div>
        {status === "success" ? (
          <div className="rounded-2xl bg-[#e8f5ed] p-6 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#39704e] text-white"><Check size={24} /></span><h3 className="mt-4 font-serif text-2xl">Your proof is with us</h3><p className="mt-2 text-sm leading-6 text-[#5f685f]">Your receipt is now pending review. We will check the transfer and match it to the Mohar Kalan project you selected.</p><button type="button" onClick={onClose} className="mt-6 rounded-full bg-[#142b23] px-5 py-3 text-sm font-bold text-white">Close</button></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="mb-1 text-sm text-[#5f685f]">* Required fields</p>
            <label className="block"><span className="mb-2 block text-sm font-bold uppercase tracking-[0.08em] text-[#5f685f]">Sender Name *</span><input value={donorName} onChange={(event) => setDonorName(event.target.value)} placeholder="Enter your full name" className="w-full rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm outline-none placeholder:text-[#6c716a] focus:border-[#b27618]" required /></label>
            <label className="block"><span className="mb-2 block text-sm font-bold uppercase tracking-[0.08em] text-[#5f685f]">Project *</span><select value={causeId} onChange={(event) => setCauseId(event.target.value)} className="w-full rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm text-[#313d36] outline-none focus:border-[#b27618]" required><option value="">Select an active cause</option>{causes.map((cause) => <option key={cause.id} value={cause.id}>{cause.title || cause.name}</option>)}</select></label>
            <label className="block"><span className="mb-2 block text-sm font-bold uppercase tracking-[0.08em] text-[#5f685f]">Amount ({currency}) *</span><input type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Enter amount sent" className="w-full rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm outline-none placeholder:text-[#6c716a] focus:border-[#b27618]" required /></label>
            <div><div className="mb-2 flex items-center justify-between"><span className="text-sm font-bold uppercase tracking-[0.08em] text-[#5f685f]">Payment proof *</span></div><label className="block"><span className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#c9c1b2] bg-white px-4 py-4 text-sm text-[#6c716a] transition hover:border-[#b27618]"><Upload size={18} className="text-[#b27618]" /><span className="min-w-0 flex-1 truncate">{screenshot ? screenshot.name : "Choose an image, up to 5 MB"}</span><input type="file" accept="image/*" onChange={(event) => setScreenshot(event.target.files?.[0] || null)} className="sr-only" /></span></label><span className="mt-2 block text-sm leading-6 text-[#5f685f]">Upload a clear screenshot showing the payment details.</span></div>
            {error && <p className="rounded-xl bg-[#fff0e8] px-4 py-3 text-sm text-[#9d4f35]">{error}</p>}
            <Button type="submit" disabled={status === "submitting"} className="w-full">{status === "submitting" ? "Submitting receipt..." : "Submit receipt"}<ArrowRight size={16} /></Button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

function ContactSection({ contactEmail, onSuccess }) {
  const [form, setForm] = useState({ name: "", email: "", interest: "Volunteer in Mohar Kalan", message: "" });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const whatsappNumber = whatsapp.number.replace(/\D/g, "");

  useEffect(() => {
    if (status !== "success") return undefined;
    const timer = window.setTimeout(() => setStatus("idle"), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

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
        <div><p className="mb-4 text-[13px] font-semibold tracking-[0.02em] text-[#5f685f]">Mohar Kalan community desk</p><MaskReveal className="font-serif text-5xl leading-none tracking-[-0.03em]">Come alongside<br />your neighbours.</MaskReveal><p className="mt-6 max-w-sm text-sm leading-7 text-[#6c716a]">Visit our community desk in Mohar Kalan or reach out directly on WhatsApp. We welcome volunteers, local referrals, and honest questions from donors in Pakistan and abroad.</p>{whatsappNumber && <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsapp.message)}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#39704e] px-5 py-3 text-sm font-bold text-[#31573e] transition hover:bg-[#e8f5ed]">Message us on WhatsApp <ArrowRight size={15} /></a>}{contactEmail && contactEmail !== "Not configured yet" && <a href={`mailto:${contactEmail}`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#142b23] underline decoration-[#c9b47f] underline-offset-4"><Mail size={16} /> {contactEmail}</a>}</div>
        <Reveal as="form" onSubmit={handleSubmit} className="rounded-[1.75rem] bg-[#f8f6f0] p-6 shadow-[0_18px_45px_rgba(20,43,35,0.06)] sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm font-bold uppercase tracking-[0.08em] text-[#5f685f]">Your name</span><input name="name" value={form.name} onChange={updateField} className="w-full rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#b27618]" required /></label><label className="block"><span className="mb-2 block text-sm font-bold uppercase tracking-[0.08em] text-[#5f685f]">Email address</span><input name="email" type="email" value={form.email} onChange={updateField} className="w-full rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#b27618]" required /></label></div>
          <label className="mt-5 block"><span className="mb-2 block text-sm font-bold uppercase tracking-[0.08em] text-[#5f685f]">I would like to</span><select name="interest" value={form.interest} onChange={updateField} className="w-full rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#b27618]"><option>Volunteer in Mohar Kalan</option><option>Refer a family needing help</option><option>Support school kits or ration bags</option><option>Ask a question</option></select></label>
          <label className="mt-5 block"><span className="mb-2 block text-sm font-bold uppercase tracking-[0.08em] text-[#5f685f]">Your message</span><textarea name="message" value={form.message} onChange={updateField} rows="4" className="w-full resize-none rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#b27618]" required /></label>
          <button type="submit" disabled={status === "submitting"} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#142b23] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#25483a] disabled:cursor-wait disabled:opacity-60">{status === "submitting" ? "Sending..." : "Send message"} <Send size={15} /></button>
          {error && <p className="mt-4 rounded-xl bg-[#fff0e8] px-4 py-3 text-sm text-[#9d4f35]" role="alert">{error}</p>}
          {status === "success" && <p className="mt-4 rounded-xl bg-[#e8f5ed] px-4 py-3 text-sm text-[#39704e]" role="status">Your message has been sent successfully.</p>}
        </Reveal>
      </div>
    </section>
  );
}

function PublicHome() {
  const reducedMotion = useReducedMotion();
  const [settings, setSettings] = useState({});
  const [causes, setCauses] = useState([]);
  const [copiedValue, setCopiedValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsError, setSettingsError] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [causesLoading, setCausesLoading] = useState(true);
  const [causesError, setCausesError] = useState(false);
  const [receiptCause, setReceiptCause] = useState(null);
  const [notice, setNotice] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [paymentInView, setPaymentInView] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const snapshot = await getDoc(doc(db, "platform_settings", "main"));
        if (snapshot.exists()) {
          setSettings(snapshot.data());
        }
      } catch {
        setSettingsError(true);
      } finally {
        setSettingsLoading(false);
      }
    }

    loadSettings();
  }, []);

  useEffect(() => {
    const paymentSection = document.getElementById("payment");
    if (!paymentSection) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setPaymentInView(entry.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(paymentSection);
    return () => observer.disconnect();
  }, [settingsLoading]);

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
    function handleScroll() {
      setScrolled(window.scrollY > 24);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handleMenuKeyDown(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", handleMenuKeyDown);
    return () => window.removeEventListener("keydown", handleMenuKeyDown);
  }, [menuOpen]);

  if (settingsLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f6f0] text-[#142b23]">
        <div className="text-center">
          <HeartHandshake className="mx-auto mb-4 text-[#b27618]" size={30} strokeWidth={1.5} />
          <p className="text-sm text-[#6c716a]">Loading Noble Alliance...</p>
        </div>
      </main>
    );
  }

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
  const tagline = stripTrailingPeriod(getPaymentValue(settings, ["organizationTagline"]));
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
  const featuredCauseDescription = String(featuredCause?.description || "").trim() || "Learn more about this community need.";
  const featuredCauseStatus = featuredCause?.status || "Local support";
  const missionHeadline = String(settings?.missionHeadline || "").trim() || "Rooted in Mohar Kalan.";
  const missionDescription = String(settings?.missionDescription || "").trim() || "Noble Alliance began with neighbours helping neighbours. Our volunteers know the lanes, families, and local pressures across Mohar Kalan and surrounding villages.";
  const howItWorksHeading = String(settings?.howItWorksHeading || "").trim() || "How every contribution is checked.";
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
  const visibleGivingAmounts = givingAmounts.filter(
    (entry) => !entry.placeholder && Number(entry.amount) > 0 && String(entry.label || "").trim(),
  );
  const visibleTeam = team
    .filter((person) => !person.placeholder && String(person.name || "").trim() && String(person.role || "").trim())
    .map((person) => {
      const imageEntry = Object.entries(teamImageUrls).find(([path]) => path.endsWith(`/${person.photo}`));
      return { ...person, image: imageEntry?.[1] || "" };
    });
  const visibleStories = stories.filter(
    (story) => !story.placeholder && String(story.title || "").trim() && String(story.date || "").trim() && String(story.text || "").trim(),
  ).map((story) => {
    const imageEntry = Object.entries(storyImageUrls).find(([path]) => path.endsWith(`/${story.photo}`));
    return { ...story, image: imageEntry?.[1] || "" };
  });
  const hasRegistration = !registration.placeholder
    && String(registration.legalName || "").trim()
    && String(registration.registrationNumber || "").trim()
    && String(registration.registeredWith || "").trim();
  const footerNavigation = Array.isArray(settings?.footerNavigation) && settings.footerNavigation.length > 0
    ? settings.footerNavigation.filter((link) => String(link.label || "").trim() && String(link.target || "").trim())
    : fallbackFooterNavigation;
  const footerAdminLink = footerNavigation.find((link) => link.target === "admin");
  const footerSocialLinks = Array.isArray(settings?.footerSocialLinks)
    ? settings.footerSocialLinks.filter((link) => String(link.label || "").trim() && String(link.url || "").trim())
    : [];
  const footerCopyright = String(settings?.footerCopyright || "").trim() || `© ${new Date().getFullYear()} ${organizationName}. All rights reserved.`;

  return (
    <main className="min-h-screen bg-[#f8f6f0] text-[#142b23]">
      <header className="sticky top-0 z-40 border-b border-[#e5e0d5] bg-[#f8f6f0]/95 shadow-[0_4px_18px_rgba(20,43,35,0.06)] backdrop-blur-md">
        <ScrollProgress />
        <div className={`mx-auto flex max-w-7xl items-center justify-between px-6 transition-[padding] duration-300 lg:px-12 ${scrolled ? "py-3" : "py-5"}`}>
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

      <Hero
        organizationName={organizationName}
        headline={heroHeadline}
        description={heroDescription}
        primaryCtaLabel={primaryCtaLabel}
        primaryCtaTarget={primaryCtaTarget}
        secondaryCtaLabel={secondaryCtaLabel}
        secondaryCtaTarget={secondaryCtaTarget}
        featuredCauseTitle={featuredCauseTitle}
        featuredCauseDescription={featuredCauseDescription}
        featuredCauseStatus={featuredCauseStatus}
        heroImage={heroImage}
      />

      <section id="causes" className="mx-auto max-w-7xl px-6 py-20 lg:px-12 lg:py-28">
        <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-4 text-[13px] font-semibold tracking-[0.02em] text-[#5f685f]">Current community needs</p><MaskReveal className="font-serif text-5xl leading-none tracking-[-0.03em]">Where support can help.</MaskReveal></div><p className="max-w-sm text-sm leading-6 text-[#5f685f]">Review the current needs, choose where you would like to help, and share your payment proof so the transfer can be checked and recorded.</p></div>
        {causesLoading && <div className="grid gap-6 md:grid-cols-3"><div className="h-80 animate-pulse rounded-[1.75rem] bg-[#ece9df]" /><div className="hidden h-80 animate-pulse rounded-[1.75rem] bg-[#ece9df] md:block" /><div className="hidden h-80 animate-pulse rounded-[1.75rem] bg-[#ece9df] md:block" /></div>}
        {causesError && <p className="rounded-2xl bg-[#fff0e8] px-5 py-4 text-sm text-[#9d4f35]">We could not load active causes right now. Please refresh and try again.</p>}
        {!causesLoading && !causesError && causes.length === 0 && <div className="rounded-[1.75rem] border border-dashed border-[#c9c1b2] px-6 py-12 text-center text-sm text-[#827d72]"><Plus className="mx-auto mb-3 text-[#b27618]" size={22} />New causes will appear here soon.</div>}
        {!causesLoading && !causesError && causes.length > 0 && <div className="grid gap-6 md:grid-cols-3">{causes.map((cause, index) => <CauseCard key={cause.id} index={index} cause={cause} currency={currency} onSubmitReceipt={setReceiptCause} />)}</div>}
      </section>

      <section id="mission" className="border-y border-[#e5e0d5] bg-[#142b23] text-[#f8f6f0]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 lg:grid-cols-[0.75fr_1.25fr] lg:px-12 lg:py-32">
          <p className="text-[13px] font-semibold tracking-[0.02em] text-[#f0bd4c]">Why this work exists</p>
          <div><MaskReveal className="max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">{missionHeadline}</MaskReveal><ScrollWords text={missionDescription} className="mt-8 max-w-2xl font-serif text-2xl leading-snug text-[#f8f6f0] sm:text-3xl" /></div>
        </div>
      </section>

      <section id="rooted" className="mx-auto max-w-7xl px-6 py-20 lg:px-12 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.45fr] lg:items-start">
          <div className="min-w-0"><p className="mb-4 text-[13px] font-semibold tracking-[0.02em] text-[#5f685f]">How support is verified</p><MaskReveal className="text-balance font-serif text-5xl leading-none tracking-[-0.03em]">{howItWorksHeading}</MaskReveal>{howItWorksIntro && <p className="mt-5 max-w-xl text-sm leading-6 text-[#5f685f]">{howItWorksIntro}</p>}</div>
          <StepsTrack steps={howItWorksSteps} />
        </div>
      </section>

      <section id="transparency" className="mx-auto max-w-7xl px-6 py-20 lg:px-12 lg:py-28">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="mb-4 text-[13px] font-semibold tracking-[0.02em] text-[#5f685f]">Transparency and past work</p><MaskReveal className="font-serif text-5xl leading-none tracking-[-0.03em]">{transparencyHeading}</MaskReveal></div><p className="max-w-sm text-sm leading-6 text-[#5f685f]">{transparencyDescription}</p></div>
        <div className="grid gap-4 md:grid-cols-4 md:grid-rows-2">
          {transparencyPhotos.map((photo, index) => <figure key={photo.id} className={`group relative min-h-56 overflow-hidden rounded-[1.5rem] ${photo.className}`}><ImageReveal src={photo.src} alt={photo.alt} width={800} height={600} delay={index * 0.12} parallax /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#142b23]/75 to-transparent px-5 pb-5 pt-16"><figcaption className="text-sm font-semibold text-white">{photo.label}</figcaption></div></figure>)}
          <Reveal delay={0.2} className="flex flex-col justify-between rounded-[1.5rem] bg-[#f0bd4c] p-6 md:col-span-2"><p className="text-[13px] font-bold uppercase tracking-[0.1em] text-[#6f5114]">Impact to date</p><div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-3"><div><p className="num font-serif text-5xl leading-none text-[#142b23] sm:text-6xl"><CountUp value={totalRaised} format={formatAmount} /></p><p className="mt-2 text-sm text-[#513b0f]">{currency} raised</p></div><div><p className="num font-serif text-5xl leading-none text-[#142b23] sm:text-6xl"><CountUp value={projectCount} /></p><p className="mt-2 text-sm text-[#513b0f]">Projects</p></div><div><p className="num font-serif text-5xl leading-none text-[#142b23] sm:text-6xl"><CountUp value={volunteerCount} /></p><p className="mt-2 text-sm text-[#513b0f]">Volunteers</p></div></div></Reveal>
        </div>
        {visibleStories.length > 0 && <div className="mt-16">
          <h3 className="mb-7 font-serif text-3xl text-[#142b23]">Recent work</h3>
          <div className="grid gap-6 md:grid-cols-2">
            {visibleStories.map((story, index) => <Reveal key={`${story.date}-${story.title}`} delay={index * 0.12} className="overflow-hidden rounded-[1.5rem] border border-[#e5e0d5] bg-white/60">
              {story.image && <div className="group relative h-52 overflow-hidden bg-[#dce8d8]">
                <ImageReveal src={story.image} alt="" width={800} height={500} />
              </div>}
              <div className="p-6">
                <p className="text-sm font-semibold text-[#5f685f]">{story.date}</p>
                <h4 className="mt-2 font-serif text-2xl text-[#142b23]">{story.title}</h4>
                <p className="mt-3 text-sm leading-6 text-[#5f685f]">{story.text}</p>
              </div>
            </Reveal>)}
          </div>
        </div>}
      </section>

      {visibleTeam.length > 0 && <section id="team" className="mx-auto max-w-7xl px-6 py-20 lg:px-12 lg:py-28">
        <div className="mb-10">
          <p className="mb-4 text-[13px] font-semibold tracking-[0.02em] text-[#5f685f]">Meet the people who serve here</p>
          <h2 className="font-serif text-5xl leading-none tracking-[-0.03em] text-balance">The people behind this</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTeam.map((person, index) => <Reveal key={`${person.name}-${person.role}`} delay={index * 0.12} className="overflow-hidden rounded-[1.5rem] border border-[#e5e0d5] bg-white/60">
            <div className="group relative h-64 overflow-hidden bg-[#dce8d8]">
              {person.image
                ? <ImageReveal src={person.image} alt={person.name} width={720} height={640} />
                : <div aria-hidden="true" className="flex h-full items-center justify-center font-serif text-5xl text-[#31573e]">{person.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>}
            </div>
            <div className="p-5">
              <h3 className="font-serif text-2xl text-[#142b23]">{person.name}</h3>
              <p className="mt-1 text-sm leading-6 text-[#5f685f]">{person.role}</p>
            </div>
          </Reveal>)}
        </div>
      </section>}

      <section id="payment" className="mx-auto max-w-7xl px-6 py-20 lg:px-12 lg:py-28">
        <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div><p className="mb-4 text-[13px] font-semibold tracking-[0.02em] text-[#5f685f]">Ways to support a cause</p><MaskReveal className="font-serif text-5xl leading-none tracking-[-0.03em]">Support a local need directly.</MaskReveal></div>
          <div className="flex max-w-xs gap-3 text-sm leading-6 text-[#6c716a]"><ShieldCheck className="mt-1 shrink-0 text-[#b27618]" size={19} /><p>Transfer through JazzCash, EasyPaisa, or bank. Then send your proof so our local team can verify it.</p></div>
        </div>
        {visibleGivingAmounts.length > 0 && <div className="mb-14">
          <h3 className="mb-6 font-serif text-3xl text-[#142b23]">What your gift does</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {visibleGivingAmounts.map((entry, index) => <Reveal key={`${entry.amount}-${entry.label}`} delay={index * 0.1} className="rounded-2xl border border-[#e5e0d5] bg-white/60 p-5">
              <p className="num font-serif text-3xl text-[#142b23]">{currency} {formatAmount(entry.amount)}</p>
              <p className="mt-2 text-sm leading-6 text-[#5f685f]">{entry.label}</p>
            </Reveal>)}
          </div>
        </div>}
        {settingsError && <p className="mb-8 rounded-2xl bg-[#fff0e8] px-5 py-4 text-sm text-[#9d4f35]">Payment details are temporarily unavailable. Please check back shortly.</p>}
        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {configuredPaymentMethods.map((method, index) => <Reveal key={method.id} delay={index * 0.12}><PaymentCard method={method} settings={settings} copiedValue={copiedValue} onCopy={handleCopy} /></Reveal>)}
        </div>
        <p className="mt-12 text-center text-sm text-[#5f685f]">Every transfer is checked against a local distribution record.</p>
      </section>

      <ContactSection contactEmail={contactEmail} onSuccess={showNotice} />
      <AnimatePresence>
        {!paymentInView && !receiptCause && !menuOpen && <motion.a
          key="mobile-give-cta"
          href="#payment"
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: 24 }}
          transition={{ duration: reducedMotion ? 0 : 0.25 }}
          className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-[#f8f6f0] via-[#f8f6f0]/95 to-transparent px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:hidden"
        >
          <span className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-full bg-[#142b23] px-6 py-4 text-sm font-bold text-white shadow-[0_8px_24px_rgba(20,43,35,0.18)]">
            Give support <ArrowRight size={16} />
          </span>
        </motion.a>}
      </AnimatePresence>
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
              {footerNavigation.filter((link) => link.target !== "admin").map((link, index) => <a key={`${link.label}-${index}`} href={link.target} className="rounded-full border border-[#527156] px-4 py-2.5 text-sm font-semibold text-[#f8f6f0] transition hover:border-[#f0bd4c] hover:text-[#f0bd4c]">{link.label}</a>)}
            </div>
            {footerSocialLinks.length > 0 && <div className="mt-4 flex flex-wrap gap-4 text-sm"><span className="text-[#b9c7ba]">Connect</span>{footerSocialLinks.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="text-[#f0bd4c] hover:text-white">{link.label}</a>)}</div>}
          </div>
        </div>
        <div className="border-t border-[#31573e]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-6 py-5 text-center text-xs text-[#b9c7ba] lg:px-12">
            <span>{footerCopyright}</span>
            {footerAdminLink && <a href={adminPath} className="text-[#b9c7ba] underline-offset-4 transition hover:text-white hover:underline">{footerAdminLink.label}</a>}
            {hasRegistration && <p className="basis-full text-sm leading-5 text-[#c2cec4]">{registration.legalName} · {registration.registrationNumber} · {registration.registeredWith}</p>}
          </div>
        </div>
      </footer>
      <AnimatePresence>{notice && <motion.div key="notice" initial={{ opacity: 0, y: 24, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 16, x: "-50%" }} transition={{ duration: 0.35 }} className="fixed bottom-5 left-1/2 z-60 flex items-center gap-3 rounded-full bg-[#142b23] px-5 py-3 text-sm font-semibold text-white shadow-xl" role="status"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f0bd4c] text-[#142b23]"><Check size={14} /></span>{notice}</motion.div>}</AnimatePresence>
      <AnimatePresence>{receiptCause && <ReceiptModal key="receipt" causes={causes} selectedCause={receiptCause} currency={currency} onClose={() => setReceiptCause(null)} onSuccess={showNotice} />}</AnimatePresence>
    </main>
  );
}

export default function App() {
  const currentPath = window.location.pathname.replace(/\/$/, "");
  const isAdminQuery = new URLSearchParams(window.location.search).get("admin") === "1";
  const isLegacyAdminPath = currentPath === legacyAdminPath.replace(/\/$/, "");
  return isAdminQuery || isLegacyAdminPath ? <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#142b23] text-white">Loading admin...</main>}><Admin /></Suspense> : <PublicHome />;
}
