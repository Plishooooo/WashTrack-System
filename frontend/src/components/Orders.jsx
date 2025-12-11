import { useState, useEffect } from 'react';
import '../styles/Orders.css';
import { API_ENDPOINTS } from '../config';

function Orders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTerm, setFilteredTerm] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userID, setUserID] = useState(null);

  // Fetch orders on component mount
  useEffect(() => {
    // Get userID from localStorage
    const storedUserID = localStorage.getItem('userID');
    console.log('Orders component mounted. Stored userID:', storedUserID);
    console.log('All localStorage items:', JSON.stringify(localStorage));

    if (storedUserID) {
      setUserID(storedUserID);
      fetchUserOrders(storedUserID);

      // Set up real-time polling to refresh orders every 3 seconds
      const interval = setInterval(() => {
        refreshOrderData(storedUserID);
      }, 3000);

      // Cleanup interval on component unmount
      return () => clearInterval(interval);
    } else {
      setLoading(false);
      console.warn('No userID found in localStorage');
      alert('Please log in first');
    }
  }, []);

  const refreshOrderData = async (userId) => {
    try {
      const response = await fetch(
        API_ENDPOINTS.GET_ORDERS_BY_USER(userId)
      );
      const result = await response.json();
      if (result.success) {
        // Only update the orders, don't reset search or other state
        setOrders(result.data);
      } else {
        console.error('Failed to refresh orders:', result.error);
      }
    } catch (error) {
      console.error('Failed to refresh orders:', error);
    }
  };

  const fetchUserOrders = async (userId) => {
    try {
      const response = await fetch(
        API_ENDPOINTS.GET_ORDERS_BY_USER(userId)
      );
      const result = await response.json();
      if (result.success) {
        setOrders(result.data);
      } else {
        console.error('Failed to fetch orders:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // FIFO Algorithm: Sort orders by date and order ID (earliest first)
  // Only show orders that are still in queue (not completed or cancelled)
  const sortOrdersByFIFO = (ordersArray) => {
    // Filter to only show active orders (in queue)
    const activeOrders = ordersArray.filter(
      (order) =>
        order.fld_orderStatus !== 'Completed' &&
        order.fld_orderStatus !== 'Cancelled'
    );

    return [...activeOrders].sort((a, b) => {
      // First, sort by date (earliest date first)
      const dateA = new Date(a.fld_orderDate);
      const dateB = new Date(b.fld_orderDate);

      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB; // Earlier dates come first
      }

      // If dates are the same, sort by order ID (lower ID first - first created)
      return a.fld_orderID - b.fld_orderID;
    });
  };

  const filteredOrders = orders.filter(
    (order) =>
      (order.fld_orderID &&
        order.fld_orderID
          .toString()
          .toLowerCase()
          .includes(filteredTerm.toLowerCase())) ||
      (order.fld_items &&
        order.fld_items.toLowerCase().includes(filteredTerm.toLowerCase()))
  );

  // Apply FIFO sorting to filtered orders (only active orders in queue)
  const queueOrders = sortOrdersByFIFO(filteredOrders);

  // Separate completed/cancelled orders (not in queue)
  const completedOrders = filteredOrders
    .filter(
      (order) =>
        order.fld_orderStatus === 'Completed' ||
        order.fld_orderStatus === 'Cancelled'
    )
    .sort((a, b) => {
      // Sort completed orders by date (most recent first)
      const dateA = new Date(a.fld_orderDate);
      const dateB = new Date(b.fld_orderDate);
      return dateB - dateA;
    });

  const handleSearch = () => {
    setFilteredTerm(searchTerm);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
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

  if (loading) {
    return (
      <section className="orders-section">
        <p style={{ textAlign: 'center', padding: '20px' }}>
          Loading orders...
        </p>
      </section>
    );
  }

  return (
    <section className="orders-section">
      <div className="orders-header">
        <div className="header-content">
          <h3>My Orders</h3>
          <p className="orders-subtitle">View and Track your Orders.</p>
        </div>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search orders by ID or items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          className="search-input"
        />
        <button onClick={handleSearch} className="search-btn">
          🔍 Search
        </button>
      </div>

      {/* Active Orders in Queue */}
      {queueOrders && queueOrders.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h4
            style={{
              padding: '15px 20px',
              backgroundColor: '#f8f9fa',
              margin: '0 0 10px 0',
              borderLeft: '4px solid #667eea',
              fontWeight: '600',
            }}
          >
            🕐 Orders in Queue ({queueOrders.length})
          </h4>
          <div className="table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Queue #</th>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Service</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {queueOrders.map((order, index) => (
                  <tr key={order.fld_orderID}>
                    <td className="queue-number">
                      <span
                        style={{
                          fontWeight: 'bold',
                          color: '#667eea',
                          fontSize: '16px',
                        }}
                      >
                        #{index + 1}
                      </span>
                    </td>
                    <td className="order-id">{order.fld_orderID}</td>
                    <td>
                      {new Date(order.fld_orderDate).toLocaleDateString()}
                    </td>
                    <td>{order.fld_serviceName || '-'}</td>
                    <td>{order.fld_items || '-'}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusColor(
                            order.fld_orderStatus
                          ),
                        }}
                      >
                        {order.fld_orderStatus}
                      </span>
                    </td>
                    <td className="total">
                      ₱{parseFloat(order.fld_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completed/Cancelled Orders */}
      {completedOrders && completedOrders.length > 0 && (
        <div>
          <h4
            style={{
              padding: '15px 20px',
              backgroundColor: '#f8f9fa',
              margin: '0 0 10px 0',
              borderLeft: '4px solid #95a5a6',
              fontWeight: '600',
            }}
          >
            ✓ Order History ({completedOrders.length})
          </h4>
          <div className="table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Service</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {completedOrders.map((order) => (
                  <tr key={order.fld_orderID}>
                    <td className="order-id">{order.fld_orderID}</td>
                    <td>
                      {new Date(order.fld_orderDate).toLocaleDateString()}
                    </td>
                    <td>{order.fld_serviceName || '-'}</td>
                    <td>{order.fld_items || '-'}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusColor(
                            order.fld_orderStatus
                          ),
                        }}
                      >
                        {order.fld_orderStatus}
                      </span>
                    </td>
                    <td className="total">
                      ₱{parseFloat(order.fld_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No orders message */}
      {queueOrders.length === 0 && completedOrders.length === 0 && (
        <div className="table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Service</th>
                <th>Items</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan="6"
                  style={{ textAlign: 'center', padding: '20px' }}
                >
                  No orders available
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default Orders;
