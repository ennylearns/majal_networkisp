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
    </div>
  `;

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
      <div class="plan-card">
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

renderApp();
