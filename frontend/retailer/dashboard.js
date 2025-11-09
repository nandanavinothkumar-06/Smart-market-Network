const BASE_URL = "http://127.0.0.1:8080";

document.addEventListener("DOMContentLoaded", async () => {
  const username = localStorage.getItem("retailer_username") || "retail2";
  
  // Show loading state
  showLoadingState();
  
  try {
    const retailerId = await getRetailerId(username);
    if (!retailerId) {
      showError("Retailer not found. Please login again.");
      setTimeout(() => window.location.href = "../login.html", 2000);
      return;
    }

    // Store retailer ID for later use
    localStorage.setItem("retailer_id", retailerId);
    
    // Load all dashboard data
    await Promise.all([
      loadProducts(retailerId),
      loadNotifications(retailerId),
      loadOrders(retailerId),
      updateDashboardStats(retailerId)
    ]);
    
    setupAddProductForm(retailerId);
    setupFilterForms(retailerId);
    
    // Hide loading state
    hideLoadingState();
    
  } catch (error) {
    console.error("Error initializing dashboard:", error);
    showError("Failed to load dashboard data. Please refresh the page.");
    hideLoadingState();
  }
});

// Show loading state
function showLoadingState() {
  const mainContent = document.querySelector('main');
  if (mainContent) {
    mainContent.style.opacity = '0.7';
    mainContent.style.pointerEvents = 'none';
  }
}

// Hide loading state
function hideLoadingState() {
  const mainContent = document.querySelector('main');
  if (mainContent) {
    mainContent.style.opacity = '1';
    mainContent.style.pointerEvents = 'auto';
  }
}

// Show success/error messages
function showMessage(message, type = 'success') {
  // Remove any existing message
  const existingMessage = document.getElementById('dashboard-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.id = 'dashboard-message';
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
    max-width: 400px;
  `;
  
  if (type === 'success') {
    messageDiv.style.background = 'linear-gradient(to right, #38b2ac, #319795)';
  } else {
    messageDiv.style.background = 'linear-gradient(to right, #e53e3e, #c53030)';
  }
  
  messageDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(messageDiv);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.style.transform = 'translateX(100%)';
      setTimeout(() => messageDiv.remove(), 300);
    }
  }, 5000);
}

function showError(message) {
  showMessage(message, 'error');
}

async function getRetailerId(username) {
  try {
    const res = await fetch(`${BASE_URL}/retailer/resolve-id/${username}`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    return data.retailer_id;
  } catch (err) {
    console.error("Error resolving retailer ID:", err);
    return null;
  }
}

// Update dashboard statistics
async function updateDashboardStats(retailerId) {
  try {
    // Fetch products for count
    const productsRes = await fetch(`${BASE_URL}/retailer/inventory/${retailerId}`);
    const products = await productsRes.json();
    
    // Fetch orders for pending count
    const ordersRes = await fetch(`${BASE_URL}/retailer/orders/${retailerId}`);
    const orders = await ordersRes.json();
    const pendingOrders = orders.filter(o => o.status === 'pending');
    
    // Update stats cards
    document.getElementById('totalProducts').textContent = products.length;
    document.getElementById('pendingOrders').textContent = pendingOrders.length;
    
  } catch (error) {
    console.error("Error updating dashboard stats:", error);
  }
}

function loadProducts(retailerId) {
  return fetch(`${BASE_URL}/retailer/inventory/${retailerId}`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      const tbody = document.querySelector("#productTable tbody");
      tbody.innerHTML = "";
      
      if (data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 40px; color: #718096;">
              <i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
              No products found. Add your first product to get started.
            </td>
          </tr>
        `;
        return;
      }
      
      data.forEach(p => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${p.name}</td>
          <td>${p.category || 'Uncategorized'}</td>
          <td>₹${p.price}</td>
          <td>
            <span class="quantity-badge ${p.quantity < 10 ? 'low-stock' : ''}">
              ${p.quantity}
              ${p.quantity < 10 ? '<i class="fas fa-exclamation-circle"></i>' : ''}
            </span>
          </td>
          <td>
            <button class="action-btn edit-btn" onclick="updateProductStock(${p.id}, '${p.name}')">
              <i class="fas fa-edit"></i> Update Stock
            </button>
            <button class="action-btn delete-btn" onclick="deleteProduct(${p.id}, ${retailerId})">
              <i class="fas fa-trash"></i> Delete
            </button>
          </td>
        `;
        tbody.appendChild(row);
      });
    })
    .catch(err => {
      console.error("Error loading products:", err);
      const tbody = document.querySelector("#productTable tbody");
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 40px; color: #e53e3e;">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
            Failed to load products. Please try again.
          </td>
        </tr>
      `;
    });
}

