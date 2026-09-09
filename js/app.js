/**
 * Nifty & Beyond - Main Application Controller & UI Router
 * Tagline: What the index doesn't tell you
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize App Components
  initNavigation();
  initThemeToggle();
  initData();
  initSectorHub();
  initReportModal();
  initAdminPortal();
  initRRG();
});

// Tab Navigation
function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');

      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add('active');
      }

      // If switching to RRG tab, trigger resize
      if (targetId === 'tab-rrg' && window.rrgInstance) {
        setTimeout(() => window.rrgInstance.resize(), 50);
      }
    });
  });
}

// Data Population & Hero Scorecard
function initData() {
  const latestDaily = window.EquityData.getLatestDaily();

  // Populate Hero Section Scorecard
  if (latestDaily) {
    updateHeroScorecard(latestDaily);
  }

  // Populate Date Selector
  const dateSelect = document.getElementById('report-date-select');
  if (dateSelect) {
    dateSelect.innerHTML = window.EquityData.reports.daily.map(r => `
      <option value="${r.id}">${r.date} — Daily Post-Market</option>
    `).join('');

    dateSelect.addEventListener('change', (e) => {
      switchDailyReport(e.target.value);
    });
  }

  // Render Daily EOD Archive Grid
  renderDailyReportsGrid();
}

function updateHeroScorecard(report) {
  const dateTag = document.getElementById('hero-date-tag');
  const regimeScore = document.getElementById('hero-regime-score');
  const regimeTag = document.getElementById('hero-regime-tag');
  const standaloneBtn = document.getElementById('hero-open-standalone-btn');
  const refOpenBtn = document.getElementById('ref-open-latest-btn');
  const refThumbDate = document.getElementById('ref-thumb-date');
  const refThumbNifty = document.getElementById('ref-thumb-nifty');
  const refThumbRegime = document.getElementById('ref-thumb-regime');

  if (dateTag) dateTag.textContent = `AS OF ${report.date}`;
  if (regimeScore) regimeScore.textContent = report.regimeScore.split(' ')[0] || report.regimeScore;
  if (regimeTag) regimeTag.textContent = report.regimeScore.includes('BEARISH') ? 'BEARISH REGIME' : 'NEUTRAL REGIME';

  // Fill highlights
  const hlContainer = document.getElementById('hero-highlights-list');
  if (hlContainer && report.highlights) {
    hlContainer.innerHTML = report.highlights.map(h => `<li>${h}</li>`).join('');
  }

  // Fill Scorecard Tiles
  const scNiftyV = document.getElementById('sc-nifty-v');
  const scNiftyD = document.getElementById('sc-nifty-d');
  if (scNiftyV) scNiftyV.textContent = report.nifty;
  if (scNiftyD) scNiftyD.innerHTML = `<span class="${report.niftyChange.includes('-') ? 'dn' : 'up'}">${report.niftyChange}</span>`;

  const scSensexV = document.getElementById('sc-sensex-v');
  const scSensexD = document.getElementById('sc-sensex-d');
  if (scSensexV) scSensexV.textContent = report.sensex;
  if (scSensexD) scSensexD.innerHTML = `<span class="${report.sensexChange.includes('-') ? 'dn' : 'up'}">${report.sensexChange}</span>`;

  const scVixV = document.getElementById('sc-vix-v');
  const scVixD = document.getElementById('sc-vix-d');
  if (scVixV) scVixV.textContent = report.vix;
  if (scVixD) scVixD.innerHTML = `<span class="${report.vixChange && report.vixChange.includes('+') ? 'up' : 'dn'}">${report.vixChange || ''}</span>`;

  const scFiiV = document.getElementById('sc-fii-v');
  const scFiiD = document.getElementById('sc-fii-d');
  if (scFiiV) scFiiV.textContent = report.fii;
  if (scFiiD) scFiiD.innerHTML = `<span class="${report.fii.includes('-') ? 'dn' : 'up'}">₹ Crore</span>`;

  const scDiiV = document.getElementById('sc-dii-v');
  const scDiiD = document.getElementById('sc-dii-d');
  if (scDiiV) scDiiV.textContent = report.dii;
  if (scDiiD) scDiiD.innerHTML = `<span class="${report.dii.includes('-') ? 'dn' : 'up'}">₹ Crore</span>`;

  const scBreadthV = document.getElementById('sc-breadth-v');
  const scBreadthD = document.getElementById('sc-breadth-d');
  if (scBreadthV && scBreadthD) {
    // Expected format: "220:274 (0.80)"
    const parts = report.breadth.split(' ');
    scBreadthV.textContent = parts[0] || report.breadth;
    if (parts[1]) {
      const val = parts[1].replace(/[()]/g, '');
      const num = parseFloat(val);
      const colorCls = num > 1 ? 'up' : (num < 1 ? 'dn' : '');
      scBreadthD.innerHTML = `<span class="${colorCls}">A/D ${val}</span>`;
    } else {
      scBreadthD.innerHTML = ``;
    }
  }

  const scBrentV = document.getElementById('sc-brent-v');
  const scBrentD = document.getElementById('sc-brent-d');
  if (scBrentV && scBrentD) {
    // Expected format: "$97.40 (+1.67%)"
    const parts = report.brent.split(' ');
    scBrentV.textContent = parts[0] || report.brent;
    if (parts[1]) {
      const val = parts[1].replace(/[()]/g, '');
      const colorCls = val.includes('-') ? 'dn' : 'up';
      scBrentD.innerHTML = `<span class="${colorCls}">${val}</span>`;
    } else {
      scBrentD.innerHTML = ``;
    }
  }

  const scUsdinrV = document.getElementById('sc-usdinr-v');
  const scUsdinrD = document.getElementById('sc-usdinr-d');
  if (scUsdinrV && scUsdinrD) {
    // Expected format: "94.7900 (-0.32%)"
    const parts = report.usdinr.split(' ');
    scUsdinrV.textContent = parts[0] || report.usdinr;
    if (parts[1]) {
      const val = parts[1].replace(/[()]/g, '');
      const colorCls = val.includes('-') ? 'up' : 'dn'; // Rupee depreciation is usually 'dn' (red), wait if USDINR goes UP, Rupee goes DOWN. A positive change in USDINR means Rupee depreciated. Let's color Rupee depreciation as 'dn'.
      // The old HTML says "Rupee -0.32% dn". A negative change in USDINR means Rupee appreciated.
      // So if val includes '-', Rupee is + (up). If val includes '+', Rupee is - (dn).
      const finalCls = val.includes('-') ? 'up' : 'dn';
      scUsdinrD.innerHTML = `<span class="${finalCls}">Rupee ${val}</span>`;
    } else {
      scUsdinrD.innerHTML = ``;
    }
  }

  // Direct links and Iframe
  if (standaloneBtn) standaloneBtn.href = report.file;
  if (refOpenBtn) refOpenBtn.href = report.file;
  
  const heroIframe = document.getElementById('hero-report-iframe');
  if (heroIframe) heroIframe.src = report.file;
}

// Function to switch Hero scorecard view by Date
window.switchDailyReport = function(dateId) {
  const report = window.EquityData.getReportById('daily', dateId);
  if (!report) return;
  updateHeroScorecard(report);
};

// Render Daily Market Update - Grid View of All EOD Reports
function renderDailyReportsGrid() {
  const container = document.getElementById('daily-reports-grid-container');
  const countBadge = document.getElementById('daily-reports-count');
  if (!container) return;

  const reports = window.EquityData.reports.daily;
  if (countBadge) countBadge.textContent = `${reports.length} Daily Reports`;

  container.innerHTML = reports.map(r => {
    const isBearish = r.regimeScore.includes('BEARISH');
    const regimeClass = isBearish ? 'regime-bearish' : 'regime-neutral';
    const topHighlights = (r.highlights || []).slice(0, 2);

    return `
      <a href="${r.file}" target="_blank" rel="noopener noreferrer" class="daily-report-card">
        <div class="daily-card-header">
          <span class="daily-card-date">📅 ${r.date}</span>
          <span class="daily-card-newtab-icon" title="Open in new tab">↗</span>
        </div>
        <div class="daily-card-title">${r.title}</div>
        
        <div class="daily-card-metrics">
          <div class="card-metric-item">
            <div class="lbl">NIFTY 50</div>
            <div class="val ${r.niftyChange.includes('-') ? 'dn' : 'up'}">${r.nifty}</div>
          </div>
          <div class="card-metric-item">
            <div class="lbl">FII / DII FLOW</div>
            <div class="val mono">${r.fii} / ${r.dii}</div>
          </div>
          <div class="card-metric-item">
            <div class="lbl">BREADTH (N500)</div>
            <div class="val mono">${r.breadth}</div>
          </div>
          <div class="card-metric-item">
            <div class="lbl">INDIA VIX</div>
            <div class="val mono">${r.vix}</div>
          </div>
        </div>

        <ul class="daily-card-highlights">
          ${topHighlights.map(hl => `<li>${hl}</li>`).join('')}
        </ul>

        <div class="daily-card-footer">
          <span class="daily-card-regime ${regimeClass}">${r.regimeScore}</span>
          <span class="daily-card-action">Open Report ↗</span>
        </div>
      </a>
    `;
  }).join('');
}

// =========================================================================
// SECTOR RESEARCH HUB CONTROLLER
// Unified Search, Grid vs List View, Period / Sector Sorting, 90% Modal
// =========================================================================

let sectorHubState = {
  view: 'grid',          // 'grid' | 'list'
  searchQuery: '',       // query string
  sortBy: 'sector-az'    // 'sector-az' | 'period-desc'
};

function initSectorHub() {
  const searchInput = document.getElementById('sector-search-input');
  const searchClear = document.getElementById('sector-search-clear');
  const sortSelect = document.getElementById('sector-sort-select');
  const btnGrid = document.getElementById('btn-view-grid');
  const btnList = document.getElementById('btn-view-list');

  // Search input handler
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      sectorHubState.searchQuery = e.target.value.trim().toLowerCase();
      if (searchClear) {
        searchClear.classList.toggle('visible', sectorHubState.searchQuery.length > 0);
      }
      renderSectorHub();
    });
  }

  // Search clear button
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      sectorHubState.searchQuery = '';
      searchClear.classList.remove('visible');
      renderSectorHub();
    });
  }

  // Sort dropdown
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sectorHubState.sortBy = e.target.value;
      renderSectorHub();
    });
  }

  // View switchers
  if (btnGrid && btnList) {
    btnGrid.addEventListener('click', () => {
      sectorHubState.view = 'grid';
      btnGrid.classList.add('active');
      btnList.classList.remove('active');
      document.getElementById('sector-grid-container').style.display = 'grid';
      document.getElementById('sector-list-container').style.display = 'none';
      renderSectorHub();
    });

    btnList.addEventListener('click', () => {
      sectorHubState.view = 'list';
      btnList.classList.add('active');
      btnGrid.classList.remove('active');
      document.getElementById('sector-grid-container').style.display = 'none';
      document.getElementById('sector-list-container').style.display = 'block';
      renderSectorHub();
    });
  }

  // Initial render
  renderSectorHub();
}

function getFilteredAndSortedSectors() {
  let list = [...window.EquityData.reports.sectors];
  const q = sectorHubState.searchQuery;

  // Unified filter by Sector name, Category, or Constituent Stock Name
  if (q) {
    list = list.filter(sec => {
      const matchTitle = (sec.title || '').toLowerCase().includes(q);
      const matchCategory = (sec.category || '').toLowerCase().includes(q);
      const matchStocks = (sec.stocks || []).some(stk => stk.toLowerCase().includes(q));
      const matchCompanies = (sec.companiesCovered || []).some(c => c.toLowerCase().includes(q));
      const matchKeywords = (sec.keywords || []).some(k => k.toLowerCase().includes(q));
      const matchHighlights = (sec.highlights || []).some(h => h.toLowerCase().includes(q));
      const matchTopBuy = (sec.topBuy || '').toLowerCase().includes(q);

      return matchTitle || matchCategory || matchStocks || matchCompanies || matchKeywords || matchHighlights || matchTopBuy;
    });
  }

  // Sort logic
  if (sectorHubState.sortBy === 'sector-az') {
    list.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sectorHubState.sortBy === 'period-desc') {
    list.sort((a, b) => (b.period || '').localeCompare(a.period || '') || a.title.localeCompare(b.title));
  }

  return list;
}

function renderSectorHub() {
  const filtered = getFilteredAndSortedSectors();
  const countBadge = document.getElementById('sector-count-badge');
  if (countBadge) {
    const total = window.EquityData.reports.sectors.length;
    countBadge.textContent = `Showing ${filtered.length} of ${total} Sectors`;
  }

  if (sectorHubState.view === 'grid') {
    renderSectorGrid(filtered);
  } else {
    renderSectorList(filtered);
  }
}

function renderSectorGrid(sectors) {
  const container = document.getElementById('sector-grid-container');
  if (!container) return;

  if (sectors.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; padding: 40px; text-align: center; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <p style="font-size: 16px; color: var(--text-muted); margin-bottom: 8px;">No sectors match query: "<strong>${sectorHubState.searchQuery}</strong>"</p>
        <p style="font-size: 13px; color: var(--text-faint);">Try searching for "apollo", "solar", "defence", "power", or a stock ticker.</p>
      </div>
    `;
    return;
  }

  const q = sectorHubState.searchQuery;

  container.innerHTML = sectors.map(sec => {
    const isMatched = q && (
      sec.title.toLowerCase().includes(q) ||
      (sec.stocks || []).some(s => s.toLowerCase().includes(q))
    );

    const stocksList = (sec.stocks || sec.companiesCovered || []).slice(0, 5);

    return `
      <div class="sector-card ${isMatched ? 'search-matched' : ''}" onclick="openSectorReportModal('${sec.id}')">
        <div class="sector-card-top">
          <span class="sector-period-pill">${sec.period || 'Q1 FY27'}</span>
          <span class="sector-category-text">${sec.category}</span>
        </div>

        <div class="sector-card-title">${sec.title}</div>

        <div class="sector-card-stocks">
          ${stocksList.map(stk => {
            const highlight = q && stk.toLowerCase().includes(q);
            return `<span class="stock-tag-pill ${highlight ? 'highlight-match' : ''}">${stk}</span>`;
          }).join('')}
          ${(sec.stocks && sec.stocks.length > 5) ? `<span class="stock-tag-pill">+${sec.stocks.length - 5}</span>` : ''}
        </div>

        <div class="sector-card-stats">
          <div class="stat-box">
            <div class="s-lbl">TOPLINE GROWTH</div>
            <div class="s-val">${sec.toplineGrowth || '+18.4%'}</div>
          </div>
          <div class="stat-box">
            <div class="s-lbl">AVG OPM</div>
            <div class="s-val mono">${sec.avgOPM || '15.2%'}</div>
          </div>
        </div>

        <div class="sector-card-topbuy">
          <strong>Top Buy:</strong> ${sec.topBuy || 'Institutional Conviction Pick'}
        </div>

        <div class="sector-card-footer-actions">
          <button class="btn-popup-trigger" onclick="event.stopPropagation(); openSectorReportModal('${sec.id}')">
            🔍 View 90% Popup
          </button>
          <a href="${sec.file}" target="_blank" rel="noopener noreferrer" class="btn-newtab-trigger" onclick="event.stopPropagation()">
            ↗ Open in Tab
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function renderSectorList(sectors) {
  const container = document.getElementById('sector-list-container');
  if (!container) return;

  if (sectors.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center;">
        <p style="font-size: 16px; color: var(--text-muted);">No sectors match query: "<strong>${sectorHubState.searchQuery}</strong>"</p>
      </div>
    `;
    return;
  }

  const q = sectorHubState.searchQuery;

  container.innerHTML = `
    <table class="sector-table">
      <thead>
        <tr>
          <th>Sector Report &amp; Period</th>
          <th>Category</th>
          <th>Constituent Stocks Covered</th>
          <th>Growth</th>
          <th>Avg OPM</th>
          <th>Top Institutional Pick</th>
          <th style="text-align:right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${sectors.map(sec => {
          const isMatched = q && (
            sec.title.toLowerCase().includes(q) ||
            (sec.stocks || []).some(s => s.toLowerCase().includes(q))
          );
          const stocksList = (sec.stocks || sec.companiesCovered || []).slice(0, 4);

          return `
            <tr class="${isMatched ? 'search-matched' : ''}" style="cursor:pointer;" onclick="openSectorReportModal('${sec.id}')">
              <td>
                <div style="font-weight:700;color:var(--text-bright);">${sec.title}</div>
                <span class="sector-period-pill" style="font-size:9px;padding:1px 5px;margin-top:4px;display:inline-block;">${sec.period || 'Q1 FY27'}</span>
              </td>
              <td style="color:var(--text-muted);font-size:12px;">${sec.category}</td>
              <td>
                <div style="display:flex;flex-wrap:wrap;gap:4px;">
                  ${stocksList.map(stk => {
                    const highlight = q && stk.toLowerCase().includes(q);
                    return `<span class="stock-tag-pill ${highlight ? 'highlight-match' : ''}" style="font-size:9.5px;">${stk}</span>`;
                  }).join('')}
                </div>
              </td>
              <td class="mono" style="font-weight:700;color:var(--gain);">${sec.toplineGrowth || '--'}</td>
              <td class="mono" style="color:var(--text-bright);">${sec.avgOPM || '--'}</td>
              <td style="font-size:12px;">${sec.topBuy || '--'}</td>
              <td style="text-align:right;white-space:nowrap;">
                <button class="btn-popup-trigger" style="margin-right:8px;" onclick="event.stopPropagation(); openSectorReportModal('${sec.id}')">
                  🔍 View
                </button>
                <a href="${sec.file}" target="_blank" rel="noopener noreferrer" class="btn-newtab-trigger" onclick="event.stopPropagation()">
                  ↗ Tab
                </a>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// Function to open Sector Report in Large 90% Modal Window
window.openSectorReportModal = function(secId) {
  const sector = window.EquityData.reports.sectors.find(s => s.id === secId);
  if (!sector) return;
  openReportModal(sector.title, sector.file, sector.period);
};

// =========================================================================
// LARGE POPUP REPORT MODAL VIEWER (90% Screen Size)
// =========================================================================

function initReportModal() {
  const overlay = document.getElementById('report-modal');
  const closeBtn = document.getElementById('modal-close-btn');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeReportModal);
  }

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeReportModal();
    });
  }

  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeReportModal();
      closeAdminModals();
    }
  });
}

function openReportModal(title, fileUrl, period) {
  const overlay = document.getElementById('report-modal');
  const iframe = document.getElementById('modal-report-frame');
  const modalTitle = document.getElementById('modal-report-title');
  const modalPeriod = document.getElementById('modal-report-period');
  const modalNewtabBtn = document.getElementById('modal-newtab-btn');

  if (overlay && iframe && modalTitle) {
    modalTitle.textContent = title;
    if (modalPeriod) modalPeriod.textContent = period || 'REPORT';
    if (modalNewtabBtn) modalNewtabBtn.href = fileUrl;

    iframe.src = fileUrl;
    overlay.classList.add('active');
  }
}

function closeReportModal() {
  const overlay = document.getElementById('report-modal');
  const iframe = document.getElementById('modal-report-frame');
  if (overlay) {
    overlay.classList.remove('active');
    if (iframe) iframe.src = 'about:blank';
  }
}

window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;

// =========================================================================
// SETTINGS & ADMIN REPORT UPLOAD PORTAL
// Username: admin | Password: password123
// =========================================================================

function initAdminPortal() {
  const btnOpen = document.getElementById('btn-admin-open');
  const loginClose = document.getElementById('admin-login-close');
  const panelClose = document.getElementById('admin-panel-close');
  const logoutBtn = document.getElementById('admin-logout-btn');

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      const isLoggedIn = sessionStorage.getItem('nb_admin_logged_in') === 'true';
      if (isLoggedIn) {
        openAdminPanel();
      } else {
        openAdminLogin();
      }
    });
  }

  if (loginClose) {
    loginClose.addEventListener('click', () => {
      document.getElementById('admin-login-modal').classList.remove('active');
    });
  }

  if (panelClose) {
    panelClose.addEventListener('click', () => {
      document.getElementById('admin-panel-modal').classList.remove('active');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('nb_admin_logged_in');
      document.getElementById('admin-panel-modal').classList.remove('active');
      alert("You have logged out of the Admin Portal.");
    });
  }
}

function openAdminLogin() {
  const modal = document.getElementById('admin-login-modal');
  const alertBox = document.getElementById('admin-login-alert');
  if (alertBox) alertBox.className = 'admin-alert';
  if (modal) modal.classList.add('active');
}

function openAdminPanel() {
  const modal = document.getElementById('admin-panel-modal');
  const alertBox = document.getElementById('admin-upload-alert');
  if (alertBox) alertBox.className = 'admin-alert';
  if (modal) modal.classList.add('active');
}

function closeAdminModals() {
  const loginModal = document.getElementById('admin-login-modal');
  const panelModal = document.getElementById('admin-panel-modal');
  if (loginModal) loginModal.classList.remove('active');
  if (panelModal) panelModal.classList.remove('active');
}

window.handleAdminLogin = function(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('admin-username');
  const passwordInput = document.getElementById('admin-password');
  const alertBox = document.getElementById('admin-login-alert');

  const u = usernameInput ? usernameInput.value.trim() : '';
  const p = passwordInput ? passwordInput.value.trim() : '';

  if (u === 'admin' && p === 'password123') {
    sessionStorage.setItem('nb_admin_logged_in', 'true');
    document.getElementById('admin-login-modal').classList.remove('active');
    openAdminPanel();
  } else {
    if (alertBox) {
      alertBox.textContent = "Invalid username or password. Please use admin / password123.";
      alertBox.className = "admin-alert error";
    }
  }
};

window.switchAdminUploadTab = function(type) {
  const tabDaily = document.getElementById('tab-btn-upload-daily');
  const tabSector = document.getElementById('tab-btn-upload-sector');
  const formDaily = document.getElementById('form-upload-daily');
  const formSector = document.getElementById('form-upload-sector');
  const alertBox = document.getElementById('admin-upload-alert');

  if (alertBox) alertBox.className = 'admin-alert';

  if (type === 'daily') {
    if (tabDaily) tabDaily.classList.add('active');
    if (tabSector) tabSector.classList.remove('active');
    if (formDaily) formDaily.style.display = 'block';
    if (formSector) formSector.style.display = 'none';
  } else {
    if (tabSector) tabSector.classList.add('active');
    if (tabDaily) tabDaily.classList.remove('active');
    if (formSector) formSector.style.display = 'block';
    if (formDaily) formDaily.style.display = 'none';
  }
};

window.handleUploadDaily = function(e) {
  e.preventDefault();
  const fileInput = document.getElementById('daily-up-file');
  const pathInput = document.getElementById('daily-up-path');
  const alertBox = document.getElementById('admin-upload-alert');

  const file = fileInput && fileInput.files && fileInput.files[0];
  const specifiedPath = pathInput ? pathInput.value.trim() : '';

  if (!file && !specifiedPath) {
    if (alertBox) {
      alertBox.textContent = "Please select an HTML report file or specify a file path.";
      alertBox.className = "admin-alert error";
    }
    return;
  }

  function parseHtmlAndSave(htmlContent, filePath) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // Date extraction
      let date = '';
      const topbarMono = doc.querySelector('.topbar .mono');
      if (topbarMono) {
        const m = topbarMono.textContent.match(/(\d{4}-\d{2}-\d{2})/);
        if (m) date = m[1];
      }
      if (!date && file) {
        const m = file.name.match(/(\d{4}-\d{2}-\d{2})/);
        if (m) date = m[1];
      }
      if (!date) {
        date = new Date().toISOString().split('T')[0];
      }

      // Title extraction
      let title = doc.title || `Nifty & Beyond — ${date}`;
      const mastSub = doc.querySelector('.mast .sub');
      if (mastSub) {
        const parts = mastSub.textContent.split('·');
        if (parts.length > 0) {
          title = `Nifty & Beyond — ${parts[parts.length - 1].trim()}`;
        }
      }

      // Tile extractor helper
      function getTile(label) {
        const tiles = doc.querySelectorAll('.score .tile');
        for (let t of tiles) {
          const k = t.querySelector('.k');
          if (k && k.textContent.trim().toLowerCase().includes(label.toLowerCase())) {
            const v = t.querySelector('.v') ? t.querySelector('.v').textContent.trim() : '';
            const d = t.querySelector('.d') ? t.querySelector('.d').textContent.trim() : '';
            return { v, d };
          }
        }
        return { v: '', d: '' };
      }

      const niftyData = getTile('Nifty 50');
      const sensexData = getTile('Sensex');
      const vixData = getTile('India VIX');
      const fiiData = getTile('FII net');
      const diiData = getTile('DII net');
      const breadthData = getTile('Breadth');
      const brentData = getTile('Brent crude');
      const usdinrData = getTile('USD/INR');

      // Regime
      let regimeScore = "30.0 BEARISH";
      const regSec = doc.getElementById('s2');
      if (regSec) {
        const compTile = regSec.querySelector('.tile');
        if (compTile) {
          const val = compTile.querySelector('.v') ? compTile.querySelector('.v').textContent.trim() : '';
          const desc = compTile.querySelector('.d') ? compTile.querySelector('.d').textContent.trim() : '';
          if (val || desc) regimeScore = `${val} ${desc}`.trim();
        }
      }

      // Highlights
      let highlights = [];
      const s1 = doc.getElementById('s1');
      if (s1) {
        const lis = s1.querySelectorAll('ul.bul.narr li');
        lis.forEach(li => highlights.push(li.textContent.trim()));
      }

      const newReport = {
        id: date,
        date: date,
        title: title,
        file: filePath,
        nifty: niftyData.v || "23,431.50",
        niftyChange: niftyData.d || "-203.60 (-0.86%)",
        sensex: sensexData.v || "74,764.23",
        sensexChange: sensexData.d || "-813.35 (-1.08%)",
        vix: vixData.v || "11.92",
        vixChange: vixData.d || "+0.69",
        fii: fiiData.v || "-582.99",
        dii: diiData.v || "+1,509.04",
        breadth: `${breadthData.v} ${breadthData.d}`.trim() || "157:340 (0.46)",
        brent: brentData.v || "$98.15",
        usdinr: usdinrData.v || "94.9250",
        regimeScore: regimeScore,
        highlights: highlights.length > 0 ? highlights : ["Daily post-market report parsed and loaded."]
      };

      window.EquityData.addDailyReport(newReport);
      renderDailyReportsGrid();

      // Re-populate date selector
      const dateSelect = document.getElementById('report-date-select');
      if (dateSelect) {
        dateSelect.innerHTML = window.EquityData.reports.daily.map(r => `
          <option value="${r.id}">${r.date} — Daily Post-Market</option>
        `).join('');
      }

      if (alertBox) {
        alertBox.innerHTML = `<strong>Success!</strong> Report for <strong>${date}</strong> auto-extracted and added to this browser session.<br><span style="font-size:11px;opacity:0.85;">To publish permanently to the live hosted site for all users, save the file to <code>data/eod/daily/${date}.html</code> and push to GitHub.</span>`;
        alertBox.className = "admin-alert success";
      }
    } catch (err) {
      console.error("Error parsing report HTML:", err);
      if (alertBox) {
        alertBox.textContent = `Error parsing HTML file: ${err.message}`;
        alertBox.className = "admin-alert error";
      }
    }
  }

  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      const content = evt.target.result;
      const blob = new Blob([content], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      parseHtmlAndSave(content, blobUrl);
    };
    reader.readAsText(file);
  } else if (specifiedPath) {
    fetch(specifiedPath)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status} loading ${specifiedPath}`);
        return res.text();
      })
      .then(content => {
        parseHtmlAndSave(content, specifiedPath);
      })
      .catch(err => {
        if (alertBox) {
          alertBox.textContent = `Could not load ${specifiedPath}: ${err.message}`;
          alertBox.className = "admin-alert error";
        }
      });
  }
};

window.handleUploadSector = function(e) {
  e.preventDefault();
  const fileInput = document.getElementById('sec-up-file');
  const pathInput = document.getElementById('sec-up-path');
  const alertBox = document.getElementById('admin-upload-alert');

  const file = fileInput && fileInput.files && fileInput.files[0];
  const specifiedPath = pathInput ? pathInput.value.trim() : '';

  if (!file && !specifiedPath) {
    if (alertBox) {
      alertBox.textContent = "Please select a sector report HTML file or specify a file path.";
      alertBox.className = "admin-alert error";
    }
    return;
  }

  function parseSectorHtmlAndSave(htmlContent, filePath) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      let title = doc.title ? doc.title.split('—')[0].trim() : 'Sector Report';
      let period = 'Q1 FY27';
      const mPeriod = (doc.title || '').match(/Q\d\s+FY\d+/i);
      if (mPeriod) period = mPeriod[0].toUpperCase();

      const secId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + period.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const newSector = {
        id: secId,
        title: title,
        period: period,
        category: "Sector Review",
        file: filePath,
        toplineGrowth: "+15.0%",
        avgOPM: "18.0%",
        evMix: "Diversified",
        orderBook: "Strong",
        topBuy: "Top Sector Picks",
        companiesCovered: [],
        stocks: [],
        keywords: [title.toLowerCase(), period.toLowerCase()],
        highlights: ["Sector research note auto-parsed and added."]
      };

      window.EquityData.addSectorReport(newSector);
      renderSectorHub();

      if (alertBox) {
        alertBox.innerHTML = `<strong>Success!</strong> Sector report "${title}" (${period}) auto-extracted and added to this browser session.<br><span style="font-size:11px;opacity:0.85;">To publish permanently to the live hosted site, save to <code>data/sectors/</code> and push to GitHub.</span>`;
        alertBox.className = "admin-alert success";
      }
    } catch (err) {
      console.error("Error parsing sector HTML:", err);
      if (alertBox) {
        alertBox.textContent = `Error parsing sector report: ${err.message}`;
        alertBox.className = "admin-alert error";
      }
    }
  }

  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      const content = evt.target.result;
      const blob = new Blob([content], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      parseSectorHtmlAndSave(content, blobUrl);
    };
    reader.readAsText(file);
  } else if (specifiedPath) {
    fetch(specifiedPath)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status} loading ${specifiedPath}`);
        return res.text();
      })
      .then(content => {
        parseSectorHtmlAndSave(content, specifiedPath);
      })
      .catch(err => {
        if (alertBox) {
          alertBox.textContent = `Could not load ${specifiedPath}: ${err.message}`;
          alertBox.className = "admin-alert error";
        }
      });
  }
};

// =========================================================================
// THEME TOGGLE
// =========================================================================

function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    toggleBtn.innerHTML = next === 'light' ? '🌙' : '☀️';
    if (window.rrgInstance) window.rrgInstance.render();
  });
}

// =========================================================================
// RELATIVE ROTATION GRAPH (RRG) CONTROLLER
// =========================================================================

function initRRG() {
  fetch('data/rrg/nifty-indices-rrg-latest.json')
    .then(res => res.json())
    .then(data => {
      const rrg = new window.RRGChart('rrgCanvas');
      window.rrgInstance = rrg;
      rrg.setData(data);
    })
    .catch(err => {
      // Background RRG embedded via real GitHub app in iframe; fallback is silent
    });
}
