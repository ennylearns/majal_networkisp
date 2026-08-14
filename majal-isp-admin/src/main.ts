import './style.css'

interface DashboardSummary {
  todayRevenue: number;
  activeCustomers: number;
  activeSessions: number;
  totalCustomers: number;
  totalVouchers: number;
  onlineRouters: number;
  offlineRouters: number;
}

interface AuditLog {
  id: number;
  action_type: string;
  target_entity: string;
  target_id: number;
  details: any;
  created_at: string;
}

interface Router {
  id: number;
  name: string;
  location: string;
  status: string;
  routeros_version: string;
  architecture: string;
  last_seen_at: string;
}

// Global state for auth token
let authToken = localStorage.getItem('majal_admin_token');

// DOM Elements
const loginOverlay = document.getElementById('login-overlay');
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

// Metric Elements
const metricActiveSessions = document.getElementById('metric-active-sessions');
const metricTotalRevenue = document.getElementById('metric-total-revenue');
const metricOnlineRouters = document.getElementById('metric-online-routers');
const metricTotalRouters = document.getElementById('metric-total-routers');
const metricTotalCustomers = document.getElementById('metric-total-customers');

const auditLogsTableBody = document.getElementById('audit-logs-table-body');

// View Elements
const viewSections = document.querySelectorAll('.view-section');
const navLinks = document.querySelectorAll('.nav-link');

// Router View Elements
const routersTableBody = document.getElementById('routers-table-body');
const btnAddRouter = document.getElementById('btn-add-router');
const modalAddRouter = document.getElementById('modal-add-router');
const btnCloseAddRouter = document.getElementById('btn-close-add-router');
const btnCancelAddRouter = document.getElementById('btn-cancel-add-router');
const addRouterForm = document.getElementById('add-router-form') as HTMLFormElement;
const addRouterError = document.getElementById('add-router-error');

// Initialize
function init() {
  if (!authToken) {
    showLogin();
  } else {
    hideLogin();
    loadDashboardData();
  }
}

// Authentication
function showLogin() {
  if (loginOverlay) loginOverlay.classList.remove('hidden');
}

function hideLogin() {
  if (loginOverlay) loginOverlay.classList.add('hidden');
}

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = (document.getElementById('email') as HTMLInputElement).value;
  const password = (document.getElementById('password') as HTMLInputElement).value;
  const spinner = document.getElementById('login-spinner');
  
  if (spinner) spinner.classList.remove('hidden');
  if (loginError) loginError.classList.add('hidden');
  
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    authToken = data.token;
    localStorage.setItem('majal_admin_token', authToken!);
    
    hideLogin();
    loadDashboardData();
    
  } catch (error: any) {
    if (loginError) {
      loginError.textContent = error.message;
      loginError.classList.remove('hidden');
    }
  } finally {
    if (spinner) spinner.classList.add('hidden');
  }
});

logoutBtn?.addEventListener('click', () => {
  authToken = null;
  localStorage.removeItem('majal_admin_token');
  showLogin();
});

// Data Loading
async function loadDashboardData() {
  try {
    const [summaryRes, logsRes] = await Promise.all([
      fetch('/api/dashboard/summary', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }),
      fetch('/api/audit-logs?limit=5', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
    ]);

    if (summaryRes.status === 401 || logsRes.status === 401) {
      // Token expired or invalid
      authToken = null;
      localStorage.removeItem('majal_admin_token');
      showLogin();
      return;
    }

    const summary: DashboardSummary = await summaryRes.json();
    const logs: AuditLog[] = await logsRes.json();

    updateMetrics(summary);
    updateAuditLogs(logs);

  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  }
}

function updateMetrics(summary: DashboardSummary) {
  if (metricActiveSessions) metricActiveSessions.textContent = summary.activeSessions.toLocaleString();
  
  // Format revenue, handling potential undefined/NaN
  if (metricTotalRevenue) {
    const rev = Number(summary.todayRevenue) || 0;
    // Formatting e.g. 4200000 -> 4.2M, or just with commas
    if (rev >= 1000000) {
        metricTotalRevenue.textContent = (rev / 1000000).toFixed(1) + 'M';
    } else {
        metricTotalRevenue.textContent = rev.toLocaleString();
    }
  }

  if (metricOnlineRouters) metricOnlineRouters.textContent = summary.onlineRouters.toString();
  if (metricTotalRouters) metricTotalRouters.textContent = `/${summary.onlineRouters + summary.offlineRouters}`;
  if (metricTotalCustomers) metricTotalCustomers.textContent = summary.totalCustomers.toLocaleString();
}

