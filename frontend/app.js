/* ==========================================================================
   WEALTHWISE CLIENT ENGINE (FRONTEND LOGIC)
   ========================================================================== */

// Global Application State
const state = {
  activeTab: 'loan',
  tenureUnit: 'years', // 'years' or 'months'
  amortView: 'yearly',  // 'yearly' or 'monthly'
  singlePrepayments: [],
  lastCalculationResult: null,
  chartInstance: null,
  
  // Multi-Currency System State
  currencySymbol: '₹',
  currencyType: 'inr', // 'inr' or 'usd'
  
  // User Session State
  user: null,
  modalAuthTab: 'signin',
  activeHistory: null
};

// Map of view information for dynamic headers
const viewMetadata = {
  loan: {
    title: 'Loan EMI Calculator',
    description: 'Calculate monthly installments, analyze prepayment interest savings, and export schedules.'
  },
  compare: {
    title: 'Loan Comparison Suite',
    description: 'Compare two loan products side-by-side to identify the most cost-effective solution.'
  },
  history: {
    title: 'My Saved Calculations',
    description: 'Access registration-saved history, restore calculation states, and manage reports.'
  },
  life: {
    title: 'Term Life Insurance Calculator',
    description: 'Estimate annual and monthly term insurance premiums based on life-stage and lifestyle risk.'
  },
  health: {
    title: 'Comprehensive Health Insurance Premium',
    description: 'Model medical cover premium rates for your family, including pre-existing loadings and health riders.'
  },
  auto: {
    title: 'Auto Insurance Premium Calculator',
    description: 'Estimate motor insurance premium including Own Damage cover, NCB discounts, and Third-Party liabilities.'
  },
  admin: {
    title: 'Administrative Console',
    description: 'Manage registered user accounts, analyze aggregate financial calculations, and oversee plan rates.'
  }
};

// Initialize Application on Page Load
document.addEventListener('DOMContentLoaded', () => {
  // Set date
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', options);

  // Format dropdown options initially in Rupees
  updateDropdownOptions();
  updateAutoIdvLabel(800000);

  // Sync range values to initial values
  updateLoanValue(1000000);
  updateTenureValue(15);
  updatePrepayMonthly(0);
  updateIncomeValue(75000);
  updateCreditScore(750); // Initial Credit Profile sync triggers dynamic interest rate update & calculation!

  // Check saved session in localStorage
  const savedUser = localStorage.getItem('wealthwise_user');
  if (savedUser) {
    try {
      state.user = JSON.parse(savedUser);
    } catch (e) {
      localStorage.removeItem('wealthwise_user');
    }
  }

  updateUserUI();
});

/**
 * ----------------------------------------------------
 * THEME & VIEW SWITCHING
 * ----------------------------------------------------
 */
function toggleTheme() {
  const switchBtn = document.getElementById('theme-switch');
  const html = document.documentElement;
  if (switchBtn.checked) {
    html.setAttribute('data-theme', 'dark');
  } else {
    html.setAttribute('data-theme', 'light');
  }
}

/**
 * ----------------------------------------------------
 * MULTI-CURRENCY SUPPORT SYSTEM
 * ----------------------------------------------------
 */
function formatCurrency(val, includeSymbol = true, decimals = 2) {
  const num = parseFloat(val) || 0;
  const locale = state.currencyType === 'inr' ? 'en-IN' : 'en-US';
  const symbol = state.currencySymbol;
  
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
  
  return includeSymbol ? `${symbol} ${formatted}` : formatted;
}

function updateAutoIdvLabel(val) {
  const num = parseInt(val) || 0;
  const label = document.getElementById('val-auto-idv');
  if (label) {
    label.innerText = formatCurrency(num, true, 0);
  }
}

function updateDropdownOptions() {
  const lifeSelect = document.getElementById('life-sum-assured');
  if (lifeSelect) {
    Array.from(lifeSelect.options).forEach(opt => {
      const val = parseFloat(opt.value);
      opt.innerText = formatCurrency(val, true, 0);
    });
  }

  const healthSelect = document.getElementById('health-coverage');
  if (healthSelect) {
    Array.from(healthSelect.options).forEach(opt => {
      const val = parseFloat(opt.value);
      opt.innerText = formatCurrency(val, true, 0);
    });
  }
}

function triggerActiveRecalculation() {
  if (state.activeTab === 'loan') {
    calculateLoanEMI();
  } else if (state.activeTab === 'compare') {
    compareLoans();
  } else if (state.activeTab === 'life') {
    calculateLifeInsurance();
  } else if (state.activeTab === 'health') {
    calculateHealthInsurance();
  } else if (state.activeTab === 'auto') {
    calculateAutoInsurance();
  }
}

function toggleCurrency() {
  const switchBtn = document.getElementById('currency-switch');
  const oldCurrency = state.currencyType;
  
  if (switchBtn.checked) {
    state.currencySymbol = '$';
    state.currencyType = 'usd';
  } else {
    state.currencySymbol = '₹';
    state.currencyType = 'inr';
  }

  // Update all currency-symbol label tags
  document.querySelectorAll('.currency-symbol').forEach(el => {
    el.innerText = state.currencySymbol;
  });

  // Re-format select option text labels
  updateDropdownOptions();

  // Convert and sync current dynamic badge sliders
  const loanInput = document.getElementById('loan-amount');
  const prepayInput = document.getElementById('prepay-monthly');
  const incomeInput = document.getElementById('monthly-income');
  const autoIdvInput = document.getElementById('auto-idv');

  let loanVal = parseFloat(loanInput.value);
  let prepayVal = parseFloat(prepayInput.value);
  let incomeVal = parseFloat(incomeInput.value);
  let autoIdvVal = autoIdvInput ? parseFloat(autoIdvInput.value) : 0;

  const rate = 80.0; // 1 USD = 80 INR standard conversion rate

  if (oldCurrency === 'inr' && state.currencyType === 'usd') {
    // Convert INR to USD
    loanVal = Math.round(loanVal / rate);
    prepayVal = Math.round(prepayVal / rate);
    incomeVal = Math.round(incomeVal / rate);
    if (autoIdvVal) autoIdvVal = Math.round(autoIdvVal / rate);
    
    // Scale slider limits for USD
    loanInput.min = 1000;
    loanInput.max = 200000;
    loanInput.step = 1000;
    
    prepayInput.min = 0;
    prepayInput.max = 5000;
    prepayInput.step = 50;

    incomeInput.min = 100;
    incomeInput.max = 10000;
    incomeInput.step = 100;
    
    if (autoIdvInput) {
      autoIdvInput.min = 1000;
      autoIdvInput.max = 150000;
      autoIdvInput.step = 1000;
    }
  } else if (oldCurrency === 'usd' && state.currencyType === 'inr') {
    // Convert USD to INR
    loanVal = Math.round(loanVal * rate);
    prepayVal = Math.round(prepayVal * rate);
    incomeVal = Math.round(incomeVal * rate);
    if (autoIdvVal) autoIdvVal = Math.round(autoIdvVal * rate);
    
    // Scale slider limits for INR
    loanInput.min = 10000;
    loanInput.max = 10000000;
    loanInput.step = 10000;
    
    prepayInput.min = 0;
    prepayInput.max = 20000;
    prepayInput.step = 100;

    incomeInput.min = 5000;
    incomeInput.max = 500000;
    incomeInput.step = 5000;
    
    if (autoIdvInput) {
      autoIdvInput.min = 50000;
      autoIdvInput.max = 5000000;
      autoIdvInput.step = 10000;
    }
  }

  // Convert scheduled single prepayments
  state.singlePrepayments.forEach(item => {
    if (oldCurrency === 'inr' && state.currencyType === 'usd') {
      item.amount = Math.round(item.amount / rate);
    } else if (oldCurrency === 'usd' && state.currencyType === 'inr') {
      item.amount = Math.round(item.amount * rate);
    }
  });

  updateLoanValue(loanVal);
  updatePrepayMonthly(prepayVal);
  updateIncomeValue(incomeVal);
  if (autoIdvInput) {
    updateAutoIdvLabel(autoIdvVal);
    autoIdvInput.value = autoIdvVal;
  }

  // Sync scheduled single prepayments list
  renderSinglePrepayments();

  // Sync saved history cards
  if (state.user && state.activeHistory) {
    renderHistoryFeed(state.activeHistory);
  }

  // Live refresh active recalculation metrics
  triggerActiveRecalculation();
}

function switchTab(tabName) {
  state.activeTab = tabName;

  // Toggle active class on nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`nav-${tabName}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Toggle active class on views
  document.querySelectorAll('.view-section').forEach(view => {
    view.classList.remove('active');
  });

  let activeViewId = '';
  switch (tabName) {
    case 'loan': activeViewId = 'view-loan-calculator'; break;
    case 'compare': activeViewId = 'view-loan-comparison'; break;
    case 'history': activeViewId = 'view-user-history'; break;
    case 'life': activeViewId = 'view-life-insurance'; break;
    case 'health': activeViewId = 'view-health-insurance'; break;
    case 'auto': activeViewId = 'view-auto-insurance'; break;
    case 'admin': activeViewId = 'view-admin-dashboard'; break;
  }
  
  const activeView = document.getElementById(activeViewId);
  if (activeView) activeView.classList.add('active');

  // Update headers
  const meta = viewMetadata[tabName];
  if (meta) {
    document.getElementById('view-title').innerText = meta.title;
    document.getElementById('view-description').innerText = meta.description;
  }
  if (langState.current !== 'en') {
    updateLanguageHeaders();
  }

  // Pre-calculate or perform layout adjustment if switching tabs
  if (tabName === 'life') {
    calculateLifeInsurance();
  } else if (tabName === 'health') {
    calculateHealthInsurance();
  } else if (tabName === 'auto') {
    calculateAutoInsurance();
  } else if (tabName === 'history') {
    fetchUserHistory();
  } else if (tabName === 'admin') {
    fetchAdminData();
  }
}

