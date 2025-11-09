const BASE_URL = "http://127.0.0.1:8080";

document.addEventListener("DOMContentLoaded", () => {
  const adminUser = localStorage.getItem("admin_username");
  const adminToken = localStorage.getItem("admin_token");
  
  if (!adminUser || !adminToken) {
    showMessage("Please login first", "error");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);
    return;
  }

  // Show loading state
  showLoadingState();
  
  // Update admin info in header
  updateAdminInfo();
  
  // Load all dashboard data
  Promise.all([
    loadRetailers(),
    loadProducts(),
    loadOrders(),
    loadDashboardStats()
  ]).finally(() => {
    hideLoadingState();
  });
});

// Show loading state
function showLoadingState() {
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => {
    const existingLoader = section.querySelector('.loading-state');
    if (!existingLoader) {
      const loader = document.createElement('div');
      loader.className = 'loading-state';
      loader.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; padding: 40px;">
          <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--accent); margin-right: 15px;"></i>
          <span>Loading data...</span>
        </div>
      `;
      const table = section.querySelector('tbody');
      if (table) {
        table.appendChild(loader);
      }
    }
  });
}

// Hide loading state
function hideLoadingState() {
  const loaders = document.querySelectorAll('.loading-state');
  loaders.forEach(loader => loader.remove());
}

// Update admin information in header
function updateAdminInfo() {
  const adminUser = localStorage.getItem("admin_username");
  const adminDisplay = document.getElementById('adminDisplay');
  if (adminDisplay) {
    adminDisplay.textContent = adminUser;
  }
}

// Show message function
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
    messageDiv.style.background = 'linear-gradient(to right, var(--success), #319795)';
  } else {
    messageDiv.style.background = 'linear-gradient(to right, var(--error), #c53030)';
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

// Load dashboard statistics
function loadDashboardStats() {
  return fetch(`${BASE_URL}/admin/dashboard/stats`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      // Update stats cards
      document.getElementById('totalRetailers').textContent = data.total_retailers || '0';
      document.getElementById('totalProducts').textContent = data.total_products || '0';
      document.getElementById('totalOrders').textContent = data.total_orders || '0';
      document.getElementById('totalRevenue').textContent = data.total_revenue ? `₹${data.total_revenue}` : '₹0';
    })
    .catch(err => {
      console.error("Error loading dashboard stats:", err);
      // Set default values if API fails
      document.getElementById('totalRetailers').textContent = '0';
      document.getElementById('totalProducts').textContent = '0';
      document.getElementById('totalOrders').textContent = '0';
      document.getElementById('totalRevenue').textContent = '₹0';
    });
}

function loadRetailers() {
  return fetch(`${BASE_URL}/admin/retailers`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      const tbody = document.querySelector("#retailerTable tbody");
      tbody.innerHTML = "";
      
      if (data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; padding: 40px; color: var(--text-light);">
              <i class="fas fa-store-slash" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
              No retailers found.
            </td>
          </tr>
        `;
        return;
      }
      
      data.forEach(retailer => {
        const row = document.createElement("tr");
        const statusClass = `status-${retailer.status || 'active'}`;
        
        row.innerHTML = `
          <td>
            <div class="user-info">
              <div class="user-avatar">
                ${getUserInitials(retailer.username || retailer.name)}
              </div>
              <div class="user-details">
                <div class="user-name">${retailer.username || retailer.name || "Unknown"}</div>
                <div class="user-email">${retailer.email || 'No email'}</div>
              </div>
            </div>
          </td>
          <td>${retailer.location || 'Unknown'}</td>
          <td>
            <span class="status-badge ${statusClass}">
              ${retailer.status ? retailer.status.charAt(0).toUpperCase() + retailer.status.slice(1) : 'Active'}
            </span>
          </td>
          <td>
            <div class="action-btns">
              <button class="btn view-btn" onclick="viewRetailer(${retailer.id})">
                <i class="fas fa-eye"></i> View
              </button>
              ${retailer.status !== 'blocked' ? `
                <button class="btn block-btn" onclick="blockRetailer(${retailer.id}, '${retailer.username || retailer.name}')">
                  <i class="fas fa-ban"></i> Block
                </button>
              ` : `
                <button class="btn unblock-btn" onclick="unblockRetailer(${retailer.id}, '${retailer.username || retailer.name}')">
                  <i class="fas fa-check"></i> Unblock
                </button>
              `}
            </div>
          </td>
        `;
        tbody.appendChild(row);
      });
    })
    .catch(err => {
      console.error("Error loading retailers:", err);
      const tbody = document.querySelector("#retailerTable tbody");
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 40px; color: var(--error);">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
            Failed to load retailers. Please try again.
          </td>
        </tr>
      `;
    });
}

function blockRetailer(id, retailerName) {
  if (!confirm(`Are you sure you want to block ${retailerName}? This will prevent them from accessing the system.`)) {
    return;
  }

  fetch(`${BASE_URL}/admin/block-retailer/${id}`, { 
    method: "POST",
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
    }
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      showMessage(`Retailer ${retailerName} has been blocked successfully`);
      loadRetailers();
      loadDashboardStats(); // Refresh stats
    })
    .catch(err => {
      console.error("Error blocking retailer:", err);
      showMessage("Failed to block retailer", "error");
    });
}

function unblockRetailer(id, retailerName) {
  if (!confirm(`Are you sure you want to unblock ${retailerName}?`)) {
    return;
  }

  fetch(`${BASE_URL}/admin/unblock-retailer/${id}`, { 
    method: "POST",
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
    }
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      showMessage(`Retailer ${retailerName} has been unblocked successfully`);
      loadRetailers();
      loadDashboardStats(); // Refresh stats
    })
    .catch(err => {
      console.error("Error unblocking retailer:", err);
      showMessage("Failed to unblock retailer", "error");
    });
}

function viewRetailer(retailerId) {
  // In a real application, this would open a detailed view or modal
  showMessage(`View details for retailer ID: ${retailerId}`, "success");
  console.log(`View retailer details for ID: ${retailerId}`);
}

function loadProducts() {
  return fetch(`${BASE_URL}/admin/products`)
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
            <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-light);">
              <i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
              No products found.
            </td>
          </tr>
        `;
        return;
      }
      
      data.forEach(product => {
        const row = document.createElement("tr");
        const quantityClass = getQuantityClass(product.quantity);
        
        row.innerHTML = `
          <td>
            <div class="product-info">
              <div class="product-name">${product.name || "Unnamed"}</div>
              <div class="product-category">${product.category || 'Uncategorized'}</div>
            </div>
          </td>
          <td class="price">₹${product.price || "N/A"}</td>
          <td>
            <span class="quantity-badge ${quantityClass}">
              ${product.quantity || 0}
              ${product.quantity < 10 ? '<i class="fas fa-exclamation-circle"></i>' : ''}
            </span>
          </td>
          <td>${product.retailer_name || product.retailer_id || "Unknown"}</td>
          <td>
            <div class="action-btns">
              <button class="btn edit-btn" onclick="editProduct(${product.id})">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button class="btn delete-btn" onclick="deleteProduct(${product.id}, '${product.name}')">
                <i class="fas fa-trash"></i> Delete
              </button>
            </div>
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
          <td colspan="5" style="text-align: center; padding: 40px; color: var(--error);">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
            Failed to load products. Please try again.
          </td>
        </tr>
      `;
    });
}

