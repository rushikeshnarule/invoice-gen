const fs = require('fs');
const path = require('path');

const logoB64 = fs.readFileSync(path.join(__dirname, '../public/app-icon.png')).toString('base64');
const logoDataUri = `data:image/png;base64,${logoB64}`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice Gen — Light Mode Ad Creatives (Exact Software Design)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    /* --------------------------------------------------------------------------
     * Official Invoice Gen Light Mode Design System (Matching the Software)
     * Canvas: #f8fafc (slate-50)
     * Surface: #ffffff (white)
     * Border: #e2e8f0 (slate-200) / #cbd5e1 (slate-300)
     * Primary Text: #0f172a (slate-900)
     * Secondary Text: #475569 (slate-600)
     * Muted Text: #94a3b8 (slate-400)
     * Primary Accent: #2563eb (blue-600)
     * Emerald Accent: #059669 (emerald-600) / #10b981
     * Strict 4px scale, tabular figures, no dark mode, no AI slop
     * -------------------------------------------------------------------------- */
    :root {
      --bg-page: #f8fafc;
      --bg-surface: #ffffff;
      --bg-surface-subtle: #f1f5f9;
      --border-light: #e2e8f0;
      --border-strong: #cbd5e1;
      --text-main: #0f172a;
      --text-secondary: #475569;
      --text-muted: #64748b;
      --accent-blue: #2563eb;
      --accent-blue-hover: #1d4ed8;
      --accent-blue-subtle: #eff6ff;
      --accent-emerald: #059669;
      --accent-emerald-subtle: #ecfdf5;
      --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08);
      --shadow-window: 0 12px 32px -8px rgb(15 23 42 / 0.12), 0 4px 12px -2px rgb(15 23 42 / 0.06);
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

    .ad-container {
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: var(--bg-page);
    }

    /* --------------------------------------------------------------------------
     * Authentic Software UI Components
     * -------------------------------------------------------------------------- */
    .app-window {
      background: var(--bg-surface);
      border: 1px solid var(--border-light);
      border-radius: 20px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-window);
    }

    .window-titlebar {
      height: 42px;
      background: #ffffff;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 18px;
    }

    .window-dots {
      display: flex;
      gap: 7px;
      align-items: center;
    }

    .dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
    }

    .dot.red { background: #ef4444; }
    .dot.yellow { background: #f59e0b; }
    .dot.green { background: #10b981; }

    .window-title {
      font-size: 12.5px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    /* Buttons */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 42px;
      padding: 0 20px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 600;
      color: #ffffff;
      background: var(--accent-blue);
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
      text-decoration: none;
      cursor: pointer;
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 42px;
      padding: 0 18px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-main);
      background: #ffffff;
      border: 1px solid var(--border-strong);
      text-decoration: none;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    /* Chips */
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 500;
      border: 1px solid transparent;
    }

    .chip-blue {
      background: var(--accent-blue-subtle);
      border-color: #bfdbfe;
      color: #1d4ed8;
    }

    .chip-green {
      background: var(--accent-emerald-subtle);
      border-color: #a7f3d0;
      color: #047857;
    }

    .chip-slate {
      background: #f1f5f9;
      border-color: #e2e8f0;
      color: #475569;
    }

    /* Software Stat Card */
    .software-stat-card {
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: 14px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .stat-caption-sub {
      font-size: 11.5px;
      font-weight: 500;
      color: var(--text-muted);
    }

    .stat-number-main {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-main);
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: -0.02em;
    }


    /* ==========================================================================
       AD 1: SQUARE FEED AD (1080 x 1080)
       Light Mode Exact Software Layout
       ========================================================================== */
    #ad-square {
      width: 1080px;
      height: 1080px;
      padding: 48px 56px;
      background: #f8fafc;
    }

    .square-top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .square-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .square-brand img {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      border: 1px solid var(--border-light);
    }

    .square-h1 {
      font-size: 42px;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.03em;
      color: #0f172a;
      margin-top: 24px;
    }

    .square-p {
      font-size: 16px;
      color: var(--text-secondary);
      line-height: 1.5;
      max-width: 780px;
      margin-top: 8px;
    }

    /* Software Window inside Ad 1 */
    .square-window {
      height: 600px;
      margin-top: 28px;
      display: flex;
      flex-direction: column;
    }

    .square-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* Left Sidebar */
    .software-sidebar {
      width: 210px;
      background: #ffffff;
      border-right: 1px solid var(--border-light);
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .sidebar-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 12px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .sidebar-item.active {
      background: var(--accent-blue-subtle);
      color: #1d4ed8;
      font-weight: 600;
    }

    .sidebar-badge {
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 10px;
      background: #e2e8f0;
      color: var(--text-secondary);
      font-family: 'JetBrains Mono', monospace;
    }

    .sidebar-item.active .sidebar-badge {
      background: #bfdbfe;
      color: #1e40af;
    }

    /* Workspace Content */
    .software-workspace {
      flex: 1;
      background: #f8fafc;
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow: hidden;
    }

    /* Workspace Action Bar */
    .workspace-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }

    .action-btn.daily {
      background: var(--accent-blue);
      color: #fff;
      border: 1px solid var(--accent-blue);
    }

    .action-btn.monthly {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }

    .action-btn.excel {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }

    /* Stats Grid */
    .workspace-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    /* Invoices Table */
    .workspace-table-box {
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      flex: 1;
    }

    .workspace-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }

    .workspace-table th {
      background: #f8fafc;
      color: var(--text-muted);
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-light);
    }

    .workspace-table td {
      padding: 11px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: var(--text-secondary);
    }

    .workspace-table tr:last-child td {
      border-bottom: none;
    }

    .square-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border-light);
      padding-top: 18px;
      margin-top: 20px;
    }


    /* ==========================================================================
       AD 2: LANDSCAPE BANNER (1200 x 628)
       Light Mode Executive Banner
       ========================================================================== */
    #ad-landscape {
      width: 1200px;
      height: 628px;
      padding: 48px 56px;
      background: #f8fafc;
    }

    .landscape-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 48px;
      height: 100%;
      align-items: center;
    }

    .landscape-h1 {
      font-size: 38px;
      font-weight: 700;
      line-height: 1.18;
      letter-spacing: -0.03em;
      color: #0f172a;
    }

    .feature-row {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      color: var(--text-secondary);
    }

    .feature-icon-box {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #2563eb;
      flex-shrink: 0;
    }


    /* ==========================================================================
       AD 3: MOBILE VERTICAL STORY (1080 x 1920)
       Light Mode Mobile Layout
       ========================================================================== */
    #ad-story {
      width: 1080px;
      height: 1920px;
      padding: 72px 64px;
      background: #f8fafc;
      gap: 36px;
    }

    .story-h1 {
      font-size: 60px;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.03em;
      color: #0f172a;
    }

    .story-card {
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: 18px;
      padding: 26px 30px;
      display: flex;
      align-items: flex-start;
      gap: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .story-icon-disc {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #2563eb;
      flex-shrink: 0;
    }


    /* ==========================================================================
       AD 4: COMPARISON MATRIX (1200 x 900)
       Light Mode Clean Comparison Table
       ========================================================================== */
    #ad-comparison {
      width: 1200px;
      height: 900px;
      padding: 48px 56px;
      background: #f8fafc;
    }

    .comp-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 24px 0;
      border: 1px solid var(--border-light);
      border-radius: 14px;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .comp-table th {
      padding: 16px 22px;
      background: #f1f5f9;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      text-align: left;
      border-bottom: 1px solid var(--border-light);
    }

    .comp-table th.col-highlight {
      color: #1d4ed8;
      background: #eff6ff;
      border-left: 1px solid #bfdbfe;
      border-right: 1px solid #bfdbfe;
    }

    .comp-table td {
      padding: 16px 22px;
      font-size: 14px;
      border-bottom: 1px solid var(--border-light);
      color: var(--text-secondary);
    }

    .comp-table tr:last-child td {
      border-bottom: none;
    }

    .comp-table td.col-highlight {
      color: #0f172a;
      font-weight: 500;
      background: #f8fbff;
      border-left: 1px solid #bfdbfe;
      border-right: 1px solid #bfdbfe;
    }


    /* ==========================================================================
       AD 5: ARCHITECTURE & FILESYSTEM (1200 x 675)
       Light Mode Engineering Inspector
       ========================================================================== */
    #ad-cyber {
      width: 1200px;
      height: 675px;
      padding: 48px 56px;
      background: #f8fafc;
    }

    .inspector-card {
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: 14px;
      padding: 24px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-secondary);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
  </style>
