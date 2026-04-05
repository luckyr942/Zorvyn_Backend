/* ╔══════════════════════════════════════════════════════════════════╗
   ║  Zovyrn Finance Dashboard — Application Logic                  ║
   ╚══════════════════════════════════════════════════════════════════╝ */

const API = '';

// ─── State ──────────────────────────────────────────────────────────────────
let state = {
  token: localStorage.getItem('zovyrn_token'),
  user: JSON.parse(localStorage.getItem('zovyrn_user') || 'null'),
  currentPage: 'dashboard',
  recordsPage: 1,
  recordsLimit: 15,
  editingRecordId: null,
  trendsChart: null,
  categoryChart: null,
};

// ─── API Helper ─────────────────────────────────────────────────────────────
async function api(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json();

  if (!res.ok) {
    const msg = data?.error?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// ─── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (state.token && state.user) {
    showApp();
  } else {
    showLogin();
  }
  bindEvents();
});

// ─── Event Bindings ─────────────────────────────────────────────────────────
function bindEvents() {
  // Login
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.querySelectorAll('.demo-card').forEach(card => {
    card.addEventListener('click', () => {
      document.getElementById('login-email').value = card.dataset.email;
      document.getElementById('login-password').value = card.dataset.password;
    });
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  // Mobile menu
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Filters
  document.getElementById('apply-filters').addEventListener('click', () => { state.recordsPage = 1; loadRecords(); });
  document.getElementById('clear-filters').addEventListener('click', clearFilters);

  // Record modal
  document.getElementById('create-record-btn').addEventListener('click', () => openRecordModal());
  document.getElementById('close-record-modal').addEventListener('click', closeRecordModal);
  document.getElementById('cancel-record-modal').addEventListener('click', closeRecordModal);
  document.getElementById('record-form').addEventListener('submit', handleSaveRecord);
  document.getElementById('record-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeRecordModal();
  });
}

// ─── Auth ───────────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');

  btn.disabled = true;
  btn.querySelector('.btn-text').textContent = 'Signing in...';
  btn.querySelector('.btn-loader').classList.remove('hidden');

  try {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const data = await api('POST', '/api/auth/login', { email, password });

    state.token = data.data.token;
    state.user = data.data.user;
    localStorage.setItem('zovyrn_token', state.token);
    localStorage.setItem('zovyrn_user', JSON.stringify(state.user));

    showApp();
    toast('Welcome back, ' + state.user.name + '!', 'success');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Sign In';
    btn.querySelector('.btn-loader').classList.add('hidden');
  }
}

function handleLogout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('zovyrn_token');
  localStorage.removeItem('zovyrn_user');
  showLogin();
  toast('Logged out successfully', 'info');
}

// ─── Screens ────────────────────────────────────────────────────────────────
function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  document.body.className = '';
  document.getElementById('login-form').reset();
  document.getElementById('login-error').classList.add('hidden');
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  // Set role-based body class
  const role = state.user.role;
  document.body.className = role === 'admin' ? 'is-admin' : '';

  // Update user card
  document.getElementById('user-name').textContent = state.user.name;
  document.getElementById('user-avatar').textContent = state.user.name.charAt(0).toUpperCase();
  const badge = document.getElementById('user-role-badge');
  badge.textContent = role;
  badge.className = `role-badge role-${role}`;
  document.getElementById('topbar-role').textContent = role;

  // Hide users nav for non-admins (show but visually indicate)
  const usersNav = document.getElementById('nav-users');
  if (role !== 'admin') {
    usersNav.style.opacity = '0.4';
    usersNav.style.pointerEvents = 'none';
  } else {
    usersNav.style.opacity = '1';
    usersNav.style.pointerEvents = 'auto';
  }

  navigateTo('dashboard');
}