function loadOrders() {
  return fetch(`${BASE_URL}/admin/orders`)
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
            <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-light);">
              <i class="fas fa-clipboard-list" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
              No orders found.
            </td>
          </tr>
        `;
        return;
      }
      
      data.forEach(order => {
        const row = document.createElement("tr");
        const statusClass = `status-${order.status}`;
        
        row.innerHTML = `
          <td>#${order.id.toString().padStart(6, '0')}</td>
          <td>${order.product_name || "Unknown"}</td>
          <td>${order.quantity}</td>
          <td>
            <div class="user-info">
              <div class="user-avatar small">
                ${getUserInitials(order.user_name)}
              </div>
              <div class="user-details">
                <div class="user-name">${order.user_name || "Unknown"}</div>
              </div>
            </div>
          </td>
          <td><span class="status-badge ${statusClass}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></td>
          <td>
            <div class="action-btns">
              <button class="btn view-btn" onclick="viewOrder(${order.id})">
                <i class="fas fa-eye"></i> Details
              </button>
              <button class="btn edit-btn" onclick="updateOrderStatus(${order.id})">
                <i class="fas fa-edit"></i> Status
              </button>
            </div>
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
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--error);">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
            Failed to load orders. Please try again.
          </td>
        </tr>
      `;
    });
}

// Helper function to get user initials
function getUserInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

// Helper function to determine quantity class
function getQuantityClass(quantity) {
  if (!quantity || quantity === 0) return 'quantity-low';
  if (quantity < 10) return 'quantity-low';
  if (quantity < 25) return 'quantity-medium';
  return 'quantity-high';
}

// Product management functions
function editProduct(productId) {
  const productRow = document.querySelector(`tr:has(button[onclick="editProduct(${productId})"])`);
  const productName = productRow.querySelector('.product-name').textContent;
  showMessage(`Edit functionality for "${productName}" would be implemented here`);
}

function deleteProduct(productId, productName) {
  if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
    return;
  }
  
  fetch(`${BASE_URL}/admin/products/${productId}`, {
    method: "DELETE",
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
    }
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      showMessage(`Product "${productName}" deleted successfully`);
      loadProducts();
      loadDashboardStats(); // Refresh stats
    })
    .catch(err => {
      console.error("Error deleting product:", err);
      showMessage("Failed to delete product", "error");
    });
}

// Order management functions
function viewOrder(orderId) {
  showMessage(`View details for order #${orderId.toString().padStart(6, '0')}`);
}

