# Book Station Pro - Complete Technical Specification

## Part 3: MVP Roadmap & QA Checklist

---

## 6. MVP DEVELOPMENT ROADMAP (8 Weeks)

### Week 1-2: Foundation & Infrastructure

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | Project setup, Electron + React + TypeScript | Working shell app |
| 3-4 | SQLite integration, Drizzle ORM schema | Database with migrations |
| 5-6 | i18n setup (FR/AR), RTL CSS system | Language switching |
| 7-8 | Authentication module (login, bcrypt) | Login screen working |
| 9-10 | License system (RSA keys, validation) | Trial/Full mode |

**Milestone:** App boots, shows login, validates license ✓

---

### Week 3-4: Core Business Modules

| Day | Task | Deliverable |
|-----|------|-------------|
| 11-12 | Product management (CRUD) | Products page |
| 13-14 | Categories + barcode generation | Category tree |
| 15-16 | POS interface (cart, search) | Basic POS |
| 17-18 | Barcode scanner integration | Barcode lookup |
| 19-20 | Payment processing, sale creation | Complete sale flow |

**Milestone:** Can create products and make sales ✓

---

### Week 5-6: Accounting & Stock

| Day | Task | Deliverable |
|-----|------|-------------|
| 21-22 | Stock movements, low stock alerts | Stock tracking |
| 23-24 | Purchase orders, supplier management | Purchases module |
| 25-26 | Chart of accounts, journal entries | Accounting base |
| 27-28 | Auto-generated journal entries | Sales/purchases post |
| 29-30 | Profit & Loss statement | P&L report |

**Milestone:** Full accounting trail from sales/purchases ✓

---

### Week 7: Reporting & Printing

| Day | Task | Deliverable |
|-----|------|-------------|
| 31-32 | Sales reports (daily, weekly, monthly) | Sales reports |
| 33-34 | Inventory reports, price lists | Inventory reports |
| 35 | Thermal printer integration (ESC/POS) | Receipt printing |
| 36-37 | A4 PDF generation (invoices) | PDF invoices |
| 38 | VAT summary, cashier reports | Tax reports |

**Milestone:** All reports printable to thermal/A4/PDF ✓

---

### Week 8: Polish & Deployment

| Day | Task | Deliverable |
|-----|------|-------------|
| 39-40 | Store type configuration, onboarding | Store setup wizard |
| 41-42 | Settings page, backup/restore | Settings complete |
| 43-44 | Bug fixes, performance optimization | Stable build |
| 45-46 | Electron-builder packaging | Windows installer |
| 47-48 | Documentation, handoff | Release package |

**Milestone:** Production-ready installer ✓

---

## 7. ACCEPTANCE CRITERIA

### 7.1 Authentication

| # | Criteria | Status |
|---|----------|--------|
| A1 | User can login with username/password | ⬜ |
| A2 | Invalid credentials show error message | ⬜ |
| A3 | Admin can create/edit/delete users | ⬜ |
| A4 | User roles restrict access to modules | ⬜ |
| A5 | Session persists across app restart | ⬜ |
| A6 | Logout clears session | ⬜ |

### 7.2 POS

| # | Criteria | Status |
|---|----------|--------|
| P1 | Products searchable by name (FR/AR) | ⬜ |
| P2 | Barcode scanner adds product to cart | ⬜ |
| P3 | Cart shows items, quantities, totals | ⬜ |
| P4 | Quantity can be increased/decreased | ⬜ |
| P5 | Discount can be applied (amount/%) | ⬜ |
| P6 | Payment modal shows cash/card/credit | ⬜ |
| P7 | Change calculated for cash payments | ⬜ |
| P8 | Sale creates invoice with unique number | ⬜ |
| P9 | Stock is deducted after sale | ⬜ |
| P10 | Receipt prints to thermal printer | ⬜ |

### 7.3 Inventory

| # | Criteria | Status |
|---|----------|--------|
| I1 | Products have FR/AR names | ⬜ |
| I2 | Products have barcode, prices, VAT | ⬜ |
| I3 | Products assigned to categories | ⬜ |
| I4 | Low stock alerts show on dashboard | ⬜ |
| I5 | Stock movements are tracked | ⬜ |
| I6 | Manual stock adjustments work | ⬜ |

