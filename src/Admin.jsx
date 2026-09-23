import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ClipboardCheck,
  ExternalLink,
  Inbox,
  HeartHandshake,
  Landmark,
  LogOut,
  Pencil,
  ReceiptText,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  WalletCards,
  X,
} from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { adminAuth, auth, db } from "./firebase";

const appBaseUrl = import.meta.env.BASE_URL;

function compressCauseImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not decode the image."));
      image.onload = () => {
        const maxDimension = 900;
        const scale = Math.min(
          1,
          maxDimension / Math.max(image.width, image.height),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas
          .getContext("2d")
          .drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.68));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const tabs = [
  { id: "general", label: "General settings", icon: Settings2 },
  { id: "causes", label: "Cause manager", icon: HeartHandshake },
  { id: "settings", label: "Payment settings", icon: WalletCards },
  { id: "queue", label: "Verification queue", icon: ClipboardCheck },
  { id: "messages", label: "Messages", icon: Inbox },
  { id: "admins", label: "Admin access", icon: ShieldCheck },
];

function AdminShell({ children, activeTab, setActiveTab, onSignOut }) {
  return (
    <main className="min-h-screen bg-[#f4f1e9] text-[#142b23]">
      <header className="border-b border-[#ddd8cc] bg-[#142b23] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-12">
          <a href={appBaseUrl} className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0bd4c] text-[#142b23]">
              <HeartHandshake size={19} />
            </span>
            <span className="font-serif text-xl">
              Noble Alliance{" "}
              <span className="font-sans text-xs text-[#b9c7ba]">/ admin</span>
            </span>
          </a>
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-2 text-sm text-[#b9c7ba] transition hover:text-white"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-12 lg:py-12">
        <div className="mb-8">
          <a
            href={appBaseUrl}
            className="mb-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.16em] text-[#827d72]"
          >
            <ChevronLeft size={14} /> Public site
          </a>
          <h1 className="font-serif text-5xl leading-none">
            Mohar Kalan, clearly served.
          </h1>
          <p className="mt-3 text-sm text-[#6c716a]">
            Check each transfer, keep local causes current, and maintain clear
            records for families and donors.
          </p>
        </div>
        <nav aria-label="Admin navigation" className="mb-8 grid gap-1.5 rounded-2xl border border-[#ddd8cc] bg-[#f8f6f0] p-2 sm:grid-cols-3 lg:grid-cols-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? "page" : undefined}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition ${activeTab === id ? "bg-[#142b23] text-white shadow-sm" : "text-[#6c716a] hover:bg-[#ebe7dc]"}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
        {children}
      </div>
    </main>
  );
}

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      onLogin(result.user);
    } catch {
      setError("The email or password is incorrect, or this account is not enabled.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#142b23] px-6 py-12">
      <div className="w-full max-w-md rounded-[2rem] bg-[#f8f6f0] p-7 shadow-2xl sm:p-10">
        <a href={appBaseUrl} className="mb-12 inline-flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#142b23] text-[#f0bd4c]">
            <HeartHandshake size={20} />
          </span>
          <span className="font-serif text-xl">Noble Alliance</span>
        </a>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#b27618]">
          Private workspace
        </p>
        <h1 className="font-serif text-4xl leading-none">
          Admin sign in
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#6c716a]">
          Review local aid, causes, messages, and direct payment details.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-[#827d72]">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#b27618]"
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-[#827d72]">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-[#d9d4c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#b27618]"
              required
            />
          </label>
          {error && (
            <p
              className="rounded-xl bg-[#fff0e8] px-4 py-3 text-sm text-[#9d4f35]"
              role="alert"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#142b23] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#25483a] disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
            <ShieldCheck size={16} />
          </button>
        </form>
      </div>
    </main>
  );
}

function Notice({ message, error = false }) {
  if (!message) return null;
  return (
    <p
      className={`mb-6 rounded-xl px-4 py-3 text-sm ${error ? "bg-[#fff0e8] text-[#9d4f35]" : "bg-[#e8f5ed] text-[#39704e]"}`}
      role="status"
    >
      {message}
    </p>
  );
}

function AdminManagement({ currentUser }) {
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({ email: "", displayName: "", password: "" });
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadAdmins() {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "admin_users"));
      setAdmins(snapshot.docs.map((admin) => ({ id: admin.id, ...admin.data() })));
    } catch {
      setError("Could not load administrators. Check your Firestore rules.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAdmins();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function addAdmin(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (form.password.length < 6) {
        throw new Error("Use a password with at least 6 characters.");
      }
      const email = form.email.trim().toLowerCase();
      let result;
      try {
        result = await createUserWithEmailAndPassword(adminAuth, email, form.password);
      } catch (authError) {
        if (authError.code !== "auth/email-already-in-use") throw authError;
        try {
          result = await signInWithEmailAndPassword(adminAuth, email, form.password);
        } catch {
          throw new Error("This email already has a Firebase account. Use its existing password or choose another email.");
        }
      }
      if (result.user.uid === currentUser.uid) {
        throw new Error("This is already the signed-in administrator account.");
      }
      await setDoc(doc(db, "admin_users", result.user.uid), {
        email,
        displayName: form.displayName.trim() || email,
        active: true,
        isPrimary: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await signOut(adminAuth);
      setForm({ email: "", displayName: "", password: "" });
      setMessage("Administrator added successfully.");
      await loadAdmins();
    } catch (addError) {
      setError(addError.message || "Could not add this administrator.");
      await signOut(adminAuth).catch(() => undefined);
    } finally {
      setSaving(false);
    }
  }

  async function updateAdmin(admin) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await updateDoc(doc(db, "admin_users", admin.id), {
        displayName: editingName.trim() || admin.email,
        updatedAt: serverTimestamp(),
      });
      setEditingId("");
      setMessage("Administrator details updated.");
      await loadAdmins();
    } catch {
      setError("Could not update this administrator.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAdmin(admin) {
    if (admin.isPrimary) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await updateDoc(doc(db, "admin_users", admin.id), {
        active: admin.active === false,
        updatedAt: serverTimestamp(),
      });
      setMessage(admin.active === false ? "Administrator access restored." : "Administrator access removed.");
      await loadAdmins();
    } catch {
      setError("Could not change this administrator's access.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAdmin(admin) {
    if (admin.isPrimary || admin.id === currentUser.uid) return;
    if (!window.confirm(`Remove admin access for ${admin.email}?`)) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await deleteDoc(doc(db, "admin_users", admin.id));
      setMessage("Administrator removed. Their account can no longer access this dashboard.");
      await loadAdmins();
    } catch {
      setError("Could not remove this administrator.");
    } finally {
      setSaving(false);
    }
  }

  async function sendReset(admin) {
    setMessage("");
    setError("");
    try {
      await sendPasswordResetEmail(auth, admin.email);
      setMessage(`Password reset instructions sent to ${admin.email}.`);
    } catch {
      setError("Could not send password reset instructions.");
    }
  }

  return (
    <section>
      <div className="mb-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#b27618]">Access control</p>
        <h2 className="font-serif text-4xl">Admin access</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6c716a]">Add trusted administrators, update their display details, send password resets, or remove their dashboard access. The primary administrator cannot be removed.</p>
      </div>
      <Notice message={message} />
      <Notice message={error} error />
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form onSubmit={addAdmin} className="rounded-2xl border border-[#ddd8cc] bg-[#f8f6f0] p-5 sm:p-6">
          <h3 className="font-serif text-2xl">Add administrator</h3>
          <div className="mt-5 space-y-4">
            <label className="block"><span className="field-label">Name</span><input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} className="field-input" placeholder="Administrator name" required /></label>
            <label className="block"><span className="field-label">Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="field-input" placeholder="admin@example.com" required /></label>
            <label className="block"><span className="field-label">Temporary password</span><input type="password" minLength="6" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="field-input" placeholder="At least 6 characters" required /></label>
          </div>
          <button type="submit" disabled={saving} className="mt-6 flex items-center gap-2 rounded-full bg-[#142b23] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><ShieldCheck size={16} /> {saving ? "Adding..." : "Add administrator"}</button>
        </form>
        <div className="rounded-2xl border border-[#ddd8cc] bg-[#f8f6f0] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4"><h3 className="font-serif text-2xl">Administrators</h3><span className="rounded-full bg-[#e8f5ed] px-3 py-1 text-xs font-bold text-[#39704e]">{admins.length} total</span></div>
          {loading ? <p className="text-sm text-[#6c716a]">Loading administrators...</p> : admins.length === 0 ? <p className="text-sm text-[#6c716a]">No administrators found.</p> : <div className="space-y-3">{admins.map((admin) => <div key={admin.id} className="rounded-xl border border-[#e1dcd0] bg-white p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 flex-1">{editingId === admin.id ? <input value={editingName} onChange={(event) => setEditingName(event.target.value)} className="field-input" autoFocus /> : <p className="font-semibold text-[#142b23]">{admin.displayName || admin.email}</p>}<p className="mt-1 truncate text-xs text-[#827d72]">{admin.email}</p><div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.12em]"><span className={`rounded-full px-2 py-1 ${admin.active === false ? "bg-[#fff0e8] text-[#9d4f35]" : "bg-[#e8f5ed] text-[#39704e]"}`}>{admin.active === false ? "Inactive" : "Active"}</span>{admin.isPrimary && <span className="rounded-full bg-[#fff4d8] px-2 py-1 text-[#a86c00]">Primary</span>}</div></div><div className="flex flex-wrap gap-2 text-xs font-semibold"><button type="button" onClick={() => { setEditingId(editingId === admin.id ? "" : admin.id); setEditingName(admin.displayName || ""); }} className="rounded-full border border-[#d9d4c9] px-3 py-2 text-[#4f5c53]">{editingId === admin.id ? "Cancel" : "Edit"}</button>{editingId === admin.id && <button type="button" disabled={saving} onClick={() => updateAdmin(admin)} className="rounded-full bg-[#142b23] px-3 py-2 text-white">Save</button>}<button type="button" onClick={() => sendReset(admin)} className="rounded-full border border-[#d9d4c9] px-3 py-2 text-[#4f5c53]">Reset password</button>{!admin.isPrimary && admin.id !== currentUser.uid && <><button type="button" disabled={saving} onClick={() => toggleAdmin(admin)} className="rounded-full border border-[#d9d4c9] px-3 py-2 text-[#4f5c53]">{admin.active === false ? "Restore" : "Disable"}</button><button type="button" disabled={saving} onClick={() => deleteAdmin(admin)} className="rounded-full border border-[#e3b9ab] px-3 py-2 text-[#9d4f35]"><Trash2 size={13} className="inline" /> Remove</button></>}</div></div></div>)}</div>}
        </div>
      </div>
    </section>
  );
}

function ContactMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      getDocs(collection(db, "contact_messages"))
        .then((snapshot) => {
          setMessages(
            snapshot.docs.map((message) => ({
              id: message.id,
              ...message.data(),
            })),
          );
        })
        .catch(() =>
          setError(
            "Could not load contact messages. Check your Firestore rules.",
          ),
        )
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#b27618]">
            Inbox
          </p>
          <h2 className="font-serif text-4xl">Contact messages</h2>
        </div>
        <span className="rounded-full bg-[#f0bd4c] px-3 py-1 text-xs font-bold text-[#142b23]">
          {messages.filter((message) => message.status === "new").length} new
        </span>
      </div>
      <Notice message={error} error />
      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-[#e8e4da]" />
      ) : messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c9c1b2] bg-[#f8f6f0] px-6 py-14 text-center text-sm text-[#827d72]">
          <Inbox className="mx-auto mb-3 text-[#b27618]" size={26} />
          No contact messages yet.
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <article
              key={message.id}
              className="admin-card rounded-2xl border border-[#ddd8cc] bg-[#f8f6f0] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-2xl">{message.name}</h3>
                  <a
                    href={`mailto:${message.email}`}
                    className="text-sm text-[#39704e] underline underline-offset-2"
                  >
                    {message.email}
                  </a>
                </div>
                <span className="rounded-full bg-[#e8f5ed] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#39704e]">
                  {message.status || "new"}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#4f5c53]">
                {message.message}
              </p>
              <p className="mt-3 text-xs text-[#827d72]">
                Interest: {message.interest || "General inquiry"}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function VerificationQueue({ causes, onRefresh }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadReceipts() {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "donation_receipts"));
      setReceipts(
        snapshot.docs
          .map((receipt) => ({ id: receipt.id, ...receipt.data() }))
          .filter((receipt) => receipt.status === "pending"),
      );
    } catch {
      setError(
        "Could not load the verification queue. Check your Firestore rules.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReceipts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function reviewReceipt(receipt, status) {
    setMessage("");
    setError("");
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "donation_receipts", receipt.id), {
        status,
        reviewedAt: serverTimestamp(),
      });
      if (status === "verified") {
        const causeRef = doc(db, "causes", receipt.causeId);
        const causeSnapshot = await getDoc(causeRef);
        const currentRaised = Number(causeSnapshot.data()?.raisedAmount || 0);
        batch.update(causeRef, {
          raisedAmount: currentRaised + Number(receipt.amount || 0),
        });
      }
      await batch.commit();
      setReceipts((current) =>
        current.filter((item) => item.id !== receipt.id),
      );
      setMessage(
        status === "verified"
          ? "Receipt approved and cause progress updated."
          : "Receipt rejected.",
      );
      onRefresh();
    } catch {
      setError("This review could not be saved. Please try again.");
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#b27618]">
            Donations
          </p>
          <h2 className="font-serif text-4xl">Verification queue</h2>
        </div>
        <span className="rounded-full bg-[#f0bd4c] px-3 py-1 text-xs font-bold text-[#142b23]">
          {receipts.length} pending
        </span>
      </div>
      <Notice message={message} />
      <Notice message={error} error />
      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-[#e8e4da]" />
      ) : receipts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c9c1b2] bg-[#f8f6f0] px-6 py-14 text-center text-sm text-[#827d72]">
          <ClipboardCheck className="mx-auto mb-3 text-[#b27618]" size={26} />
          No pending receipts.
        </div>
      ) : (
        <div className="space-y-5">
          {receipts.map((receipt) => {
            const cause = causes.find((item) => item.id === receipt.causeId);
            return (
              <article
                key={receipt.id}
                className="grid gap-6 rounded-2xl border border-[#ddd8cc] bg-[#f8f6f0] p-5 md:grid-cols-[12rem_1fr_auto] md:items-center"
              >
                <a
                  href={receipt.screenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block aspect-[4/3] overflow-hidden rounded-xl bg-[#e8e4da]"
                >
                  <img
                    src={receipt.screenshotUrl}
                    alt={`Payment receipt for ${cause?.title || "cause"}`}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-[#142b23]/85 px-2 py-1 text-[10px] font-bold text-white">
                    <ExternalLink size={11} /> Preview
                  </span>
                </a>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#827d72]">
                    {cause?.title || receipt.causeId}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl">
                    PKR {Number(receipt.amount || 0).toLocaleString("en-PK")}
                  </h3>
                  <dl className="mt-3 grid gap-2 text-sm text-[#6c716a] sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-[#aaa398]">TRX ID</dt>
                      <dd className="font-medium text-[#313d36]">
                        {receipt.transactionId || "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#aaa398]">Donor</dt>
                      <dd className="font-medium text-[#313d36]">
                        {receipt.donorName || receipt.donorEmail || "Anonymous"}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="flex gap-2 md:flex-col">
                  <button
                    type="button"
                    onClick={() => reviewReceipt(receipt, "verified")}
                    className="flex items-center justify-center gap-2 rounded-full bg-[#39704e] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#285b3c]"
                  >
                    <Check size={15} /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewReceipt(receipt, "rejected")}
                    className="flex items-center justify-center gap-2 rounded-full border border-[#c77b65] px-4 py-2.5 text-sm font-bold text-[#9d4f35] transition hover:bg-[#fff0e8]"
                  >
                    <X size={15} /> Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CauseManager({ causes, onChange }) {
  const blankCause = {
    title: "",
    description: "",
    imageUrl: "",
    status: "",
    active: true,
    displayOrder: causes.length + 1,
    raisedAmount: "",
    targetAmount: "",
  };
  const [form, setForm] = useState(blankCause);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function editCause(cause) {
    setEditingId(cause.id);
    setForm({ ...blankCause, ...cause });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function reset() {
    setEditingId("");
    setForm({ ...blankCause, displayOrder: causes.length + 1 });
  }

  async function saveCause(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const values = {
        ...form,
        displayOrder: Number(form.displayOrder),
        raisedAmount: Number(form.raisedAmount),
        targetAmount: Number(form.targetAmount),
      };
      if (editingId) await updateDoc(doc(db, "causes", editingId), values);
      else await addDoc(collection(db, "causes"), values);
      setMessage(editingId ? "Cause updated." : "Cause added.");
      reset();
      onChange();
    } catch {
      setError(
        "Could not save this cause. Keep image files below the Firestore document size limit.",
      );
    }
  }

  async function removeCause(cause) {
    if (!window.confirm(`Delete ${cause.title}?`)) return;
    try {
      await deleteDoc(doc(db, "causes", cause.id));
      setMessage("Cause deleted.");
      onChange();
    } catch {
      setError("Could not delete this cause.");
    }
  }

  return (
    <section>
      <div className="mb-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#b27618]">
          Public campaigns
        </p>
        <h2 className="font-serif text-4xl">Cause manager</h2>
      </div>
      <Notice message={message} />
      <Notice message={error} error />
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <form
          onSubmit={saveCause}
          className="rounded-2xl border border-[#ddd8cc] bg-[#f8f6f0] p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-serif text-2xl">
              {editingId ? "Edit cause" : "Add a cause"}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={reset}
                className="text-xs font-bold text-[#827d72]"
              >
                Cancel
              </button>
            )}
          </div>
          <div className="space-y-4">
            <label className="block">
              <span className="field-label">Title</span>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                className="field-input"
                required
              />
            </label>
            <label className="block">
              <span className="field-label">Description</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                rows="3"
                className="field-input resize-none"
                required
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="field-label">Image URL</span>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(event) =>
                    setForm({ ...form, imageUrl: event.target.value })
                  }
                  placeholder="https://example.com/cause.jpg"
                  className="field-input"
                />
              </label>
              <label className="flex cursor-pointer items-end">
                <span className="flex h-[42px] items-center gap-2 rounded-xl border border-dashed border-[#c9c1b2] px-3 text-xs font-semibold text-[#5f685f] hover:border-[#b27618] hover:text-[#142b23]">
                  <Upload size={15} />
                  <span>Upload image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024 || !file.type.startsWith("image/")) {
                        setError("Choose an image smaller than 5 MB.");
                        return;
                      }
                      try {
                        const compressedImage = await compressCauseImage(file);
                        if (compressedImage.length > 900000) {
                          setError("Image is too large after compression. Choose a smaller image.");
                          return;
                        }
                        setForm({ ...form, imageUrl: compressedImage });
                        setError("");
                      } catch {
                        setError("Could not process that image.");
                      }
                    }}
                  />
                </span>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Status</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value })
                  }
                  className="field-input"
                >
                  <option>Active</option>
                  <option>Urgent</option>
                  <option>In progress</option>
                  <option>Completed</option>
                </select>
              </label>
              <label className="block">
                <span className="field-label">Display order</span>
                <input
                  type="number"
                  min="1"
                  value={form.displayOrder}
                  onChange={(event) =>
                    setForm({ ...form, displayOrder: event.target.value })
                  }
                  className="field-input"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Raised (PKR)</span>
                <input
                  type="number"
                  min="0"
                  value={form.raisedAmount}
                  onChange={(event) =>
                    setForm({ ...form, raisedAmount: event.target.value })
                  }
                  className="field-input"
                />
              </label>
              <label className="block">
                <span className="field-label">Target (PKR)</span>
                <input
                  type="number"
                  min="1"
                  value={form.targetAmount}
                  onChange={(event) =>
                    setForm({ ...form, targetAmount: event.target.value })
                  }
                  className="field-input"
                  required
                />
              </label>
            </div>
            <label className="flex items-center gap-3 text-sm text-[#5f685f]">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm({ ...form, active: event.target.checked })
                }
                className="h-4 w-4 accent-[#142b23]"
              />{" "}
              Show this cause publicly
            </label>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#142b23] px-5 py-3 text-sm font-bold text-white"
            >
              <Save size={16} /> {editingId ? "Save changes" : "Add cause"}
            </button>
          </div>
        </form>
        <div className="space-y-3">
          {causes.map((cause) => (
            <article
              key={cause.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-[#ddd8cc] bg-[#f8f6f0] p-5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="truncate font-serif text-2xl">
                    {cause.title}
                  </h3>
                  <span className="rounded-full bg-[#e8f5ed] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#39704e]">
                    {cause.status || "Active"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#6c716a]">
                  PKR {Number(cause.raisedAmount || 0).toLocaleString("en-PK")}{" "}
                  raised of PKR{" "}
                  {Number(cause.targetAmount || 0).toLocaleString("en-PK")}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => editCause(cause)}
                  aria-label={`Edit ${cause.title}`}
                  className="icon-button"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => removeCause(cause)}
                  aria-label={`Delete ${cause.title}`}
                  className="icon-button text-[#9d4f35]"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PaymentSettingsEditor({ onChange }) {
  const [form, setForm] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getDoc(doc(db, "platform_settings", "main"))
      .then((snapshot) => {
        if (snapshot.exists()) setForm(snapshot.data());
      })
      .catch(() => setError("Could not load payment settings."));
  }, []);

  async function saveSettings(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      await setDoc(doc(db, "platform_settings", "main"), form, { merge: true });
      setMessage("Payment settings updated successfully.");
      onChange();
    } catch {
      setError(
        "Could not save payment settings. Confirm that you are signed in and that the latest Firestore rules are deployed.",
      );
    }
  }

  function field(label, key, type = "text") {
    return (
      <label className="block">
        <span className="field-label">{label}</span>
        <input
          type={type}
          value={form[key] ?? ""}
          onChange={(event) => setForm({ ...form, [key]: event.target.value })}
          className="field-input"
        />
      </label>
    );
  }

  return (
    <section>
      <div className="mb-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#b27618]">
          Public payment details
        </p>
        <h2 className="font-serif text-4xl">Payment settings</h2>
      </div>
      <Notice message={message} />
      <Notice message={error} error />
      <form
        onSubmit={saveSettings}
        className="rounded-2xl border border-[#ddd8cc] bg-[#f8f6f0] p-5 sm:p-6"
      >
        <div className="mb-6 max-w-xs border-b border-[#e1dcd0] pb-6">
          {field("Currency", "currency")}
        </div>
        <div className="grid gap-7 lg:grid-cols-3">
          <div>
            <h3 className="mb-4 flex items-center gap-2 font-serif text-2xl">
              <SmartphoneIcon />
              Mobile wallets
            </h3>
            <div className="space-y-3">
              {field("JazzCash account title", "jazzCashAccountTitle")}
              {field("JazzCash number", "jazzCashNumber")}
              {field("EasyPaisa account title", "easyPaisaAccountTitle")}
              {field("EasyPaisa number", "easyPaisaNumber")}
            </div>
          </div>
          <div>
            <h3 className="mb-4 flex items-center gap-2 font-serif text-2xl">
              <Landmark size={20} className="text-[#b27618]" />
              Bank transfer
            </h3>
            <div className="space-y-3">
              {field("Bank name", "bankName")}
              {field("Account title", "bankAccountTitle")}
              {field("Account number", "bankAccountNumber")}
              {field("IBAN", "iban")}
            </div>
          </div>
          <div>
            <h3 className="mb-4 flex items-center gap-2 font-serif text-2xl">
              <ReceiptText size={20} className="text-[#b27618]" />
              Public metrics
            </h3>
            <div className="space-y-3">
              {field("Volunteer count", "volunteerCount", "number")}
              {field("Projects completed", "projectsCompleted", "number")}
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="mt-7 flex items-center gap-2 rounded-full bg-[#142b23] px-6 py-3 text-sm font-bold text-white"
        >
          <Save size={16} /> Save payment settings
        </button>
      </form>
    </section>
  );
}

function GeneralSettingsEditor({ onChange }) {
  const [form, setForm] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getDoc(doc(db, "platform_settings", "main"))
      .then((snapshot) => {
        if (snapshot.exists()) setForm(snapshot.data());
      })
      .catch(() => setError("Could not load general settings."));
  }, []);

  async function saveSettings(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      await setDoc(doc(db, "platform_settings", "main"), form, { merge: true });
      setMessage("General settings updated successfully.");
      onChange();
    } catch {
      setError("Could not save general settings. Confirm that you are signed in and that the latest Firestore rules are deployed.");
    }
  }

  function field(label, key, type = "text") {
    return (
      <label className="block">
        <span className="field-label">{label}</span>
        <input
          type={type}
          value={form[key] ?? ""}
          onChange={(event) => setForm({ ...form, [key]: event.target.value })}
          className="field-input"
        />
      </label>
    );
  }

  return (
    <section>
      <div className="mb-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#b27618]">Public website details</p>
        <h2 className="font-serif text-4xl">General settings</h2>
      </div>
      <Notice message={message} />
      <Notice message={error} error />
      <form onSubmit={saveSettings} className="rounded-2xl border border-[#ddd8cc] bg-[#f8f6f0] p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {field("Organization name", "organizationName")}
          {field("Tagline", "organizationTagline")}
          <div className="sm:col-span-2 lg:col-span-3">{field("Hero description", "organizationDescription")}</div>
          {field("Contact email", "contactEmail", "email")}
          {field("Phone number", "phoneNumber")}
          {field("Volunteer count", "volunteerCount", "number")}
          {field("Projects completed", "projectsCompleted", "number")}
        </div>
        <button type="submit" className="mt-7 flex items-center gap-2 rounded-full bg-[#142b23] px-6 py-3 text-sm font-bold text-white">
          <Save size={16} /> Save general settings
        </button>
      </form>
    </section>
  );
}

function SmartphoneIcon() {
  return <span className="text-[#b27618]">#</span>;
}

export default function Admin() {
  const [user, setUser] = useState(undefined);
  const [adminProfile, setAdminProfile] = useState(undefined);
  const [activeTab, setActiveTab] = useState("queue");
  const [causes, setCauses] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  async function loadCauses() {
    const snapshot = await getDocs(collection(db, "causes"));
    setCauses(
      snapshot.docs.map((cause) => ({ id: cause.id, ...cause.data() })),
    );
  }

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let cancelled = false;
    async function loadAdminProfile() {
      try {
        const snapshot = await getDoc(doc(db, "admin_users", user.uid));
        if (!snapshot.exists()) {
          await setDoc(doc(db, "admin_users", user.uid), {
            email: user.email?.toLowerCase() || "",
            displayName: user.email || "Primary administrator",
            active: true,
            isPrimary: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          await setDoc(doc(db, "admin_settings", "main"), {
            primaryUid: user.uid,
            createdAt: serverTimestamp(),
          });
          if (!cancelled) setAdminProfile({ isPrimary: true, active: true });
          return;
        }
        const profile = snapshot.data();
        if (profile.active === false) {
          await signOut(auth);
          return;
        }
        if (!cancelled) setAdminProfile(profile);
      } catch {
        try {
          await setDoc(doc(db, "admin_users", user.uid), {
            email: user.email?.toLowerCase() || "",
            displayName: user.email || "Primary administrator",
            active: true,
            isPrimary: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          await setDoc(doc(db, "admin_settings", "main"), {
            primaryUid: user.uid,
            createdAt: serverTimestamp(),
          });
          if (!cancelled) setAdminProfile({ isPrimary: true, active: true });
        } catch {
          // Keep existing authenticated admins online until the updated
          // Firestore rules are deployed and the one-time registry migration
          // can complete.
          if (!cancelled) {
            setAdminProfile({
              email: user.email || "",
              displayName: user.email || "Primary administrator",
              active: true,
              isPrimary: true,
              migrationPending: true,
            });
          }
        }
      }
    }

    void loadAdminProfile();
    return () => {
      cancelled = true;
    };
  }, [user]);
  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setTimeout(() => {
      void loadCauses().catch(() => setCauses([]));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user, refreshKey]);

  if (user === undefined)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#142b23] text-white">
        Loading admin...
      </main>
    );
  if (!user) return <AdminLogin onLogin={setUser} />;
  if (!adminProfile)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#142b23] text-white">
        Checking admin access...
      </main>
    );

  return (
    <AdminShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onSignOut={() => signOut(auth)}
    >
      {activeTab === "queue" && (
        <VerificationQueue
          key={refreshKey}
          causes={causes}
          onRefresh={() => setRefreshKey((value) => value + 1)}
        />
      )}
      {activeTab === "causes" && (
        <CauseManager
          causes={causes}
          onChange={() => setRefreshKey((value) => value + 1)}
        />
      )}
      {activeTab === "settings" && (
        <PaymentSettingsEditor
          onChange={() => setRefreshKey((value) => value + 1)}
        />
      )}
      {activeTab === "general" && (
        <GeneralSettingsEditor
          onChange={() => setRefreshKey((value) => value + 1)}
        />
      )}
      {activeTab === "messages" && <ContactMessages />}
      {activeTab === "admins" && <AdminManagement currentUser={user} />}
    </AdminShell>
  );
}