/**
 * ----------------------------------------------------
 * SLIDER SYNC AND INPUTS
 * ----------------------------------------------------
 */
function updateLoanValue(val) {
  const num = parseFloat(val) || 0;
  document.getElementById('loan-amount').value = num;
  document.getElementById('loan-amount-input').value = num;
  document.getElementById('val-loan-amount-badge').innerText = formatCurrency(num, true, 0);
  
  if (state.activeTab === 'loan') {
    calculateLoanEMI();
  }
}

function updateInterestValue(val) {
  const num = parseFloat(val) || 0;
  document.getElementById('interest-rate').value = num;
  document.getElementById('interest-rate-input').value = num;
  document.getElementById('val-interest-badge').innerText = num.toFixed(2) + ' %';
  
  if (state.activeTab === 'loan') {
    calculateLoanEMI();
  }
}

function updateTenureValue(val) {
  const num = parseInt(val) || 0;
  document.getElementById('tenure').value = num;
  document.getElementById('tenure-input').value = num;
  document.getElementById('tenure-unit-label').innerText = state.tenureUnit === 'years' ? 'Yrs' : 'Mths';
  
  sanitizePrepayments();
  
  if (state.activeTab === 'loan') {
    calculateLoanEMI();
  }
}

function updatePrepayMonthly(val) {
  const num = parseFloat(val) || 0;
  document.getElementById('prepay-monthly').value = num;
  document.getElementById('prepay-monthly-input').value = num;
  document.getElementById('val-prepay-monthly-badge').innerText = formatCurrency(num, true, 0);
  
  if (state.activeTab === 'loan') {
    calculateLoanEMI();
  }
}

function updateIncomeValue(val) {
  const num = parseFloat(val) || 0;
  document.getElementById('monthly-income').value = num;
  document.getElementById('monthly-income-input').value = num;
  document.getElementById('val-income-badge').innerText = formatCurrency(num, true, 0);
  
  if (state.activeTab === 'loan') {
    calculateLoanEMI();
  }
}

// FICO Credit Score dynamics linking to Interest Rates (Realistic Touch)
function updateCreditScore(val) {
  const score = parseInt(val) || 750;
  document.getElementById('credit-score').value = score;
  document.getElementById('credit-score-input').value = score;

  const badge = document.getElementById('val-credit-badge');
  badge.className = 'badge score-badge'; // reset classes

  let rating = '';
  let targetInterest = 8.5; // baseline rate at 670 - 739 "Good"

  if (score >= 800) {
    rating = 'Excellent';
    targetInterest = 6.25; // Optimum discount (-2.25%)
    badge.classList.add('excellent');
  } else if (score >= 740) {
    rating = 'Very Good';
    targetInterest = 7.15; // Discount (-1.35%)
    badge.classList.add('excellent');
  } else if (score >= 670) {
    rating = 'Good';
    targetInterest = 8.50; // Standard base rate
    badge.classList.add('good');
  } else if (score >= 580) {
    rating = 'Fair';
    targetInterest = 10.75; // Markup (+2.25%)
    badge.classList.add('fair');
  } else {
    rating = 'Poor';
    targetInterest = 13.95; // High-risk markup (+5.45%)
    badge.classList.add('poor');
  }

  badge.innerText = `${score} (${rating})`;
  updateInterestValue(targetInterest);
  
  // Live recalculate standard loan parameters on FICO slider drag
  if (state.activeTab === 'loan') {
    calculateLoanEMI();
  }
}

function changeTenureUnit(unit) {
  state.tenureUnit = unit;
  
  const yrsBtn = document.getElementById('unit-years');
  const mthsBtn = document.getElementById('unit-months');
  const slider = document.getElementById('tenure');

  if (unit === 'years') {
    yrsBtn.classList.add('active');
    mthsBtn.classList.remove('active');
    slider.min = 1;
    slider.max = 30;
    slider.value = Math.round(slider.value / 12) || 15;
  } else {
    yrsBtn.classList.remove('active');
    mthsBtn.classList.add('active');
    slider.min = 12;
    slider.max = 360;
    slider.value = slider.value * 12 || 180;
  }

  updateTenureValue(slider.value);
  calculateLoanEMI();
}

function togglePrepayCollapse() {
  const wrapper = document.getElementById('prepay-fields-wrapper');
  const chevron = document.getElementById('prepay-chevron');
  if (wrapper.classList.contains('collapsed')) {
    wrapper.classList.remove('collapsed');
    chevron.style.transform = 'rotate(180deg)';
  } else {
    wrapper.classList.add('collapsed');
    chevron.style.transform = 'rotate(0deg)';
  }
}

/**
 * ----------------------------------------------------
 * SINGLE PREPAYMENTS ACCORDION
 * ----------------------------------------------------
 */
function addSinglePrepayment() {
  const monthInput = document.getElementById('single-prepay-month');
  const amountInput = document.getElementById('single-prepay-amount');

  const month = parseInt(monthInput.value);
  const amount = parseFloat(amountInput.value);

  if (isNaN(month) || month <= 0 || isNaN(amount) || amount <= 0) {
    alert("Please enter a valid Month Number and Prepayment Amount.");
    return;
  }

  // Get dynamic max tenure in months
  const tenureVal = parseFloat(document.getElementById('tenure').value);
  const maxMonths = state.tenureUnit === 'years' ? Math.round(tenureVal * 12) : Math.round(tenureVal);

  if (month > maxMonths) {
    alert(`Prepayment month cannot exceed the active loan tenure of ${maxMonths} months.`);
    return;
  }

  // Check if prepayment for this month already exists, and if so, merge them
  const existing = state.singlePrepayments.find(item => item.month === month);
  if (existing) {
    existing.amount += amount;
  } else {
    state.singlePrepayments.push({ month, amount });
  }

  // Sort single prepayments by month ascending
  state.singlePrepayments.sort((a, b) => a.month - b.month);

  monthInput.value = '';
  amountInput.value = '';

  renderSinglePrepayments();
  calculateLoanEMI();
}

function removeSinglePrepayment(index) {
  state.singlePrepayments.splice(index, 1);
  renderSinglePrepayments();
  calculateLoanEMI();
}

