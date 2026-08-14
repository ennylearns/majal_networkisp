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

// Start
init();