function loadNotifications(retailerId) {
  return fetch(`${BASE_URL}/retailer/notifications/${retailerId}`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      const list = document.getElementById("notificationList");
      list.innerHTML = "";
      
      if (data.length === 0) {
        list.innerHTML = `
          <li style="text-align: center; padding: 40px; color: #718096;">
            <i class="fas fa-bell-slash" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
            No notifications at this time.
          </li>
        `;
        return;
      }
      
      data.forEach(n => {
        const item = document.createElement("li");
        item.className = "notification-item";
        item.innerHTML = `
          <div class="notification-content">
            <i class="fas ${getNotificationIcon(n.message)} notification-icon"></i>
            <div class="notification-text">
              ${n.message}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="notification-time">${formatTimeAgo(n.timestamp || new Date().toISOString())}</div>
            ${!n.is_read ? `
              <button class="action-btn edit-btn" onclick="markAsRead(${n.id}, ${retailerId})" style="font-size: 0.8rem;">
                <i class="fas fa-check"></i> Mark Read
              </button>
            ` : ''}
          </div>
        `;
        
        if (!n.is_read) {
          item.style.borderLeftColor = '#3a9bdc';
          item.style.background = 'rgba(58, 155, 220, 0.05)';
        }
        
        list.appendChild(item);
      });
    })
    .catch(err => {
      console.error("Error loading notifications:", err);
      const list = document.getElementById("notificationList");
      list.innerHTML = `
        <li style="text-align: center; padding: 40px; color: #e53e3e;">
          <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
          Failed to load notifications.
        </li>
      `;
    });
}

// Helper function to get appropriate icon for notification type
function getNotificationIcon(message) {
  if (message.toLowerCase().includes('order')) return 'fa-shopping-cart';
  if (message.toLowerCase().includes('stock') || message.toLowerCase().includes('low')) return 'fa-exclamation-triangle';
  if (message.toLowerCase().includes('payment')) return 'fa-credit-card';
  return 'fa-bell';
}

// Helper function to format time ago
function formatTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function markAsRead(notificationId, retailerId) {
  fetch(`${BASE_URL}/retailer/notifications/read/${notificationId}`, {
    method: "POST"
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      showMessage('Notification marked as read');
      loadNotifications(retailerId);
    })
    .catch(err => {
      console.error("Error marking notification:", err);
      showError('Failed to mark notification as read');
    });
}

function loadOrders(retailerId) {
  return fetch(`${BASE_URL}/retailer/orders/${retailerId}`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      const tbody = document.querySelector("#orderTable tbody");
      tbody.innerHTML = "";
      
      if (data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: #718096;">
              <i class="fas fa-clipboard-list" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
              No orders found.
            </td>
          </tr>
        `;
        return;
      }
      
      data.forEach(o => {
        const row = document.createElement("tr");
        const statusClass = `status-${o.status}`;
        row.innerHTML = `
          <td>#${o.id.toString().padStart(3, '0')}</td>
          <td>${o.product_name}</td>
          <td>${o.quantity}</td>
          <td>${o.user_id}</td>
          <td><span class="status-badge ${statusClass}">${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span></td>
          <td>
            ${o.status === "pending" ? `
              <button class="action-btn accept-btn" onclick="updateOrderStatus(${o.id}, 'accepted', ${retailerId})">
                <i class="fas fa-check"></i> Accept
              </button>
              <button class="action-btn reject-btn" onclick="updateOrderStatus(${o.id}, 'rejected', ${retailerId})">
                <i class="fas fa-times"></i> Reject
              </button>
            ` : `
              <span style="color: #718096; font-style: italic;">No actions available</span>
            `}
          </td>
        `;
        tbody.appendChild(row);
      });
    })
    .catch(err => {
      console.error("Error loading orders:", err);
      const tbody = document.querySelector("#orderTable tbody");
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: #e53e3e;">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
            Failed to load orders.
          </td>
        </tr>
      `;
    });
}

function updateOrderStatus(orderId, status, retailerId) {
  const action = status === 'accepted' ? 'accept' : 'reject';
  if (!confirm(`Are you sure you want to ${action} this order?`)) {
    return;
  }
  
  fetch(`${BASE_URL}/retailer/orders/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId, status })
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      showMessage(`Order ${status} successfully`);
      loadOrders(retailerId);
      updateDashboardStats(retailerId);
      loadNotifications(retailerId); // Refresh notifications as there might be new ones
    })
    .catch(err => {
      console.error("Error updating order:", err);
      showError(`Failed to ${action} order`);
    });
}

function setupAddProductForm(retailerId) {
  const form = document.getElementById("addProductForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get form values
    const productName = form.name.value.trim();
    const price = parseFloat(form.price.value);
    const quantity = parseInt(form.quantity.value);
    const category = form.category.value.trim() || "Uncategorized";

    // Validation
    if (!productName) {
      showError("Please enter a product name");
      return;
    }
    
    if (isNaN(price) || price <= 0) {
      showError("Please enter a valid price");
      return;
    }
    
    if (isNaN(quantity) || quantity < 0) {
      showError("Please enter a valid quantity");
      return;
    }

    const payload = {
      retailer_id: retailerId,
      product_name: productName,
      new_qty: quantity,
      price: price,
      category: category
    };

    // Show loading state on button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    submitBtn.disabled = true;

    try {
      const response = await fetch(`${BASE_URL}/retailer/inventory/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      showMessage("Product added successfully!");
      form.reset();
      await loadProducts(retailerId);
      await updateDashboardStats(retailerId);
      
    } catch (err) {
      console.error("Error adding product:", err);
      showError("Failed to add product");
    } finally {
      // Restore button state
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

function setupFilterForms(retailerId) {
  // Notification filter
  const notificationFilterForm = document.getElementById("notificationFilterForm");
  if (notificationFilterForm) {
    notificationFilterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const keyword = e.target.keyword.value.toLowerCase();
      filterNotifications(keyword, retailerId);
    });
  }
  
  // Order filter
  const orderFilterForm = document.getElementById("orderFilterForm");
  if (orderFilterForm) {
    orderFilterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const status = e.target.status.value.toLowerCase();
      filterOrders(status, retailerId);
    });
  }
}