</head>
<body>

  <!-- =========================================================================
       CREATIVE 1: SQUARE PRODUCT WINDOW (1080 x 1080)
       Light Mode Exact Software Layout
       ========================================================================= -->
  <section id="ad-square" class="ad-container">
    <div>
      <div class="square-top-bar">
        <div class="square-brand">
          <img src="${logoDataUri}" alt="Invoice Gen">
          <div>
            <div style="font-size: 18px; font-weight: 700; color: #0f172a;">Invoice Gen</div>
            <div style="font-size: 12px; color: var(--text-muted);">Commercial Desktop Workstation</div>
          </div>
        </div>
        <div class="chip chip-blue" style="font-size: 12px; padding: 5px 12px;">
          ● 100% Offline Software &bull; Zero Monthly Rent
        </div>
      </div>

      <h1 class="square-h1">The Invoicing Software That Runs On Your PC.</h1>
      <p class="square-p">
        Built natively for Windows and macOS. Experience the refined speed and aesthetics of a modern SaaS tool, without recurring cloud subscription fees.
      </p>

      <!-- Exact Light Mode App Window -->
      <div class="app-window square-window">
        <!-- Titlebar -->
        <div class="window-titlebar">
          <div class="window-dots">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <div class="window-title">Invoice Gen — Invoices Directory</div>
          <div style="font-size: 11px; color: #059669; font-family: 'JetBrains Mono', monospace;">● Local Database Ready</div>
        </div>

        <div class="square-body">
          <!-- Sidebar -->
          <div class="software-sidebar">
            <div class="sidebar-item active">
              <div style="display: flex; align-items: center; gap: 8px;">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                <span>Invoices</span>
              </div>
              <span class="sidebar-badge">18</span>
            </div>

            <div class="sidebar-item">
              <div style="display: flex; align-items: center; gap: 8px;">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
                <span>Templates</span>
              </div>
              <span class="sidebar-badge">8</span>
            </div>

            <div class="sidebar-item">
              <div style="display: flex; align-items: center; gap: 8px;">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                <span>Clients</span>
              </div>
              <span class="sidebar-badge">24</span>
            </div>

            <div style="margin-top: auto; padding: 12px; background: #f8fafc; border: 1px solid var(--border-light); border-radius: 10px;">
              <div style="font-size: 11px; color: var(--text-muted); font-weight: 500;">Storage Sovereignty</div>
              <div style="font-size: 10.5px; color: #475569; font-family: 'JetBrains Mono', monospace; word-break: break-all; margin-top: 4px;">
                ~/Documents/Invoice Gen Data
              </div>
            </div>
          </div>

          <!-- Main Workspace -->
          <div class="software-workspace">
            <!-- Action Bar -->
            <div class="workspace-actions">
              <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
                Billing Ledger <span style="font-size: 12px; font-weight: 500; color: var(--text-muted);">&bull; 18 active bills</span>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="action-btn excel">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  <span>Export Excel</span>
                </button>
                <button class="action-btn monthly">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <span>Monthly Bill</span>
                </button>
                <button class="action-btn daily">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                  <span>Daily Bill</span>
                </button>
              </div>
            </div>

            <!-- Stats Row -->
            <div class="workspace-stats">
              <div class="software-stat-card">
                <span class="stat-caption-sub">Total invoiced</span>
                <span class="stat-number-main">₹2,48,500</span>
              </div>
              <div class="software-stat-card">
                <span class="stat-caption-sub">Collected</span>
                <span class="stat-number-main" style="color: #059669;">₹1,95,000</span>
              </div>
              <div class="software-stat-card">
                <span class="stat-caption-sub">Outstanding</span>
                <span class="stat-number-main">₹53,500</span>
              </div>
              <div class="software-stat-card">
                <span class="stat-caption-sub">GST tax pool</span>
                <span class="stat-number-main">₹37,890</span>
              </div>
            </div>

            <!-- Table -->
            <div class="workspace-table-box">
              <table class="workspace-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="tnum" style="color: #2563eb; font-weight: 600;">INV-2026-0042</td>
                    <td style="color: #0f172a; font-weight: 500;">Acme Global Systems Ltd</td>
                    <td>Nov 12, 2026</td>
                    <td class="tnum" style="font-weight: 600; color: #0f172a;">₹48,250.00</td>
                    <td><span class="chip chip-green">Paid</span></td>
                  </tr>
                  <tr>
                    <td class="tnum" style="color: #2563eb; font-weight: 600;">INV-2026-0041</td>
                    <td style="color: #0f172a; font-weight: 500;">Zenith Media Studios</td>
                    <td>Nov 10, 2026</td>
                    <td class="tnum" style="font-weight: 600; color: #0f172a;">₹27,800.00</td>
                    <td><span class="chip chip-blue">Sent</span></td>
                  </tr>
                  <tr>
                    <td class="tnum" style="color: #2563eb; font-weight: 600;">INV-2026-0040</td>
                    <td style="color: #0f172a; font-weight: 500;">Apex Hardware Supplies</td>
                    <td>Nov 08, 2026</td>
                    <td class="tnum" style="font-weight: 600; color: #0f172a;">₹14,200.00</td>
                    <td><span class="chip chip-slate">Draft</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Square Footer -->
    <footer class="square-footer">
      <div style="font-size: 13.5px; color: var(--text-secondary);">
        Windows 10/11 &bull; macOS (Apple Silicon &amp; Intel) &bull; One-time purchase
      </div>
      <div class="btn-primary">
        <span>Download Workstation</span>
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
      </div>
    </footer>
  </section>


  <!-- =========================================================================
       CREATIVE 2: LANDSCAPE BANNER (1200 x 628)
       Light Mode Executive Banner
       ========================================================================= -->
  <section id="ad-landscape" class="ad-container">
    <div class="landscape-grid">
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${logoDataUri}" alt="Logo" style="width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--border-light);">
          <div>
            <span style="font-size: 18px; font-weight: 700; color: #0f172a;">Invoice Gen</span>
            <div style="font-size: 11.5px; color: var(--text-muted);">Commercial Desktop Software</div>
          </div>
          <span class="chip chip-blue" style="margin-left: 6px;">Desktop v1.3.3</span>
        </div>

        <h1 class="landscape-h1">
          Stop Paying Monthly Rent for Invoicing Software.
        </h1>

        <p style="font-size: 15px; color: var(--text-secondary); line-height: 1.55;">
          A native desktop invoicing application for Windows and macOS. Keep all client records and financial transactions safely on your local computer.
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px; margin: 4px 0;">
          <div class="feature-row">
            <div class="feature-icon-box">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span><strong>Zero monthly subscriptions</strong> &mdash; One-time purchase, perpetual desktop license</span>
          </div>
          <div class="feature-row">
            <div class="feature-icon-box">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span><strong>100% offline data sovereignty</strong> &mdash; Stored in Documents/Invoice Gen Data</span>
          </div>
          <div class="feature-row">
            <div class="feature-icon-box">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span><strong>8 commercial templates</strong> &mdash; Minimalist, Corporate, Contractor &amp; POS Receipts</span>
          </div>
        </div>

        <div style="display: flex; gap: 14px; margin-top: 6px;">
          <div class="btn-primary">
            <span>Get Desktop License</span>
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </div>
          <div class="btn-secondary">
            <span>Explore 8 Templates</span>
          </div>
        </div>
      </div>

      <!-- Right Column: Exact Light Mode Stat Cards -->
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div class="software-stat-card" style="padding: 20px 22px;">
          <span class="stat-caption-sub">Monthly SaaS Overhead</span>
          <div class="tnum" style="font-size: 28px; font-weight: 700; color: #2563eb; margin: 6px 0;">
            ₹0.00 <span style="font-size: 14px; font-weight: 500; color: var(--text-muted);">/month</span>
          </div>
          <div style="font-size: 12px; color: #059669; font-weight: 500;">
            Save ₹30,000+/year vs QuickBooks &amp; FreshBooks
          </div>
        </div>

        <div class="software-stat-card" style="padding: 20px 22px;">
          <span class="stat-caption-sub">Hardware Arithmetic Latency</span>
          <div class="tnum" style="font-size: 28px; font-weight: 700; color: #0f172a; margin: 6px 0;">
            0.00 ms
          </div>
          <div style="font-size: 12px; color: var(--text-secondary);">
            Instant bare-metal desktop performance
          </div>
        </div>

        <div class="software-stat-card" style="padding: 20px 22px;">
          <span class="stat-caption-sub">Financial Ledger Storage</span>
          <div style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 6px 0;">
            100% Local Hard Drive
          </div>
          <div style="font-size: 11.5px; font-family: 'JetBrains Mono', monospace; color: var(--text-muted);">
            ~/Documents/Invoice Gen Data/database.json
          </div>
        </div>
      </div>
    </div>
  </section>


  <!-- =========================================================================
       CREATIVE 3: MOBILE VERTICAL STORY (1080 x 1920)
       Light Mode Mobile Layout
       ========================================================================= -->
  <section id="ad-story" class="ad-container">
    <div>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${logoDataUri}" alt="Logo" style="width: 52px; height: 52px; border-radius: 12px; border: 1px solid var(--border-light);">
          <div>
            <div style="font-size: 22px; font-weight: 700; color: #0f172a;">Invoice Gen</div>
            <div style="font-size: 13px; color: var(--text-muted);">Commercial Desktop Software</div>
          </div>
        </div>
        <span class="chip chip-blue" style="padding: 6px 14px; font-size: 13px;">
          v1.3.3 Release
        </span>
      </div>

      <div style="margin-top: 56px;">
        <div style="font-size: 18px; font-weight: 600; color: #2563eb; margin-bottom: 8px;">The Offline Workstation</div>
        <h1 class="story-h1">
          Why Pay ₹3,000/Month Just to Generate Invoices?
        </h1>
        <p style="font-size: 20px; color: var(--text-secondary); line-height: 1.5; margin-top: 14px;">
          Cloud invoicing tools charge ongoing subscription fees for basic arithmetic and PDF generation. Invoice Gen runs 100% offline on your PC with zero recurring costs.
        </p>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 18px; flex: 1; justify-content: center;">
      <div class="story-card">
        <div class="story-icon-disc">
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div>
          <div style="font-size: 20px; font-weight: 600; color: #0f172a;">Zero Monthly Subscriptions</div>
          <div style="font-size: 15px; color: var(--text-secondary); margin-top: 4px; line-height: 1.45;">One-time purchase for Windows or Mac. Keep your software and your business records forever.</div>
        </div>
      </div>

      <div class="story-card">
        <div class="story-icon-disc">
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/></svg>
        </div>
        <div>
          <div style="font-size: 20px; font-weight: 600; color: #0f172a;">8 Built-in Commercial Templates</div>
          <div style="font-size: 15px; color: var(--text-secondary); margin-top: 4px; line-height: 1.45;">Create Minimalist consulting bills, Contractor progress invoices, and 80mm thermal storefront POS receipts.</div>
        </div>
      </div>

      <div class="story-card">
        <div class="story-icon-disc">
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div>
          <div style="font-size: 20px; font-weight: 600; color: #0f172a;">100% Financial Privacy</div>
          <div style="font-size: 15px; color: var(--text-secondary); margin-top: 4px; line-height: 1.45;">All customer balances, rates, and tax pools reside locally on your machine in Documents/Invoice Gen Data.</div>
        </div>
      </div>

      <div class="story-card">
        <div class="story-icon-disc">
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div>
          <div style="font-size: 20px; font-weight: 600; color: #0f172a;">Formatted Excel (.xlsx) Export</div>
          <div style="font-size: 15px; color: var(--text-secondary); margin-top: 4px; line-height: 1.45;">1-click multi-sheet workbook generation with automated GST tax breakdown for your accountant.</div>
        </div>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 16px; margin-top: auto;">
      <div class="btn-primary" style="height: 56px; font-size: 18px; border-radius: 14px;">
        <span>Install Invoice Gen Desktop</span>
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
      </div>
      <div style="text-align: center; font-size: 15px; color: var(--text-secondary);">
        Windows 10/11 &bull; macOS (Intel &amp; Apple Silicon)
      </div>
    </div>
  </section>


  <!-- =========================================================================
       CREATIVE 4: COMPARISON MATRIX (1200 x 900)
       Light Mode Clean Comparison Table
       ========================================================================= -->
  <section id="ad-comparison" class="ad-container">
    <div>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${logoDataUri}" alt="Logo" style="width: 38px; height: 38px; border-radius: 8px; border: 1px solid var(--border-light);">
          <span style="font-size: 18px; font-weight: 700; color: #0f172a;">Invoice Gen</span>
        </div>
        <span class="chip chip-slate">Product Architecture Comparison</span>
      </div>

      <div style="margin-top: 24px;">
        <h1 style="font-size: 34px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">
          Cloud Invoicing SaaS vs. Invoice Gen Desktop Workstation
        </h1>
        <p style="font-size: 15px; color: var(--text-secondary); margin-top: 6px;">
          A direct comparison between recurring subscription SaaS and native offline desktop software.
        </p>
      </div>

      <table class="comp-table">
        <thead>
          <tr>
            <th style="width: 25%;">Capability</th>
            <th style="width: 37%;">Typical Cloud SaaS (QuickBooks / FreshBooks)</th>
            <th style="width: 38%;" class="col-highlight">Invoice Gen (Desktop Workstation)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="color: #0f172a; font-weight: 600;">Pricing model</td>
            <td>₹2,000 to ₹5,000 every month (₹25,000–₹60,000/yr)</td>
            <td class="col-highlight" style="color: #059669; font-weight: 600;">One-time purchase. Lifetime ownership.</td>
          </tr>
          <tr>
            <td style="color: #0f172a; font-weight: 600;">Internet dependency</td>
            <td>Halts during WiFi drops, travel, or server outages</td>
            <td class="col-highlight" style="color: #059669; font-weight: 600;">100% offline. Instant access anywhere.</td>
          </tr>
          <tr>
            <td style="color: #0f172a; font-weight: 600;">Data storage &amp; privacy</td>
            <td>Financial records stored on 3rd-party remote servers</td>
            <td class="col-highlight" style="color: #059669; font-weight: 600;">Stored locally on your PC (Documents/Invoice Gen Data)</td>
          </tr>
          <tr>
            <td style="color: #0f172a; font-weight: 600;">Execution latency</td>
            <td>1.5s to 3.0s per page reload and API roundtrip</td>
            <td class="col-highlight" style="color: #059669; font-weight: 600;">0.00ms instantaneous local response</td>
          </tr>
          <tr>
            <td style="color: #0f172a; font-weight: 600;">Thermal POS &amp; contractor bills</td>
            <td>Restricted to higher enterprise subscription tiers</td>
            <td class="col-highlight" style="color: #059669; font-weight: 600;">8 commercial templates included by default</td>
          </tr>
          <tr>
            <td style="color: #0f172a; font-weight: 600;">Excel export (.xlsx)</td>
            <td>Often limited to basic, unformatted CSV</td>
            <td class="col-highlight" style="color: #059669; font-weight: 600;">Multi-sheet formatted Excel with automated tax pools</td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-light); padding-top: 18px;">
      <div style="font-size: 13.5px; color: var(--text-secondary);">
        Compatible with Windows 10/11 &bull; macOS (Apple Silicon &amp; Intel)
      </div>
      <div class="btn-primary" style="height: 40px; font-size: 13px;">
        <span>Get Lifetime Access</span>
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
      </div>
    </footer>
  </section>


  <!-- =========================================================================
       CREATIVE 5: ARCHITECTURE & FILESYSTEM (1200 x 675)
       Light Mode Engineering Inspector
       ========================================================================= -->
  <section id="ad-cyber" class="ad-container">
    <div>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${logoDataUri}" alt="Logo" style="width: 38px; height: 38px; border-radius: 8px; border: 1px solid var(--border-light);">
          <div>
            <div style="font-size: 18px; font-weight: 700; color: #0f172a;">Invoice Gen</div>
            <div style="font-size: 11.5px; color: var(--text-muted);">Native Desktop Architecture</div>
          </div>
        </div>
        <span class="chip chip-green" style="font-size: 12px; padding: 5px 12px;">
          ● Local Storage Engine &bull; Zero Outbound Telemetry
        </span>
      </div>

      <div style="margin-top: 24px;">
        <h1 style="font-size: 36px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">
          Engineered for Local Data Sovereignty.
        </h1>
        <p style="font-size: 15px; color: var(--text-secondary); margin-top: 6px; max-width: 820px;">
          Your financial transactions, customer contracts, and tax calculations should not live on remote third-party databases. Invoice Gen stores everything in transparent local JSON on your hard drive.
        </p>
      </div>

      <!-- Light Inspector Window -->
      <div class="inspector-card" style="margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-light); padding-bottom: 10px; margin-bottom: 14px; font-size: 11.5px; color: var(--text-muted);">
          <span>LOCAL FILESYSTEM INSPECTOR &mdash; DOCUMENTS/INVOICE GEN DATA</span>
          <span style="color: #059669; font-weight: 600;">STATUS: MOUNTED &bull; SYNC: LOCAL HARDWARE</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <div>
            <div style="color: #2563eb; font-weight: 600; margin-bottom: 4px;">// Active Local Database</div>
            <div>path: "~/Documents/Invoice Gen Data/database.json"</div>
            <div>format: Normalized JSON Document Model</div>
            <div>encryption: Hardware-level OS Data Protection</div>
            <div>auto_backup: Enabled (Daily timestamped snapshots)</div>
          </div>
          <div>
            <div style="color: #2563eb; font-weight: 600; margin-bottom: 4px;">// Runtime Diagnostics</div>
            <div>calculation_latency: 0.00ms (Hardware arithmetic)</div>
            <div>cloud_telemetry: Disabled / Zero Outbound Requests</div>
            <div>thermal_printer_driver: ESC/POS 80mm Native</div>
            <div>tax_engine: Multi-tier GST (Interstate / Intrastate)</div>
          </div>
        </div>
      </div>
    </div>

    <footer style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-light); padding-top: 18px;">
      <div style="display: flex; gap: 20px; font-size: 13.5px; color: var(--text-secondary);">
        <span>✓ Windows 10/11 Executable</span>
        <span>✓ macOS Universal DMG</span>
        <span>✓ Zero Recurring Subscriptions</span>
      </div>
      <div class="btn-primary" style="height: 40px; font-size: 13px;">
        <span>Download Workstation</span>
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
      </div>
    </footer>
  </section>

</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '../marketing-assets/templates-render.html'), html, 'utf8');
console.log('Light Mode templates-render.html successfully compiled!');