function updateOrderStatus(orderId) {
  const newStatus = prompt('Enter new status (pending, accepted, shipped, delivered, cancelled):', 'accepted');
  if (newStatus && ['pending', 'accepted', 'shipped', 'delivered', 'cancelled'].includes(newStatus.toLowerCase())) {
    fetch(`${BASE_URL}/admin/orders/${orderId}/status`, {
      method: "PUT",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
      },
      body: JSON.stringify({ status: newStatus.toLowerCase() })
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        showMessage(`Order status updated to ${newStatus}`);
        loadOrders();
      })
      .catch(err => {
        console.error("Error updating order status:", err);
        showMessage("Failed to update order status", "error");
      });
  } else if (newStatus) {
    showMessage("Invalid status entered", "error");
  }
}

// Search and filter functionality
function setupSearchFilters() {
  // Retailer search
  const retailerSearch = document.getElementById('retailerSearch');
  if (retailerSearch) {
    retailerSearch.addEventListener('input', filterRetailers);
  }
  
  // Product search
  const productSearch = document.getElementById('productSearch');
  if (productSearch) {
    productSearch.addEventListener('input', filterProducts);
  }
  
  // Order search
  const orderSearch = document.getElementById('orderSearch');
  if (orderSearch) {
    orderSearch.addEventListener('input', filterOrders);
  }
}

// Initialize search filters when DOM is loaded
document.addEventListener('DOMContentLoaded', setupSearchFilters);

// Logout function
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('admin_username');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_role');
    showMessage('Logged out successfully');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1000);
  }
}

// Add CSS for additional styles
const additionalStyles = `
  .loading-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 20px;
    color: var(--text-light);
  }
  
  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(58, 155, 220, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    font-weight: 600;
    font-size: 0.9rem;
  }
  
  .user-avatar.small {
    width: 32px;
    height: 32px;
    font-size: 0.8rem;
  }
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .user-details {
    text-align: left;
  }
  
  .user-name {
    font-weight: 600;
    color: var(--text);
    margin-bottom: 2px;
  }
  
  .user-email {
    color: var(--text-light);
    font-size: 0.85rem;
  }
  
  .product-info {
    text-align: left;
  }
  
  .product-name {
    font-weight: 600;
    color: var(--text);
    margin-bottom: 4px;
  }
  
  .product-category {
    color: var(--text-light);
    font-size: 0.85rem;
  }
  
  .price {
    font-weight: 600;
    color: var(--primary);
  }
  
  .quantity-badge {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  
  .quantity-high {
    background: rgba(56, 178, 172, 0.1);
    color: var(--success);
    border: 1px solid rgba(56, 178, 172, 0.3);
  }
  
  .quantity-medium {
    background: rgba(237, 137, 54, 0.1);
    color: var(--warning);
    border: 1px solid rgba(237, 137, 54, 0.3);
  }
  
  .quantity-low {
    background: rgba(229, 62, 62, 0.1);
    color: var(--error);
    border: 1px solid rgba(229, 62, 62, 0.3);
  }
  
  .status-badge {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  
  .status-active, .status-delivered {
    background: rgba(56, 178, 172, 0.1);
    color: var(--success);
    border: 1px solid rgba(56, 178, 172, 0.3);
  }
  
  .status-pending, .status-shipped {
    background: rgba(237, 137, 54, 0.1);
    color: var(--warning);
    border: 1px solid rgba(237, 137, 54, 0.3);
  }
  
  .status-blocked, .status-cancelled {
    background: rgba(229, 62, 62, 0.1);
    color: var(--error);
    border: 1px solid rgba(229, 62, 62, 0.3);
  }
  
  .action-btns {
    display: flex;
    gap: 8px;
  }
  
  .btn {
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  
  .view-btn {
    background: rgba(58, 155, 220, 0.1);
    color: var(--accent);
    border: 1px solid rgba(58, 155, 220, 0.3);
  }
  
  .view-btn:hover {
    background: var(--accent);
    color: white;
  }
  
  .block-btn {
    background: rgba(229, 62, 62, 0.1);
    color: var(--error);
    border: 1px solid rgba(229, 62, 62, 0.3);
  }
  
  .block-btn:hover {
    background: var(--error);
    color: white;
  }
  
  .unblock-btn {
    background: rgba(56, 178, 172, 0.1);
    color: var(--success);
    border: 1px solid rgba(56, 178, 172, 0.3);
  }
  
  .unblock-btn:hover {
    background: var(--success);
    color: white;
  }
  
  .edit-btn {
    background: rgba(56, 178, 172, 0.1);
    color: var(--success);
    border: 1px solid rgba(56, 178, 172, 0.3);
  }
  
  .edit-btn:hover {
    background: var(--success);
    color: white;
  }
  
  .delete-btn {
    background: rgba(229, 62, 62, 0.1);
    color: var(--error);
    border: 1px solid rgba(229, 62, 62, 0.3);
  }
  
  .delete-btn:hover {
    background: var(--error);
    color: white;
  }
`;

// Inject additional styles
const styleSheet = document.createElement("style");
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