### 7.4 Accounting

| # | Criteria | Status |
|---|----------|--------|
| C1 | Sales create journal entries | ⬜ |
| C2 | Purchases create journal entries | ⬜ |
| C3 | Expenses create journal entries | ⬜ |
| C4 | P&L statement calculates correctly | ⬜ |
| C5 | VAT summary shows collected/payable | ⬜ |

### 7.5 Reporting

| # | Criteria | Status |
|---|----------|--------|
| R1 | Sales report filters by date range | ⬜ |
| R2 | Inventory report shows stock values | ⬜ |
| R3 | Price list exportable to PDF | ⬜ |
| R4 | Client/supplier balances display | ⬜ |
| R5 | Reports print to A4 printer | ⬜ |

### 7.6 Multi-Language

| # | Criteria | Status |
|---|----------|--------|
| L1 | UI switches between FR and AR | ⬜ |
| L2 | AR mode shows RTL layout | ⬜ |
| L3 | All text strings translated | ⬜ |
| L4 | Product names display in current lang | ⬜ |

### 7.7 Licensing

| # | Criteria | Status |
|---|----------|--------|
| X1 | App detects MAC address | ⬜ |
| X2 | Generate license request file | ⬜ |
| X3 | Activate with signed license | ⬜ |
| X4 | Trial mode restricts features | ⬜ |
| X5 | Full mode unlocks all features | ⬜ |

---

## 8. QA CHECKLIST

### 8.1 Pre-Release Checklist

```
□ All unit tests pass
□ All acceptance criteria met
□ No console errors in production build
□ App installs on Windows 7
□ App installs on Windows 10
□ App installs on Windows 11
□ Database migrations run correctly
□ Default admin user created
□ License validation works
□ Thermal printer tested
□ A4 printer tested
□ PDF export tested
□ Arabic RTL layout correct
□ French LTR layout correct
□ All translations complete
□ Performance acceptable (<1s page load)
□ Memory usage stable over time
□ No data loss on crash recovery
```

### 8.2 Security Checklist

```
□ Passwords hashed with bcrypt (12 rounds)
□ No plaintext secrets in code
□ Private key not bundled in app
□ SQLite database encrypted (optional)
□ License signature verified
□ Input validation on all forms
□ SQL injection prevented (parameterized)
□ XSS prevented (React auto-escaping)
```

### 8.3 Compatibility Matrix

| OS | Version | Status |
|----|---------|--------|
| Windows | 7 SP1 | ⬜ Test |
| Windows | 8.1 | ⬜ Test |
| Windows | 10 | ⬜ Test |
| Windows | 11 | ⬜ Test |

| Printer | Type | Status |
|---------|------|--------|
| Generic | Thermal 58mm | ⬜ Test |
| Generic | Thermal 80mm | ⬜ Test |
| HP | LaserJet A4 | ⬜ Test |
| Epson | Inkjet A4 | ⬜ Test |

---

## 9. DEPLOYMENT PACKAGE

### 9.1 Build Commands

```bash
# Development
npm run dev

# Production build
npm run build:win

# Package installer
npm run package
```

### 9.2 Installer Contents

```
BookStationPro-Setup-1.0.0.exe
├── app.asar (bundled app)
├── electron.exe
├── resources/
│   └── public-key.pem
├── locales/ (Electron locales)
└── node_modules/ (native deps)
```

### 9.3 Post-Install Files

```
%APPDATA%/BookStationPro/
├── database.sqlite
├── license.json
├── config.json
└── backups/
```

---

## 10. SUPPORT DOCUMENTATION

### 10.1 User Manual TOC

1. Installation
2. First Launch & Setup
3. License Activation
4. Store Configuration
5. User Management
6. Product Management
7. Point of Sale
8. Purchases & Suppliers
9. Accounting Overview
10. Reports & Printing
11. Backup & Restore
12. Troubleshooting

### 10.2 Admin Guide TOC

1. Technical Requirements
2. Installation Guide
3. License Key Generation
4. Database Management
5. System Configuration
6. Printer Setup
7. Backup Procedures
8. Security Best Practices
