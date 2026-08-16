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

interface Plan {
  id: number;
  name: string;
  price: string;
  data_limit_bytes: number | null;
  duration_minutes: number;
  speed_down_kbps: number | null;
  speed_up_kbps: number | null;
  mikrotik_profile_name: string;
  enabled: boolean;
}

interface Voucher {
  id: number;
  status: string;
  activation_status: string;
  issued_at: string;
  phone_number: string;
  email: string;
  amount: string;
  paystack_reference: string;
  plan_name: string;
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

// Plans View Elements
const plansTableBody = document.getElementById('plans-table-body');
const btnAddPlan = document.getElementById('btn-add-plan');
const modalAddPlan = document.getElementById('modal-add-plan');
const btnCloseAddPlan = document.getElementById('btn-close-add-plan');
const btnCancelAddPlan = document.getElementById('btn-cancel-add-plan');
const addPlanForm = document.getElementById('add-plan-form') as HTMLFormElement;
const addPlanError = document.getElementById('add-plan-error');

// Vouchers View Elements
const vouchersTableBody = document.getElementById('vouchers-table-body');
const vouchersSearchInput = document.getElementById('vouchers-search-input') as HTMLInputElement;
const btnSearchVouchers = document.getElementById('btn-search-vouchers');

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
  } else if (targetView === 'plans') {
    loadPlansData();
  } else if (targetView === 'vouchers') {
    loadVouchersData();
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

// Plans Logic
async function loadPlansData() {
  if (!plansTableBody) return;
  plansTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-secondary">Loading...</td></tr>`;
  
  try {
    const res = await fetch('/api/plans', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!res.ok) throw new Error('Failed to load plans');
    
    const plans: Plan[] = await res.json();
    renderPlansTable(plans);
  } catch (error) {
    console.error(error);
    plansTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-error">Failed to load plans</td></tr>`;
  }
}

function renderPlansTable(plans: Plan[]) {
  if (!plansTableBody) return;
  
  if (plans.length === 0) {
    plansTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-secondary">No plans found</td></tr>`;
    return;
  }
  
  plansTableBody.innerHTML = plans.map(plan => {
    const statusColor = plan.enabled ? 'text-[#059669]' : 'text-error';
    const statusText = plan.enabled ? 'Active' : 'Disabled';
    const toggleAction = plan.enabled ? 'Disable' : 'Enable';
    const toggleClass = plan.enabled ? 'text-error hover:text-error/80' : 'text-[#059669] hover:text-[#059669]/80';
    
    let details = `${Math.round(plan.duration_minutes / 1440)} Days`;
    if (plan.data_limit_bytes !== null && plan.data_limit_bytes !== undefined) {
      details += ` • ${(plan.data_limit_bytes / 1073741824).toFixed(1)}GB`;
    } else {
      details += ` • Unlimited`;
    }
    if (plan.speed_down_kbps) {
      details += ` • ${(plan.speed_down_kbps / 1000).toFixed(1)}Mbps DL`;
    }

    return `
      <tr class="hover:bg-surface-container/50 transition-colors">
          <td class="px-6 py-4 text-on-background font-medium">${escapeHtml(plan.name)}</td>
          <td class="px-6 py-4 text-secondary">₦${Number(plan.price).toLocaleString()}</td>
          <td class="px-6 py-4 text-secondary text-sm">${escapeHtml(details)}</td>
          <td class="px-6 py-4">
              <span class="font-label-sm text-label-sm ${statusColor}">${statusText}</span>
          </td>
          <td class="px-6 py-4">
              <button class="${toggleClass} font-label-sm text-label-sm transition-colors" onclick="togglePlanStatus(${plan.id}, ${!plan.enabled})">${toggleAction}</button>
          </td>
      </tr>
    `;
  }).join('');
}

(window as any).togglePlanStatus = async (id: number, enable: boolean) => {
  const action = enable ? 'enable' : 'disable';
  if (!confirm(`Are you sure you want to ${action} this plan?`)) return;
  
  try {
    const res = await fetch(`/api/plans/${id}/${action}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || `Failed to ${action} plan`);
    }
    
    loadPlansData();
  } catch (error: any) {
    alert(error.message);
  }
};

function showAddPlanModal() {
  if (modalAddPlan) modalAddPlan.classList.remove('hidden');
  if (addPlanError) addPlanError.classList.add('hidden');
  addPlanForm?.reset();
}

function hideAddPlanModal() {
  if (modalAddPlan) modalAddPlan.classList.add('hidden');
}

btnAddPlan?.addEventListener('click', showAddPlanModal);
btnCloseAddPlan?.addEventListener('click', hideAddPlanModal);
btnCancelAddPlan?.addEventListener('click', hideAddPlanModal);

addPlanForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = (document.getElementById('plan-name') as HTMLInputElement).value;
  const price = Number((document.getElementById('plan-price') as HTMLInputElement).value);
  const dataAllowanceGb = (document.getElementById('plan-data-allowance') as HTMLInputElement).value;
  const durationDays = Number((document.getElementById('plan-duration') as HTMLInputElement).value);
  const downloadSpeed = (document.getElementById('plan-download') as HTMLInputElement).value;
  const uploadSpeed = (document.getElementById('plan-upload') as HTMLInputElement).value;
  
  const data_allowance = dataAllowanceGb ? Number(dataAllowanceGb) * 1073741824 : null;
  
  const spinner = document.getElementById('add-plan-spinner');
  
  if (spinner) spinner.classList.remove('hidden');
  if (addPlanError) addPlanError.classList.add('hidden');
  
  try {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        name,
        price,
        data_allowance,
        duration: durationDays,
        download_speed: downloadSpeed,
        upload_speed: uploadSpeed
      })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Failed to add plan');
    }
    
    hideAddPlanModal();
    loadPlansData();
    
  } catch (error: any) {
    if (addPlanError) {
      addPlanError.textContent = error.message;
      addPlanError.classList.remove('hidden');
    }
  } finally {
    if (spinner) spinner.classList.add('hidden');
  }
});

// Vouchers Logic
async function loadVouchersData(searchQuery?: string) {
  if (!vouchersTableBody) return;
  vouchersTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-secondary">Loading...</td></tr>`;
  
  try {
    let url = '/api/vouchers';
    if (searchQuery) {
      const isEmail = searchQuery.includes('@');
      url += isEmail ? `?email=${encodeURIComponent(searchQuery)}` : `?phone_number=${encodeURIComponent(searchQuery)}`;
    }

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!res.ok) throw new Error('Failed to load vouchers');
    
    const vouchers: Voucher[] = await res.json();
    renderVouchersTable(vouchers);
  } catch (error) {
    console.error(error);
    vouchersTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-error">Failed to load vouchers</td></tr>`;
  }
}

function renderVouchersTable(vouchers: Voucher[]) {
  if (!vouchersTableBody) return;
  
  if (vouchers.length === 0) {
    vouchersTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-secondary">No vouchers found</td></tr>`;
    return;
  }
  
  vouchersTableBody.innerHTML = vouchers.map(voucher => {
    const statusColor = voucher.status === 'active' ? 'text-[#059669]' : voucher.status === 'disabled' ? 'text-error' : 'text-primary';
    const statusText = voucher.status ? voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1) : '-';
    const actionDisabled = voucher.status === 'disabled';
    
    return `
      <tr class="hover:bg-surface-container/50 transition-colors">
          <td class="px-6 py-4 text-on-background font-medium">${escapeHtml(voucher.plan_name || '-')}</td>
          <td class="px-6 py-4 text-secondary">
            <div>${escapeHtml(voucher.phone_number || '-')}</div>
            <div class="text-sm">${escapeHtml(voucher.email || '-')}</div>
          </td>
          <td class="px-6 py-4">
              <span class="font-label-sm text-label-sm ${statusColor}">${statusText}</span>
              ${voucher.activation_status === 'ACTIVATED' ? '' : `<br><span class="text-xs text-secondary mt-1 block">Not activated</span>`}
          </td>
          <td class="px-6 py-4">
              <button class="text-error hover:text-error/80 font-label-sm text-label-sm transition-colors disabled:opacity-50" 
                onclick="disableVoucher(${voucher.id})" ${actionDisabled ? 'disabled' : ''}>Revoke Access</button>
          </td>
      </tr>
    `;
  }).join('');
}

btnSearchVouchers?.addEventListener('click', () => {
  const query = vouchersSearchInput?.value.trim();
  loadVouchersData(query);
});

vouchersSearchInput?.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') {
    const query = vouchersSearchInput?.value.trim();
    loadVouchersData(query);
  }
});

(window as any).disableVoucher = async (id: number) => {
  if (!confirm('Are you sure you want to revoke network access for this voucher?')) return;
  
  try {
    const res = await fetch(`/api/vouchers/${id}/disable`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to revoke voucher');
    }
    
    loadVouchersData(vouchersSearchInput?.value.trim());
  } catch (error: any) {
    alert(error.message);
  }
};

// Start
init();
