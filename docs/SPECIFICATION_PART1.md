# Book Station Pro - Complete Technical Specification

## Part 1: Architecture & System Design

---

## 1. SYSTEM ARCHITECTURE (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BOOK STATION PRO                                   │
│                      Windows Desktop Application                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      PRESENTATION LAYER                              │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │    │
│  │  │   Login     │ │  Dashboard  │ │    POS      │ │  Products   │    │    │
│  │  │   Screen    │ │   Screen    │ │   Screen    │ │   Screen    │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │    │
│  │  │   Sales     │ │ Accounting  │ │  Reports    │ │  Settings   │    │    │
│  │  │   History   │ │   Module    │ │   Module    │ │   Module    │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │  REACT 18 + TypeScript  │  Zustand State  │  i18next (AR/FR) │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                            IPC Bridge (contextBridge)                        │
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       ELECTRON MAIN PROCESS                          │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                      IPC HANDLERS                             │   │    │
│  │  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │   │    │
│  │  │  │ Auth │ │ Prod │ │Sales │ │ Acct │ │Report│ │Config│       │   │    │
│  │  │  │ IPC  │ │ IPC  │ │ IPC  │ │ IPC  │ │ IPC  │ │ IPC  │       │   │    │
│  │  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘       │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │                      SERVICES                                │    │    │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐              │    │    │
│  │  │  │  Database  │  │  License   │  │  Printer   │              │    │    │
│  │  │  │  Service   │  │  Service   │  │  Service   │              │    │    │
│  │  │  └────────────┘  └────────────┘  └────────────┘              │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         DATA LAYER                                   │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │    │
│  │  │    SQLite      │  │   License      │  │    Config      │         │    │
│  │  │   Database     │  │   File (.json) │  │   Files        │         │    │
│  │  │  (encrypted)   │  │   (RSA signed) │  │   (.json)      │         │    │
│  │  └────────────────┘  └────────────────┘  └────────────────┘         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      EXTERNAL INTERFACES                             │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │    │
│  │  │   Thermal      │  │   A4 Printer   │  │   Barcode      │         │    │
│  │  │   Printer      │  │   (PDF/Direct) │  │   Scanner      │         │    │
│  │  │   (ESC/POS)    │  │                │  │   (Keyboard)   │         │    │
│  │  └────────────────┘  └────────────────┘  └────────────────┘         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. DATABASE SCHEMA (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE SCHEMA (ERD)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐         │
│  │    USERS     │         │   SESSIONS   │         │  AUDIT_LOG   │         │
│  ├──────────────┤         ├──────────────┤         ├──────────────┤         │
│  │ PK id        │───┐     │ PK id        │         │ PK id        │         │
│  │    username  │   │     │ FK user_id   │◄────────│ FK user_id   │         │
│  │    password  │   │     │    token     │         │    action    │         │
│  │    role      │   └────►│    expires   │         │    table     │         │
│  │    full_name │                                  │    record_id │         │
│  │    is_active │                                  │    old_values│         │
│  └──────────────┘                                  │    new_values│         │
│         │                                          └──────────────┘         │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐         │
│  │    SALES     │         │  SALE_ITEMS  │         │   PAYMENTS   │         │
│  ├──────────────┤         ├──────────────┤         ├──────────────┤         │
│  │ PK id        │───┐     │ PK id        │         │ PK id        │         │
│  │ FK user_id   │   │     │ FK sale_id   │◄───┐    │ FK sale_id   │◄───┐    │
│  │ FK client_id │   │     │ FK product_id│    │    │    amount    │    │    │
│  │    invoice_no│   │     │    quantity  │    │    │    method    │    │    │
│  │    total     │   └────►│    unit_price│    │    │    reference │    │    │
│  │    vat_amount│         │    discount  │    │    └──────────────┘    │    │
│  │    status    │─────────│    vat_amount│    │                        │    │
│  └──────────────┘         └──────────────┘    │                        │    │
│         │                                      │                        │    │
│         │                       ┌──────────────┘                        │    │
│         ▼                       │                                       │    │
│  ┌──────────────┐         ┌─────┴────────┐         ┌──────────────┐    │    │
│  │   CLIENTS    │         │   PRODUCTS   │         │  CATEGORIES  │    │    │
│  ├──────────────┤         ├──────────────┤         ├──────────────┤    │    │
│  │ PK id        │         │ PK id        │         │ PK id        │    │    │
│  │    name      │         │    barcode   │◄────────│    name      │    │    │
│  │    name_ar   │         │    name_fr   │         │    name_ar   │    │    │
│  │    phone     │         │    name_ar   │         │ FK parent_id │    │    │
│  │    balance   │         │ FK category  │─────────│    sort_order│    │    │
│  │    credit_lim│         │    buy_price │         └──────────────┘    │    │
│  └──────────────┘         │    sell_price│                             │    │
│                           │    vat_rate  │                             │    │
│  ┌──────────────┐         │    stock_qty │         ┌──────────────┐    │    │
│  │  SUPPLIERS   │         │    min_stock │         │STOCK_MOVEMENT│    │    │
│  ├──────────────┤         └──────────────┘         ├──────────────┤    │    │
│  │ PK id        │               │                  │ PK id        │    │    │
│  │    name      │               │                  │ FK product_id│◄───┘    │
│  │    phone     │               │                  │    type      │         │
│  │    balance   │               ▼                  │    quantity  │         │
│  └──────────────┘         ┌──────────────┐         │    prev_stock│         │
│         │                 │  PURCHASES   │         │    new_stock │         │
│         │                 ├──────────────┤         │ FK user_id   │         │
│         └────────────────►│ PK id        │         └──────────────┘         │
│                           │ FK supplier  │                                   │
│                           │ FK user_id   │                                   │
│                           │    total     │                                   │
│                           │    vat_amount│         ┌──────────────┐         │
│                           │    status    │         │PURCHASE_ITEMS│         │
│                           └──────────────┘────────►├──────────────┤         │
│                                                    │ PK id        │         │
│  ┌──────────────┐         ┌──────────────┐         │ FK purchase  │         │
│  │   ACCOUNTS   │         │JOURNAL_ENTRY │         │ FK product_id│         │
│  ├──────────────┤         ├──────────────┤         │    quantity  │         │
│  │ PK id        │◄────────│ PK id        │         │    unit_price│         │
│  │    code      │         │ FK account_id│         └──────────────┘         │
│  │    name_fr   │         │    debit     │                                   │
│  │    name_ar   │         │    credit    │         ┌──────────────┐         │
│  │    type      │         │    descr     │         │ STORE_CONFIG │         │
│  │    balance   │         │    ref_type  │         ├──────────────┤         │
│  │    is_system │         │    ref_id    │         │ PK id        │         │
│  └──────────────┘         │ FK user_id   │         │    store_type│         │
│                           └──────────────┘         │    store_name│         │
│                                                    │    currency  │         │
│  ┌──────────────┐         ┌──────────────┐         │    vat_rate  │         │
│  │   EXPENSES   │         │EXPENSE_CATEG │         │    language  │         │
│  ├──────────────┤         ├──────────────┤         │    printers  │         │
│  │ PK id        │◄────────│ PK id        │         └──────────────┘         │
│  │ FK category  │         │    name      │                                   │
│  │    amount    │         │    name_ar   │                                   │
│  │    descr     │         │    acct_code │                                   │
│  │    date      │         └──────────────┘                                   │
│  │ FK user_id   │                                                            │
│  └──────────────┘                                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

RELATIONSHIPS:
─────────────
PK = Primary Key
FK = Foreign Key
──► = One-to-Many
───│ = Reference
```

---

## 3. COMPLETE FILE STRUCTURE

```
d:\Util\Book station pro\
│
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript configuration
├── tsconfig.node.json              # Node TypeScript config
├── vite.config.ts                  # Vite + Electron build
├── index.html                      # HTML entry point
├── README.md                       # Project documentation
├── .env.example                    # Environment template
├── .gitignore                      # Git ignore rules
│
├── electron/                       # ELECTRON MAIN PROCESS
│   ├── main.ts                     # App entry point
│   ├── preload.ts                  # Context bridge
│   │
│   ├── services/                   # Business services
│   │   ├── database.service.ts     # SQLite + migrations
│   │   ├── license.service.ts      # RSA license validation
│   │   └── printer.service.ts      # Thermal + A4 printing
│   │
│   └── ipc/                        # IPC handlers
│       ├── auth.ipc.ts             # Authentication
│       ├── products.ipc.ts         # Products + categories
│       ├── sales.ipc.ts            # Sales + invoices
│       ├── accounting.ipc.ts       # Journal entries
│       ├── reports.ipc.ts          # Report generation
│       ├── settings.ipc.ts         # Configuration
│       └── license.ipc.ts          # License management
│
├── src/                            # REACT RENDERER
│   ├── main.tsx                    # React entry
│   ├── App.tsx                     # Root component
│   │
│   ├── components/                 # UI Components
│   │   ├── common/
│   │   │   ├── Layout.tsx          # Sidebar layout
│   │   │   ├── Layout.css
│   │   │   ├── ProtectedRoute.tsx  # Auth guard
│   │   │   ├── TrialBanner.tsx     # License warning
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── DataTable.tsx
│   │   │   └── PrintPreview.tsx
│   │   ├── pos/
│   │   │   ├── Cart.tsx
│   │   │   ├── ProductSearch.tsx
│   │   │   └── PaymentModal.tsx
│   │   ├── products/
│   │   │   ├── ProductForm.tsx
│   │   │   └── CategoryTree.tsx
│   │   └── reports/
│   │       ├── SalesChart.tsx
│   │       └── ReportViewer.tsx
│   │
│   ├── pages/                      # Page components
│   │   ├── Login.tsx + .css
│   │   ├── Dashboard.tsx + .css
│   │   ├── StoreSetup.tsx
│   │   ├── POS.tsx + .css
│   │   ├── Products.tsx
│   │   ├── StockMovements.tsx
│   │   ├── Sales.tsx
│   │   ├── Purchases.tsx
│   │   ├── Accounting.tsx
│   │   ├── Reports.tsx
│   │   ├── Settings.tsx
│   │   ├── Users.tsx
│   │   └── License.tsx + .css
│   │
│   ├── stores/                     # Zustand state
│   │   ├── authStore.ts
│   │   ├── settingsStore.ts
│   │   └── cartStore.ts
│   │
│   ├── hooks/                      # Custom hooks
│   │   ├── useProducts.ts
│   │   ├── useSales.ts
│   │   └── usePrinter.ts
│   │
│   ├── i18n/                       # Internationalization
│   │   ├── index.ts                # i18next config
│   │   └── locales/
│   │       ├── fr.json             # French (200+ keys)
│   │       └── ar.json             # Arabic RTL
│   │
│   ├── styles/                     # CSS
│   │   ├── globals.css             # Theme + utilities
│   │   └── rtl.css                 # RTL overrides
│   │
│   ├── types/                      # TypeScript types
│   │   └── electron.d.ts           # Electron API types
│   │
│   └── utils/                      # Utilities
│       ├── currency.ts
│       ├── date.ts
│       └── validation.ts
│
├── database/                       # Database
│   ├── schema.ts                   # Drizzle ORM schema
│   └── migrations/                 # SQL migrations
│
├── templates/                      # Print templates
│   ├── thermal/
│   │   └── receipt.html
│   └── a4/
│       ├── invoice.html
│       └── price-list.html
│
├── license/                        # License tools
│   ├── generate-keys.ts            # RSA key generation
│   └── sign-license.ts             # License signing
│
└── public/                         # Static assets
    ├── icon.ico                    # App icon
    └── public-key.pem              # RSA public key
```
