import './style.css'

interface Plan {
  id: string;
  name: string;
  price: number;
  data_limit_bytes: number | null;
  duration_minutes: number | null;
  speed_down_kbps: number | null;
  speed_up_kbps: number | null;
}

const formatBytes = (bytes: number | null | undefined) => {
  if (bytes == null) return 'Unlimited Data';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (minutes: number | null | undefined) => {
  if (minutes == null) return 'No expiry';
  if (minutes < 60) return `${minutes} mins`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`;
  const days = hours / 24;
  return `${days} day${days > 1 ? 's' : ''}`;
};

const formatSpeed = (kbps: number | null | undefined) => {
  if (kbps == null) return 'Uncapped';
  return kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mbps` : `${kbps} kbps`;
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

const Icons = {
  data: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`,
  time: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  speed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5l-5-3-5 3M17 19l-5 3-5-3"></path></svg>`
};

const renderApp = async () => {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  const sessionToken = localStorage.getItem('majal_session_token');
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get('reference');

  if (sessionToken && !reference) {
    app.innerHTML = `
      <div class="portal-container">
        <div class="header">
          <div class="header-logo">M</div>
          <div class="status-badge" id="session-badge">
            <div class="status-dot"></div>
            Loading Session...
          </div>
          <h1>Session Status</h1>
        </div>
        
        <div id="session-details" class="plans-grid">
          <div class="loading">
            <div class="spinner"></div>
            <p>Fetching your session...</p>
          </div>
        </div>
        
        <button class="pay-btn" onclick="logout()" style="background: rgba(239, 68, 68, 0.1); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.2); margin-top: 2rem;">Logout / Disconnect</button>
      </div>
    `;

    (window as any).logout = () => {
      localStorage.removeItem('majal_session_token');
      let logoutUrl = urlParams.get('link-logout') || 'http://192.168.88.1/logout';
      window.location.href = logoutUrl;
    };

    try {
      const res = await fetch('/api/sessions', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (!res.ok) throw new Error('Session invalid');
      const data = await res.json();
      
      const badge = document.getElementById('session-badge')!;
      badge.innerHTML = `<div class="status-dot"></div> ${data.voucherStatus.toUpperCase()}`;
      if (data.voucherStatus !== 'active') {
        badge.style.color = '#F87171';
        badge.style.background = 'rgba(239, 68, 68, 0.1)';
      }

      document.getElementById('session-details')!.innerHTML = `
        <div class="plan-card">
          <div class="plan-features" style="grid-template-columns: 1fr; gap: 1rem;">
            <div class="feature" style="justify-content: space-between; font-size: 1rem;">
              <span style="color: #fff">Data Used:</span>
              <span>${formatBytes(data.dataUsed)} / ${formatBytes(data.dataAllowance)}</span>
            </div>
            <div class="feature" style="justify-content: space-between; font-size: 1rem;">
              <span style="color: #fff">Started At:</span>
              <span>${new Date(data.startedAt).toLocaleString()}</span>
            </div>
            <div class="feature" style="justify-content: space-between; font-size: 1rem;">
              <span style="color: #fff">IP Address:</span>
              <span>${data.ipAddress || 'Unknown'}</span>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      localStorage.removeItem('majal_session_token');
      window.location.reload();
    }
    return;
  }
  
  app.innerHTML = `
    <div class="portal-container">
      <div class="header">
        <div class="header-logo">M</div>
        <div class="status-badge">
          <div class="status-dot"></div>
          Connected to MAJAL
        </div>
        <h1>Welcome to MAJAL Network</h1>
        <p>You have successfully connected. Please select a plan to access the internet.</p>
      </div>
      
      <div class="plans-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2 style="margin-bottom: 0;">Available Plans</h2>
          <button class="pay-btn" style="width: auto; margin-top: 0; padding: 0.5rem 1rem;" onclick="openLoginModal()">Have a Voucher?</button>
        </div>
        <div id="plans-container" class="plans-grid">
          <div class="loading">
            <div class="spinner"></div>
            <p>Loading plans...</p>
          </div>
        </div>
      </div>

      <div id="checkout-modal" class="modal hidden">
        <div class="modal-content">
          <span class="close-btn" onclick="closeModal()">&times;</span>
          <h2>Checkout</h2>
          <p id="checkout-plan-name"></p>
          <p id="checkout-plan-price" style="color: var(--primary); font-weight: bold; margin-bottom: 1rem;"></p>
          <form id="checkout-form">
            <input type="hidden" id="checkout-plan-id" />
            <div class="form-group">
              <label for="checkout-email">Email</label>
              <input type="email" id="checkout-email" required />
            </div>
            <div class="form-group">
              <label for="checkout-phone">Phone Number</label>
              <input type="tel" id="checkout-phone" required />
            </div>
            <button type="submit" class="pay-btn" id="pay-btn">Pay with Paystack</button>
          </form>
        </div>
      </div>

      <div id="status-modal" class="modal hidden">
        <div class="modal-content" style="text-align: center;">
          <h2 id="status-title">Processing</h2>
          <div class="spinner" id="status-spinner" style="margin: 20px auto;"></div>
          <p id="status-message">Please wait...</p>
          <div id="voucher-display" class="hidden" style="margin-top: 20px; padding: 20px; background: #f0f0f0; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 2px;"></div>
          <button id="status-close-btn" class="pay-btn hidden" onclick="closeStatusModal()" style="margin-top: 20px;">Close</button>
        </div>
      </div>
      <div id="login-modal" class="modal hidden">
        <div class="modal-content">
          <span class="close-btn" onclick="closeLoginModal()">&times;</span>
          <h2>Voucher Login</h2>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Enter your voucher code to access the internet.</p>
          <div id="login-error" class="error-message hidden" style="margin-bottom: 1rem;"></div>
          <form id="login-form">
            <div class="form-group">
              <label for="login-voucher">Voucher Code</label>
              <input type="text" id="login-voucher" required placeholder="e.g. A1B2C3" style="text-transform: uppercase;" />
            </div>
            <button type="submit" class="pay-btn" id="login-btn">Login</button>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn') as HTMLButtonElement;
    const errorDiv = document.getElementById('login-error')!;
    const voucherInput = document.getElementById('login-voucher') as HTMLInputElement;
    const voucherCode = voucherInput.value.toUpperCase();

    btn.disabled = true;
    btn.textContent = 'Verifying...';
    errorDiv.classList.add('hidden');

    try {
      const res = await fetch('/api/sessions/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherCode })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('majal_session_token', data.sessionToken);
      
      const urlParams = new URLSearchParams(window.location.search);
      let loginUrl = urlParams.get('link-login') || 'http://192.168.88.1/login';
      
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = loginUrl;
      
      const userField = document.createElement('input');
      userField.type = 'hidden';
      userField.name = 'username';
      userField.value = voucherCode;
      
      const passField = document.createElement('input');
      passField.type = 'hidden';
      passField.name = 'password';
      passField.value = voucherCode;
      
      const dstField = document.createElement('input');
      dstField.type = 'hidden';
      dstField.name = 'dst';
      dstField.value = urlParams.get('link-orig') || 'https://www.google.com';

      form.appendChild(userField);
      form.appendChild(passField);
      form.appendChild(dstField);
      document.body.appendChild(form);
      
      btn.textContent = 'Connecting...';
      form.submit();

    } catch (err: any) {
      errorDiv.textContent = err.message;
      errorDiv.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Login';
    }
  });

  document.getElementById('checkout-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('pay-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Processing...';

    const planId = (document.getElementById('checkout-plan-id') as HTMLInputElement).value;
    const email = (document.getElementById('checkout-email') as HTMLInputElement).value;
    const phoneNumber = (document.getElementById('checkout-phone') as HTMLInputElement).value;

    const urlParams = new URLSearchParams(window.location.search);
    const routerIdStr = urlParams.get('router_id');
    const routerId = routerIdStr ? Number(routerIdStr) : null;

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: Number(planId), email, phoneNumber, routerId })
      });
      if (!res.ok) throw new Error('Checkout failed');
      const data = await res.json();
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error(err);
      alert('Checkout failed. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Pay with Paystack';
    }
  });

  try {
    const response = await fetch('/api/plans');
    if (!response.ok) throw new Error('Failed to fetch plans');
    const plans: Plan[] = await response.json();
    
    const plansContainer = document.getElementById('plans-container')!;
    
    if (plans.length === 0) {
      plansContainer.innerHTML = `
        <div class="error-message">
          No active plans available right now. Please try again later.
        </div>
      `;
      return;
    }

    plansContainer.innerHTML = plans.map(plan => `
      <div class="plan-card" onclick="selectPlan('${plan.id}', '${plan.name}', ${plan.price})">
        <div class="plan-header">
          <div class="plan-name">${plan.name}</div>
          <div class="plan-price">${formatPrice(plan.price)}</div>
        </div>
        <div class="plan-features">
          <div class="feature">
            ${Icons.data}
            <span>${formatBytes(plan.data_limit_bytes)}</span>
          </div>
          <div class="feature">
            ${Icons.time}
            <span>${formatDuration(plan.duration_minutes)}</span>
          </div>
          <div class="feature">
            ${Icons.speed}
            <span>↓ ${formatSpeed(plan.speed_down_kbps)} / ↑ ${formatSpeed(plan.speed_up_kbps)}</span>
          </div>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error(error);
    const plansContainer = document.getElementById('plans-container')!;
    // Fallback UI for demonstration if backend is unreachable
    plansContainer.innerHTML = `
      <div class="error-message" style="margin-bottom: 1rem;">
        Could not connect to the server. Showing demo plans.
      </div>
      
      <div class="plan-card">
        <div class="plan-header">
          <div class="plan-name">Daily Pass</div>
          <div class="plan-price">$2.00</div>
        </div>
        <div class="plan-features">
          <div class="feature">${Icons.data}<span>Unlimited</span></div>
          <div class="feature">${Icons.time}<span>1 day</span></div>
          <div class="feature">${Icons.speed}<span>↓ 10 Mbps / ↑ 5 Mbps</span></div>
        </div>
      </div>

      <div class="plan-card">
        <div class="plan-header">
          <div class="plan-name">Weekly Pro</div>
          <div class="plan-price">$10.00</div>
        </div>
        <div class="plan-features">
          <div class="feature">${Icons.data}<span>50 GB</span></div>
          <div class="feature">${Icons.time}<span>7 days</span></div>
          <div class="feature">${Icons.speed}<span>↓ 20 Mbps / ↑ 10 Mbps</span></div>
        </div>
      </div>
    `;
  }
};

(window as any).selectPlan = (id: string, name: string, price: number) => {
  document.getElementById('checkout-plan-id')!.setAttribute('value', id);
  document.getElementById('checkout-plan-name')!.textContent = `Plan: ${name}`;
  document.getElementById('checkout-plan-price')!.textContent = `Price: ${formatPrice(price)}`;
  document.getElementById('checkout-modal')!.classList.remove('hidden');
};

(window as any).closeModal = () => {
  document.getElementById('checkout-modal')!.classList.add('hidden');
};

(window as any).closeStatusModal = () => {
  document.getElementById('status-modal')!.classList.add('hidden');
  window.history.replaceState({}, document.title, window.location.pathname);
};

(window as any).openLoginModal = () => {
  document.getElementById('login-modal')!.classList.remove('hidden');
};

(window as any).closeLoginModal = () => {
  document.getElementById('login-modal')!.classList.add('hidden');
};

renderApp();

const pollUrlParams = new URLSearchParams(window.location.search);
const reference = pollUrlParams.get('reference');

if (reference) {
  const statusModal = document.getElementById('status-modal')!;
  const statusTitle = document.getElementById('status-title')!;
  const statusMessage = document.getElementById('status-message')!;
  const statusSpinner = document.getElementById('status-spinner')!;
  const voucherDisplay = document.getElementById('voucher-display')!;
  const statusCloseBtn = document.getElementById('status-close-btn')!;
  
  statusModal.classList.remove('hidden');
  statusTitle.textContent = 'Verifying Payment';
  statusMessage.textContent = 'Waiting for payment confirmation...';
  
  let attempts = 0;
  const maxAttempts = 45; // 90 seconds (2s interval)
  let voucherCodeFetched = false;
  let voucherCode: string | null = null;
  
  const pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/payments/${reference}`);
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      
      if (data.status === 'successful') {
        if (!voucherCodeFetched) {
          voucherCodeFetched = true;
          try {
            const vRes = await fetch(`/api/transactions/${reference}/voucher`, { method: 'POST' });
            if (vRes.ok) {
              const vData = await vRes.json();
              voucherCode = vData.code;
            }
          } catch (e) {
            console.error('Failed to issue voucher', e);
          }
        }

        if (data.activation_status === 'ACTIVATED') {
          clearInterval(pollInterval);
          statusTitle.textContent = 'Internet Activated!';
          statusSpinner.classList.add('hidden');
          
          if (voucherCode) {
            statusMessage.textContent = 'Here is your unique voucher code. Please save it!';
            voucherDisplay.textContent = voucherCode;
            voucherDisplay.classList.remove('hidden');
          } else {
            statusMessage.textContent = 'Your device has been activated. (Voucher was already issued previously)';
          }
          statusCloseBtn.classList.remove('hidden');
        } else if (data.activation_status === 'FAILED') {
          clearInterval(pollInterval);
          statusTitle.textContent = 'Activation Failed';
          statusSpinner.classList.add('hidden');
          statusMessage.textContent = 'Payment was successful, but router activation failed. Please contact support.';
          statusCloseBtn.classList.remove('hidden');
        } else {
          statusTitle.textContent = 'Activating...';
          statusMessage.textContent = 'Payment received, activation in progress...';
        }
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          statusTitle.textContent = 'Timeout';
          statusSpinner.classList.add('hidden');
          statusMessage.textContent = 'Payment confirmation is taking longer than expected. Please check back later or contact support.';
          statusCloseBtn.classList.remove('hidden');
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, 2000);
}
