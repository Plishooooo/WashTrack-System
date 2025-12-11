import { useState, useEffect } from 'react';
import '../styles/AdminOrders.css';
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
} from '../utils/toastUtils';
import deletelogo from '../assets/DELETE.png';
import editlogo from '../assets/EDIT.png';
import viewlogo from '../assets/VIEW.png';

function AdminOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminID, setAdminID] = useState(null);
  const [showHiddenOrdersModal, setShowHiddenOrdersModal] = useState(false);
  const [hiddenOrdersFilter, setHiddenOrdersFilter] = useState('all');
  const [hiddenOrdersSearch, setHiddenOrdersSearch] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [completionConfirm, setCompletionConfirm] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editFormData, setEditFormData] = useState({
    userID: '',
    userName: '',
    selectedServices: [],
    orderDate: '',
    status: 'Pending',
    amount: '',
    weight: '',
  });
  const [newOrderForm, setNewOrderForm] = useState({
    userID: '',
    userName: '',
    weight: '',
    status: 'Pending',
    selectedServices: [],
    amount: '₱0.00',
  });

  // Fetch orders and services on component mount
  useEffect(() => {
    // Get admin ID from localStorage
    const storedAdminID = localStorage.getItem('adminID');
    if (storedAdminID) {
      setAdminID(storedAdminID);
    }
    fetchOrders();
    fetchServices();

    // Set up auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('http://localhost:8081/orders');
      const result = await response.json();
      if (result.success) {
        setOrders(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get today's date in YYYY-MM-DD format for date picker min
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const fetchServices = async () => {
    try {
      console.log('Fetching services...');
      const response = await fetch('http://localhost:8081/services');
      const result = await response.json();
      console.log('Services response:', result);
      if (result.success) {
        console.log('Services loaded:', result.data);
        setServices(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  };

  // Helper function to check if order is older than 1 day
  const isOrderOlderThan1Day = (orderDate) => {
    const now = new Date();
    const order = new Date(orderDate);
    const diffTime = Math.abs(now - order);
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays > 1;
  };

  // Get hidden completed and cancelled orders (older than 1 day)
  const hiddenCompletedOrders = orders.filter(
    (order) =>
      (order.fld_orderStatus === 'Completed' ||
        order.fld_orderStatus === 'Cancelled') &&
      isOrderOlderThan1Day(order.fld_orderDate)
  );

  // Filter hidden orders based on selected filter
  const getFilteredHiddenOrders = () => {
    const now = new Date();
    return hiddenCompletedOrders.filter((order) => {
      const orderDate = new Date(order.fld_orderDate);
      const diffTime = Math.abs(now - orderDate);
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      // Apply age filter
      let passesAgeFilter = true;
      switch (hiddenOrdersFilter) {
        case 'last7days':
          passesAgeFilter = diffDays <= 7;
          break;
        case 'last30days':
          passesAgeFilter = diffDays <= 30;
          break;
        case 'last90days':
          passesAgeFilter = diffDays <= 90;
          break;
        case 'older':
          passesAgeFilter = diffDays > 90;
          break;
        default: // 'all'
          passesAgeFilter = true;
      }

      if (!passesAgeFilter) return false;

      // Apply search filter
      const searchLower = hiddenOrdersSearch.toLowerCase();
      if (searchLower) {
        const orderID = String(order.fld_orderID).toLowerCase();
        const customerName = (order.fld_username || '').toLowerCase();
        const serviceName = (order.fld_serviceName || '').toLowerCase();
        const items = (order.fld_items || '').toLowerCase();

        return (
          orderID.includes(searchLower) ||
          customerName.includes(searchLower) ||
          serviceName.includes(searchLower) ||
          items.includes(searchLower)
        );
      }

      return true;
    });
  };

  const filteredHiddenOrders = getFilteredHiddenOrders();

  // Helper to close modal and reset filters
  const closeHiddenOrdersModal = () => {
    setShowHiddenOrdersModal(false);
    setHiddenOrdersSearch('');
    setHiddenOrdersFilter('all');
  };

  const ordersData = orders.filter((order) => {
    // Hide completed and cancelled orders older than 1 day by default
    if (
      (order.fld_orderStatus === 'Completed' ||
        order.fld_orderStatus === 'Cancelled') &&
      isOrderOlderThan1Day(order.fld_orderDate)
    ) {
      return false; // Always hide by default
    }
    return true;
  });

  const handleStatusChange = (orderId, newStatus) => {
    // If changing to Completed or Cancelled, show confirmation dialog
    if (newStatus === 'Completed' || newStatus === 'Cancelled') {
      setCompletionConfirm({
        orderId,
        newStatus,
      });
      return;
    }

    // For other statuses, update directly
    proceedWithStatusChange(orderId, newStatus);
  };

  const proceedWithStatusChange = (orderId, newStatus) => {
    // Update locally
    setOrders(
      orders.map((order) =>
        order.fld_orderID === orderId
          ? { ...order, fld_orderStatus: newStatus }
          : order
      )
    );

    // Update in database
    fetch(`http://localhost:8081/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus }),
    })
      .then(() => {
        // If status is changed to "Completed", create a report
        if (newStatus === 'Completed') {
          createReport(orderId);
        }
      })
      .catch((error) => console.error('Failed to update status:', error));
  };

  const createReport = async (orderId) => {
    try {
      const reportResponse = await fetch('http://localhost:8081/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminID: adminID,
          orderID: orderId,
        }),
      });
      const reportResult = await reportResponse.json();
      if (reportResult.success) {
        console.log('Report created successfully for order:', orderId);
        showSuccessToast('Report generated for completed order');
      } else {
        console.error('Report creation failed:', reportResult.error);
        showWarningToast('Order completed but report generation failed');
      }
    } catch (reportError) {
      console.error('Failed to create report:', reportError);
      showWarningToast('Order completed but report generation failed');
    }
  };

  const handleViewClick = (order) => {
    setViewOrder(order);
  };

  const handleCloseView = () => {
    setViewOrder(null);
  };

  const handleEditClick = (order) => {
    // Prevent editing of completed and cancelled orders
    if (
      order.fld_orderStatus === 'Completed' ||
      order.fld_orderStatus === 'Cancelled'
    ) {
      showWarningToast(
        order.fld_orderStatus === 'Completed'
          ? 'Completed orders cannot be edited'
          : 'Cancelled orders cannot be edited'
      );
      return;
    }
    setEditOrder(order.fld_orderID);
    const dateObject = new Date(order.fld_orderDate);
    const formattedDate = dateObject.toISOString().split('T')[0];
    setEditFormData({
      userID: order.fld_userID,
      userName: order.fld_username || '-',
      selectedServices: [order.fld_serviceID],
      orderDate: formattedDate,
      status: order.fld_orderStatus,
      amount: order.fld_amount,
      items: order.fld_items || '',
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;

    // Prevent orderDate from being changed
    if (name === 'orderDate') {
      return;
    }

    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditServiceToggle = (serviceId) => {
    setEditFormData((prev) => {
      // For single selection - if already selected, deselect it; otherwise select it
      const updatedServices = prev.selectedServices.includes(serviceId)
        ? []
        : [serviceId];

      // Calculate total price from database services
      const totalPrice = updatedServices.reduce((sum, id) => {
        const service = services.find((s) => s.fld_serviceID === id);
        return sum + (service ? parseFloat(service.fld_servicePrice) : 0);
      }, 0);

      return {
        ...prev,
        selectedServices: updatedServices,
        amount: totalPrice.toFixed(2),
      };
    });
  };

  const handleSaveEdit = async () => {
    console.log('=== handleSaveEdit called ===');
    console.log('editFormData:', editFormData);
    console.log('editOrder:', editOrder);

    if (!editFormData.selectedServices.length) {
      showErrorToast('Please select at least one service');
      return;
    }

    try {
      const orderData = {
        serviceID: editFormData.selectedServices[0],
        orderDate: editFormData.orderDate,
        status: editFormData.status,
        amount: editFormData.amount,
        items: editFormData.items,
      };

      console.log(
        'Sending PUT request to:',
        `http://localhost:8081/orders/${editOrder}`
      );
      console.log('Order data:', orderData);

      const response = await fetch(
        `http://localhost:8081/orders/${editOrder}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        }
      );

      const result = await response.json();
      console.log('Response from server:', result);

      if (result.success) {
        // Refresh orders from backend to ensure latest data
        await fetchOrders();
        setEditOrder(null);
        showSuccessToast('Order updated successfully!');
      } else {
        showErrorToast('Failed to update order: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to update order:', error);
      showErrorToast('Failed to update order');
    }
  };

  const handleCancelEdit = () => {
    setEditOrder(null);
  };

  const confirmCompletion = () => {
    if (completionConfirm) {
      proceedWithStatusChange(
        completionConfirm.orderId,
        completionConfirm.newStatus
      );
      setCompletionConfirm(null);
    }
  };

  const cancelCompletion = () => {
    setCompletionConfirm(null);
  };

  const handleDeleteClick = (orderId) => {
    // Find the order to check its status
    const order = ordersData.find((o) => o.fld_orderID === orderId);
    if (
      order &&
      (order.fld_orderStatus === 'Completed' ||
        order.fld_orderStatus === 'Cancelled')
    ) {
      showWarningToast(
        order.fld_orderStatus === 'Completed'
          ? 'Completed orders cannot be deleted'
          : 'Cancelled orders cannot be deleted'
      );
      return;
    }
    setDeleteConfirm(orderId);
  };

  const confirmDelete = (orderId) => {
    if (!orderId) return;

    fetch(`http://localhost:8081/orders/${orderId}`, {
      method: 'DELETE',
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          // Remove from local state
          setOrders(orders.filter((order) => order.fld_orderID !== orderId));
          console.log('Order deleted successfully');
          showSuccessToast('Order deleted successfully');
        }
      })
      .catch((error) => console.error('Failed to delete order:', error));

    setDeleteConfirm(null);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleAddOrderClick = () => {
    setShowAddForm(true);
  };

  const handleServiceToggle = (serviceId) => {
    setNewOrderForm((prev) => {
      // For new orders, only allow single service selection (radio button behavior)
      const updatedServices = [serviceId];

      // Get price from the selected service
      const service = services.find((s) => s.fld_serviceID === serviceId);
      const pricePerKg = service ? parseFloat(service.fld_servicePrice) : 0;
      const weight = prev.weight ? parseFloat(prev.weight) : 0;
      // Calculate tier: every 7kg or part thereof = 1 tier
      const tier = weight > 0 ? Math.ceil(weight / 7) : 0;
      const totalPrice = pricePerKg * tier;

      return {
        ...prev,
        selectedServices: updatedServices,
        amount: `₱${totalPrice.toFixed(2)}`,
      };
    });
  };

  const handleCloseAddForm = () => {
    setShowAddForm(false);
    setNewOrderForm({
      userID: '',
      userName: '',
      items: '',
      status: 'Pending',
      selectedServices: [],
      amount: '₱0.00',
    });
  };

  const handleAddFormChange = (e) => {
    const { name, value } = e.target;

    setNewOrderForm((prev) => {
      const updatedForm = {
        ...prev,
        [name]: value,
      };

      // If weight changed, recalculate the total price
      if (name === 'weight' && prev.selectedServices.length > 0) {
        const service = services.find(
          (s) => s.fld_serviceID === prev.selectedServices[0]
        );
        const pricePerKg = service ? parseFloat(service.fld_servicePrice) : 0;
        const weight = value ? parseFloat(value) : 0;
        // Calculate tier: every 7kg or part thereof = 1 tier
        const tier = weight > 0 ? Math.ceil(weight / 7) : 0;
        const totalPrice = pricePerKg * tier;
        updatedForm.amount = `₱${totalPrice.toFixed(2)}`;
      }

      return updatedForm;
    });

    // If userID field changed, fetch user data
    if (name === 'userID' && value) {
      fetchUserData(value);
    }
  };

  const fetchUserData = async (userID) => {
    try {
      console.log('Fetching user data for ID:', userID);
      const response = await fetch(
        `http://localhost:8081/getuser/id/${userID}`
      );
      const result = await response.json();
      console.log('User fetch result:', result);
      if (result.success && result.user) {
        setNewOrderForm((prev) => ({
          ...prev,
          userName: result.user.fld_username || 'User not found',
        }));
      } else {
        setNewOrderForm((prev) => ({
          ...prev,
          userName: 'User does not exist',
        }));
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setNewOrderForm((prev) => ({
        ...prev,
        userName: 'User does not exist',
      }));
    }
  };

  const handleSubmitAddOrder = async (e) => {
    e.preventDefault();
    console.log('Current adminID:', adminID);

    // Validate all required fields
    if (!newOrderForm.userID) {
      showErrorToast('Please select a customer');
      return;
    }
    if (newOrderForm.selectedServices.length === 0) {
      showErrorToast('Please select a service');
      return;
    }
    if (!newOrderForm.weight || parseFloat(newOrderForm.weight) <= 0) {
      showErrorToast('Please enter a valid weight in kg');
      return;
    }

    // Validate the amount make sure that its greater than 0
    const amount = parseFloat(newOrderForm.amount.replace('₱', ''));
    if (isNaN(amount) || amount <= 0) {
      showErrorToast('Amount must be greater than 0');
      return;
    }

    try {
      const orderData = {
        userID: parseInt(newOrderForm.userID),
        serviceID: newOrderForm.selectedServices[0],
        status: newOrderForm.status,
        amount: amount.toString(),
        adminID: adminID,
        items: newOrderForm.weight,
      };
      console.log('Sending order data:', orderData);

      const response = await fetch('http://localhost:8081/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      const result = await response.json();
      if (result.success) {
        console.log('Order created with ID from response:', result.id);
        fetchOrders();
        handleCloseAddForm();
        showSuccessToast('Order created successfully');
      } else {
        showErrorToast('Failed to create order: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      showErrorToast('Failed to create order');
    }
  };

  const filteredOrders = ordersData.filter(
    (order) =>
      (order.fld_orderID &&
        order.fld_orderID
          .toString()
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (order.fld_userID &&
        order.fld_userID
          .toString()
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (order.fld_username &&
        order.fld_username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Separate pending, completed and cancelled orders
  const pendingOrders = filteredOrders.filter(
    (order) =>
      order.fld_orderStatus !== 'Completed' &&
      order.fld_orderStatus !== 'Cancelled'
  );
  const completedOrders = filteredOrders.filter(
    (order) => order.fld_orderStatus === 'Completed'
  );
  const cancelledOrders = filteredOrders.filter(
    (order) =>
      order.fld_orderStatus === 'Cancelled' &&
      !isOrderOlderThan1Day(order.fld_orderDate)
  );

  // FIFO Algorithm: Sort orders by date and time (earliest first)
  const sortOrdersByFIFO = (ordersArray) => {
    return [...ordersArray].sort((a, b) => {
      // Sort by date and time (earliest first)
      const dateA = new Date(a.fld_orderDate);
      const dateB = new Date(b.fld_orderDate);

      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB; // Earlier dates come first
      }

      // If dates are the same, sort by order ID (lower ID first)
      return a.fld_orderID - b.fld_orderID;
    });
  };

  // Apply FIFO sorting to all order lists
  const sortedPendingOrders = sortOrdersByFIFO(pendingOrders);
  const sortedCompletedOrders = sortOrdersByFIFO(completedOrders);
  const sortedCancelledOrders = sortOrdersByFIFO(cancelledOrders);

  const getStatusColor = (status) => {
    switch (status) {
      case 'processing':
        return '#3498db';
      case 'ready':
        return '#27ae60';
      case 'completed':
        return '#2ecc71';
      case 'pending':
        return '#f39c12';
      case 'cancelled':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  return (
    <section className="admin-orders-section">
      <div className="section-header">
        <div className="header-content">
          <h3>Order Management</h3>
          <p>Manage and track all customer orders</p>
        </div>
        <button className="add-order-btn" onClick={handleAddOrderClick}>
          ➕ Add Order
        </button>
      </div>

      <div className="search-box">
        <div
          style={{
            display: 'flex',
            gap: '15px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            placeholder="Search orders by ID or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{ flex: 1, maxWidth: '400px' }}
          />
          {hiddenCompletedOrders.length > 0 && (
            <button
              onClick={() => setShowHiddenOrdersModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#d97706')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#f59e0b')}
            >
              <img src={viewlogo} className="pastOrder-icon" /> View Past Orders
              ({hiddenCompletedOrders.length})
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="no-results-container">
          <p className="no-results-text">No results found</p>
          <p className="no-results-subtext">
            {searchTerm
              ? `No orders match your search: "${searchTerm}"`
              : 'No orders available'}
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          {/* Active Orders Section */}
          <div className="orders-section active-orders">
            <h4 className="section-title">Active Orders</h4>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Service</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedPendingOrders && sortedPendingOrders.length > 0 ? (
                  sortedPendingOrders.map((order) => (
                    <tr key={order.fld_orderID}>
                      <td className="order-id-cell">{order.fld_orderID}</td>
                      <td>{order.fld_username || '-'}</td>
                      <td>
                        {new Date(order.fld_orderDate).toLocaleDateString()}
                      </td>
                      <td>{order.fld_serviceName || '-'}</td>
                      <td>{order.fld_items || '-'}</td>
                      <td>
                        <select
                          className="status-select"
                          value={order.fld_orderStatus}
                          onChange={(e) =>
                            handleStatusChange(
                              order.fld_orderID,
                              e.target.value
                            )
                          }
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">Processing</option>
                          <option value="Ready">Ready</option>
                          <option value="Completed">Complete</option>
                          <option value="Cancelled">Cancel</option>
                        </select>
                      </td>
                      <td className="total-cell">
                        ₱{parseFloat(order.fld_amount).toFixed(2)}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="action-btn view-btn"
                          onClick={() => handleViewClick(order)}
                          title="View"
                        >
                          <img src={viewlogo} className="iconslogo" />
                        </button>
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEditClick(order)}
                          title="Edit"
                        >
                          <img src={editlogo} className="iconslogo" />
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteClick(order.fld_orderID)}
                        >
                          <img src={deletelogo} className="iconslogo" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      style={{ textAlign: 'center', padding: '20px' }}
                    >
                      No active orders
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Completed Orders Section */}
          {sortedCompletedOrders && sortedCompletedOrders.length > 0 && (
            <div className="orders-section completed-orders">
              <h4 className="section-title">Completed Orders</h4>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Service</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCompletedOrders.map((order) => (
                    <tr key={order.fld_orderID} className="completed-row">
                      <td className="order-id-cell">{order.fld_orderID}</td>
                      <td>{order.fld_username || '-'}</td>
                      <td>
                        {new Date(order.fld_orderDate).toLocaleDateString()}
                      </td>
                      <td>{order.fld_serviceName || '-'}</td>
                      <td>{order.fld_items || '-'}</td>
                      <td>
                        <span className="completed-status">Completed</span>
                      </td>
                      <td className="total-cell">
                        ₱{parseFloat(order.fld_amount).toFixed(2)}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="action-btn view-btn"
                          onClick={() => handleViewClick(order)}
                          title="View"
                        >
                          👁️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Cancelled Orders Section */}
          {sortedCancelledOrders && sortedCancelledOrders.length > 0 && (
            <div className="orders-section cancelled-orders">
              <h4 className="section-title">Cancelled Orders</h4>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Service</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCancelledOrders.map((order) => (
                    <tr key={order.fld_orderID} className="cancelled-row">
                      <td className="order-id-cell">{order.fld_orderID}</td>
                      <td>{order.fld_username || '-'}</td>
                      <td>
                        {new Date(order.fld_orderDate).toLocaleDateString()}
                      </td>
                      <td>{order.fld_serviceName || '-'}</td>
                      <td>{order.fld_items || '-'}</td>
                      <td>
                        <span className="cancelled-status">Cancelled</span>
                      </td>
                      <td className="total-cell">
                        ₱{parseFloat(order.fld_amount).toFixed(2)}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="action-btn view-btn"
                          onClick={() => handleViewClick(order)}
                          title="View"
                        >
                          👁️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {deleteConfirm && (
        <div className="confirmation-modal">
          <div className="confirmation-content">
            <h3>Delete Order</h3>
            <p>
              Are you sure you want to delete this order? This action cannot be
              undone.
            </p>
            <div className="confirmation-actions">
              <button className="btn-cancel" onClick={cancelDelete}>
                Cancel
              </button>
              <button
                className="btn-confirm"
                onClick={() => confirmDelete(deleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {completionConfirm && (
        <div className="confirmation-modal">
          <div className="confirmation-content">
            <h3>
              {completionConfirm.newStatus === 'Completed'
                ? 'Complete Order'
                : 'Cancel Order'}
            </h3>
            <p>
              Are you sure you want to mark this order as{' '}
              <strong>{completionConfirm.newStatus}</strong>?
            </p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
              Once {completionConfirm.newStatus.toLowerCase()}:
            </p>
            <ul style={{ fontSize: '14px', color: '#666', marginLeft: '20px' }}>
              <li>The order cannot be edited</li>
              <li>The order cannot be deleted</li>
              {completionConfirm.newStatus === 'Completed' && (
                <li>A report will be generated automatically</li>
              )}
              <li>The order will be archived after 1 day</li>
            </ul>
            <div className="confirmation-actions">
              <button className="btn-cancel" onClick={cancelCompletion}>
                Cancel
              </button>
              <button
                className="btn-confirm btn-success"
                onClick={confirmCompletion}
              >
                {completionConfirm.newStatus === 'Completed'
                  ? 'Complete Order'
                  : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewOrder && (
        <div className="modal-overlay" onClick={handleCloseView}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Order Details</h3>
              <button className="close-btn" onClick={handleCloseView}>
                ✕
              </button>
            </div>

            <div className="order-details">
              <div className="detail-group">
                <label>Order ID</label>
                <p>{viewOrder.fld_orderID}</p>
              </div>

              <div className="detail-group">
                <label>Customer Name</label>
                <p>{viewOrder.fld_username || '-'}</p>
              </div>

              <div className="detail-group">
                <label>Order Date</label>
                <p>{new Date(viewOrder.fld_orderDate).toLocaleDateString()}</p>
              </div>

              <div className="detail-group">
                <label>Service</label>
                <p>{viewOrder.fld_serviceName || '-'}</p>
              </div>

              <div className="detail-group">
                <label>Items</label>
                <p>{viewOrder.fld_items || '-'}</p>
              </div>

              <div className="detail-group">
                <label>Status</label>
                <p>
                  <span
                    className="status-badge-detail"
                    style={{
                      backgroundColor: getStatusColor(
                        viewOrder.fld_orderStatus
                      ),
                    }}
                  >
                    {viewOrder.fld_orderStatus}
                  </span>
                </p>
              </div>

              <div className="detail-group">
                <label>Total Amount</label>
                <p className="total-amount">
                  ₱{parseFloat(viewOrder.fld_amount).toFixed(2)}
                </p>
              </div>

              <div className="detail-actions">
                <button className="btn-close" onClick={handleCloseView}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editOrder && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Order</h3>
              <button className="close-btn" onClick={handleCancelEdit}>
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEdit();
              }}
              className="edit-form"
            >
              <div className="form-group">
                <label htmlFor="edit-orderID">Order ID</label>
                <input
                  type="text"
                  id="edit-orderID"
                  name="orderID"
                  value={editOrder}
                  disabled
                  readOnly
                  className="read-only-field"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-userID">User ID</label>
                <input
                  type="text"
                  id="edit-userID"
                  name="userID"
                  value={editFormData.userID}
                  disabled
                  readOnly
                  className="read-only-field"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-userName">Customer Name</label>
                <input
                  type="text"
                  id="edit-userName"
                  name="userName"
                  value={editFormData.userName}
                  disabled
                  readOnly
                  className="read-only-field"
                />
              </div>

              <div className="form-group">
                <label>Select Service</label>
                <div className="services-checkboxes">
                  {services && services.length > 0 ? (
                    services.map((service) => (
                      <label
                        key={service.fld_serviceID}
                        className="service-checkbox"
                      >
                        <input
                          type="radio"
                          name="editService"
                          checked={editFormData.selectedServices.includes(
                            service.fld_serviceID
                          )}
                          onChange={() =>
                            handleEditServiceToggle(service.fld_serviceID)
                          }
                          disabled={service.fld_serviceStatus !== 'Available'}
                        />
                        <span className="checkbox-label">
                          {service.fld_serviceName} - ₱
                          {parseFloat(service.fld_servicePrice).toFixed(2)}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p>No services available</p>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="edit-date">Order Date</label>
                <input
                  type="text"
                  id="edit-date"
                  name="orderDate"
                  value={new Date(editFormData.orderDate).toLocaleDateString()}
                  readOnly
                  disabled
                  className="read-only-field"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-status">Status</label>
                <select
                  id="edit-status"
                  name="status"
                  value={editFormData.status}
                  onChange={handleEditFormChange}
                  required
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Ready">Ready</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="edit-items">Items</label>
                <textarea
                  id="edit-items"
                  name="items"
                  value={editFormData.items}
                  onChange={handleEditFormChange}
                  placeholder="Enter the items ordered"
                  rows="3"
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label htmlFor="edit-amount">
                  Total Amount (Auto-calculated)
                </label>
                <input
                  type="text"
                  id="edit-amount"
                  name="amount"
                  value={`₱${parseFloat(editFormData.amount || 0).toFixed(2)}`}
                  placeholder="₱0.00"
                  readOnly
                  disabled
                  className="read-only-field"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="modal-overlay" onClick={handleCloseAddForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Order</h3>
              <button className="close-btn" onClick={handleCloseAddForm}>
                ✕
              </button>
            </div>

            <form className="add-order-form" onSubmit={handleSubmitAddOrder}>
              <div className="form-group">
                <label htmlFor="add-userID">User ID</label>
                <input
                  type="number"
                  id="add-userID"
                  name="userID"
                  value={newOrderForm.userID}
                  onChange={handleAddFormChange}
                  placeholder="Enter user ID"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="add-userName">Customer Name</label>
                <input
                  type="text"
                  id="add-userName"
                  name="userName"
                  value={newOrderForm.userName}
                  readOnly
                  className="read-only-field"
                  placeholder="Enter user ID above"
                />
              </div>

              <div className="form-group">
                <label>Select Services</label>
                <div className="services-checkboxes">
                  {services && services.length > 0 ? (
                    services.map((service) => (
                      <label
                        key={service.fld_serviceID}
                        className="service-checkbox"
                      >
                        <input
                          type="radio"
                          name="addService"
                          checked={newOrderForm.selectedServices.includes(
                            service.fld_serviceID
                          )}
                          onChange={() =>
                            handleServiceToggle(service.fld_serviceID)
                          }
                          disabled={service.fld_serviceStatus !== 'Available'}
                        />
                        <span className="checkbox-label">
                          {service.fld_serviceName} - ₱
                          {parseFloat(service.fld_servicePrice).toFixed(2)}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p>No services available</p>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="add-weight">Weight (kg)</label>
                <input
                  type="number"
                  id="add-weight"
                  name="weight"
                  value={newOrderForm.weight}
                  onChange={handleAddFormChange}
                  placeholder="Enter weight in kilograms"
                  step="0.1"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="add-status">Status</label>
                <select
                  id="add-status"
                  name="status"
                  value={newOrderForm.status}
                  onChange={handleAddFormChange}
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Ready">Ready</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="add-total">
                  Total Amount (Auto-calculated)
                </label>
                <input
                  type="text"
                  id="add-total"
                  name="amount"
                  value={newOrderForm.amount}
                  placeholder="₱0.00"
                  readOnly
                  className="read-only-field"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCloseAddForm}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Add Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Past Orders Modal */}
      {showHiddenOrdersModal && (
        <div className="modal-overlay" onClick={() => closeHiddenOrdersModal()}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '900px' }}
          >
            <div className="modal-header">
              <h3>Past Orders</h3>
              <button
                className="close-btn"
                onClick={() => closeHiddenOrdersModal()}
              >
                ✕
              </button>
            </div>

            {/* Filter Buttons */}
            <div
              style={{
                padding: '15px 20px',
                borderBottom: '1px solid #e0e0e0',
              }}
            >
              {/* Search Bar */}
              <div style={{ marginBottom: '15px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search by Order ID, Customer, Service, or Items..."
                  value={hiddenOrdersSearch}
                  onChange={(e) => setHiddenOrdersSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div
                style={{
                  marginBottom: '10px',
                  fontSize: '12px',
                  color: '#999',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}
              >
                Filter by Age:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setHiddenOrdersFilter('all')}
                  style={{
                    padding: '6px 12px',
                    backgroundColor:
                      hiddenOrdersFilter === 'all' ? '#667eea' : '#f0f0f0',
                    color: hiddenOrdersFilter === 'all' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                  }}
                >
                  All Orders
                </button>
                <button
                  onClick={() => setHiddenOrdersFilter('last7days')}
                  style={{
                    padding: '6px 12px',
                    backgroundColor:
                      hiddenOrdersFilter === 'last7days'
                        ? '#667eea'
                        : '#f0f0f0',
                    color:
                      hiddenOrdersFilter === 'last7days' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                  }}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setHiddenOrdersFilter('last30days')}
                  style={{
                    padding: '6px 12px',
                    backgroundColor:
                      hiddenOrdersFilter === 'last30days'
                        ? '#667eea'
                        : '#f0f0f0',
                    color:
                      hiddenOrdersFilter === 'last30days' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                  }}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => setHiddenOrdersFilter('last90days')}
                  style={{
                    padding: '6px 12px',
                    backgroundColor:
                      hiddenOrdersFilter === 'last90days'
                        ? '#667eea'
                        : '#f0f0f0',
                    color:
                      hiddenOrdersFilter === 'last90days' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                  }}
                >
                  Last 90 Days
                </button>
                <button
                  onClick={() => setHiddenOrdersFilter('older')}
                  style={{
                    padding: '6px 12px',
                    backgroundColor:
                      hiddenOrdersFilter === 'older' ? '#667eea' : '#f0f0f0',
                    color: hiddenOrdersFilter === 'older' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                  }}
                >
                  Older than 90 Days
                </button>
              </div>
            </div>

            <div
              style={{ padding: '20px', maxHeight: '600px', overflowY: 'auto' }}
            >
              {filteredHiddenOrders.length > 0 ? (
                <table className="admin-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Service</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHiddenOrders.map((order) => (
                      <tr key={order.fld_orderID} className="completed-row">
                        <td className="order-id-cell">{order.fld_orderID}</td>
                        <td>{order.fld_username || '-'}</td>
                        <td>
                          {new Date(order.fld_orderDate).toLocaleDateString()}
                        </td>
                        <td>{order.fld_serviceName || '-'}</td>
                        <td>{order.fld_items || '-'}</td>
                        <td className="total-cell">
                          ₱{parseFloat(order.fld_amount).toFixed(2)}
                        </td>
                        <td className="actions-cell">
                          <button
                            className="action-btn view-btn"
                            onClick={() => {
                              handleViewClick(order);
                              closeHiddenOrdersModal();
                            }}
                            title="View"
                          >
                            👁️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ textAlign: 'center', color: '#999' }}>
                  No orders found in this filter
                </p>
              )}
            </div>

            <div
              style={{
                padding: '20px',
                textAlign: 'right',
                borderTop: '1px solid #e0e0e0',
              }}
            >
              <button
                onClick={() => closeHiddenOrdersModal()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminOrders;