function filterNotifications(keyword, retailerId) {
  const notificationItems = document.querySelectorAll('.notification-item');
  let visibleCount = 0;
  
  notificationItems.forEach(item => {
    const text = item.querySelector('.notification-text').textContent.toLowerCase();
    if (keyword === '' || text.includes(keyword)) {
      item.style.display = 'flex';
      visibleCount++;
    } else {
      item.style.display = 'none';
    }
  });
  
  // Show message if no results
  const list = document.getElementById("notificationList");
  const noResults = list.querySelector('.no-results-message');
  if (visibleCount === 0 && !noResults) {
    const message = document.createElement('li');
    message.className = 'no-results-message';
    message.style.textAlign = 'center';
    message.style.padding = '40px';
    message.style.color = '#718096';
    message.innerHTML = `
      <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
      No notifications match your search.
    `;
    list.appendChild(message);
  } else if (noResults && visibleCount > 0) {
    noResults.remove();
  }
}

function filterOrders(status, retailerId) {
  const orderRows = document.querySelectorAll('#orderTable tbody tr');
  let visibleCount = 0;
  
  orderRows.forEach(row => {
    if (row.querySelector('.no-orders-message')) {
      row.style.display = 'none';
      return;
    }
    
    const statusBadge = row.querySelector('.status-badge');
    const rowStatus = statusBadge ? statusBadge.textContent.toLowerCase() : '';
    
    if (status === '' || rowStatus.includes(status)) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });
  
  // Show message if no results
  const tbody = document.querySelector("#orderTable tbody");
  const noResults = tbody.querySelector('.no-results-message');
  if (visibleCount === 0 && !noResults) {
    const row = document.createElement('tr');
    row.className = 'no-results-message';
    row.innerHTML = `
      <td colspan="6" style="text-align: center; padding: 40px; color: #718096;">
        <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
        No orders match your filter.
      </td>
    `;
    tbody.appendChild(row);
  } else if (noResults && visibleCount > 0) {
    noResults.remove();
  }
}

// Additional product management functions
function updateProductStock(productId, productName) {
  const newStock = prompt(`Enter new stock quantity for ${productName}:`);
  if (newStock === null) return;
  
  const quantity = parseInt(newStock);
  if (isNaN(quantity) || quantity < 0) {
    showError("Please enter a valid quantity");
    return;
  }
  
  const retailerId = localStorage.getItem("retailer_id");
  const payload = {
    retailer_id: parseInt(retailerId),
    product_id: productId,
    new_qty: quantity
  };
  
  fetch(`${BASE_URL}/retailer/inventory/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      showMessage("Stock updated successfully");
      loadProducts(retailerId);
      updateDashboardStats(retailerId);
    })
    .catch(err => {
      console.error("Error updating stock:", err);
      showError("Failed to update stock");
    });
}

function deleteProduct(productId, retailerId) {
  if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
    return;
  }
  
  // Note: You'll need to implement a delete endpoint in your backend
  // This is a placeholder for the delete functionality
  showMessage("Delete functionality would be implemented here");
  console.log(`Would delete product ${productId}`);
}

function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('retailer_username');
    localStorage.removeItem('retailer_id');
    showMessage('Logged out successfully');
    setTimeout(() => {
      window.location.href = "../login.html";
    }, 1000);
  }
}

// Add CSS for additional styles
const additionalStyles = `
  .quantity-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.85rem;
    background: rgba(56, 178, 172, 0.1);
    color: #38b2ac;
    border: 1px solid rgba(56, 178, 172, 0.3);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  
  .quantity-badge.low-stock {
    background: rgba(229, 62, 62, 0.1);
    color: #e53e3e;
    border: 1px solid rgba(229, 62, 62, 0.3);
  }
  
  .status-badge {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  
  .status-pending {
    background: rgba(237, 137, 54, 0.1);
    color: #ed8936;
    border: 1px solid rgba(237, 137, 54, 0.3);
  }
  
  .status-accepted {
    background: rgba(56, 178, 172, 0.1);
    color: #38b2ac;
    border: 1px solid rgba(56, 178, 172, 0.3);
  }
  
  .status-rejected {
    background: rgba(229, 62, 62, 0.1);
    color: #e53e3e;
    border: 1px solid rgba(229, 62, 62, 0.3);
  }
  
  .action-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
  
  .action-btn:disabled:hover {
    transform: none !important;
  }
`;

// Inject additional styles
const styleSheet = document.createElement("style");
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