function renderSinglePrepayments() {
  const wrapper = document.getElementById('single-prepay-list-wrapper');
  const ul = document.getElementById('single-prepayments-ul');
  
  ul.innerHTML = '';
 
  if (state.singlePrepayments.length === 0) {
    wrapper.style.display = 'none';
    return;
  }
 
  wrapper.style.display = 'block';
  
  state.singlePrepayments.forEach((item, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>Month ${item.month}: <strong>${formatCurrency(item.amount, true, 0)}</strong></span>
      <button onclick="removeSinglePrepayment(${index})"><i class="fa-solid fa-trash"></i></button>
    `;
    ul.appendChild(li);
  });
}

function sanitizePrepayments() {
  const tenureVal = parseFloat(document.getElementById('tenure').value) || 0;
  const maxMonths = state.tenureUnit === 'years' ? Math.round(tenureVal * 12) : Math.round(tenureVal);

  const initialCount = state.singlePrepayments.length;
  state.singlePrepayments = state.singlePrepayments.filter(item => item.month <= maxMonths);

  if (state.singlePrepayments.length !== initialCount) {
    renderSinglePrepayments();
  }
}

/**
 * ----------------------------------------------------
 * CORE API CALLS
 * ----------------------------------------------------
 */
async function fetchPost(url, data) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData.error || 'Request failed.');
    }
    return resData;
  } catch (error) {
    console.error('API Error:', error);
    showErrorBanner(error.message);
    return null;
  }
}

function showLoader(show, text = 'Retrieving Live Calculations...') {
  const loader = document.getElementById('global-loader');
  const loaderText = document.getElementById('loader-text');
  loaderText.innerText = text;
  if (show) loader.classList.remove('hidden');
  else loader.classList.add('hidden');
}

/**
 * ----------------------------------------------------
 * CALCULATION HISTORY PERSISTENCE
 * ----------------------------------------------------
 */
async function saveCalculation(calcType) {
  if (!state.user) {
    alert("You must be signed in to save history calculations.");
    return;
  }

  let payload = {
    userId: state.user.user_id,
    calcType: calcType
  };

  if (calcType === 'loan') {
    if (!state.lastCalculationResult) {
      alert("No active EMI calculation to save. Compute first.");
      return;
    }
    
    payload.loanAmount = parseFloat(document.getElementById('loan-amount').value);
    payload.interestRate = parseFloat(document.getElementById('interest-rate').value);
    payload.tenure = parseFloat(document.getElementById('tenure').value);
    payload.emi = state.lastCalculationResult.standard.emi;
  } else {
    // Insurance
    let priceEl = null;
    let coverVal = 0;
    let termVal = 0;
    let nameVal = '';

    if (calcType === 'life') {
      priceEl = document.getElementById('life-premium-annual');
      coverVal = parseFloat(document.getElementById('life-sum-assured').value);
      termVal = parseFloat(document.getElementById('life-tenure').value);
      nameVal = "Term Life Insurance";
    } else if (calcType === 'health') {
      priceEl = document.getElementById('health-premium-annual');
      coverVal = parseFloat(document.getElementById('health-coverage').value);
      termVal = parseFloat(document.getElementById('health-age').value);
      nameVal = "Health Insurance";
    } else if (calcType === 'auto') {
      priceEl = document.getElementById('auto-premium-annual');
      coverVal = parseFloat(document.getElementById('auto-idv').value);
      termVal = parseFloat(document.getElementById('auto-vehicle-age').value);
      nameVal = document.getElementById('auto-policy-type').value === 'comprehensive' ? "Comprehensive Auto" : "Third Party Auto";
    }

    const cleanPrice = parseFloat(priceEl.innerText.replace(/[^\d.]/g, ''));
    if (!priceEl || isNaN(cleanPrice) || cleanPrice === 0) {
      alert("Please calculate premium before saving.");
      return;
    }

    payload.coverageAmount = coverVal;
    payload.premium = cleanPrice;
    payload.duration = termVal;
    payload.insuranceType = nameVal;
  }

  showLoader(true, "Saving to Profile...");
  const res = await fetchPost('/api/history/save', payload);
  showLoader(false);

  if (res) {
    alert("Calculation saved to profile history successfully!");
    if (state.activeTab === 'history') {
      fetchUserHistory();
    }
  }
}

async function fetchUserHistory() {
  if (!state.user) return;

  const res = await fetchPost('/api/history/list', { userId: state.user.user_id });
  if (res) {
    state.activeHistory = res;
    renderHistoryFeed(res);
  }
}

function renderHistoryFeed(data) {
  const loansFeed = document.getElementById('history-loans-feed');
  const insFeed = document.getElementById('history-insurance-feed');

  loansFeed.innerHTML = '';
  insFeed.innerHTML = '';

  // Render Saved Loans
  if (data.loans && data.loans.length > 0) {
    data.loans.forEach(rec => {
      const div = document.createElement('div');
      div.className = 'history-card';
      div.innerHTML = `
        <div class="history-details">
          <h4>${formatCurrency(rec.loan_amount, true, 0)} @ ${rec.interest_rate}%</h4>
          <span class="h-metric">Tenure: <strong>${rec.tenure} Yrs</strong> | Monthly EMI: <strong>${formatCurrency(rec.emi, true, 2)}</strong></span>
          <span class="h-date"><i class="fa-regular fa-clock"></i> Saved: ${rec.timestamp}</span>
        </div>
        <div class="history-restore-action"><i class="fa-solid fa-square-arrow-up-right"></i></div>
      `;
      
      div.onclick = () => {
        switchTab('loan');
        updateLoanValue(rec.loan_amount);
        updateInterestValue(rec.interest_rate);
        updateTenureValue(rec.tenure);
        changeTenureUnit('years');
        calculateLoanEMI();
      };
      loansFeed.appendChild(div);
    });
  } else {
    loansFeed.innerHTML = '<p class="empty-feed">No saved loan calculations.</p>';
  }

  // Render Saved Insurance
  if (data.insurance && data.insurance.length > 0) {
    data.insurance.forEach(rec => {
      const div = document.createElement('div');
      div.className = 'history-card';
      div.innerHTML = `
        <div class="history-details">
          <h4>${rec.insurance_type}</h4>
          <span class="h-metric">Coverage: <strong>${formatCurrency(rec.coverage_amount, true, 0)}</strong> | Premium: <strong>${formatCurrency(rec.premium, true, 2)}/yr</strong></span>
          <span class="h-date"><i class="fa-regular fa-clock"></i> Saved: ${rec.timestamp}</span>
        </div>
        <div class="history-restore-action"><i class="fa-solid fa-square-arrow-up-right"></i></div>
      `;
      
      div.onclick = () => {
        if (rec.insurance_type.includes("Life")) {
          switchTab('life');
          document.getElementById('life-sum-assured').value = rec.coverage_amount;
          document.getElementById('life-age').value = 30;
          document.getElementById('life-tenure').value = rec.duration;
          document.getElementById('val-life-tenure').innerText = rec.duration + ' Years';
          calculateLifeInsurance();
        } else if (rec.insurance_type.includes("Health")) {
          switchTab('health');
          document.getElementById('health-coverage').value = rec.coverage_amount;
          document.getElementById('health-age').value = rec.duration;
          calculateHealthInsurance();
        } else {
          switchTab('auto');
          document.getElementById('auto-idv').value = rec.coverage_amount;
          document.getElementById('auto-vehicle-age').value = rec.duration;
          updateAutoIdvLabel(rec.coverage_amount);
          document.getElementById('val-auto-age').innerText = rec.duration + ' Years';
          calculateAutoInsurance();
        }
      };
      insFeed.appendChild(div);
    });
  } else {
    insFeed.innerHTML = '<p class="empty-feed">No saved insurance plans.</p>';
  }
}

/**
 * ----------------------------------------------------
 * USER AUTH FLOW (REGISTRATION & LOGIN)
 * ----------------------------------------------------
 */
function openAuthModal() {
  document.getElementById('auth-modal').classList.remove('hidden');
  switchModalAuthTab('signin');
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
  hideErrorBanner();
}

function switchModalAuthTab(tab) {
  state.modalAuthTab = tab;
  
  const signinBtn = document.getElementById('modal-tab-signin');
  const signupBtn = document.getElementById('modal-tab-signup');
  const signinForm = document.getElementById('signin-form');
  const signupForm = document.getElementById('signup-form');

  hideErrorBanner();

  if (tab === 'signin') {
    signinBtn.classList.add('active');
    signupBtn.classList.remove('active');
    signinForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
  } else {
    signinBtn.classList.remove('active');
    signupBtn.classList.add('active');
    signinForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
  }
}

function showErrorBanner(msg) {
  const banner = document.getElementById('auth-error-banner');
  const text = document.getElementById('auth-error-text');
  if (banner && text) {
    text.innerText = msg;
    banner.classList.remove('hidden');
  }
}

function hideErrorBanner() {
  const banner = document.getElementById('auth-error-banner');
  if (banner) banner.classList.add('hidden');
}

async function submitSignIn(event) {
  event.preventDefault();
  const email = document.getElementById('signin-email').value;
  const password = document.getElementById('signin-password').value;

  showLoader(true, "Signing in...");
  const res = await fetchPost('/api/auth/login', { email, password });
  showLoader(false);

  if (res) {
    state.user = res;
    localStorage.setItem('wealthwise_user', JSON.stringify(res));
    updateUserUI();
    closeAuthModal();
    
    document.getElementById('signin-email').value = '';
    document.getElementById('signin-password').value = '';
  }
}

async function submitSignUp(event) {
  event.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  showLoader(true, "Creating Profile...");
  const res = await fetchPost('/api/auth/register', { name, email, password });
  showLoader(false);

  if (res) {
    state.user = res;
    localStorage.setItem('wealthwise_user', JSON.stringify(res));
    updateUserUI();
    closeAuthModal();

    document.getElementById('signup-name').value = '';
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';
  }
}

function signOut() {
  state.user = null;
  localStorage.removeItem('wealthwise_user');
  updateUserUI();
  switchTab('loan');
}

function updateUserUI() {
  const displayName = document.getElementById('user-display-name');
  const displayRole = document.getElementById('user-display-role');
  const authMainBtn = document.getElementById('auth-main-btn');
  const logoutBtn = document.getElementById('logout-btn');
  
  const loanHelper = document.getElementById('loan-guest-helper');
  const lifeHelper = document.getElementById('life-guest-helper');
  const healthHelper = document.getElementById('health-guest-helper');
  const autoHelper = document.getElementById('auto-guest-helper');

  const saveLoan = document.getElementById('save-loan-history-btn');
  const saveLife = document.getElementById('save-life-history-btn');
  const saveHealth = document.getElementById('save-health-history-btn');
  const saveAuto = document.getElementById('save-auto-history-btn');

  const histUnauth = document.getElementById('history-unauth-wrapper');
  const histAuth = document.getElementById('history-auth-wrapper');

  if (state.user) {
    displayName.innerText = state.user.name;
    
    const isAdmin = state.user.email && state.user.email.toLowerCase().includes('admin');
    if (isAdmin) {
      displayRole.innerText = 'Admin Administrator';
      const adminNavGroup = document.getElementById('nav-group-admin');
      if (adminNavGroup) adminNavGroup.classList.remove('hidden');
    } else {
      displayRole.innerText = 'Registered User';
      const adminNavGroup = document.getElementById('nav-group-admin');
      if (adminNavGroup) adminNavGroup.classList.add('hidden');
    }

    authMainBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');

    loanHelper.classList.add('hidden');
    lifeHelper.classList.add('hidden');
    healthHelper.classList.add('hidden');
    autoHelper.classList.add('hidden');

    saveLoan.classList.remove('hidden');
    saveLife.classList.remove('hidden');
    saveHealth.classList.remove('hidden');
    saveAuto.classList.remove('hidden');

    histUnauth.classList.add('hidden');
    histAuth.classList.remove('hidden');
    
    fetchUserHistory();
  } else {
    displayName.innerText = 'Guest User';
    displayRole.innerText = 'Limited Access';
    authMainBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');

    const adminNavGroup = document.getElementById('nav-group-admin');
    if (adminNavGroup) adminNavGroup.classList.add('hidden');

    loanHelper.classList.remove('hidden');
    lifeHelper.classList.remove('hidden');
    healthHelper.classList.remove('hidden');
    autoHelper.classList.remove('hidden');

    saveLoan.classList.add('hidden');
    saveLife.classList.add('hidden');
    saveHealth.classList.add('hidden');
    saveAuto.classList.add('hidden');

    histUnauth.classList.remove('hidden');
    histAuth.classList.add('hidden');
  }
}

/**
 * ----------------------------------------------------
 * LOAN EMI CALCULATIONS
 * ----------------------------------------------------
 */
async function calculateLoanEMI() {
  const principal = parseFloat(document.getElementById('loan-amount').value);
  const interestRate = parseFloat(document.getElementById('interest-rate').value);
  const tenure = parseFloat(document.getElementById('tenure').value);
  const recurringPrepay = parseFloat(document.getElementById('prepay-monthly').value) || 0;

  showLoader(true);

  const payload = {
    principal,
    interestRate,
    tenure,
    tenureType: state.tenureUnit,
    prepayments: {
      recurringMonthly: recurringPrepay,
      single: state.singlePrepayments
    }
  };

  const result = await fetchPost('/api/calculate-emi', payload);
  showLoader(false);

  if (!result) return;

  state.lastCalculationResult = result;
  displayLoanResults(result);
  fetchSmartBankRecommendations();
}

function displayLoanResults(data) {
  const prepayActive = data.prepayment.totalPrepaymentsMade > 0 || parseFloat(document.getElementById('prepay-monthly').value) > 0;
  
  document.getElementById('res-emi').innerText = formatCurrency(data.standard.emi, true, 2);
  
  if (prepayActive) {
    document.getElementById('res-interest').innerText = formatCurrency(data.prepayment.totalInterest, true, 2);
    document.getElementById('res-total').innerText = formatCurrency(data.prepayment.totalPayment, true, 2);

    const savingsBox = document.getElementById('savings-box');
    savingsBox.classList.remove('hidden');
    
    document.getElementById('save-tenure').innerText = `${data.prepayment.tenureMonths} months`;
    document.getElementById('save-orig-tenure').innerText = `${data.standard.tenureMonths} months`;
    document.getElementById('save-months-saved').innerText = `${data.prepayment.monthsSaved} months (${data.prepayment.yearsSaved} yrs)`;
    document.getElementById('save-interest-value').innerText = formatCurrency(data.prepayment.interestSaved, true, 2);
  } else {
    document.getElementById('res-interest').innerText = formatCurrency(data.standard.totalInterest, true, 2);
    document.getElementById('res-total').innerText = formatCurrency(data.standard.totalPayment, true, 2);
    
    document.getElementById('savings-box').classList.add('hidden');
  }

  drawLoanPieChart(data, prepayActive);
  renderAmortizationSchedule(data, prepayActive);
  updateDTIDiagnostics(data.standard.emi);
}

function updateDTIDiagnostics(emi) {
  const incomeInput = document.getElementById('monthly-income');
  if (!incomeInput) return;
  const income = parseFloat(incomeInput.value) || 1;
  const dti = (emi / income) * 100;
  
  document.getElementById('res-dti-ratio').innerText = dti.toFixed(1) + "%";
  
  const dtiStatus = document.getElementById('res-dti-status');
  const dtiProgress = document.getElementById('res-dti-progress');
  const dtiFeedback = document.getElementById('res-dti-feedback');
  
  dtiStatus.className = 'badge'; // reset
  
  if (dti < 20.0) {
    dtiStatus.innerText = "Safe (Low Risk)";
    dtiStatus.classList.add('excellent');
    dtiProgress.style.width = Math.min(dti, 100) + "%";
    dtiProgress.style.background = "var(--success)";
    dtiFeedback.innerText = "Your loan payment is highly affordable. You are inside the low-risk zone, leaving you with healthy monthly cash flow.";
  } else if (dti <= 36.0) {
    dtiStatus.innerText = "Manageable (Good)";
    dtiStatus.classList.add('good');
    dtiProgress.style.width = Math.min(dti, 100) + "%";
    dtiProgress.style.background = "var(--info)";
    dtiFeedback.innerText = "This is standard and manageable. Most financial lenders approve this moderate-risk zone easily.";
  } else if (dti <= 50.0) {
    dtiStatus.innerText = "Warning (High Risk)";
    dtiStatus.classList.add('fair');
    dtiProgress.style.width = Math.min(dti, 100) + "%";
    dtiProgress.style.background = "var(--warning)";
    dtiFeedback.innerText = "Warning: High debt load. This stretch limit will restrict your monthly cash flow. Prepayment is highly recommended to deleverage.";
  } else {
    dtiStatus.innerText = "Critical (Overleveraged)";
    dtiStatus.classList.add('poor');
    dtiProgress.style.width = "100%";
    dtiProgress.style.background = "var(--accent)";
    dtiFeedback.innerText = "Critical: Overleveraged! More than half of your income is allocated to this single loan. Consider shortening the amount or extending tenure.";
  }
}

function drawLoanPieChart(data, prepayActive) {
  const canvas = document.getElementById('loan-pie-chart');
  
  if (state.chartInstance) {
    state.chartInstance.destroy();
  }

  const interest = prepayActive ? data.prepayment.totalInterest : data.standard.totalInterest;
  const principal = data.standard.totalPayment - data.standard.totalInterest;

  const colors = getComputedStyle(document.documentElement);
  const primaryColor = colors.getPropertyValue('--primary').trim() || '#6366f1';
  const successColor = colors.getPropertyValue('--success').trim() || '#10b981';

  state.chartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Principal Amount', 'Total Interest'],
      datasets: [{
        data: [principal, interest],
        backgroundColor: [primaryColor, successColor],
        borderWidth: 2,
        borderColor: colors.getPropertyValue('--border-color').trim() || 'rgba(255,255,255,0.08)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: colors.getPropertyValue('--text-main').trim() || '#f1f5f9',
            font: { family: 'Plus Jakarta Sans', size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              return ` ${label}: ${formatCurrency(value, true, 0)}`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });
}

function changeAmortView(view) {
  state.amortView = view;
  const yearlyBtn = document.getElementById('amort-yearly');
  const monthlyBtn = document.getElementById('amort-monthly');

  if (view === 'yearly') {
    yearlyBtn.classList.add('active');
    monthlyBtn.classList.remove('active');
  } else {
    yearlyBtn.classList.remove('active');
    monthlyBtn.classList.add('active');
  }

  if (state.lastCalculationResult) {
    const prepayActive = state.lastCalculationResult.prepayment.totalPrepaymentsMade > 0 || parseFloat(document.getElementById('prepay-monthly').value) > 0;
    renderAmortizationSchedule(state.lastCalculationResult, prepayActive);
  }
}

function renderAmortizationSchedule(data, prepayActive) {
  const tbody = document.getElementById('amortization-tbody');
  const headRow = document.getElementById('table-head-row');
  tbody.innerHTML = '';

  const schedule = prepayActive ? data.prepayment : data.standard;
  const isYearly = state.amortView === 'yearly';

  if (isYearly) {
    headRow.innerHTML = `
      <th>Year</th>
      <th>Annual Cumulative Paid</th>
      <th>Principal Paid</th>
      <th>Interest Paid</th>
      <th>Ending Balance</th>
    `;
  } else {
    headRow.innerHTML = `
      <th>Month</th>
      <th>Monthly Installment</th>
      ${prepayActive ? '<th>Prepayment Made</th>' : ''}
      <th>Principal Component</th>
      <th>Interest Component</th>
      <th>Ending Balance</th>
    `;
  }

  const list = isYearly ? schedule.yearlySchedule : schedule.schedule;

  list.forEach(rec => {
    const tr = document.createElement('tr');
    
    if (isYearly) {
      tr.innerHTML = `
        <td>Year ${rec.year}</td>
        <td>${formatCurrency(rec.emi, true, 2)}</td>
        <td>${formatCurrency(rec.principalPaid, true, 2)}</td>
        <td>${formatCurrency(rec.interestPaid, true, 2)}</td>
        <td>${formatCurrency(rec.endingBalance, true, 2)}</td>
      `;
    } else {
      tr.innerHTML = `
        <td>Month ${rec.month}</td>
        <td>${formatCurrency(rec.emi, true, 2)}</td>
        ${prepayActive ? `<td>${formatCurrency(rec.extraPaid || 0, true, 2)}</td>` : ''}
        <td>${formatCurrency(rec.principalPaid, true, 2)}</td>
        <td>${formatCurrency(rec.interestPaid, true, 2)}</td>
        <td>${formatCurrency(rec.endingBalance, true, 2)}</td>
      `;
    }
    
    tbody.appendChild(tr);
  });
}

function exportCSV() {
  if (!state.lastCalculationResult) {
    alert("Please compute standard results before exporting.");
    return;
  }

  const prepayActive = state.lastCalculationResult.prepayment.totalPrepaymentsMade > 0 || parseFloat(document.getElementById('prepay-monthly').value) > 0;
  const schedule = prepayActive ? state.lastCalculationResult.prepayment : state.lastCalculationResult.standard;
  const isYearly = state.amortView === 'yearly';
  const list = isYearly ? schedule.yearlySchedule : schedule.schedule;

  let csvContent = "data:text/csv;charset=utf-8,";
  
  if (isYearly) {
    csvContent += "Year,Annual Cumulative Paid,Principal Paid,Interest Paid,Ending Balance\n";
    list.forEach(r => {
      csvContent += `${r.year},${r.emi},${r.principalPaid},${r.interestPaid},${r.endingBalance}\n`;
    });
  } else {
    csvContent += `Month,Monthly Installment,${prepayActive ? 'Prepayment Made,' : ''}Principal Component,Interest Component,Ending Balance\n`;
    list.forEach(r => {
      csvContent += `${r.month},${r.emi},${prepayActive ? (r.extraPaid || 0) + ',' : ''}${r.principalPaid},${r.interestPaid},${r.endingBalance}\n`;
    });
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Amortization_Schedule_${isYearly ? 'Yearly' : 'Monthly'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * ----------------------------------------------------
 * LOAN SIDE-BY-SIDE COMPARISON
 * ----------------------------------------------------
 */
async function compareLoans() {
  const pA = parseFloat(document.getElementById('comp-amount-a').value);
  const rA = parseFloat(document.getElementById('comp-rate-a').value);
  const tA = parseFloat(document.getElementById('comp-tenure-a').value);

  const pB = parseFloat(document.getElementById('comp-amount-b').value);
  const rB = parseFloat(document.getElementById('comp-rate-b').value);
  const tB = parseFloat(document.getElementById('comp-tenure-b').value);

  if (isNaN(pA) || pA <= 0 || isNaN(rA) || rA < 0 || isNaN(tA) || tA <= 0 ||
      isNaN(pB) || pB <= 0 || isNaN(rB) || rB < 0 || isNaN(tB) || tB <= 0) {
    alert("Please input positive loan values for both Scenario A and B.");
    return;
  }

  showLoader(true);

  const reqA = fetchPost('/api/calculate-emi', { principal: pA, interestRate: rA, tenure: tA, tenureType: 'years' });
  const reqB = fetchPost('/api/calculate-emi', { principal: pB, interestRate: rB, tenure: tB, tenureType: 'years' });

  const [resA, resB] = await Promise.all([reqA, reqB]);
  showLoader(false);

  if (!resA || !resB) return;

  document.getElementById('comparison-results-card').classList.remove('hidden');

  document.getElementById('comp-emi-a').innerText = formatCurrency(resA.standard.emi, true, 2);
  document.getElementById('comp-emi-b').innerText = formatCurrency(resB.standard.emi, true, 2);

  document.getElementById('comp-interest-a').innerText = formatCurrency(resA.standard.totalInterest, true, 2);
  document.getElementById('comp-interest-b').innerText = formatCurrency(resB.standard.totalInterest, true, 2);

  document.getElementById('comp-total-a').innerText = formatCurrency(resA.standard.totalPayment, true, 2);
  document.getElementById('comp-total-b').innerText = formatCurrency(resB.standard.totalPayment, true, 2);

  const recText = document.getElementById('comp-rec-text');
  const difference = Math.abs(resA.standard.totalPayment - resB.standard.totalPayment);

  if (resA.standard.totalPayment < resB.standard.totalPayment) {
    recText.innerHTML = `Scenario A is the more cost-effective option, saving you <strong>${formatCurrency(difference, true, 2)}</strong> in total outflow!`;
  } else if (resB.standard.totalPayment < resA.standard.totalPayment) {
    recText.innerHTML = `Scenario B is the more cost-effective option, saving you <strong>${formatCurrency(difference, true, 2)}</strong> in total outflow!`;
  } else {
    recText.innerHTML = `Scenario A and Scenario B are perfectly matched in total financial outflow!`;
  }
}

/**
 * ----------------------------------------------------
 * TERM LIFE INSURANCE
 * ----------------------------------------------------
 */
async function calculateLifeInsurance() {
  const sumAssured = parseFloat(document.getElementById('life-sum-assured').value);
  const age = parseInt(document.getElementById('life-age').value);
  const gender = document.getElementById('life-gender').value;
  
  const smokerRadios = document.getElementsByName('life-smoker');
  let smoker = false;
  for (let i = 0; i < smokerRadios.length; i++) {
    if (smokerRadios[i].checked && smokerRadios[i].value === 'yes') {
      smoker = true;
    }
  }

  const tenure = parseInt(document.getElementById('life-tenure').value);

  showLoader(true);
  const payload = {
    type: 'life',
    details: { sumAssured, age, gender, smoker, tenure }
  };

  const res = await fetchPost('/api/calculate-insurance', payload);
  showLoader(false);

  if (!res) return;

  document.getElementById('life-premium-annual').innerText = formatCurrency(res.annualPremium, true, 2);
  document.getElementById('life-premium-monthly').innerText = formatCurrency(res.monthlyPremium, true, 2);

  document.getElementById('life-bd-base').innerText = formatCurrency(res.breakdown.basePremium, true, 2);
  document.getElementById('life-bd-smoker').innerText = formatCurrency(res.breakdown.riskLoading, true, 2);
  
  const discountVal = res.breakdown.genderDiscount;
  document.getElementById('life-bd-gender').innerText = discountVal > 0 ? '- ' + formatCurrency(discountVal, true, 2) : formatCurrency(0, true, 2);
  document.getElementById('life-bd-taxes').innerText = formatCurrency(res.breakdown.taxes, true, 2);
}

/**
 * ----------------------------------------------------
 * COMPREHENSIVE HEALTH INSURANCE
 * ----------------------------------------------------
 */
function toggleSpouseAgeInput(include) {
  const wrapper = document.getElementById('health-spouse-age-wrapper');
  if (include) wrapper.classList.remove('hidden');
  else wrapper.classList.add('hidden');
}

async function calculateHealthInsurance() {
  const coverageAmount = parseFloat(document.getElementById('health-coverage').value);
  const age = parseInt(document.getElementById('health-age').value);
  const includeSpouse = document.getElementById('health-spouse').checked;
  const spouseAge = parseInt(document.getElementById('health-spouse-age').value);
  const childrenCount = parseInt(document.getElementById('health-kids').value);

  const preExistingConditions = [];
  document.querySelectorAll('.health-condition:checked').forEach(cb => {
    preExistingConditions.push(cb.value);
  });

  const riders = [];
  document.querySelectorAll('.health-rider:checked').forEach(cb => {
    riders.push(cb.value);
  });

  showLoader(true);
  const payload = {
    type: 'health',
    details: {
      coverageAmount, age, includeSpouse, spouseAge, childrenCount, preExistingConditions, riders
    }
  };

  const res = await fetchPost('/api/calculate-insurance', payload);
  showLoader(false);

  if (!res) return;

  document.getElementById('health-premium-annual').innerText = formatCurrency(res.annualPremium, true, 2);
  document.getElementById('health-premium-monthly').innerText = formatCurrency(res.monthlyPremium, true, 2);

  document.getElementById('health-bd-members').innerText = formatCurrency(res.breakdown.memberPremium, true, 2);
  document.getElementById('health-bd-loading').innerText = formatCurrency(res.breakdown.medicalLoading, true, 2);
  document.getElementById('health-bd-riders').innerText = formatCurrency(res.breakdown.ridersPremium, true, 2);
  document.getElementById('health-bd-taxes').innerText = formatCurrency(res.breakdown.taxes, true, 2);
}

/**
 * ----------------------------------------------------
 * AUTO INSURANCE PREMIUM
 * ----------------------------------------------------
 */
async function calculateAutoInsurance() {
  const vehicleValue = parseFloat(document.getElementById('auto-idv').value);
  const vehicleAge = parseFloat(document.getElementById('auto-vehicle-age').value);
  const engineCC = parseInt(document.getElementById('auto-engine-cc').value);
  const ncbPercent = parseFloat(document.getElementById('auto-ncb').value);
  const policyType = document.getElementById('auto-policy-type').value;

  showLoader(true);
  const payload = {
    type: 'auto',
    details: {
      vehicleValue, vehicleAge, engineCC, ncbPercent, policyType
    }
  };

  const res = await fetchPost('/api/calculate-insurance', payload);
  showLoader(false);

  if (!res) return;

  document.getElementById('auto-premium-annual').innerText = formatCurrency(res.annualPremium, true, 2);
  document.getElementById('auto-premium-monthly').innerText = formatCurrency(res.monthlyPremium, true, 2);

  document.getElementById('auto-bd-od').innerText = formatCurrency(res.breakdown.ownDamage, true, 2);
  document.getElementById('auto-bd-tp').innerText = formatCurrency(res.breakdown.thirdParty, true, 2);
  document.getElementById('auto-bd-taxes').innerText = formatCurrency(res.breakdown.taxes, true, 2);
}

/**
 * ----------------------------------------------------
 * ADMIN DASHBOARD CONTROLLER
 * ----------------------------------------------------
 */
async function fetchAdminData() {
  if (!state.user || !state.user.email.toLowerCase().includes('admin')) return;

  showLoader(true, "Fetching Admin Data...");
  const data = await fetchPost('/api/admin/data', { email: state.user.email });
  showLoader(false);

  if (data) {
    renderAdminConsole(data);
  }
}

function renderAdminConsole(data) {
  // Update Stats Cards
  document.getElementById('admin-stat-users').innerText = data.users.length;
  document.getElementById('admin-stat-loans').innerText = data.loans.length;
  document.getElementById('admin-stat-insurance').innerText = data.insurance.length;

  // Render Users Table
  const tbody = document.getElementById('admin-users-tbody');
  tbody.innerHTML = '';
  
  if (data.users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; font-style:italic;">No registered users in system.</td></tr>';
  } else {
    data.users.forEach(u => {
      const tr = document.createElement('tr');
      const userIsAdmin = u.email.toLowerCase().includes('admin');
      tr.innerHTML = `
        <td>${u.user_id}</td>
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td><span class="badge ${userIsAdmin ? 'excellent' : 'score-badge'}">${userIsAdmin ? 'SYSTEM ADMIN' : 'REGISTERED USER'}</span></td>
        <td style="text-align: center;">
          ${userIsAdmin ? '<em>No Actions Allowed</em>' : `<button class="btn btn-secondary btn-sm" onclick="adminDeleteUser(${u.user_id})" style="border-color:var(--accent); color:var(--accent); display:inline-block;"><i class="fa-solid fa-trash-can"></i> Terminate Account</button>`}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Render Loans Feed
  const loansFeed = document.getElementById('admin-loans-feed');
  loansFeed.innerHTML = '';
  if (data.loans.length === 0) {
    loansFeed.innerHTML = '<p class="empty-feed">No saved loan calculations.</p>';
  } else {
    data.loans.forEach(rec => {
      const div = document.createElement('div');
      div.className = 'history-card';
      div.style.cursor = 'default';
      div.innerHTML = `
        <div class="history-details">
          <h4>${formatCurrency(rec.loan_amount, true, 0)} @ ${rec.interest_rate}%</h4>
          <span class="h-metric">User ID: <strong>${rec.user_id}</strong> | EMI: <strong>${formatCurrency(rec.emi, true, 2)}</strong></span>
          <span class="h-date"><i class="fa-regular fa-clock"></i> Timestamp: ${rec.timestamp}</span>
        </div>
      `;
      loansFeed.appendChild(div);
    });
  }

  // Render Insurance Feed
  const insFeed = document.getElementById('admin-insurance-feed');
  insFeed.innerHTML = '';
  if (data.insurance.length === 0) {
    insFeed.innerHTML = '<p class="empty-feed">No saved insurance plans.</p>';
  } else {
    data.insurance.forEach(rec => {
      const div = document.createElement('div');
      div.className = 'history-card';
      div.style.cursor = 'default';
      div.innerHTML = `
        <div class="history-details">
          <h4>${rec.insurance_type}</h4>
          <span class="h-metric">User: <strong>${rec.user_id}</strong> | Cover: <strong>${formatCurrency(rec.coverage_amount, true, 0)}</strong> | Prem: <strong>${formatCurrency(rec.premium, true, 2)}/yr</strong></span>
          <span class="h-date"><i class="fa-regular fa-clock"></i> Timestamp: ${rec.timestamp}</span>
        </div>
      `;
      insFeed.appendChild(div);
    });
  }
}

async function adminDeleteUser(userId) {
  if (!state.user || !state.user.email.toLowerCase().includes('admin')) return;

  if (!confirm(`Are you absolutely sure you want to terminate User ID ${userId} and wipe all their history calculations? This action is permanent!`)) {
    return;
  }

  showLoader(true, "Terminating User Profile...");
  const res = await fetchPost('/api/admin/delete-user', {
    adminEmail: state.user.email,
    targetUserId: userId
  });
  showLoader(false);

  if (res && res.success) {
    alert("User profile and historical records deleted successfully.");
    fetchAdminData(); // Refresh Dashboard!
  } else {
    alert("Administrative profile deletion failed.");
  }
}

/**
 * ----------------------------------------------------
 * DOWNLOADABLE PDF REPORTS GENERATION
 * ----------------------------------------------------
 */
function downloadPDFReport() {
  if (!state.lastCalculationResult) {
    alert("Please calculate loan EMI values before generating a report.");
    return;
  }

  const data = state.lastCalculationResult;
  const prepayActive = data.prepayment.totalPrepaymentsMade > 0 || parseFloat(document.getElementById('prepay-monthly').value) > 0;
  const schedule = prepayActive ? data.prepayment : data.standard;

  const element = document.createElement('div');
  element.style.padding = '40px';
  element.style.color = '#0f172a';
  element.style.background = '#ffffff';
  element.style.fontFamily = 'Plus Jakarta Sans, sans-serif';

  element.innerHTML = `
    <div style="border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h1 style="margin: 0; font-family: Outfit, sans-serif; font-size: 28px; color: #4f46e5;">WealthWise Financial Suite</h1>
        <p style="margin: 5px 0 0 0; font-size: 13px; color: #475569;">Loan Repayment & Amortization Analytics Statement</p>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">Generated On:</span><br>
        <span style="font-size: 13px; font-weight: bold; color: #334155;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Loan Parameters</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Principal Sum (Loan Amount)</td>
          <td style="padding: 6px 0; font-size: 13px; font-weight: bold; text-align: right; color: #0f172a;">${formatCurrency(document.getElementById('loan-amount').value, true, 0)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Annual Percentage Rate (APR)</td>
          <td style="padding: 6px 0; font-size: 13px; font-weight: bold; text-align: right; color: #0f172a;">${document.getElementById('interest-rate').value}%</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Loan Tenure</td>
          <td style="padding: 6px 0; font-size: 13px; font-weight: bold; text-align: right; color: #0f172a;">${document.getElementById('tenure').value} ${state.tenureUnit === 'years' ? 'Years' : 'Months'}</td>
        </tr>
        ${prepayActive ? `
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Prepayment Plan</td>
          <td style="padding: 6px 0; font-size: 13px; font-weight: bold; text-align: right; color: #ea580c;">Active (${formatCurrency(document.getElementById('prepay-monthly').value, true, 0)}/mo)</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="display: flex; gap: 15px; margin-bottom: 40px; justify-content: space-between;">
      <div style="flex: 1; background: #eef2ff; border-left: 4px solid #4f46e5; border-radius: 4px; padding: 15px; text-align: center; box-sizing: border-box;">
        <span style="font-size: 11px; text-transform: uppercase; color: #4338ca; font-weight: bold;">Monthly Installment</span><br>
        <span style="font-size: 18px; font-weight: bold; color: #312e81; margin-top: 5px; display: inline-block;">${formatCurrency(data.standard.emi, true, 2)}</span>
      </div>
      <div style="flex: 1; background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px; padding: 15px; text-align: center; box-sizing: border-box;">
        <span style="font-size: 11px; text-transform: uppercase; color: #166534; font-weight: bold;">Total Interest</span><br>
        <span style="font-size: 18px; font-weight: bold; color: #14532d; margin-top: 5px; display: inline-block;">${formatCurrency(schedule.totalInterest, true, 2)}</span>
      </div>
      <div style="flex: 1; background: #ecfeff; border-left: 4px solid #0891b2; border-radius: 4px; padding: 15px; text-align: center; box-sizing: border-box;">
        <span style="font-size: 11px; text-transform: uppercase; color: #155e75; font-weight: bold;">Total Outflow</span><br>
        <span style="font-size: 18px; font-weight: bold; color: #164e63; margin-top: 5px; display: inline-block;">${formatCurrency(schedule.totalPayment, true, 2)}</span>
      </div>
    </div>

    ${prepayActive ? `
    <div style="background: #fffbeb; border: 1px solid #fef08a; border-radius: 6px; padding: 15px; margin-bottom: 30px;">
      <h4 style="margin:0 0 5px 0; color: #854d0e; font-size:14px;">Prepayment Plan Highlight</h4>
      <p style="margin:0; font-size:12px; color: #713f12; line-height: 1.5;">
        By paying off extra, you pay off the loan in <strong>${data.prepayment.tenureMonths} months</strong> instead of ${data.standard.tenureMonths} months.
        This saves you <strong>${data.prepayment.monthsSaved} months</strong> of debt and saves an absolute sum of <strong>${formatCurrency(data.prepayment.interestSaved, true, 2)}</strong> in interest fees!
      </p>
    </div>
    ` : ''}

    <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Amortization Schedule (${state.amortView === 'yearly' ? 'Yearly Summary' : 'Monthly Schedule'})</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
      <thead>
        <tr style="background: #f1f5f9; text-align: left; border-bottom: 2px solid #cbd5e1;">
          <th style="padding: 8px 10px; color: #475569;">Period</th>
          <th style="padding: 8px 10px; color: #475569;">Total Paid</th>
          ${prepayActive && state.amortView === 'monthly' ? '<th style="padding: 8px 10px; color: #475569;">Extra Paid</th>' : ''}
          <th style="padding: 8px 10px; color: #475569;">Principal Paid</th>
          <th style="padding: 8px 10px; color: #475569;">Interest Paid</th>
          <th style="padding: 8px 10px; color: #475569;">Ending Balance</th>
        </tr>
      </thead>
      <tbody>
        ${(state.amortView === 'yearly' ? schedule.yearlySchedule : schedule.schedule).slice(0, 120).map((r, idx) => `
          <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding: 8px 10px; font-weight: bold; color: #334155;">${state.amortView === 'yearly' ? 'Year ' + r.year : 'Month ' + r.month}</td>
            <td style="padding: 8px 10px; color: #0f172a;">${formatCurrency(r.emi, true, 2)}</td>
            ${prepayActive && state.amortView === 'monthly' ? `<td style="padding: 8px 10px; color: #ea580c; font-weight:bold;">${formatCurrency(r.extraPaid || 0, true, 2)}</td>` : ''}
            <td style="padding: 8px 10px; color: #0f172a;">${formatCurrency(r.principalPaid, true, 2)}</td>
            <td style="padding: 8px 10px; color: #475569;">${formatCurrency(r.interestPaid, true, 2)}</td>
            <td style="padding: 8px 10px; font-weight: bold; color: #0f172a;">${formatCurrency(r.endingBalance, true, 2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 10px; color: #94a3b8;">
      This report is dynamically calculated by the WealthWise Suite and is strictly compliant with standard reducing balance accounting methods.
    </div>
  `;

  const opt = {
    margin:       10,
    filename:     `Loan_EMI_Report_${state.currencyType.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  showLoader(true, "Compiling PDF Report...");
  html2pdf().from(element).set(opt).save().then(() => {
    showLoader(false);
  }).catch(err => {
    console.error("PDF Compilation Failed:", err);
    showLoader(false);
    alert("Report generation failed.");
  });
}

/* ==========================================================================
   FUTURE ENHANCEMENTS: MULTI-LANGUAGE, CHATBOT & BANK MATCHES
   ========================================================================== */
const langState = {
  current: 'en'
};

const dictionary = {
  en: {
    sidebar_loan: "Loan EMI",
    sidebar_compare: "Loan Compare",
    sidebar_history: "My History",
    sidebar_life: "Term Life",
    sidebar_health: "Health Care",
    sidebar_auto: "Auto Premium",
    sidebar_admin: "Admin Console",
    
    view_loan_title: "Adjust Loan Details",
    view_loan_desc: "Calculate monthly installments, analyze prepayment interest savings, and export schedules.",
    
    label_credit: "Your Credit Score",
    label_loan: "How much is your loan? (Principal)",
    label_interest: "Annual Interest Rate",
    label_tenure: "How long is the loan? (Tenure)",
    label_prepay: "Make Extra Payments (Pay off faster!)",
    label_prepay_monthly: "Add to your Monthly Payment",
    
    btn_calc: "Calculate EMI",
    btn_save: "Save to Profile",
    btn_pdf: "Download PDF",
    btn_csv: "Export CSV",
    
    rec_box_title: "Smart Bank Matches"
  },
  hi: {
    sidebar_loan: "ऋण ईएमआई",
    sidebar_compare: "ऋण तुलना",
    sidebar_history: "मेरा इतिहास",
    sidebar_life: "जीवन बीमा",
    sidebar_health: "स्वास्थ्य बीमा",
    sidebar_auto: "वाहन बीमा",
    sidebar_admin: "व्यवस्थापक कंसोल",
    
    view_loan_title: "ऋण विवरण समायोजित करें",
    view_loan_desc: "मासिक किश्तों की गणना करें, अतिरिक्त भुगतान ब्याज बचत का विश्लेषण करें, और अनुसूची निर्यात करें।",
    
    label_credit: "आपका क्रेडिट स्कोर",
    label_loan: "आपका ऋण कितना है? (मूलधन)",
    label_interest: "वार्षिक ब्याज दर",
    label_tenure: "ऋण कितने समय के लिए है? (अवधि)",
    label_prepay: "अतिरिक्त भुगतान करें (जल्दी भुगतान करें!)",
    label_prepay_monthly: "अपने मासिक भुगतान में जोड़ें",
    
    btn_calc: "ईएमआई गणना करें",
    btn_save: "प्रोफ़ाइल में सहेजें",
    btn_pdf: "पीडीएफ डाउनलोड",
    btn_csv: "सीएसवी निर्यात",
    
    rec_box_title: "स्मार्ट बैंक मैच"
  },
  es: {
    sidebar_loan: "EMI de Préstamo",
    sidebar_compare: "Comparar Préstamos",
    sidebar_history: "Mi Historial",
    sidebar_life: "Seguro de Vida",
    sidebar_health: "Atención Médica",
    sidebar_auto: "Seguro de Auto",
    sidebar_admin: "Consola de Administrador",
    
    view_loan_title: "Ajustar Detalles del Préstamo",
    view_loan_desc: "Calcule las cuotas mensuales, analice los ahorros de intereses por pagos anticipados y exporte cronogramas.",
    
    label_credit: "Su Puntaje de Crédito",
    label_loan: "¿Cuánto es su préstamo? (Principal)",
    label_interest: "Tasa de Interés Anual",
    label_tenure: "¿Cuánto dura el préstamo? (Plazo)",
    label_prepay: "Hacer Pagos Extras (¡Pague más rápido!)",
    label_prepay_monthly: "Añadir a su Pago Mensual",
    
    btn_calc: "Calcular EMI",
    btn_save: "Guardar en Perfil",
    btn_pdf: "Descargar PDF",
    btn_csv: "Exportar CSV",
    
    rec_box_title: "Coincidencias Bancarias Inteligentes"
  }
};

function changeLanguage(lang) {
  langState.current = lang;
  const dict = dictionary[lang];
  if (!dict) return;

  // Sidebar navigation elements
  document.querySelector('#nav-loan span').innerText = dict.sidebar_loan;
  document.querySelector('#nav-compare span').innerText = dict.sidebar_compare;
  document.querySelector('#nav-history span').innerText = dict.sidebar_history;
  document.querySelector('#nav-life span').innerText = dict.sidebar_life;
  document.querySelector('#nav-health span').innerText = dict.sidebar_health;
  document.querySelector('#nav-auto span').innerText = dict.sidebar_auto;
  const adminNav = document.querySelector('#nav-admin span');
  if (adminNav) adminNav.innerText = dict.sidebar_admin;

  // View headings inside active layout
  updateLanguageHeaders();

  // Input labels humanized
  const labelCredit = document.querySelector('label[for="credit-score"]');
  if (labelCredit) labelCredit.childNodes[0].textContent = dict.label_credit + " ";
  
  const labelLoan = document.querySelector('label[for="loan-amount"]');
  if (labelLoan) labelLoan.childNodes[0].textContent = dict.label_loan + " ";
  
  const labelInterest = document.querySelector('label[for="interest-rate"]');
  if (labelInterest) labelInterest.childNodes[0].textContent = dict.label_interest + " ";
  
  const labelTenure = document.querySelector('label[for="tenure"]');
  if (labelTenure) labelTenure.childNodes[0].textContent = dict.label_tenure + " ";

  const labelPrepay = document.querySelector('.prepayment-card h4 span');
  if (labelPrepay) labelPrepay.innerText = dict.label_prepay;

  const labelPrepayMonthly = document.querySelector('label[for="prepay-monthly"]');
  if (labelPrepayMonthly) labelPrepayMonthly.innerText = dict.label_prepay_monthly;

  // Action buttons
  const btnCalc = document.querySelector('button[onclick="calculateLoanEMI()"]');
  if (btnCalc) btnCalc.innerHTML = `<i class="fa-solid fa-calculator"></i> ${dict.btn_calc}`;
  
  const btnSave = document.getElementById('save-loan-history-btn');
  if (btnSave) btnSave.innerHTML = `<i class="fa-solid fa-bookmark"></i> ${dict.btn_save}`;

  const btnPDF = document.querySelector('button[onclick="downloadPDFReport()"]');
  if (btnPDF) btnPDF.innerHTML = `<i class="fa-solid fa-file-pdf text-danger"></i> ${dict.btn_pdf}`;

  const btnCSV = document.querySelector('button[onclick="exportCSV()"]');
  if (btnCSV) btnCSV.innerHTML = `<i class="fa-solid fa-download"></i> ${dict.btn_csv}`;

  // Smart matches title
  const matchTitle = document.querySelector('#recommendations-box h3');
  if (matchTitle) matchTitle.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles text-success"></i> ${dict.rec_box_title}`;

  // Trigger smooth fade animation transition
  const appMain = document.querySelector('.app-main');
  appMain.style.opacity = '0.3';
  setTimeout(() => {
    appMain.style.opacity = '1';
  }, 150);
}

function updateLanguageHeaders() {
  const dict = dictionary[langState.current];
  const titleEl = document.getElementById('view-title');
  const descEl = document.getElementById('view-description');
  
  if (state.activeTab === 'loan') {
    titleEl.innerText = dict.view_loan_title;
    descEl.innerText = dict.view_loan_desc;
  }
}

// Floating Chatbot ("Wealthy") Logic
function toggleChat() {
  const panel = document.getElementById('chatbot-panel-wrapper');
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    // Hide trigger badge
    const badge = document.querySelector('.chatbot-badge');
    if (badge) badge.style.display = 'none';
  } else {
    panel.classList.add('hidden');
  }
}

async function queryChatbotBackend(message) {
  try {
    const res = await fetch('/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    if (data) {
      if (data.reply) {
        return data.reply;
      } else if (data.fallback) {
        return getWealthyNLPReply(message);
      }
    }
  } catch (e) {
    console.error("Chatbot API failed:", e);
  }
  // Local fallback
  return getWealthyNLPReply(message);
}

function showChatbotTypingIndicator(show) {
  const container = document.getElementById('chatbot-messages');
  if (!container) return;
  let indicator = document.getElementById('chatbot-typing-indicator');
  
  if (show) {
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'chat-message bot-typing';
      indicator.id = 'chatbot-typing-indicator';
      indicator.innerHTML = '<span></span><span></span><span></span>';
      container.appendChild(indicator);
    }
    container.scrollTop = container.scrollHeight;
  } else {
    if (indicator) {
      indicator.remove();
    }
  }
}

async function submitChatMessage(event) {
  event.preventDefault();
  const input = document.getElementById('chatbot-input-field');
  const message = input.value.trim();
  if (!message) return;

  // Render user message
  renderChatMessage(message, 'user');
  input.value = '';

  // Show typing wave immediately
  showChatbotTypingIndicator(true);

  // Fire API call instantly
  const reply = await queryChatbotBackend(message);
  
  // Hide typing wave
  showChatbotTypingIndicator(false);
  
  // Render bot message
  renderChatMessage(reply, 'bot');
}

async function askChatbotSuggestion(q) {
  renderChatMessage(q, 'user');
  
  // Show typing wave immediately
  showChatbotTypingIndicator(true);

  // Fire API call instantly
  const reply = await queryChatbotBackend(q);
  
  // Hide typing wave
  showChatbotTypingIndicator(false);
  
  // Render bot message
  renderChatMessage(reply, 'bot');
}

function renderChatMessage(text, sender) {
  const container = document.getElementById('chatbot-messages');
  const div = document.createElement('div');
  div.className = `chat-message ${sender}`;
  div.innerHTML = `<p>${text}</p>`;
  container.appendChild(div);
  
  // Auto scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function getWealthyNLPReply(q) {
  const query = q.toLowerCase();
  
  if (query.includes('who are you') || query.includes('your name') || query.includes('introduce yourself')) {
    return "I am <strong>Wealthy</strong>, your personal financial assistant! I was custom-built by our developers to help you understand EMIs, compare loan products, analyze prepayment savings, and estimate insurance premiums in real time. Try asking me something like 'Explain Prepayments'!";
  }
  if (query.includes('what are you doing') || query.includes('what are you up to')) {
    return "I'm currently scanning live interest rates, analyzing payment schedules, and waiting to help you calculate your savings! Ask me anything about EMIs, prepayments, or insurance plans.";
  }
  if (query.includes('how are you') || query.includes('how\'s it going')) {
    return "I'm doing fantastic, thank you! I'm fully charged and ready to model some exciting financial scenarios with you. How is your day going, and how can I help you save money today?";
  }
  if (query.includes('thank you') || query.includes('thanks') || query.includes('cool') || query.includes('awesome')) {
    return "You are very welcome! It is my absolute pleasure to help you optimize your finances and secure a debt-free future. Let me know if you need any other calculations!";
  }
  if (query.includes('bye') || query.includes('goodbye') || query.includes('exit')) {
    return "Goodbye! Have a wonderful day, and remember—paying even a tiny bit extra on your principal balance works wonders in saving long-term interest! Feel free to chat with me anytime you need financial advice.";
  }
  if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
    return "Hello! I am Wealthy, your personal financial advisor. Ask me anything about payments, prepayments, or interest rates!";
  }
  if (query.includes('best bank') || query.includes('rates') || query.includes('interest') || query.includes('loan') || query.includes('mortgage') || query.includes('borrow')) {
    const currency = state.currencyType === 'inr' ? 'Rupees' : 'Dollars';
    const rateText = state.currencyType === 'inr' 
      ? "HDFC Bank offers 8.10% (Excellent credit profile), ICICI Bank offers 8.15%, State Bank of India (SBI) offers 8.25%, and Axis Bank offers 8.30%. Check out our 'Smart Bank Matches' panel on the right side of your workspace to import any of these rates directly!"
      : "Chase Bank offers 6.05% (Excellent credit profile), Bank of America offers 6.15%, Wells Fargo offers 6.25%, and Citibank Premium offers 6.35%. Click 'Import Rate' on the right-hand panel to instantly sync your calculation sliders!";
    
    let loanTypePrefix = "";
    if (query.includes('education')) {
      loanTypePrefix = "Education loans are standard reducing-balance plans. ";
    } else if (query.includes('home') || query.includes('house')) {
      loanTypePrefix = "Home mortgages are excellent candidates for monthly prepayments. ";
    } else if (query.includes('car') || query.includes('auto')) {
      loanTypePrefix = "Car loans can be modeled easily using our sliders. ";
    }
    
    return `${loanTypePrefix}Currently in ${currency} mode: ${rateText} You can customize your exact principal and tenure parameters on the left slider panel to model this scenario in real time!`;
  }
  if (query.includes('insurance') || query.includes('premium') || query.includes('life') || query.includes('health') || query.includes('auto') || query.includes('medical') || query.includes('cover')) {
    return "WealthWise has a comprehensive Insurance Suite! Select 'Term Life', 'Health Care', or 'Auto Premium' from the left sidebar navigation to estimate exact yearly and monthly premium rates based on risk factors, lifestyle choices, or vehicle values instantly.";
  }
  if (query.includes('prepay') || query.includes('extra payment') || query.includes('save money')) {
    return "Prepayments are amazing! By paying a little extra each month (or making a single one-time part-payment), you pay off your principal balance faster. This prevents compound interest from accumulating, saving you thousands of dollars/rupees in interest fees and wiping months off your loan tenure!";
  }
  if (query.includes('fico') || query.includes('credit score')) {
    return "Your credit score is a rating of creditworthiness. WealthWise automatically links your score to interest rates: an Excellent score unlocks our premium low rates, saving you an absolute fortune in interest payments over the loan's lifetime!";
  }
  if (query.includes('emi') || query.includes('how to calculate')) {
    return "EMI stands for Equated Monthly Installment. It consists of a principal component and an interest component. We calculate it using the standard reducing-balance method, which allocates your payments proportionally to pay off your outstanding balance.";
  }
  if (query.includes('tip') || query.includes('financial advice')) {
    const tips = [
      "Financial Tip 💡: Always aim to pay even 10% extra on your monthly EMI. This can wipe 2 to 3 years off a 15-year mortgage!",
      "Financial Tip 💡: Keep your credit score high. It earns you the best loan rates, saving you thousands of dollars over time.",
      "Financial Tip 💡: Comprehensive insurance protects you from massive cash outflows during emergencies. Shop for cashless hospital networks!",
      "Financial Tip 💡: Shortening your tenure (e.g. from 30 to 15 years) dramatically reduces your total interest payment outlay!"
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }
  
  return "I understand your inquiry. That's a great financial question! To model this scenario, try adjusting the parameters on the left slider panel, and WealthWise will calculate your custom monthly installments in real time.";
}

// Live Recommendations Matches
async function fetchSmartBankRecommendations() {
  const creditScore = parseInt(document.getElementById('credit-score').value);
  const currency = state.currencyType;

  // Fetch bank products matching FICO rating
  const data = await fetchPost('/api/bank-rates', { currency, creditScore });
  if (!data) return;

  const container = document.getElementById('recommendations-list');
  if (!container) return;

  container.innerHTML = '';
  
  data.forEach(bank => {
    const card = document.createElement('div');
    card.className = 'bank-card animate-scale';
    card.innerHTML = `
      <div class="bank-logo-box">
        <i class="fa-solid ${bank.logoIcon}"></i>
      </div>
      <div class="bank-info">
        <h4>${bank.name}</h4>
        <p>${bank.benefitTag}</p>
      </div>
      <div class="bank-action">
        <span class="bank-rate-badge">${bank.interestRate.toFixed(2)}% APR</span>
        <button class="bank-import-btn" onclick="importBankRate(${bank.interestRate})">Import Rate</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function importBankRate(rate) {
  // Update interest rate input and trigger calculation
  updateInterestValue(rate);
  calculateLoanEMI();
  
  // Show clean success toast alert
  alert(`HDFC/Chase Smart Bank rate of ${rate.toFixed(2)}% imported successfully!`);
}

