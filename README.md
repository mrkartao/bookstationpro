# Book Station Pro

A complete Windows desktop application for store management built with Electron, React, and TypeScript.

## Features

- **Point of Sale (POS)** - Fast sales with barcode scanning
- **Inventory Management** - Products, categories, stock tracking
- **Financial Accounting** - Double-entry accounting, P&L, VAT
- **Multi-language UI** - Arabic (RTL) & French (LTR)
- **Offline-first** - Works 100% offline with SQLite
- **Licensing System** - MAC address-based activation
- **Printing** - Thermal and A4 printer support

## Tech Stack

- **Electron** - Desktop application framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **SQLite** - Local database
- **Zustand** - State management
- **i18next** - Internationalization

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build:win
```

### Default Login

- **Username:** admin
- **Password:** admin123

## License Activation

1. Generate RSA keys (vendor only):
   ```bash
   npx tsx license/generate-keys.ts
   ```

2. Customer generates request from app (License page)

3. Vendor signs license:
   ```bash
   npx tsx license/sign-license.ts request.json --features all
   ```

4. Customer activates with the signed license file

## Project Structure

```
├── electron/          # Electron main process
│   ├── main.ts       # Entry point
│   ├── preload.ts    # Context bridge
│   ├── services/     # Business services
│   └── ipc/          # IPC handlers
├── src/              # React renderer
│   ├── components/   # UI components
│   ├── pages/        # Page components
│   ├── stores/       # Zustand stores
│   ├── i18n/         # Translations
│   └── styles/       # CSS
├── database/         # Schema & migrations
├── license/          # Licensing tools
└── templates/        # Invoice templates
```

## Store Types

- Grocery / Épicerie
- Clothing / Vêtements
- Electronics / Électronique
- Pharmacy / Pharmacie
- General Store

## License

Proprietary - All rights reserved

## Windows Installer (CI & Local)

- **CI (GitHub Actions)**: تم إضافة workflow جاهز في
   `.github/workflows/build-windows.yml` يبني مثبت NSIS على Windows runners لعماريتي `x64` و`ia32`.
   - التفريغ (artifacts) سيظهر في صفحة الـ workflow بعد الانتهاء.
   - تُشغّل تلقائيًا عند `push` إلى `main` أو عند إنشاء tag بنمط `v*.*.*` أو يدويًا عبر `workflow_dispatch`.

- **تحميل النتائج (artifacts)**: افتح تبويب `Actions` في المستودع، اختر التشغيل المناسب، ثم نزّل الـ artifacts من خطوة "Upload release artifacts".

- **بناء محليًا (PowerShell على Windows)**:

```powershell
cd "D:\Util\Book station pro"
npm install
# 64-bit installer
npm run build:win64
# 32-bit installer
npm run build:win32
```

- **ملاحظات**:
   - تنفيذ بناء NSIS يجب أن يتم على جهاز Windows أو عبر Windows runner في CI.
   - إن ظهرت أخطاء عند تجميع حزم native (مثل `better-sqlite3`) ثبّت "Visual Studio Build Tools" مع مكونات C++ ثم أعد `npm ci`.
   - إن أردت توقيع رقمي للمثبت (Code Signing) من أجل SmartScreen، جهّز شهادة توقيع كود وأضفها لبيئة CI.
   - المشروع مُعد لـ Windows 7+ بشكل عام، لكن إن لاحظت مشكلات توافقية مع Electron (إصدار `electron` الموضوع في `package.json`) أخبرني لأقترح تبديلًا مناسبًا.