// ─── Navigation ─────────────────────────────────────────────────────────────
function navigateTo(page) {
  // RBAC check
  if (page === 'users' && state.user.role !== 'admin') {
    toast('Access denied — Admin only', 'error');
    return;
  }

  state.currentPage = page;

  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  // Update page title
  const titles = { dashboard: 'Dashboard', records: 'Financial Records', users: 'User Management' };
  document.getElementById('page-title').textContent = titles[page] || page;

  // Show page
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) {
    pageEl.classList.add('active');
    // Force re-animation
    pageEl.style.animation = 'none';
    pageEl.offsetHeight;
    pageEl.style.animation = '';
  }

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');

  // Load data
  if (page === 'dashboard') loadDashboard();
  else if (page === 'records') loadRecords();
  else if (page === 'users') loadUsers();
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
async function loadDashboard() {
  const role = state.user.role;
  const canViewAnalytics = role === 'admin' || role === 'analyst';

  // Show/hide RBAC notice & charts
  document.getElementById('dashboard-rbac-notice').classList.toggle('hidden', canViewAnalytics);
  document.getElementById('charts-section').classList.toggle('hidden', !canViewAnalytics);

  if (canViewAnalytics) {
    try {
      const summaryData = await api('GET', '/api/dashboard/summary');
      const s = summaryData.data.summary;
      animateValue('total-income', s.totalIncome, '₹');
      animateValue('total-expenses', s.totalExpenses, '₹');
      animateValue('net-balance', s.netBalance, '₹');
      animateValue('total-records', s.totalRecords, '');
    } catch (err) {
      console.error('Summary error:', err);
    }

    try {
      const trendsData = await api('GET', '/api/dashboard/trends');
      renderTrendsChart(trendsData.data.trends);
    } catch (err) {
      console.error('Trends error:', err);
    }

    try {
      const catData = await api('GET', '/api/dashboard/category-totals');
      renderCategoryChart(catData.data.categoryTotals);
    } catch (err) {
      console.error('Category error:', err);
    }
  } else {
    // Viewer: show zeros or message
    document.getElementById('total-income').textContent = '🔒';
    document.getElementById('total-expenses').textContent = '🔒';
    document.getElementById('net-balance').textContent = '🔒';
    document.getElementById('total-records').textContent = '🔒';
  }

  // Recent activity — all roles can see
  try {
    const recentData = await api('GET', '/api/dashboard/recent?limit=8');
    renderRecentActivity(recentData.data.records);
  } catch (err) {
    console.error('Recent error:', err);
  }
}

function animateValue(elId, target, prefix) {
  const el = document.getElementById(elId);
  const duration = 800;
  const start = performance.now();
  const from = 0;

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(from + (target - from) * eased);

    if (prefix === '₹') {
      el.textContent = '₹' + current.toLocaleString('en-IN');
    } else {
      el.textContent = current.toLocaleString();
    }

    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

function renderTrendsChart(trends) {
  // Group by period
  const periods = [...new Set(trends.map(t => t.period))].sort();
  const incomeByPeriod = {};
  const expenseByPeriod = {};

  trends.forEach(t => {
    if (t.type === 'income') incomeByPeriod[t.period] = t.total;
    else expenseByPeriod[t.period] = t.total;
  });

  const incomeData = periods.map(p => incomeByPeriod[p] || 0);
  const expenseData = periods.map(p => expenseByPeriod[p] || 0);

  const ctx = document.getElementById('trends-chart').getContext('2d');

  if (state.trendsChart) state.trendsChart.destroy();

  state.trendsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: periods,
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
        {
          label: 'Expenses',
          data: expenseData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#9194b3', font: { family: 'Inter' } } },
        tooltip: {
          backgroundColor: '#161832',
          borderColor: '#2a2d5a',
          borderWidth: 1,
          titleColor: '#e8e9f3',
          bodyColor: '#9194b3',
          padding: 12,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(30,33,72,0.5)' }, ticks: { color: '#5d6086', font: { family: 'Inter' } } },
        y: {
          grid: { color: 'rgba(30,33,72,0.5)' },
          ticks: {
            color: '#5d6086',
            font: { family: 'Inter' },
            callback: (v) => '₹' + (v / 1000).toFixed(0) + 'k'
          }
        }
      }
    }
  });
}

function renderCategoryChart(categories) {
  // Group totals by category (merge income + expense)
  const catMap = {};
  categories.forEach(c => {
    catMap[c.category] = (catMap[c.category] || 0) + c.total;
  });

  const labels = Object.keys(catMap);
  const data = Object.values(catMap);

  const colors = [
    '#6366f1', '#10b981', '#ef4444', '#f59e0b', '#3b82f6',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'
  ];

  const ctx = document.getElementById('category-chart').getContext('2d');

  if (state.categoryChart) state.categoryChart.destroy();

  state.categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#9194b3',
            font: { family: 'Inter', size: 11 },
            padding: 12,
            usePointStyle: true,
            pointStyleWidth: 10,
          }
        },
        tooltip: {
          backgroundColor: '#161832',
          borderColor: '#2a2d5a',
          borderWidth: 1,
          titleColor: '#e8e9f3',
          bodyColor: '#9194b3',
          padding: 12,
          callbacks: {
            label: (ctx) => `${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')}`
          }
        }
      }
    }
  });
}

