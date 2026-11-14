const fs = require('fs');
const path = require('path');

const logoB64 = fs.readFileSync(path.join(__dirname, '../public/app-icon.png')).toString('base64');
const logoDataUri = `data:image/png;base64,${logoB64}`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice Gen — Gumroad Assets Suite</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    /* --------------------------------------------------------------------------
     * Official Gumroad High-Converting Theme
     * Clean slate canvas (#f8fafc), white surfaces, slate-200 borders,
     * blue-600 & emerald-600 accents. 100% Light Mode matching the desktop app.
     * -------------------------------------------------------------------------- */
    :root {
      --bg-page: #f8fafc;
      --bg-surface: #ffffff;
      --border-light: #e2e8f0;
      --border-strong: #cbd5e1;
      --text-main: #0f172a;
      --text-secondary: #475569;
      --text-muted: #64748b;
      --accent-blue: #2563eb;
      --accent-emerald: #059669;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    body {
      background: var(--bg-page);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--text-main);
    }

    .tnum {
      font-family: 'JetBrains Mono', monospace;
      font-feature-settings: 'tnum';
    }

    .gumroad-container {
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: var(--bg-page);
    }

    /* Window Container */
    .app-window {
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 16px 36px -10px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.06);
    }

    .window-titlebar {
      height: 38px;
      background: #ffffff;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
    }

    .window-dots {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot.red { background: #ef4444; }
    .dot.yellow { background: #f59e0b; }
    .dot.green { background: #10b981; }

    /* Chips */
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
    }

    .chip-blue {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
    }

    .chip-green {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #047857;
    }

    .chip-slate {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #475569;
    }

    .software-stat-card {
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }


    /* ==========================================================================
       1. GUMROAD PRODUCT COVER (1280 x 720)
       Main banner on the top of Gumroad product page
       ========================================================================== */
    #gumroad-cover {
      width: 1280px;
      height: 720px;
      padding: 48px 56px;
      background: #f8fafc;
    }

    .cover-grid {
      display: grid;
      grid-template-columns: 1.05fr 1.15fr;
      gap: 40px;
      height: 100%;
      align-items: center;
    }

    .cover-left {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .cover-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .cover-brand img {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      border: 1px solid var(--border-light);
    }

    .cover-title {
      font-size: 40px;
      font-weight: 800;
      line-height: 1.14;
      letter-spacing: -0.03em;
      color: #0f172a;
    }

    .cover-subtitle {
      font-size: 15.5px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .cover-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }

    .cover-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 8px;
      background: #ffffff;
      border: 1px solid var(--border-light);
      font-size: 12.5px;
      font-weight: 600;
      color: #334155;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .cover-pricing {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 8px;
      padding: 12px 16px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      max-width: 440px;
    }

    /* Cover Software Mockup (Right Column) */
    .cover-window {
      height: 520px;
      display: flex;
      flex-direction: column;
    }

    .cover-window-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .cover-sidebar {
      width: 170px;
      background: #ffffff;
      border-right: 1px solid var(--border-light);
      padding: 14px 10px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .cover-sidebar-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .cover-sidebar-item.active {
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 600;
    }

    .cover-main-pane {
      flex: 1;
      background: #f8fafc;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow: hidden;
    }


    /* ==========================================================================
       2. GUMROAD PRODUCT THUMBNAIL (1200 x 1200)
       Square 1:1 card displayed in Gumroad Discover and profile page
       ========================================================================== */
    #gumroad-thumbnail {
      width: 1200px;
      height: 1200px;
      padding: 64px;
      background: #f8fafc;
      align-items: center;
      text-align: center;
    }

    .thumb-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .thumb-logo {
      width: 100px;
      height: 100px;
      border-radius: 24px;
      box-shadow: 0 12px 28px -6px rgba(15, 23, 42, 0.15);
      border: 1px solid var(--border-light);
    }

    .thumb-h1 {
      font-size: 54px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #0f172a;
      line-height: 1.1;
    }

    .thumb-sub {
      font-size: 20px;
      color: var(--text-secondary);
      max-width: 820px;
      line-height: 1.45;
    }

    .thumb-window {
      width: 100%;
      max-width: 1060px;
      height: 580px;
      margin: 32px auto 0;
      display: flex;
      flex-direction: column;
      text-align: left;
    }

    .thumb-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      border-top: 1px solid var(--border-light);
      padding-top: 24px;
      margin-top: auto;
    }


    /* ==========================================================================
       3. GUMROAD CAROUSEL SLIDE 1: 8 TEMPLATES (1280 x 720)
       Shows all built-in templates (Minimalist, Corporate, Contractor, POS)
       ========================================================================== */
    #gumroad-templates {
      width: 1280px;
      height: 720px;
      padding: 48px 56px;
      background: #f8fafc;
    }

    .templates-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-top: 28px;
      flex: 1;
    }

    .template-card {
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: 14px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .template-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      background: #f1f5f9;
      color: #475569;
      margin-bottom: 12px;
      align-self: flex-start;
    }

    .template-mini-sheet {
      background: #f8fafc;
      border: 1px solid var(--border-light);
      border-radius: 8px;
      padding: 12px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 11px;
      margin-top: 12px;
    }


    /* ==========================================================================
       4. GUMROAD CAROUSEL SLIDE 2: EXCEL & LOCAL DATA (1280 x 720)
       Shows multi-sheet Excel export + Documents/Invoice Gen Data
       ========================================================================== */
    #gumroad-excel {
      width: 1280px;
      height: 720px;
      padding: 48px 56px;
      background: #f8fafc;
    }

    .excel-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-top: 28px;
      flex: 1;
      align-items: stretch;
    }

    .feature-box {
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: 16px;
      padding: 28px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
  </style>
</head>
<body>

  <!-- =========================================================================
       ASSET 1: GUMROAD PRODUCT COVER (1280 x 720)
       ========================================================================= -->
  <section id="gumroad-cover" class="gumroad-container">
    <div class="cover-grid">
      <div class="cover-left">
        <div class="cover-brand">
          <img src="${logoDataUri}" alt="Logo">
          <div>
            <div style="font-size: 18px; font-weight: 700; color: #0f172a;">Invoice Gen</div>
            <div style="font-size: 12px; color: var(--text-muted);">Commercial Desktop Software</div>
          </div>
        </div>

        <h1 class="cover-title">
          The Desktop Invoicing Workstation.
        </h1>

        <p class="cover-subtitle">
          Modern SaaS design without monthly subscription fees. Runs 100% offline on your PC with physical data privacy and instant 0ms calculation.
        </p>

        <div class="cover-badges">
          <div class="cover-pill">✓ Windows 10/11 &amp; macOS</div>
          <div class="cover-pill">✓ 100% Offline (Zero Cloud Rent)</div>
          <div class="cover-pill">✓ 8 Commercial Templates Included</div>
          <div class="cover-pill">✓ Formatted Excel (.xlsx) Export</div>
        </div>

        <div class="cover-pricing">
          <div style="font-size: 26px; font-weight: 800; color: #2563eb; font-family: 'JetBrains Mono', monospace;">
            $99 <span style="font-size: 13px; font-weight: 500; color: #64748b;">one-time</span>
          </div>
          <div style="border-left: 1px solid #bfdbfe; padding-left: 12px; font-size: 12px; color: #1e40af; line-height: 1.35;">
            <strong>Lifetime License &bull; Free Updates</strong><br>
            Save $360+/year vs QuickBooks &amp; FreshBooks
          </div>
        </div>
      </div>

      <!-- Right Column: Exact Light Mode Window -->
      <div class="app-window cover-window">
        <div class="window-titlebar">
          <div class="window-dots">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <div style="font-size: 12px; font-weight: 500; color: var(--text-secondary);">Invoice Gen &mdash; Invoices Directory</div>
          <div style="font-size: 11px; color: #059669; font-family: 'JetBrains Mono', monospace;">● Local Storage Active</div>
        </div>

        <div class="cover-window-body">
          <div class="cover-sidebar">
            <div class="cover-sidebar-item active">
              <span>Invoices</span>
              <span class="chip chip-blue" style="padding: 1px 6px; font-size: 10px;">18</span>
            </div>
            <div class="cover-sidebar-item">
              <span>Templates</span>
              <span class="chip chip-slate" style="padding: 1px 6px; font-size: 10px;">8</span>
            </div>
            <div class="cover-sidebar-item">
              <span>Clients</span>
              <span class="chip chip-slate" style="padding: 1px 6px; font-size: 10px;">24</span>
            </div>

            <div style="margin-top: auto; padding: 8px; background: #f8fafc; border: 1px solid var(--border-light); border-radius: 8px;">
              <div style="font-size: 10px; color: var(--text-muted); font-weight: 600;">LOCAL DIRECTORY</div>
              <div style="font-size: 9.5px; color: #475569; font-family: 'JetBrains Mono', monospace; word-break: break-all; margin-top: 2px;">
                ~/Documents/Invoice Gen Data
              </div>
            </div>
          </div>

          <div class="cover-main-pane">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">Active Ledger</span>
              <div style="display: flex; gap: 6px;">
                <span class="chip chip-green" style="font-size: 11px;">Export Excel</span>
                <span class="chip chip-blue" style="font-size: 11px; font-weight: 600;">+ Daily Bill</span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
              <div class="software-stat-card">
                <span style="font-size: 10px; color: var(--text-muted);">Total Invoiced</span>
                <span class="tnum" style="font-size: 15px; font-weight: 700;">$24,850.00</span>
              </div>
              <div class="software-stat-card">
                <span style="font-size: 10px; color: var(--text-muted);">Collected</span>
                <span class="tnum" style="font-size: 15px; font-weight: 700; color: #059669;">$19,500.00</span>
              </div>
              <div class="software-stat-card">
                <span style="font-size: 10px; color: var(--text-muted);">Outstanding</span>
                <span class="tnum" style="font-size: 15px; font-weight: 700;">$5,350.00</span>
              </div>
            </div>

            <div style="background: #fff; border: 1px solid var(--border-light); border-radius: 10px; overflow: hidden; flex: 1;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
                <thead>
                  <tr style="background: #f8fafc; border-bottom: 1px solid var(--border-light); color: var(--text-muted); text-align: left;">
                    <th style="padding: 7px 10px;">Invoice #</th>
                    <th style="padding: 7px 10px;">Client</th>
                    <th style="padding: 7px 10px;">Amount</th>
                    <th style="padding: 7px 10px;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td class="tnum" style="padding: 8px 10px; color: #2563eb; font-weight: 600;">INV-2026-0042</td>
                    <td style="padding: 8px 10px; font-weight: 500;">Acme Global Corp</td>
                    <td class="tnum" style="padding: 8px 10px; font-weight: 600;">$4,850.00</td>
                    <td style="padding: 8px 10px;"><span class="chip chip-green" style="padding: 1px 6px; font-size: 10px;">Paid</span></td>
                  </tr>
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td class="tnum" style="padding: 8px 10px; color: #2563eb; font-weight: 600;">INV-2026-0041</td>
                    <td style="padding: 8px 10px; font-weight: 500;">Zenith Studio Labs</td>
                    <td class="tnum" style="padding: 8px 10px; font-weight: 600;">$2,780.00</td>
                    <td style="padding: 8px 10px;"><span class="chip chip-blue" style="padding: 1px 6px; font-size: 10px;">Sent</span></td>
                  </tr>
                  <tr>
                    <td class="tnum" style="padding: 8px 10px; color: #2563eb; font-weight: 600;">INV-2026-0040</td>
                    <td style="padding: 8px 10px; font-weight: 500;">Apex Hardware POS</td>
                    <td class="tnum" style="padding: 8px 10px; font-weight: 600;">$1,420.00</td>
                    <td style="padding: 8px 10px;"><span class="chip chip-slate" style="padding: 1px 6px; font-size: 10px;">Draft</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>


  <!-- =========================================================================
       ASSET 2: GUMROAD PRODUCT THUMBNAIL (1200 x 1200)
       ========================================================================= -->
  <section id="gumroad-thumbnail" class="gumroad-container">
    <div class="thumb-header">
      <img src="${logoDataUri}" alt="Logo" class="thumb-logo">
      <h1 class="thumb-h1">Invoice Gen</h1>
      <p class="thumb-sub">
        The 100% Offline Desktop Invoicing Workstation for Windows &amp; Mac. Zero Monthly Rent.
      </p>
      <div style="display: flex; gap: 10px; margin-top: 4px;">
        <span class="chip chip-blue" style="padding: 6px 14px; font-size: 13px;">100% Offline</span>
        <span class="chip chip-green" style="padding: 6px 14px; font-size: 13px;">$0 Monthly Subscription</span>
        <span class="chip chip-slate" style="padding: 6px 14px; font-size: 13px;">8 Built-in Templates</span>
      </div>
    </div>

    <!-- Mini Software Window -->
    <div class="app-window thumb-window">
      <div class="window-titlebar">
        <div class="window-dots">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </div>
        <div style="font-size: 12px; color: var(--text-secondary); font-weight: 500;">Invoice Gen &mdash; Desktop v1.3.3</div>
        <div style="font-size: 11px; color: #059669; font-family: 'JetBrains Mono', monospace;">● 0.00ms Latency</div>
      </div>

      <div style="display: flex; flex: 1; background: #f8fafc; padding: 24px; gap: 20px;">
        <div style="width: 200px; background: #fff; border: 1px solid var(--border-light); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 13px; font-weight: 600; color: #2563eb; background: #eff6ff; padding: 8px 10px; border-radius: 8px;">Invoices (18)</div>
          <div style="font-size: 13px; color: var(--text-secondary); padding: 8px 10px;">Templates (8)</div>
          <div style="font-size: 13px; color: var(--text-secondary); padding: 8px 10px;">Clients (24)</div>
          <div style="margin-top: auto; font-size: 10.5px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;">
            ~/Documents/Invoice Gen Data
          </div>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; gap: 16px;">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <div class="software-stat-card">
              <span style="font-size: 11px; color: var(--text-muted);">Invoiced</span>
              <span class="tnum" style="font-size: 18px; font-weight: 700;">$24,850</span>
            </div>
            <div class="software-stat-card">
              <span style="font-size: 11px; color: var(--text-muted);">Collected</span>
              <span class="tnum" style="font-size: 18px; font-weight: 700; color: #059669;">$19,500</span>
            </div>
            <div class="software-stat-card">
              <span style="font-size: 11px; color: var(--text-muted);">Balance</span>
              <span class="tnum" style="font-size: 18px; font-weight: 700;">$5,350</span>
            </div>
          </div>

          <div style="background: #fff; border: 1px solid var(--border-light); border-radius: 12px; padding: 14px; flex: 1;">
            <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Recent Commercial Records</div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12.5px;">
              <span>#INV-2026-0042 &bull; Acme Global Corp</span>
              <span class="tnum" style="font-weight: 600; color: #059669;">$4,850.00 &bull; Paid</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 12.5px;">
              <span>#INV-2026-0041 &bull; Zenith Studio Labs</span>
              <span class="tnum" style="font-weight: 600; color: #2563eb;">$2,780.00 &bull; Sent</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="thumb-footer">
      <div style="font-size: 15px; color: var(--text-secondary); text-align: left;">
        <strong>Includes:</strong> Windows .exe &bull; macOS .dmg &bull; License &bull; Free Updates
      </div>
      <div style="font-size: 24px; font-weight: 800; color: #2563eb; font-family: 'JetBrains Mono', monospace;">
        $99 Lifetime
      </div>
    </div>
  </section>


  <!-- =========================================================================
       ASSET 3: GUMROAD CAROUSEL SLIDE 1 (1280 x 720) - 8 TEMPLATES
       ========================================================================= -->
  <section id="gumroad-templates" class="gumroad-container">
    <div>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${logoDataUri}" alt="Logo" style="width: 36px; height: 36px; border-radius: 8px;">
          <span style="font-size: 16px; font-weight: 700;">Invoice Gen</span>
        </div>
        <span class="chip chip-blue">Slide 1 of 2 &bull; Commercial Versatility</span>
      </div>

      <div style="margin-top: 20px;">
        <h1 style="font-size: 36px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">
          8 Commercial Invoicing Templates Included
        </h1>
        <p style="font-size: 15px; color: var(--text-secondary); margin-top: 6px;">
          Switch templates in one click. Specially formatted for consultancies, corporate B2B, construction trades, and retail storefronts.
        </p>
      </div>

      <div class="templates-grid">
        <!-- 1. Minimalist -->
        <div class="template-card">
          <div class="template-badge">TECH &bull; CONSULTING</div>
          <div style="font-size: 16px; font-weight: 700; color: #0f172a;">1. Modern Minimalist</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Crisp typography, high whitespace, ideal for software engineers &amp; agencies.</div>
          <div class="template-mini-sheet">
            <div style="font-weight: 700; color: #2563eb;">INVOICE #INV-0042</div>
            <div style="color: #64748b;">Architecture &amp; Security Audit</div>
            <div style="margin-top: auto; font-weight: 700; text-align: right;">Total: $7,500.00</div>
          </div>
        </div>

        <!-- 2. Corporate -->
        <div class="template-card">
          <div class="template-badge">ENTERPRISE &bull; B2B</div>
          <div style="font-size: 16px; font-weight: 700; color: #0f172a;">2. Corporate Statement</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Structured columns, company registration numbers, formal payment rails.</div>
          <div class="template-mini-sheet">
            <div style="font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">TAX INVOICE</div>
            <div style="color: #64748b;">PO Ref: PO-8921-X</div>
            <div style="margin-top: auto; font-weight: 700; text-align: right;">GST (18%): $1,350.00</div>
          </div>
        </div>

        <!-- 3. Contractor -->
        <div class="template-card">
          <div class="template-badge">TRADES &bull; CONSTRUCTION</div>
          <div style="font-size: 16px; font-weight: 700; color: #0f172a;">3. Contractor Progress</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Labor and materials breakdown, jobsite location notes, milestone billing.</div>
          <div class="template-mini-sheet">
            <div style="font-weight: 700;">JOB: Downtown Site Phase 2</div>
            <div style="color: #64748b;">Labor: 40 hrs &bull; Materials: $2,400</div>
            <div style="margin-top: auto; font-weight: 700; text-align: right;">Due: $5,600.00</div>
          </div>
        </div>

        <!-- 4. Thermal POS -->
        <div class="template-card">
          <div class="template-badge">RETAIL &bull; STOREFRONTS</div>
          <div style="font-size: 16px; font-weight: 700; color: #0f172a;">4. Thermal POS Receipt</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">ESC/POS 80mm roll format for instant offline counter printing.</div>
          <div class="template-mini-sheet" style="font-family: 'JetBrains Mono', monospace; font-size: 10px; background: #fff;">
            <div style="text-align: center; font-weight: 700;">*** RECEIPT ***</div>
            <div>Item A x 2: $40.00</div>
            <div style="border-top: 1px dashed #cbd5e1; padding-top: 4px; font-weight: 700; text-align: right;">PAID: $40.00</div>
          </div>
        </div>
      </div>
    </div>

    <footer style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-light); padding-top: 16px;">
      <span style="font-size: 13.5px; color: var(--text-secondary);">Also includes: Elegant Studio, Compact Ledger, Bold Creative, and Thermal 58mm.</span>
      <span style="font-size: 13.5px; font-weight: 600; color: #2563eb;">Invoice Gen on Gumroad</span>
    </footer>
  </section>


  <!-- =========================================================================
       ASSET 4: GUMROAD CAROUSEL SLIDE 2 (1280 x 720) - EXCEL & LOCAL DATA
       ========================================================================= -->
  <section id="gumroad-excel" class="gumroad-container">
    <div>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${logoDataUri}" alt="Logo" style="width: 36px; height: 36px; border-radius: 8px;">
          <span style="font-size: 16px; font-weight: 700;">Invoice Gen</span>
        </div>
        <span class="chip chip-green">Slide 2 of 2 &bull; Accountant Ready &amp; Sovereign</span>
      </div>

      <div style="margin-top: 20px;">
        <h1 style="font-size: 36px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">
          Multi-Sheet Excel Export &amp; Total Data Sovereignty
        </h1>
        <p style="font-size: 15px; color: var(--text-secondary); margin-top: 6px;">
          Export cleanly formatted workbooks with automated tax pools. Store your company financial database locally on your PC hard drive.
        </p>
      </div>

      <div class="excel-grid">
        <!-- Feature 1: Excel Export -->
        <div class="feature-box">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: #ecfdf5; border: 1px solid #a7f3d0; display: flex; align-items: center; justify-content: center; color: #059669; font-weight: 700;">
              XLS
            </div>
            <div>
              <div style="font-size: 18px; font-weight: 700; color: #0f172a;">1-Click Formatted Excel Export</div>
              <div style="font-size: 12px; color: var(--text-muted);">Accountant-Ready (.xlsx) Files</div>
            </div>
          </div>
          <p style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.5;">
            No watermarks and no CSV limitations. Generates real multi-sheet Excel files with separated tabs:
          </p>
          <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 8px; font-size: 12.5px;">
            <div style="padding: 8px 12px; background: #f8fafc; border: 1px solid var(--border-light); border-radius: 6px;">
              📁 <strong>Sheet 1: Executive Summary</strong> &mdash; Gross invoiced, settled, outstanding
            </div>
            <div style="padding: 8px 12px; background: #f8fafc; border: 1px solid var(--border-light); border-radius: 6px;">
              📁 <strong>Sheet 2: Invoices Directory</strong> &mdash; Sequential ledger with client tax IDs
            </div>
            <div style="padding: 8px 12px; background: #f8fafc; border: 1px solid var(--border-light); border-radius: 6px;">
              📁 <strong>Sheet 3: GST Tax Pool</strong> &mdash; Auto-calculated tax liabilities
            </div>
          </div>
        </div>

        <!-- Feature 2: Local Sovereignty -->
        <div class="feature-box">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: #eff6ff; border: 1px solid #bfdbfe; display: flex; align-items: center; justify-content: center; color: #2563eb; font-weight: 700;">
              FS
            </div>
            <div>
              <div style="font-size: 18px; font-weight: 700; color: #0f172a;">100% Local PC Data Sovereignty</div>
              <div style="font-size: 12px; color: var(--text-muted);">Zero Cloud Data Harvesting</div>
            </div>
          </div>
          <p style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.5;">
            Your client rates, bank accounts, and revenue figures are stored in human-readable JSON right on your PC:
          </p>
          <div style="margin-top: 14px; background: #0f172a; color: #e2e8f0; padding: 14px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11.5px; line-height: 1.6;">
            <span style="color: #60a5fa;">// Transparent Local Storage</span><br>
            path: ~/Documents/Invoice Gen Data/database.json<br>
            backups: Daily automatic timestamped JSON<br>
            telemetry: 0 outbound connections / Air-gapped safe
          </div>
          <div style="margin-top: 12px; font-size: 12px; color: #059669; font-weight: 600;">
            ✓ Copy to USB drive or Dropbox anytime for instant backup.
          </div>
        </div>
      </div>
    </div>

    <footer style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-light); padding-top: 16px;">
      <span style="font-size: 13.5px; color: var(--text-secondary);">One-time purchase &bull; Lifetime ownership &bull; Windows 10/11 &amp; macOS</span>
      <span style="font-size: 13.5px; font-weight: 600; color: #2563eb;">$99 on Gumroad</span>
    </footer>
  </section>

</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '../marketing-assets/gumroad-templates.html'), html, 'utf8');
console.log('Gumroad HTML templates successfully generated!');
