# React + Vite

## Firebase App Check

All `VITE_` configuration variables are listed with empty values in [.env.example](./.env.example).
Supply the Firebase configuration and `VITE_RECAPTCHA_SITE_KEY` in your local environment
or your hosting build environment. `.env.local` is ignored by Git. Vite embeds these
values at build time, so restart the dev server or rebuild after changing them.

1. Create a score-based website key in Fraud Defense (formerly reCAPTCHA Enterprise)
   for your public domains, including `wasimakram-turk.github.io`, and register the
   default Firebase web app with the reCAPTCHA Enterprise provider in Firebase
   Console > App Check using that same key. The public site key goes in
   `VITE_RECAPTCHA_SITE_KEY`; never put secrets or service-account credentials in
   a `VITE_` variable.
2. With a site key configured, local development uses the App Check debug provider.
   Register the debug token printed in the browser console under App Check > Manage
   debug tokens. Treat this token as a secret; never commit or publish it.
3. Validate legitimate requests in App Check metrics before enabling Cloud Firestore
   enforcement. Enforcement applies to the whole service, including public reads and
   admin requests, not just the two public forms. The secondary `admin-user-creation`
   app is intentionally unchanged; test its workflows before enforcing other services.

App Check initializes before default-app Auth and Firestore. It uses reCAPTCHA Enterprise
without a challenge widget or user interaction and refreshes tokens automatically.
Follow reCAPTCHA's branding and privacy requirements; do not hide its attribution badge
without the required alternative disclosure.

Without a site key, initialization emits one warning and continues. This permits
development against a project without enforcement, but is not a production bypass:
once enforcement is enabled, Firestore rejects requests without valid App Check tokens.
Both public forms also discard submissions with a filled off-screen `website` field or
submitted within three seconds of mounting, showing their usual success feedback without
saving anything. These client-side checks are supplementary; enforcement is the protection
against requests that bypass the UI.

## Firestore

The Firestore collections are:

- `causes`: public cause listings. Signed-in users can create, update, or delete them.
- `donation_receipts`: donation receipt records. Anyone can create a receipt; signed-in users can manage them.
- `platform_settings`: public application settings, stored in the `main` document.
- `contact_messages`: volunteer and contact form messages. Anyone can create a message; signed-in users can view and manage them from the Admin Messages tab.

The rules are in `firestore.rules`. The upload restriction for donation screenshots is in `storage.rules`. After installing and logging into the Firebase CLI, deploy them with `firebase deploy --only firestore:rules,storage`, or copy them into the Firestore and Storage Rules tabs in the Firebase console.

After signing in, seed the default data from application code with:

```js
import { seedFirestore } from "./firestore";

await seedFirestore();
```

`seedFirestore` uses a batch and merge writes, so it can be run repeatedly without deleting existing fields. The default seed includes demo organization, JazzCash, EasyPaisa, bank, metric, and cause data. To also load sample receipt and contact records for dashboard development, use `await seedFirestore({ includeDemoRecords: true })`. Those records use clearly marked demo IDs and values.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
