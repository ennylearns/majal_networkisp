import './style.css'

interface Plan {
  id: string;
  name: string;
  price: number;
  data_limit_bytes: number | null;
  duration_minutes: number;
  speed_down_kbps: number | null;
  speed_up_kbps: number | null;
}

const formatBytes = (bytes: number | null) => {
  if (bytes === null) return 'Unlimited Data';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} mins`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`;
  const days = hours / 24;
  return `${days} day${days > 1 ? 's' : ''}`;
};

const formatSpeed = (kbps: number | null) => {
  if (kbps === null) return 'Uncapped';
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
        <h2>Available Plans</h2>
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
    </div>
  `;

  document.getElementById('checkout-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('pay-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Processing...';

    const planId = (document.getElementById('checkout-plan-id') as HTMLInputElement).value;
    const email = (document.getElementById('checkout-email') as HTMLInputElement).value;
    const phoneNumber = (document.getElementById('checkout-phone') as HTMLInputElement).value;

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: Number(planId), email, phoneNumber })
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
  // Clean URL without refreshing
  window.history.replaceState({}, document.title, window.location.pathname);
};

renderApp();

// Handle Paystack redirect callback
const urlParams = new URLSearchParams(window.location.search);
const reference = urlParams.get('reference');

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