function renderRecentActivity(records) {
  const container = document.getElementById('recent-activity');

  if (!records.length) {
    container.innerHTML = `<div class="empty-state"><p>No recent activity</p></div>`;
    return;
  }

  container.innerHTML = records.map(r => `
    <div class="activity-item">
      <div class="activity-icon ${r.type}">
        ${r.type === 'income' ? '↑' : '↓'}
      </div>
      <div class="activity-details">
        <div class="activity-desc">${escapeHtml(r.description || r.category)}</div>
        <div class="activity-meta">${r.category} · ${formatDate(r.date)}</div>
      </div>
      <div class="activity-amount ${r.type}">
        ${r.type === 'income' ? '+' : '-'}₹${r.amount.toLocaleString('en-IN')}
      </div>
    </div>
  `).join('');
}

// ─── Records ────────────────────────────────────────────────────────────────
async function loadRecords() {
  const params = new URLSearchParams();
  const type = document.getElementById('filter-type').value;
  const category = document.getElementById('filter-category').value;
  const startDate = document.getElementById('filter-start').value;
  const endDate = document.getElementById('filter-end').value;
  const search = document.getElementById('filter-search').value;

  if (type) params.set('type', type);
  if (category) params.set('category', category);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (search) params.set('search', search);
  params.set('page', state.recordsPage);
  params.set('limit', state.recordsLimit);
  params.set('sort', 'date');
  params.set('order', 'desc');

  try {
    const data = await api('GET', `/api/records?${params}`);
    renderRecordsTable(data.data.records);
    renderPagination(data.data.pagination);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderRecordsTable(records) {
  const tbody = document.getElementById('records-tbody');
  const isAdmin = state.user.role === 'admin';

  if (!records.length) {
    tbody.innerHTML = `<tr><td colspan="${isAdmin ? 6 : 5}" class="empty-state"><p>No records found</p></td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => `
    <tr>
      <td>${formatDate(r.date)}</td>
      <td><span class="type-badge type-${r.type}">${r.type}</span></td>
      <td style="text-transform: capitalize">${escapeHtml(r.category)}</td>
      <td>${escapeHtml(r.description || '—')}</td>
      <td class="text-right amount-cell amount-${r.type}">
        ${r.type === 'income' ? '+' : '-'}₹${r.amount.toLocaleString('en-IN')}
      </td>
      ${isAdmin ? `
        <td>
          <div class="action-btns">
            <button class="btn-icon" onclick="editRecord(${r.id})" title="Edit">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 1.5l1.5 1.5L4.5 11H3v-1.5L11 1.5z"/></svg>
            </button>
            <button class="btn-icon delete" onclick="deleteRecord(${r.id})" title="Delete">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3.5h8M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M4.5 5v6a1 1 0 001 1h3a1 1 0 001-1V5"/></svg>
            </button>
          </div>
        </td>
      ` : ''}
    </tr>
  `).join('');
}

function renderPagination(pagination) {
  const container = document.getElementById('pagination');
  const { page, totalPages, total } = pagination;

  if (totalPages <= 1) {
    container.innerHTML = `<span class="page-info">${total} record${total !== 1 ? 's' : ''}</span>`;
    return;
  }

  let html = '';
  html += `<button class="page-btn" onclick="goToPage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>← Prev</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (i === page - 2 || i === page + 2) {
      html += `<span class="page-info">…</span>`;
    }
  }

  html += `<button class="page-btn" onclick="goToPage(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>Next →</button>`;
  html += `<span class="page-info">${total} records</span>`;

  container.innerHTML = html;
}

function goToPage(page) {
  state.recordsPage = page;
  loadRecords();
}

function clearFilters() {
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-category').value = '';
  document.getElementById('filter-start').value = '';
  document.getElementById('filter-end').value = '';
  document.getElementById('filter-search').value = '';
  state.recordsPage = 1;
  loadRecords();
}

// ─── Record Modal ───────────────────────────────────────────────────────────
function openRecordModal(record = null) {
  state.editingRecordId = record ? record.id : null;
  document.getElementById('record-modal-title').textContent = record ? 'Edit Record' : 'Add Record';
  document.getElementById('save-record-btn').textContent = record ? 'Update Record' : 'Save Record';

  if (record) {
    document.getElementById('rec-amount').value = record.amount;
    document.getElementById('rec-type').value = record.type;
    document.getElementById('rec-category').value = record.category;
    document.getElementById('rec-date').value = record.date;
    document.getElementById('rec-desc').value = record.description || '';
  } else {
    document.getElementById('record-form').reset();
    document.getElementById('rec-date').value = new Date().toISOString().split('T')[0];
  }

  document.getElementById('record-modal').classList.remove('hidden');
}

function closeRecordModal() {
  document.getElementById('record-modal').classList.add('hidden');
  state.editingRecordId = null;
}

async function handleSaveRecord(e) {
  e.preventDefault();

  const body = {
    amount: parseFloat(document.getElementById('rec-amount').value),
    type: document.getElementById('rec-type').value,
    category: document.getElementById('rec-category').value.trim(),
    date: document.getElementById('rec-date').value,
    description: document.getElementById('rec-desc').value.trim(),
  };

  try {
    if (state.editingRecordId) {
      await api('PUT', `/api/records/${state.editingRecordId}`, body);
      toast('Record updated successfully', 'success');
    } else {
      await api('POST', '/api/records', body);
      toast('Record created successfully', 'success');
    }
    closeRecordModal();
    loadRecords();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function editRecord(id) {
  try {
    const data = await api('GET', `/api/records/${id}`);
    openRecordModal(data.data.record);
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function deleteRecord(id) {
  if (!confirm('Are you sure you want to delete this record?')) return;

  try {
    await api('DELETE', `/api/records/${id}`);
    toast('Record deleted', 'success');
    loadRecords();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─── Users ──────────────────────────────────────────────────────────────────
async function loadUsers() {
  try {
    const data = await api('GET', '/api/users');
    renderUsersTable(data.data.users);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-tbody');

  tbody.innerHTML = users.map(u => `
    <tr>
      <td style="font-weight: 500; color: var(--text-primary)">${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>
        <select class="role-select" onchange="updateUserRole(${u.id}, this.value)" ${u.id === state.user.id ? 'disabled title="Cannot change own role"' : ''}>
          <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>Viewer</option>
          <option value="analyst" ${u.role === 'analyst' ? 'selected' : ''}>Analyst</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td>
        <button class="status-badge status-${u.status}" onclick="toggleUserStatus(${u.id}, '${u.status}')" ${u.id === state.user.id ? 'disabled' : ''}>
          ${u.status}
        </button>
      </td>
      <td style="color: var(--text-muted); font-size: 0.82rem">${formatDate(u.created_at)}</td>
      <td>
        ${u.id !== state.user.id ? `
          <button class="btn-icon delete" onclick="deleteUser(${u.id})" title="Delete user">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3.5h8M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M4.5 5v6a1 1 0 001 1h3a1 1 0 001-1V5"/></svg>
          </button>
        ` : '<span style="color: var(--text-muted); font-size: 0.75rem">You</span>'}
      </td>
    </tr>
  `).join('');
}

async function updateUserRole(id, role) {
  try {
    await api('PUT', `/api/users/${id}/role`, { role });
    toast(`Role updated to ${role}`, 'success');
  } catch (err) {
    toast(err.message, 'error');
    loadUsers(); // revert
  }
}

async function toggleUserStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  try {
    await api('PUT', `/api/users/${id}/status`, { status: newStatus });
    toast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
    loadUsers();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function deleteUser(id) {
  if (!confirm('Are you sure you want to delete this user?')) return;
  try {
    await api('DELETE', `/api/users/${id}`);
    toast('User deleted', 'success');
    loadUsers();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─── Toast Notifications ────────────────────────────────────────────────────
function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  el.innerHTML = `<span style="font-weight:700">${icons[type] || 'ℹ'}</span> ${escapeHtml(message)}`;
  container.appendChild(el);

  setTimeout(() => el.remove(), 3200);
}

// ─── Utilities ──────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Make functions globally accessible for inline onclick handlers
window.goToPage = goToPage;
window.editRecord = editRecord;
window.deleteRecord = deleteRecord;
window.updateUserRole = updateUserRole;
window.toggleUserStatus = toggleUserStatus;
window.deleteUser = deleteUser;