function updateAuditLogs(logs: AuditLog[]) {
  if (!auditLogsTableBody) return;
  
  if (!logs || logs.length === 0) {
    auditLogsTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-secondary">No recent activity</td></tr>`;
    return;
  }

  auditLogsTableBody.innerHTML = logs.map(log => {
    const date = new Date(log.created_at);
    const dateStr = `${date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}`;
    
    const detailsStr = log.details ? JSON.stringify(log.details) : '-';

    return `
      <tr class="hover:bg-surface-container/50 transition-colors">
          <td class="px-6 py-4 text-on-surface whitespace-nowrap">${dateStr}</td>
          <td class="px-6 py-4 text-on-background font-medium">${escapeHtml(log.action_type)}</td>
          <td class="px-6 py-4 text-secondary">${escapeHtml(log.target_entity || '-')} #${log.target_id || ''}</td>
          <td class="px-6 py-4">
              <span class="inline-block max-w-xs truncate text-secondary text-sm" title="${escapeHtml(detailsStr)}">
                  ${escapeHtml(detailsStr)}
              </span>
          </td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(unsafe: string) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Navigation
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = (link as HTMLElement).dataset.target;
    if (target) switchView(target);
  });
});

function switchView(targetView: string) {
  // Update nav links styles
  navLinks.forEach(link => {
    const isTarget = (link as HTMLElement).dataset.target === targetView;
    if (isTarget) {
      link.className = 'nav-link bg-primary text-on-primary rounded-xl flex items-center gap-3 px-4 py-3 mx-2 scale-98 transition-all duration-200';
    } else {
      link.className = 'nav-link text-surface-variant flex items-center gap-3 px-4 py-3 mx-2 hover:bg-primary-fixed-dim/10 transition-colors rounded-xl';
    }
  });

  // Show/Hide sections
  viewSections.forEach(section => {
    if (section.id === `view-${targetView}`) {
      section.classList.remove('hidden');
    } else {
      section.classList.add('hidden');
    }
  });

  // Load specific view data
  if (targetView === 'routers') {
    loadRoutersData();
  } else if (targetView === 'dashboard') {
    loadDashboardData();
  }
}

// Load Routers Data
async function loadRoutersData() {
  if (!routersTableBody) return;
  routersTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-secondary">Loading...</td></tr>`;
  
  try {
    const res = await fetch('/api/routers', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!res.ok) throw new Error('Failed to load routers');
    
    const routers: Router[] = await res.json();
    renderRoutersTable(routers);
  } catch (error) {
    console.error(error);
    routersTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-error">Failed to load routers</td></tr>`;
  }
}

function renderRoutersTable(routers: Router[]) {
  if (!routersTableBody) return;
  
  if (routers.length === 0) {
    routersTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-secondary">No routers found</td></tr>`;
    return;
  }
  
  routersTableBody.innerHTML = routers.map(router => {
    const statusColor = router.status === 'online' ? 'text-[#059669]' : router.status === 'offline' ? 'text-error' : 'text-primary';
    
    return `
      <tr class="hover:bg-surface-container/50 transition-colors">
          <td class="px-6 py-4 text-on-background font-medium">${escapeHtml(router.name)}</td>
          <td class="px-6 py-4 text-secondary">${escapeHtml(router.location || '-')}</td>
          <td class="px-6 py-4">
              <span class="font-label-sm text-label-sm ${statusColor} capitalize">${escapeHtml(router.status)}</span>
          </td>
          <td class="px-6 py-4">
              <button class="text-error hover:text-error/80 font-label-sm text-label-sm transition-colors" onclick="revokeRouterToken(${router.id})">Revoke Token</button>
          </td>
      </tr>
    `;
  }).join('');
}

// Expose revoke function globally
(window as any).revokeRouterToken = async (id: number) => {
  if (!confirm('Are you sure you want to revoke the provisioning token for this router?')) return;
  
  try {
    const res = await fetch(`/api/routers/${id}/revoke-token`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to revoke token');
    }
    
    alert('Token revoked successfully');
    loadRoutersData();
  } catch (error: any) {
    alert(error.message);
  }
};

// Add Router Logic
function showAddRouterModal() {
  if (modalAddRouter) modalAddRouter.classList.remove('hidden');
  if (addRouterError) addRouterError.classList.add('hidden');
  addRouterForm?.reset();
}

function hideAddRouterModal() {
  if (modalAddRouter) modalAddRouter.classList.add('hidden');
}

btnAddRouter?.addEventListener('click', showAddRouterModal);
btnCloseAddRouter?.addEventListener('click', hideAddRouterModal);
btnCancelAddRouter?.addEventListener('click', hideAddRouterModal);

addRouterForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = (document.getElementById('router-name') as HTMLInputElement).value;
  const location = (document.getElementById('router-location') as HTMLInputElement).value;
  const spinner = document.getElementById('add-router-spinner');
  
  if (spinner) spinner.classList.remove('hidden');
  if (addRouterError) addRouterError.classList.add('hidden');
  
  try {
    const res = await fetch('/api/routers', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ name, location })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Failed to add router');
    }
    
    hideAddRouterModal();
    loadRoutersData();
    
    // Show the provisioning command in an alert
    if (data.command) {
      alert(`Router added successfully.\n\nRun this command in the router terminal to provision:\n${data.command}`);
    }
    
  } catch (error: any) {
    if (addRouterError) {
      addRouterError.textContent = error.message;
      addRouterError.classList.remove('hidden');
    }
  } finally {
    if (spinner) spinner.classList.add('hidden');
  }
});

// Start
init();
