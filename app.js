// app.js
// const API_BASE = "http://127.0.0.1:8000/api";
const API_BASE = "https://money-tracker-api-uesx.onrender.com/api";
let currentUser = null;
let selectedWalletId = null;
let allUsers = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Check if user exists in sessionStorage
    const savedUserId = sessionStorage.getItem('mansa_user_id');
    if (savedUserId) {
        loadUserById(savedUserId);
    } else {
        // Show user creation modal
        setTimeout(() => {
            const userModal = new bootstrap.Modal(document.getElementById('userModal'));
            userModal.show();
        }, 500);
    }
    
    setupEventListeners();
    loadAllUsers(); // Load existing users for selector
});

function setupEventListeners() {
    // Create wallet form
    const createWalletForm = document.getElementById('createWalletForm');
    if (createWalletForm) {
        createWalletForm.addEventListener('submit', handleCreateWallet);
    }
    
    // Transaction form
    const txForm = document.getElementById('txForm');
    if (txForm) {
        txForm.addEventListener('submit', handleCreateTransaction);
    }
    
    // User form
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', handleCreateUser);
    }
    
    // User selector
    const userSelector = document.getElementById('userSelector');
    if (userSelector) {
        userSelector.addEventListener('change', handleUserSelect);
    }
}

// ============= USER MANAGEMENT =============

