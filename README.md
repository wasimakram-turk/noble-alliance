# React + Vite

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
