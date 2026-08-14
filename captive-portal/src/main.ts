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
  return new Intl.NumberFormat('en-US').format(price) + ' NGN';
};

const renderApp = async () => {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  const sessionToken = localStorage.getItem('majal_session_token');
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get('reference');

  if (sessionToken && !reference) {
    app.innerHTML = `
      <main>
        <div class="hero-section">
          <img alt="MAJAL ISP Logo" class="hero-logo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDG6zoiSBrRWm_Xt1DT01j13IewzCb69Js9J4-yhusFKBdOYn3E8kNbxPypYzd7xSQQc2d4dGU5HJvQft6-T2dGhvtNbw9aQDMdAjao4aMoIqTVJGoSSbqGHqHzuJWbZvI0TjIRieT34ss1aKP8ROnsA8ID8lg1_ZJM5tKlgstv-r5wqe-E__EepIa4QfAKmpWxYmPY3xklfnUEfgJFCWUkJEdi0q5e3b9VjkXSCNr-nhsvSEbLsUbqD8pmrVWMWf0ZK6A">
          <h1 class="hero-title">Session Status</h1>
          <p class="hero-subtitle">You are connected to the network.</p>
          <div class="status-badge" id="session-badge">
            <div class="status-dot"></div>
            Loading Session...
          </div>
        </div>
        
        <div id="session-details" class="card">
          <div class="loading">
            <div class="spinner"></div>
            <p>Fetching your session...</p>
          </div>
        </div>
        
        <button class="btn-outline" onclick="logout()" style="color: var(--error); border-color: var(--error); max-width: 448px;">Logout / Disconnect</button>
      </main>
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
        badge.style.color = 'var(--error)';
        badge.style.background = 'var(--error-bg)';
      }

      document.getElementById('session-details')!.innerHTML = `
        <div>
          <h2 class="card-title">Session Details</h2>
        </div>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="display: flex; justify-content: space-between; font-size: 16px;">
            <span style="color: var(--text-muted)">Data Used:</span>
            <span style="font-weight: 600;">${formatBytes(data.dataUsed)} / ${formatBytes(data.dataAllowance)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 16px;">
            <span style="color: var(--text-muted)">Started At:</span>
            <span style="font-weight: 600;">${new Date(data.startedAt).toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 16px;">
            <span style="color: var(--text-muted)">IP Address:</span>
            <span style="font-weight: 600; font-family: var(--font-mono);">${data.ipAddress || 'Unknown'}</span>
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
    <main>
      <div class="hero-section">
        <img alt="MAJAL ISP Logo" class="hero-logo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDG6zoiSBrRWm_Xt1DT01j13IewzCb69Js9J4-yhusFKBdOYn3E8kNbxPypYzd7xSQQc2d4dGU5HJvQft6-T2dGhvtNbw9aQDMdAjao4aMoIqTVJGoSSbqGHqHzuJWbZvI0TjIRieT34ss1aKP8ROnsA8ID8lg1_ZJM5tKlgstv-r5wqe-E__EepIa4QfAKmpWxYmPY3xklfnUEfgJFCWUkJEdi0q5e3b9VjkXSCNr-nhsvSEbLsUbqD8pmrVWMWf0ZK6A">
        <h1 class="hero-title">Welcome to MAJAL ISP WiFi</h1>
        <p class="hero-subtitle">Enter your voucher or select a plan to connect.</p>
      </div>

      <div class="card">
        <div>
          <h2 class="card-title">Voucher Login</h2>
          <p class="card-desc">Already have a code? Enter it below.</p>
        </div>
        <div id="login-error" class="error-message hidden"></div>
        <form id="login-form" style="display: flex; flex-direction: column; gap: 16px;">
          <div class="form-group">
            <label class="form-label" for="login-voucher">Voucher Code</label>
            <input class="form-input" id="login-voucher" placeholder="Enter your code" type="text" style="text-transform: uppercase;" required>
          </div>
          <button type="submit" class="btn-primary" id="login-btn">
            <span class="material-symbols-outlined">login</span>
            Connect
          </button>
        </form>
      </div>

      <div class="divider-container">
        <div class="divider-line"></div>
        <span class="divider-text">Or Select a Plan</span>
        <div class="divider-line"></div>
      </div>

      <div id="plans-container" class="plans-list">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading plans...</p>
        </div>
      </div>
    </main>

    <div id="checkout-modal" class="modal hidden">
      <div class="modal-content">
        <span class="close-btn" onclick="closeModal()">&times;</span>
        <h2 class="card-title">Checkout</h2>
        <p id="checkout-plan-name" class="card-desc"></p>
        <p id="checkout-plan-price" style="color: var(--primary); font-size: 24px; font-weight: 700; margin-bottom: 24px;"></p>
        <form id="checkout-form" style="display: flex; flex-direction: column; gap: 16px;">
          <input type="hidden" id="checkout-plan-id" />
          <div class="form-group">
            <label class="form-label" for="checkout-email">Email</label>
            <input class="form-input" type="email" id="checkout-email" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="checkout-phone">Phone Number</label>
            <input class="form-input" type="tel" id="checkout-phone" required />
          </div>
          <button type="submit" class="btn-primary" id="pay-btn" style="margin-top: 8px;">Pay with Paystack</button>
        </form>
      </div>
    </div>

    <div id="status-modal" class="modal hidden">
      <div class="modal-content" style="text-align: center;">
        <h2 id="status-title" class="card-title">Processing</h2>
        <div class="spinner" id="status-spinner" style="margin: 24px auto;"></div>
        <p id="status-message" class="card-desc">Please wait...</p>
        <div id="voucher-display" class="hidden" style="margin-top: 24px; padding: 24px; background: var(--bg-color); border: 1px solid var(--outline-variant); border-radius: 8px; font-family: var(--font-mono); font-size: 32px; font-weight: 700; letter-spacing: 0.1em; color: var(--primary);"></div>
        <button id="status-close-btn" class="btn-primary hidden" onclick="closeStatusModal()" style="margin-top: 24px;">Close</button>
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
    btn.innerHTML = `<span class="material-symbols-outlined">sync</span> Verifying...`;
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
      
      btn.innerHTML = `<span class="material-symbols-outlined">wifi</span> Connecting...`;
      form.submit();

    } catch (err: any) {
      errorDiv.textContent = err.message;
      errorDiv.classList.remove('hidden');
      btn.disabled = false;
      btn.innerHTML = `<span class="material-symbols-outlined">login</span> Connect`;
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

    plansContainer.innerHTML = plans.map((plan, index) => {
      // In the mockup, standard is highlighted. We'll highlight the second plan or first if only one.
      const isPopular = (plans.length > 1 && index === 1) || plans.length === 1;
      return `
      <div class="plan-card ${isPopular ? 'popular' : ''}" onclick="selectPlan('${plan.id}', '${plan.name}', ${plan.price})">
        ${isPopular ? '<div class="popular-badge">POPULAR</div>' : ''}
        <div class="plan-header">
          <div>
            <h3 class="plan-name">${plan.name}</h3>
            <p class="card-desc">${formatBytes(plan.data_limit_bytes)} / ${formatDuration(plan.duration_minutes)}</p>
          </div>
          <div class="plan-price">${formatPrice(plan.price)}</div>
        </div>
        <div class="plan-features">
          <span class="material-symbols-outlined">speed</span>
          High Speed ${formatSpeed(plan.speed_down_kbps)} / ${formatSpeed(plan.speed_up_kbps)}
        </div>
        <button class="${isPopular ? 'btn-primary' : 'btn-outline'}" style="margin-top: 8px;">
          Buy with Paystack
        </button>
      </div>
    `}).join('');

  } catch (error) {
    console.error(error);
    const plansContainer = document.getElementById('plans-container')!;
    plansContainer.innerHTML = `
      <div class="error-message" style="margin-bottom: 16px;">
        Could not connect to the server. Showing demo plans.
      </div>
      
      <div class="plan-card" onclick="selectPlan('demo-1', 'Lite', 500)">
        <div class="plan-header">
          <div>
            <h3 class="plan-name">Lite</h3>
            <p class="card-desc">1GB / 1 Day</p>
          </div>
          <div class="plan-price">500 NGN</div>
        </div>
        <div class="plan-features">
          <span class="material-symbols-outlined">speed</span>
          High Speed 4G/5G
        </div>
        <button class="btn-outline" style="margin-top: 8px;">Buy with Paystack</button>
      </div>

      <div class="plan-card popular" onclick="selectPlan('demo-2', 'Standard', 2000)">
        <div class="popular-badge">POPULAR</div>
        <div class="plan-header">
          <div>
            <h3 class="plan-name">Standard</h3>
            <p class="card-desc">5GB / 7 Days</p>
          </div>
          <div class="plan-price">2,000 NGN</div>
        </div>
        <div class="plan-features">
          <span class="material-symbols-outlined">speed</span>
          High Speed 4G/5G
        </div>
        <button class="btn-primary" style="margin-top: 8px;">Buy with Paystack</button>
      </div>
      
      <div class="plan-card" onclick="selectPlan('demo-3', 'Unlimited', 10000)">
        <div class="plan-header">
          <div>
            <h3 class="plan-name">Unlimited</h3>
            <p class="card-desc">30 Days</p>
          </div>
          <div class="plan-price">10,000 NGN</div>
        </div>
        <div class="plan-features">
          <span class="material-symbols-outlined">speed</span>
          High Speed 4G/5G (Fair Use Applies)
        </div>
        <button class="btn-outline" style="margin-top: 8px;">Buy with Paystack</button>
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