async function loadAllUsers() {
    try {
        const response = await fetch(`${API_BASE}/users`);
        const result = await response.json();
        
        if (result.success && result.data) {
            allUsers = result.data;
            updateUserSelector(allUsers);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function updateUserSelector(users) {
    const selector = document.getElementById('userSelector');
    if (!selector) return;
    
    selector.innerHTML = '<option value="">Select existing user</option>' +
        users.map(user => `<option value="${user.id}">${user.name} (${user.wallets?.length || 0} wallets)</option>`).join('');
}

async function handleCreateUser(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        name: formData.get('name'),
        email: formData.get('email') || `${formData.get('name').toLowerCase().replace(/\s+/g, '.')}@example.com`
    };
    
    try {
        const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Save user and load data
            currentUser = result.data;
            sessionStorage.setItem('mansa_user_id', currentUser.id);
            
            // Hide modal
            bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
            
            // Load user data
            loadUserData();
            
            // Reset form
            e.target.reset();
            
            // Refresh user list
            loadAllUsers();
        }
    } catch (error) {
        console.error('Error creating user:', error);
        alert('Failed to create user');
    }
}

async function handleUserSelect(e) {
    const userId = e.target.value;
    if (userId) {
        await loadUserById(userId);
        bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
    }
}


// Update loadUserById function
async function loadUserById(userId) {
    try {
        const response = await fetch(`${API_BASE}/users/${userId}`);
        const result = await response.json();
        
        if (result.success) {
            currentUser = result.data;
            sessionStorage.setItem('mansa_user_id', currentUser.id);
            
            // Show logout button and status bar if they exist
            const logoutNavItem = document.getElementById('logoutNavItem');
            const userStatusBar = document.getElementById('userStatusBar');
            
            if (logoutNavItem) logoutNavItem.style.display = 'block';
            if (userStatusBar) userStatusBar.style.display = 'block';
            
            // Update username in status bar if it exists
            const loggedInUserName = document.getElementById('loggedInUserName');
            if (loggedInUserName) loggedInUserName.textContent = currentUser.name;
            
            await loadUserData();
        }
    } catch (error) {
        console.error('Error loading user:', error);
    }
}




// ============= DATA LOADING =============

async function loadUserData() {
    try {
        showLoading(true);
        
        // Update UI only if elements exist
        updateUserProfile(currentUser);
        updateWallets(currentUser.wallets || []);
        updateTotalBalance(currentUser.total_balance || 0);
        
        // Update wallet select dropdown if it exists
        updateWalletSelect(currentUser.wallets || []);
        
        // Update wallet count if element exists
        const walletCountEl = document.getElementById('wallet-count');
        if (walletCountEl) {
            walletCountEl.textContent = `${currentUser.wallets?.length || 0} wallets`;
        }
        
        // Update stats section if it exists
        const totalTxEl = document.getElementById('total-tx');
        const totalIncomeEl = document.getElementById('total-income');
        const totalExpensesEl = document.getElementById('total-expenses');
        
        if (totalTxEl || totalIncomeEl || totalExpensesEl) {
            // Calculate stats from all wallets
            let totalTx = 0;
            let totalIncome = 0;
            let totalExpenses = 0;
            
            // You might want to fetch all transactions here if needed
            // For now, we'll just show 0
            if (totalTxEl) totalTxEl.textContent = totalTx;
            if (totalIncomeEl) totalIncomeEl.textContent = `$${totalIncome}`;
            if (totalExpensesEl) totalExpensesEl.textContent = `$${totalExpenses}`;
        }
        
        // Hide wallet detail view if it exists
        const detailView = document.getElementById('walletDetailView');
        if (detailView) {
            hideWalletDetail();
        }
        
        // If on wallets page, load wallets grid
        if (window.location.pathname.includes('wallets.html')) {
            loadWalletsPage();
        }
        // If on transactions page, load all transactions
        else if (window.location.pathname.includes('transactions.html')) {
            if (typeof loadAllTransactions === 'function') {
                loadAllTransactions();
            }
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showError('Failed to load user data');
    } finally {
        showLoading(false);
    }
}





async function fetchUserData() {
    if (currentUser) {
        await loadUserById(currentUser.id);
    } else {
        loadAllUsers();
    }
}


async function fetchWalletTransactions(walletId) {
    try {
        // Use the transactions endpoint
        const response = await fetch(`${API_BASE}/transactions`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        let allTransactions = [];
        if (result.success && result.data) {
            allTransactions = result.data;
        } else if (Array.isArray(result)) {
            allTransactions = result;
        }
        
        // Filter transactions for this wallet
        const walletTransactions = allTransactions.filter(tx => tx.wallet_id === walletId);
        
        console.log(`📋 Rendering ${walletTransactions.length} transactions for wallet ${walletId}`);
        
        // Render transactions
        renderTransactions(walletTransactions, walletId);
        
        // Update wallet detail if this is the selected wallet
        if (selectedWalletId === walletId && currentUser) {
            const wallet = currentUser.wallets.find(w => w.id === walletId);
            if (wallet) {
                updateWalletDetail(wallet, walletTransactions);
            }
        }
        
    } catch (error) {
        console.error('Error fetching transactions:', error);
        renderTransactions([], walletId);
    }
}








// ============= UI UPDATES =============

function updateUserProfile(user) {
    const userNameEl = document.getElementById('user-name');
    const userTierEl = document.getElementById('user-tier');
    const loggedInUserName = document.getElementById('loggedInUserName');
    
    // Only update if elements exist on the current page
    if (userNameEl) userNameEl.textContent = user.name;
    if (userTierEl) userTierEl.textContent = `Member since ${new Date(user.created_at).getFullYear()}`;
    if (loggedInUserName) loggedInUserName.textContent = user.name;
}

// Update updateWallets function
function updateWallets(wallets) {
    const container = document.getElementById('wallet-container');
    if (!container) return; // Exit if not on dashboard page
    
    // Rest of the function remains the same...
    if (!wallets || wallets.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info bg-dark text-white border-info">
                    No wallets yet. Create one using the form!
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = wallets.map((wallet, index) => `
        <div class="col-12 col-md-6 col-lg-3">
            <div class="stat-card ${index === 0 ? 'pink-glow' : 'blue-glow'}" 
                 onclick="selectWallet(${wallet.id})" 
                 data-wallet-id="${wallet.id}"
                 style="cursor: pointer; transition: all 0.3s;">
                <span class="small opacity-75">${wallet.name}</span>
                <h3 class="fw-bold mb-0">$${parseFloat(wallet.balance).toLocaleString()}</h3>
                <small class="text-white-50">${wallet.transactions?.length || 0} transactions</small>
            </div>
        </div>
    `).join('');
}

// Update updateTotalBalance function
function updateTotalBalance(balance) {
    const mainBalanceElement = document.getElementById('main-balance');
    const totalBalanceElement = document.getElementById('total-balance');
    
    if (mainBalanceElement) {
        mainBalanceElement.textContent = `$${parseFloat(balance || 0).toLocaleString()}`;
    }
    
    if (totalBalanceElement) {
        totalBalanceElement.textContent = `$${parseFloat(balance || 0).toLocaleString()}`;
    }
}

// Update updateWalletSelect function
function updateWalletSelect(wallets) {
    const select = document.getElementById('wallet-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Choose a wallet</option>' + 
        wallets.map(wallet => `<option value="${wallet.id}">${wallet.name} ($${wallet.balance})</option>`).join('');
}






// ============= WALLET DETAIL VIEW =============

function selectWallet(walletId) {
    selectedWalletId = walletId;
    
    // Highlight selected wallet
    document.querySelectorAll('[data-wallet-id]').forEach(el => {
        if (parseInt(el.dataset.walletId) === walletId) {
            el.style.opacity = '1';
            el.style.transform = 'scale(1.05)';
            el.style.border = '2px solid #bf9000';
        } else {
            el.style.opacity = '0.7';
            el.style.transform = 'scale(0.98)';
            el.style.border = 'none';
        }
    });
    
    // Show wallet detail view
    const wallet = currentUser.wallets.find(w => w.id === walletId);
    showWalletDetail(wallet);
    
    // Fetch and display transactions
    fetchWalletTransactions(walletId);
}

function showWalletDetail(wallet) {
    const detailView = document.getElementById('walletDetailView');
    const walletsSection = document.getElementById('wallet-container');
    
    // Hide wallets grid, show detail view
    walletsSection.style.display = 'none';
    detailView.style.display = 'block';
    
    // Update wallet detail with current data
    updateWalletDetail(wallet, []);
}

function hideWalletDetail() {
    const detailView = document.getElementById('walletDetailView');
    const walletsSection = document.getElementById('wallet-container');
    
    // Show wallets grid, hide detail view
    walletsSection.style.display = 'flex';
    walletsSection.style.flexWrap = 'wrap';
    detailView.style.display = 'none';
    
    // Remove highlighting
    document.querySelectorAll('[data-wallet-id]').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'scale(1)';
        el.style.border = 'none';
    });
    
    selectedWalletId = null;
}


function updateWalletDetail(wallet, transactions) {
    if (!wallet) return;
    
    // Update basic wallet info
    const selectedWalletName = document.getElementById('selectedWalletName');
    const selectedWalletBalance = document.getElementById('selectedWalletBalance');
    const selectedWalletDescription = document.getElementById('selectedWalletDescription');
    
    if (selectedWalletName) selectedWalletName.textContent = wallet.name;
    if (selectedWalletBalance) {
        selectedWalletBalance.textContent = `$${parseFloat(wallet.balance).toLocaleString()}`;
    }
    if (selectedWalletDescription) {
        selectedWalletDescription.textContent = wallet.description || 'No description';
    }
    
    // Calculate stats based on your data structure
    let totalIncome = 0;
    let totalExpenses = 0;
    
    transactions.forEach(t => {
        // Check different possible amount representations
        const amount = parseFloat(t.amount);
        
        // Case 1: Amount is negative for expenses, positive for income
        if (amount < 0) {
            totalExpenses += Math.abs(amount);
        } 
        // Case 2: Amount is positive but has a type field
        else if (t.type === 'expense' || t.type === 'Expense') {
            totalExpenses += amount;
        }
        // Case 3: Amount is positive and type is income or no type
        else {
            totalIncome += amount;
        }
    });
    
    // Update stats in UI
    const walletTxCount = document.getElementById('walletTxCount');
    const walletIncomeTotal = document.getElementById('walletIncomeTotal');
    const walletExpenseTotal = document.getElementById('walletExpenseTotal');
    
    if (walletTxCount) walletTxCount.textContent = transactions.length;
    if (walletIncomeTotal) walletIncomeTotal.textContent = `$${totalIncome.toLocaleString()}`;
    if (walletExpenseTotal) walletExpenseTotal.textContent = `$${totalExpenses.toLocaleString()}`;
    
    console.log('Transaction stats:', { totalIncome, totalExpenses, transactions });
}





// ============= TRANSACTIONS =============

function renderTransactions(transactions, walletId) {
    const tbody = document.getElementById('tx-history');
    if (!tbody) return;
    
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-white-50 py-4">
                    No transactions for this wallet yet.
                </td>
            </tr>
        `;
        return;
    }
    
    // Find wallet name
    const wallet = currentUser?.wallets?.find(w => w.id === walletId);
    
    tbody.innerHTML = transactions.map(tx => {
        // Handle different amount formats
        let amount = parseFloat(tx.amount);
        let isIncome = amount > 0;
        
        // If amount is positive but type is expense, treat as expense
        if (amount > 0 && (tx.type === 'expense' || tx.type === 'Expense')) {
            isIncome = false;
        }
        
        const displayAmount = Math.abs(amount);
        
        return `
            <tr>
                <td>
                    <span class="fw-600">${tx.description || 'Transaction'}</span>
                    <small class="d-block text-white-50">#${tx.id}</small>
                </td>
                <td>${new Date(tx.created_at).toLocaleDateString()}</td>
                <td class="${isIncome ? 'text-success' : 'text-danger'} fw-bold">
                    ${isIncome ? '+' : '-'}$${displayAmount.toLocaleString()}
                </td>
                <td>
                    <span class="badge ${isIncome ? 'bg-success' : 'bg-danger'} bg-opacity-25 text-white">
                        ${wallet?.name || 'Wallet'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
    
    // Update stats
    updateTransactionStats(transactions);
}

// Also update the updateTransactionStats function
function updateTransactionStats(transactions) {
    const total = transactions.length;
    
    let income = 0;
    let expenses = 0;
    
    transactions.forEach(t => {
        const amount = parseFloat(t.amount);
        
        if (amount < 0) {
            expenses += Math.abs(amount);
        } else if (amount > 0 && t.type === 'expense') {
            expenses += amount;
        } else {
            income += amount;
        }
    });
    
    const totalTxEl = document.getElementById('total-tx');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpensesEl = document.getElementById('total-expenses');
    
    if (totalTxEl) totalTxEl.textContent = total;
    if (totalIncomeEl) totalIncomeEl.textContent = `$${income.toLocaleString()}`;
    if (totalExpensesEl) totalExpensesEl.textContent = `$${expenses.toLocaleString()}`;
}







// This function to show sucess message
function showSuccess(message) {
    // Create success toast/alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 end-0 m-3';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.background = 'rgba(25, 135, 84, 0.2)';
    alertDiv.style.backdropFilter = 'blur(10px)';
    alertDiv.style.border = '1px solid rgba(25, 135, 84, 0.3)';
    alertDiv.style.color = 'white';
    alertDiv.style.minWidth = '250px';
    alertDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi bi-check-circle-fill me-2 text-success"></i>
            <strong>${message}</strong>
        </div>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}





// ============= FORM HANDLERS =============

async function handleCreateWallet(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Please create or select a user first');
        return;
    }
    
    const form = e.target;
    const name = form.querySelector('input[placeholder="Wallet Name"]').value;
    const balance = form.querySelector('input[placeholder="Initial Balance"]').value || 0;
    
    try {
        const response = await fetch(`${API_BASE}/wallets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                name: name,
                balance: balance,
                description: `${name} wallet`
            })
        });
        
        if (response.ok) {
            // Refresh data
            await loadUserById(currentUser.id);
            
            // Close collapse
            const collapseEl = document.getElementById('foundationInfo');
            if (collapseEl.classList.contains('show')) {
                bootstrap.Collapse.getInstance(collapseEl).hide();
            }
            form.reset();
        }
    } catch (error) {
        console.error('Error creating wallet:', error);
        alert('Failed to create wallet');
    }
}


async function handleCreateTransaction(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Please create or select a user first');
        return;
    }
    
    const formData = new FormData(e.target);
    const type = formData.get('type'); // 'income' or 'expense'
    const amount = parseFloat(formData.get('amount'));
    const description = formData.get('description');
    const walletId = formData.get('wallet_id') || selectedWalletId;
    
    if (!walletId) {
        alert('Please select a wallet');
        return;
    }
    
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount greater than 0');
        return;
    }
    
    // CRITICAL DEBUG: Check what the radio button value actually is
    console.log('🔍 RADIO BUTTON CHECK:');
    console.log('Type from formData:', type);
    console.log('Income radio checked:', document.getElementById('income').checked);
    console.log('Expense radio checked:', document.getElementById('expense').checked);
    
    const payload = {
        wallet_id: parseInt(walletId),
        amount: amount,
        type: type,  // This MUST be 'expense' for expenses
        description: description
    };
    
    console.log('📤 Sending payload:', payload);
    
    try {
        const response = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const responseData = await response.json();
        console.log('📥 Server response:', responseData);
        
        if (response.ok) {
            // Refresh user data
            await loadUserById(currentUser.id);
            
            // Get the updated wallet
            const updatedWallet = currentUser.wallets.find(w => w.id === parseInt(walletId));
            console.log('💰 Final wallet balance:', updatedWallet?.balance);
            
            showSuccess('Transaction added successfully!');
            
            // Close modal and reset
            const modal = bootstrap.Modal.getInstance(document.getElementById('txModal'));
            if (modal) modal.hide();
            
            e.target.reset();
            document.getElementById('income').checked = true;
        } else {
            alert(responseData.message || 'Failed to create transaction');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to create transaction');
    } finally {
        // Re-enable submit button if you disabled it
    }
}




// ============= UTILITIES =============


function showLoading(show) {
    const mainElement = document.querySelector('main');
    if (mainElement) {
        if (show) {
            mainElement.classList.add('loading');
        } else {
            mainElement.classList.remove('loading');
        }
    }
}




function showError(message) {
    // Create a toast or alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 end-0 m-3';
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Make functions global for onclick handlers
window.selectWallet = selectWallet;
window.fetchUserData = fetchUserData;
window.hideWalletDetail = hideWalletDetail;



// latest

// Add these functions to app.js

// Logout function
function logout() {
    // Clear session storage
    sessionStorage.removeItem('mansa_user_id');
    
    // Reset current user
    currentUser = null;
    selectedWalletId = null;
    
    // Hide logout button and status bar
    document.getElementById('logoutNavItem').style.display = 'none';
    document.getElementById('userStatusBar').style.display = 'none';
    
    // Show user creation modal
    const userModal = new bootstrap.Modal(document.getElementById('userModal'));
    userModal.show();
    
    // Clear any displayed data
    document.getElementById('user-name').textContent = 'Not logged in';
    document.getElementById('total-balance').textContent = '$0.00';
    document.getElementById('wallet-container').innerHTML = `
        <div class="col-12">
            <div class="alert alert-info bg-dark text-white border-info">
                Please create or select a user to get started.
            </div>
        </div>
    `;
    
    // If on other pages, redirect to index
    if (!window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
    }
}

// Switch user function
function switchUser() {
    logout(); // This will show the user modal
}

// Navigation functions
function showDashboard() {
    window.location.href = 'index.html';
}

function showWallets() {
    window.location.href = 'wallets.html';
}

function showTransactions() {
    window.location.href = 'transactions.html';
}

function goToDashboard() {
    window.location.href = 'index.html';
}

// Update loadUserById to show status bar
async function loadUserById(userId) {
    try {
        const response = await fetch(`${API_BASE}/users/${userId}`);
        const result = await response.json();
        
        if (result.success) {
            currentUser = result.data;
            sessionStorage.setItem('mansa_user_id', currentUser.id);
            
            // Show logout button and status bar
            document.getElementById('logoutNavItem').style.display = 'block';
            document.getElementById('userStatusBar').style.display = 'block';
            document.getElementById('loggedInUserName').textContent = currentUser.name;
            
            loadUserData();
            
            // If on wallets page, load wallets grid
            if (window.location.pathname.includes('wallets.html')) {
                loadWalletsPage();
            }
            // If on transactions page, load all transactions
            else if (window.location.pathname.includes('transactions.html')) {
                if (typeof loadAllTransactions === 'function') {
                    loadAllTransactions();
                }
            }
        }
    } catch (error) {
        console.error('Error loading user:', error);
    }
}

// Function for wallets page
function loadWalletsPage() {
    if (!currentUser) return;
    
    const walletsGrid = document.getElementById('walletsGrid');
    if (!walletsGrid) return;
    
    if (!currentUser.wallets || currentUser.wallets.length === 0) {
        walletsGrid.innerHTML = `
            <div class="col-12">
                <div class="card glass-panel p-5 text-center">
                    <i class="bi bi-wallet2" style="font-size: 3rem; color: rgba(255,215,0,0.5);"></i>
                    <h5 class="text-white mt-3">No Wallets Yet</h5>
                    <p class="text-white-50">Create your first wallet to get started</p>
                    <div class="mt-3">
                        <button class="btn btn-warning" data-bs-toggle="modal" data-bs-target="#walletModal">
                            <i class="bi bi-plus-circle me-2"></i>Create Wallet
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Update stats
        document.getElementById('totalBalance').textContent = '$0.00';
        document.getElementById('totalWallets').textContent = '0';
        document.getElementById('avgBalance').textContent = '$0.00';
        
        return;
    }
    
    // Calculate stats
    const totalBalance = currentUser.wallets.reduce((sum, w) => sum + parseFloat(w.balance), 0);
    const avgBalance = totalBalance / currentUser.wallets.length;
    
    document.getElementById('totalBalance').textContent = `$${totalBalance.toLocaleString()}`;
    document.getElementById('totalWallets').textContent = currentUser.wallets.length;
    document.getElementById('avgBalance').textContent = `$${avgBalance.toLocaleString()}`;
    
    // Render wallets grid
    walletsGrid.innerHTML = currentUser.wallets.map((wallet, index) => `
        <div class="col-md-6 col-lg-4">
            <div class="card glass-panel p-4 h-100" style="cursor: pointer;" onclick="viewWalletDetails(${wallet.id})">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h5 class="text-white mb-1">${wallet.name}</h5>
                        <small class="text-white-50">${wallet.description || 'No description'}</small>
                    </div>
                    <span class="badge ${index % 2 === 0 ? 'bg-warning' : 'bg-info'} text-dark">
                        ${wallet.transactions?.length || 0} txns
                    </span>
                </div>
                <h3 class="text-warning fw-bold mb-0">$${parseFloat(wallet.balance).toLocaleString()}</h3>
                <div class="mt-3">
                    <button class="btn btn-sm btn-outline-warning w-100" onclick="event.stopPropagation(); viewWalletDetails(${wallet.id})">
                        View Details
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Update wallet select for transactions page
function updateWalletSelect(wallets) {
    const select = document.getElementById('wallet-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Choose a wallet</option>' + 
        wallets.map(wallet => `<option value="${wallet.id}">${wallet.name} ($${wallet.balance})</option>`).join('');
    
    // Check if we have a pre-selected wallet (for transactions page)
    const selectedWalletId = sessionStorage.getItem('selectedWalletForTx');
    if (selectedWalletId && window.location.pathname.includes('transactions.html')) {
        select.value = selectedWalletId;
        sessionStorage.removeItem('selectedWalletForTx');
    }
}

// Make functions global
window.logout = logout;
window.switchUser = switchUser;
window.showDashboard = showDashboard;
window.showWallets = showWallets;
window.showTransactions = showTransactions;
window.goToDashboard = goToDashboard;






// adding wallet.html code

// document.addEventListener('DOMContentLoaded', function () {
//             const savedUserId = sessionStorage.getItem('mansa_user_id');
//             if (savedUserId) {
//                 loadUserById(savedUserId);
//                 const logoutNavItem = document.getElementById('logoutNavItem');
//                 if (logoutNavItem) logoutNavItem.style.display = 'block';
//             } else {
//                 window.location.href = 'index.html';
//             }

//             const createWalletForm = document.getElementById('createWalletForm');
//             if (createWalletForm) {
//                 createWalletForm.addEventListener('submit', handleCreateWallet);
//             }
//         });

//         window.viewWalletDetails = async function (walletId) {
//             if (!currentUser) return;

//             const wallet = currentUser.wallets.find(w => w.id === walletId);
//             if (!wallet) {
//                 alert('Wallet not found');
//                 return;
//             }

//             // Update modal with wallet details
//             document.getElementById('detailWalletName').textContent = wallet.name;
//             document.getElementById('detailWalletBalance').textContent =
//                 `$${parseFloat(wallet.balance).toLocaleString()}`;
//             document.getElementById('detailWalletDescription').textContent =
//                 wallet.description || 'No description';

//             // Fetch transactions
//             const tbody = document.getElementById('detailWalletTransactions');
//             tbody.innerHTML = '<tr><td colspan="3" class="text-center">Loading transactions...</td></tr>';

//             try {
//                 const response = await fetch(`${API_BASE}/transactions`);
//                 if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

//                 const result = await response.json();

//                 let allTx = [];
//                 if (result.success && result.data) {
//                     allTx = result.data;
//                 } else if (Array.isArray(result)) {
//                     allTx = result;
//                 }

//                 // Filter for this wallet
//                 const walletTransactions = allTx.filter(tx => tx.wallet_id === walletId);

//                 if (walletTransactions.length === 0) {
//                     tbody.innerHTML = '<tr><td colspan="3" class="text-center">No transactions yet</td></tr>';
//                 } else {
//                     tbody.innerHTML = walletTransactions.map(tx => {
//                         const amount = parseFloat(tx.amount);
//                         // USE THE TYPE FIELD to determine if it's income or expense
//                         const isIncome = tx.type === 'income';

//                         return `
//                     <tr>
//                         <td>${new Date(tx.created_at).toLocaleDateString()}</td>
//                         <td>${tx.description || 'Transaction'}</td>
//                         <td class="${isIncome ? 'text-success' : 'text-danger'} fw-bold">
//                             ${isIncome ? '+' : '-'}$${amount.toLocaleString()}
//                         </td>
//                     </tr>
//                 `;
//                     }).join('');
//                 }
//             } catch (error) {
//                 console.error('Error fetching transactions:', error);
//                 tbody.innerHTML = `
//             <tr>
//                 <td colspan="3" class="text-center text-danger">
//                     <i class="bi bi-exclamation-triangle me-2"></i>
//                     Unable to load transactions
//                 </td>
//             </tr>
//         `;
//             }

//             selectedWalletId = walletId;
//             new bootstrap.Modal(document.getElementById('walletDetailModal')).show();
//         };

//         window.addTransactionToWallet = function () {
//             const modal = bootstrap.Modal.getInstance(document.getElementById('walletDetailModal'));
//             if (modal) modal.hide();

//             if (selectedWalletId) {
//                 sessionStorage.setItem('selectedWalletForTx', selectedWalletId);
//                 window.location.href = 'transactions.html';
//             }
//         };






//         // code for transactions.html

//         document.addEventListener('DOMContentLoaded', function () {
//     const savedUserId = sessionStorage.getItem('mansa_user_id');
//     if (savedUserId) {
//         loadUserById(savedUserId);
//         const logoutNavItem = document.getElementById('logoutNavItem');
//         if (logoutNavItem) logoutNavItem.style.display = 'block';

//         // Check for pre-selected wallet
//         const selectedWalletId = sessionStorage.getItem('selectedWalletForTx');
//         if (selectedWalletId) {
//             setTimeout(() => {
//                 const walletSelect = document.getElementById('wallet-select');
//                 if (walletSelect) {
//                     walletSelect.value = selectedWalletId;
//                     const txModal = new bootstrap.Modal(document.getElementById('txModal'));
//                     txModal.show();
//                 }
//                 sessionStorage.removeItem('selectedWalletForTx');
//             }, 1000);
//         }
//     } else {
//         window.location.href = 'index.html';
//     }

//     const txForm = document.getElementById('txForm');
//     if (txForm) {
//         txForm.addEventListener('submit', async function (e) {
//             e.preventDefault();
//             await handleCreateTransaction(e);
//             await fetchAllTransactions();
            
//             bootstrap.Modal.getInstance(document.getElementById('txModal')).hide();
//             txForm.reset();
//             document.getElementById('income').checked = true;
//         });
//     }

//     // Set up filter listeners
//     document.getElementById('filterWallet')?.addEventListener('change', applyFilters);
//     document.getElementById('filterType')?.addEventListener('change', applyFilters);
//     document.getElementById('filterDate')?.addEventListener('change', applyFilters);
// });

// // Global variables
// let allTransactions = [];
// let userWallets = [];

// // Override loadUserData to also fetch transactions
// const originalLoadUserData = loadUserData;
// loadUserData = async function () {
//     await originalLoadUserData();
//     if (currentUser && currentUser.wallets) {
//         userWallets = currentUser.wallets;
//         await fetchAllTransactions();
//         updateFilterDropdown(userWallets);
//     }
// };

// // Fetch all transactions from the correct endpoint
// async function fetchAllTransactions() {
//     if (!currentUser) return;

//     try {
//         const response = await fetch(`${API_BASE}/transactions`);
//         if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

//         const result = await response.json();

//         let transactions = [];
//         if (result.success && result.data) {
//             transactions = result.data;
//         } else if (Array.isArray(result)) {
//             transactions = result;
//         }

//         const userWalletIds = userWallets.map(w => w.id);
//         const userTransactions = transactions.filter(tx =>
//             userWalletIds.includes(tx.wallet_id)
//         );

//         allTransactions = userTransactions.map(tx => {
//             const wallet = userWallets.find(w => w.id === tx.wallet_id);
//             return {
//                 ...tx,
//                 wallet_name: wallet ? wallet.name : 'Unknown'
//             };
//         });

//         allTransactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
//         applyFilters();

//     } catch (error) {
//         console.error('Error fetching transactions:', error);
//         const tbody = document.getElementById('allTransactions');
//         if (tbody) {
//             tbody.innerHTML = `
//                 <tr>
//                     <td colspan="6" class="text-center py-4">
//                         <div class="text-danger">
//                             <i class="bi bi-exclamation-triangle me-2"></i>
//                             Error loading transactions. Please try again.
//                         </div>
//                         <button class="btn btn-sm btn-warning mt-2" onclick="fetchAllTransactions()">
//                             <i class="bi bi-arrow-repeat me-1"></i>Retry
//                         </button>
//                     </td>
//                 </tr>
//             `;
//         }
//     }
// }

// function updateFilterDropdown(wallets) {
//     const filterWallet = document.getElementById('filterWallet');
//     if (!filterWallet) return;

//     filterWallet.innerHTML = '<option value="">All Wallets</option>' +
//         wallets.map(w => `<option value="${w.id}">${w.name} ($${w.balance})</option>`).join('');
// }

// // Uses type field
// window.applyFilters = function () {
//     const filterWallet = document.getElementById('filterWallet');
//     const filterType = document.getElementById('filterType');
//     const filterDate = document.getElementById('filterDate');

//     let filtered = [...allTransactions];

//     if (filterWallet && filterWallet.value) {
//         filtered = filtered.filter(tx => tx.wallet_id == filterWallet.value);
//     }

//     if (filterType && filterType.value) {
//         if (filterType.value === 'income') {
//             filtered = filtered.filter(tx => tx.type === 'income');
//         } else if (filterType.value === 'expense') {
//             filtered = filtered.filter(tx => tx.type === 'expense');
//         }
//     }

//     if (filterDate && filterDate.value) {
//         const filterDateStr = filterDate.value;
//         filtered = filtered.filter(tx => {
//             const txDate = new Date(tx.created_at).toISOString().split('T')[0];
//             return txDate === filterDateStr;
//         });
//     }

//     renderTransactionsTable(filtered);
//     updateSummary(filtered);
// };

// //Uses type field
// function renderTransactionsTable(transactions) {
//     const tbody = document.getElementById('allTransactions');
//     if (!tbody) return;

//     if (transactions.length === 0) {
//         tbody.innerHTML = `
//             <tr>
//                 <td colspan="6" class="text-center py-4">
//                     <i class="bi bi-inbox text-white-50" style="font-size: 2rem;"></i>
//                     <p class="text-white-50 mt-2">No transactions found</p>
//                     <button class="btn btn-sm btn-warning" data-bs-toggle="modal" data-bs-target="#txModal">
//                         <i class="bi bi-plus-circle me-1"></i>Add Transaction
//                     </button>
//                 </td>
//             </tr>
//         `;
//         return;
//     }

//     tbody.innerHTML = transactions.map(tx => {
//         const amount = parseFloat(tx.amount);
//         const isIncome = tx.type === 'income';

//         return `
//             <tr>
//                 <td>${new Date(tx.created_at).toLocaleDateString()}</td>
//                 <td>${tx.description || 'Transaction'}</td>
//                 <td>${tx.wallet_name}</td>
//                 <td>
//                     <span class="badge ${isIncome ? 'bg-success' : 'bg-danger'} bg-opacity-25 text-white">
//                         ${isIncome ? 'Income' : 'Expense'}
//                     </span>
//                 </td>
//                 <td class="${isIncome ? 'text-success' : 'text-danger'} fw-bold">
//                     ${isIncome ? '+' : '-'}$${amount.toLocaleString()}
//                 </td>
//                 <td>
//                     <button class="btn btn-sm btn-outline-warning" onclick="showTransactionDetails(${tx.id})">
//                         <i class="bi bi-eye"></i>
//                     </button>
//                 </td>
//             </tr>
//         `;
//     }).join('');
// }

// //Uses type field
// function updateSummary(transactions) {
//     const income = transactions.filter(t => t.type === 'income')
//         .reduce((sum, t) => sum + parseFloat(t.amount), 0);
//     const expenses = transactions.filter(t => t.type === 'expense')
//         .reduce((sum, t) => sum + parseFloat(t.amount), 0);
//     const net = income - expenses;

//     document.getElementById('totalIncome').textContent = `$${income.toLocaleString()}`;
//     document.getElementById('totalExpenses').textContent = `$${expenses.toLocaleString()}`;
//     document.getElementById('netFlow').textContent = `$${net.toLocaleString()}`;
//     document.getElementById('txCount').textContent = transactions.length;
// }

// //Uses type field
// window.showTransactionDetails = function (transactionId) {
//     const transaction = allTransactions.find(t => t.id === transactionId);
//     if (transaction) {
//         alert(`
// Transaction Details:
// -------------------
// Description: ${transaction.description || 'N/A'}
// Amount: $${transaction.amount}
// Type: ${transaction.type === 'income' ? 'Income' : 'Expense'}
// Wallet: ${transaction.wallet_name}
// Date: ${new Date(transaction.created_at).toLocaleString()}
//         `);
//     }
// };

// window.clearFilters = function () {
//     document.getElementById('filterWallet').value = '';
//     document.getElementById('filterType').value = '';
//     document.getElementById('filterDate').value = '';
//     applyFilters();
// };

// // Helper function
// function safeGetElement(id) {
//     const el = document.getElementById(id);
//     if (!el) {
//         console.warn(`Element with id '${id}' not found`);
//     }
//     return el;
// }










// 2. updated version
document.addEventListener('DOMContentLoaded', function() {
    // This runs AFTER the main initialization
    // Check which page we're on
    const currentPath = window.location.pathname;
    
    // Only run wallet page code if we're on wallets.html
    if (currentPath.includes('wallets.html')) {
        console.log('Initializing wallets page from app.js');
        
        // Make sure we have a user
        const savedUserId = sessionStorage.getItem('mansa_user_id');
        if (!savedUserId) {
            window.location.href = 'index.html';
            return;
        }
        
        // Add wallet-specific event listeners if needed
        const createWalletForm = document.getElementById('createWalletForm');
        if (createWalletForm) {
            // Remove any existing listeners first to prevent duplicates
            const newForm = createWalletForm.cloneNode(true);
            createWalletForm.parentNode.replaceChild(newForm, createWalletForm);
            newForm.addEventListener('submit', handleCreateWallet);
        }
    }
    
    // Only run transactions page code if we're on transactions.html
    else if (currentPath.includes('transactions.html')) {
        console.log('Initializing transactions page from app.js');
        
        // Make sure we have a user
        const savedUserId = sessionStorage.getItem('mansa_user_id');
        if (!savedUserId) {
            window.location.href = 'index.html';
            return;
        }
        
        // Check for pre-selected wallet
        const selectedWalletId = sessionStorage.getItem('selectedWalletForTx');
        if (selectedWalletId) {
            setTimeout(() => {
                const walletSelect = document.getElementById('wallet-select');
                if (walletSelect) {
                    walletSelect.value = selectedWalletId;
                    const txModal = document.getElementById('txModal');
                    if (txModal) {
                        new bootstrap.Modal(txModal).show();
                    }
                }
                sessionStorage.removeItem('selectedWalletForTx');
            }, 1000);
        }
        
        // Set up transaction form
        const txForm = document.getElementById('txForm');
        if (txForm) {
            // Remove existing listeners
            const newTxForm = txForm.cloneNode(true);
            txForm.parentNode.replaceChild(newTxForm, txForm);
            
            newTxForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                await handleCreateTransaction(e);
                await fetchAllTransactions();
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('txModal'));
                if (modal) modal.hide();
                
                newTxForm.reset();
                document.getElementById('income').checked = true;
            });
        }
        
        // Set up filter listeners
        const filterWallet = document.getElementById('filterWallet');
        const filterType = document.getElementById('filterType');
        const filterDate = document.getElementById('filterDate');
        
        if (filterWallet) {
            filterWallet.replaceWith(filterWallet.cloneNode(true));
            document.getElementById('filterWallet')?.addEventListener('change', applyFilters);
        }
        if (filterType) {
            filterType.replaceWith(filterType.cloneNode(true));
            document.getElementById('filterType')?.addEventListener('change', applyFilters);
        }
        if (filterDate) {
            filterDate.replaceWith(filterDate.cloneNode(true));
            document.getElementById('filterDate')?.addEventListener('change', applyFilters);
        }
    }
});

// ============= WALLETS PAGE FUNCTIONS =============
// Keep these at the bottom

window.viewWalletDetails = async function(walletId) {
    if (!currentUser) return;

    const wallet = currentUser.wallets.find(w => w.id === walletId);
    if (!wallet) {
        alert('Wallet not found');
        return;
    }

    // Update modal with wallet details
    document.getElementById('detailWalletName').textContent = wallet.name;
    document.getElementById('detailWalletBalance').textContent =
        `$${parseFloat(wallet.balance).toLocaleString()}`;
    document.getElementById('detailWalletDescription').textContent =
        wallet.description || 'No description';

    // Fetch transactions
    const tbody = document.getElementById('detailWalletTransactions');
    tbody.innerHTML = '<tr><td colspan="3" class="text-center">Loading transactions...</td></tr>';

    try {
        const response = await fetch(`${API_BASE}/transactions`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();

        let allTx = [];
        if (result.success && result.data) {
            allTx = result.data;
        } else if (Array.isArray(result)) {
            allTx = result;
        }

        // Filter for this wallet
        const walletTransactions = allTx.filter(tx => tx.wallet_id === walletId);

        if (walletTransactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">No transactions yet</td></tr>';
        } else {
            tbody.innerHTML = walletTransactions.map(tx => {
                const amount = parseFloat(tx.amount);
                const isIncome = tx.type === 'income';

                return `
                    <tr>
                        <td>${new Date(tx.created_at).toLocaleDateString()}</td>
                        <td>${tx.description || 'Transaction'}</td>
                        <td class="${isIncome ? 'text-success' : 'text-danger'} fw-bold">
                            ${isIncome ? '+' : '-'}$${amount.toLocaleString()}
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error fetching transactions:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Unable to load transactions
                </td>
            </tr>
        `;
    }

    selectedWalletId = walletId;
    new bootstrap.Modal(document.getElementById('walletDetailModal')).show();
};

window.addTransactionToWallet = function() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('walletDetailModal'));
    if (modal) modal.hide();

    if (selectedWalletId) {
        sessionStorage.setItem('selectedWalletForTx', selectedWalletId);
        window.location.href = 'transactions.html';
    }
};

// ============= TRANSACTIONS PAGE FUNCTIONS =============

// Global variables for transactions
let allTransactions = [];
let userWallets = [];

// Override loadUserData for transactions page
const originalLoadUserData = loadUserData;
loadUserData = async function() {
    await originalLoadUserData();
    if (window.location.pathname.includes('transactions.html')) {
        if (currentUser && currentUser.wallets) {
            userWallets = currentUser.wallets;
            await fetchAllTransactions();
            updateFilterDropdown(userWallets);
        }
    }
};

async function fetchAllTransactions() {
    if (!currentUser || !window.location.pathname.includes('transactions.html')) return;

    try {
        const response = await fetch(`${API_BASE}/transactions`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();

        let transactions = [];
        if (result.success && result.data) {
            transactions = result.data;
        } else if (Array.isArray(result)) {
            transactions = result;
        }

        const userWalletIds = userWallets.map(w => w.id);
        const userTransactions = transactions.filter(tx =>
            userWalletIds.includes(tx.wallet_id)
        );

        allTransactions = userTransactions.map(tx => {
            const wallet = userWallets.find(w => w.id === tx.wallet_id);
            return {
                ...tx,
                wallet_name: wallet ? wallet.name : 'Unknown'
            };
        });

        allTransactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        applyFilters();

    } catch (error) {
        console.error('Error fetching transactions:', error);
        const tbody = document.getElementById('allTransactions');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <div class="text-danger">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Error loading transactions. Please try again.
                        </div>
                        <button class="btn btn-sm btn-warning mt-2" onclick="fetchAllTransactions()">
                            <i class="bi bi-arrow-repeat me-1"></i>Retry
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

function updateFilterDropdown(wallets) {
    const filterWallet = document.getElementById('filterWallet');
    if (!filterWallet || !window.location.pathname.includes('transactions.html')) return;

    filterWallet.innerHTML = '<option value="">All Wallets</option>' +
        wallets.map(w => `<option value="${w.id}">${w.name} ($${w.balance})</option>`).join('');
}

window.applyFilters = function() {
    if (!window.location.pathname.includes('transactions.html')) return;
    
    const filterWallet = document.getElementById('filterWallet');
    const filterType = document.getElementById('filterType');
    const filterDate = document.getElementById('filterDate');

    let filtered = [...allTransactions];

    if (filterWallet && filterWallet.value) {
        filtered = filtered.filter(tx => tx.wallet_id == filterWallet.value);
    }

    if (filterType && filterType.value) {
        if (filterType.value === 'income') {
            filtered = filtered.filter(tx => tx.type === 'income');
        } else if (filterType.value === 'expense') {
            filtered = filtered.filter(tx => tx.type === 'expense');
        }
    }

    if (filterDate && filterDate.value) {
        const filterDateStr = filterDate.value;
        filtered = filtered.filter(tx => {
            const txDate = new Date(tx.created_at).toISOString().split('T')[0];
            return txDate === filterDateStr;
        });
    }

    renderTransactionsTable(filtered);
    updateSummary(filtered);
};

function renderTransactionsTable(transactions) {
    if (!window.location.pathname.includes('transactions.html')) return;
    
    const tbody = document.getElementById('allTransactions');
    if (!tbody) return;

    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <i class="bi bi-inbox text-white-50" style="font-size: 2rem;"></i>
                    <p class="text-white-50 mt-2">No transactions found</p>
                    <button class="btn btn-sm btn-warning" data-bs-toggle="modal" data-bs-target="#txModal">
                        <i class="bi bi-plus-circle me-1"></i>Add Transaction
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = transactions.map(tx => {
        const amount = parseFloat(tx.amount);
        const isIncome = tx.type === 'income';

        return `
            <tr>
                <td>${new Date(tx.created_at).toLocaleDateString()}</td>
                <td>${tx.description || 'Transaction'}</td>
                <td>${tx.wallet_name}</td>
                <td>
                    <span class="badge ${isIncome ? 'bg-success' : 'bg-danger'} bg-opacity-25 text-white">
                        ${isIncome ? 'Income' : 'Expense'}
                    </span>
                </td>
                <td class="${isIncome ? 'text-success' : 'text-danger'} fw-bold">
                    ${isIncome ? '+' : '-'}$${amount.toLocaleString()}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-warning" onclick="showTransactionDetails(${tx.id})">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateSummary(transactions) {
    if (!window.location.pathname.includes('transactions.html')) return;
    
    const income = transactions.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expenses = transactions.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const net = income - expenses;

    document.getElementById('totalIncome').textContent = `$${income.toLocaleString()}`;
    document.getElementById('totalExpenses').textContent = `$${expenses.toLocaleString()}`;
    document.getElementById('netFlow').textContent = `$${net.toLocaleString()}`;
    document.getElementById('txCount').textContent = transactions.length;
}

window.showTransactionDetails = function(transactionId) {
    if (!window.location.pathname.includes('transactions.html')) return;
    
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (transaction) {
        alert(`
Transaction Details:
-------------------
Description: ${transaction.description || 'N/A'}
Amount: $${transaction.amount}
Type: ${transaction.type === 'income' ? 'Income' : 'Expense'}
Wallet: ${transaction.wallet_name}
Date: ${new Date(transaction.created_at).toLocaleString()}
        `);
    }
};

window.clearFilters = function() {
    if (!window.location.pathname.includes('transactions.html')) return;
    
    document.getElementById('filterWallet').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterDate').value = '';
    applyFilters();
};