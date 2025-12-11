import { useState, useEffect } from 'react';
import '../styles/Tracking.css';
import { API_ENDPOINTS } from '../config';

function Tracking() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTerm, setFilteredTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserOrders();

    // Set up real-time polling to refresh orders every 3 seconds
    const interval = setInterval(() => {
      refreshOrderData();
    }, 3000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const refreshOrderData = async () => {
    try {
      const userID = localStorage.getItem('userID');
      if (!userID) {
        return;
      }

      const response = await fetch(
        API_ENDPOINTS.GET_ORDERS_BY_USER(userID)
      );
      const data = await response.json();

      if (data.success && data.data) {
        // Only update the orders, don't reset selection or other state
        setOrders(data.data);
      }
    } catch (error) {
      console.error('Error refreshing orders:', error);
    }
  };

  const fetchUserOrders = async () => {
    try {
      const userID = localStorage.getItem('userID');
      if (!userID) {
        console.error('No user ID found');
        setLoading(false);
        return;
      }

      const response = await fetch(
        API_ENDPOINTS.GET_ORDERS_BY_USER(userID)
      );
      const data = await response.json();

      if (data.success && data.data) {
        setOrders(data.data);
        if (data.data.length > 0 && !selectedOrder) {
          setSelectedOrder(data.data[0].fld_orderID);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrackingStages = (orderStatus, orderDate) => {
    const stages = [
      { name: 'Order Received', status: 'received' },
      { name: 'Processing your Order', status: 'processing' },
      { name: 'Ready for Pickup', status: 'ready' },
      { name: 'Picked Up', status: 'pickedup' },
    ];

    const statusMap = {
      Pending: [],
      Processing: ['received', 'processing'],
      Ready: ['received', 'processing', 'ready'],
      Completed: ['received', 'processing', 'ready', 'pickedup'],
      Cancelled: [],
    };

    const completedStatuses = statusMap[orderStatus] || [];

    return stages.map((stage) => ({
      name: stage.name,
      completed: completedStatuses.includes(stage.status),
      date: completedStatuses.includes(stage.status) ? orderDate : 'Pending',
    }));
  };

  // Sort orders: Active orders first (FIFO), then completed/cancelled at bottom
  const sortOrders = (ordersArray) => {
    // Separate active and completed/cancelled orders
    const activeOrders = ordersArray.filter(
      (order) =>
        order.fld_orderStatus !== 'Completed' &&
        order.fld_orderStatus !== 'Cancelled'
    );

    const completedOrders = ordersArray.filter(
      (order) =>
        order.fld_orderStatus === 'Completed' ||
        order.fld_orderStatus === 'Cancelled'
    );

    // Sort active orders by FIFO (date first, then order ID)
    const sortedActive = [...activeOrders].sort((a, b) => {
      const dateA = new Date(a.fld_orderDate);
      const dateB = new Date(b.fld_orderDate);

      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB; // Earlier dates first
      }

      return a.fld_orderID - b.fld_orderID; // Lower ID first
    });

    // Sort completed/cancelled orders by date (most recent first)
    const sortedCompleted = [...completedOrders].sort((a, b) => {
      const dateA = new Date(a.fld_orderDate);
      const dateB = new Date(b.fld_orderDate);
      return dateB - dateA; // Most recent first
    });

    // Combine: active orders first, then completed/cancelled
    return [...sortedActive, ...sortedCompleted];
  };

  const filteredOrders =
    filteredTerm.trim() === ''
      ? sortOrders(orders)
      : sortOrders(
          orders.filter((order) =>
            String(order.fld_orderID)
              .toLowerCase()
              .includes(filteredTerm.toLowerCase())
          )
        );

  const handleSearch = () => {
    setFilteredTerm(searchTerm);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const currentOrder = orders.find((o) => o.fld_orderID === selectedOrder);
  const currentTracking = currentOrder
    ? {
        orderId: currentOrder.fld_orderID,
        status: currentOrder.fld_orderStatus,
        stages: getTrackingStages(
          currentOrder.fld_orderStatus,
          new Date(currentOrder.fld_orderDate).toLocaleDateString()
        ),
      }
    : null;

  if (loading) {
    return (
      <section className="tracking-section">
        <div className="loading">Loading your orders...</div>
      </section>
    );
  }

  if (orders.length === 0) {
    return (
      <section className="tracking-section">
        <div className="tracking-header">
          <h3>Order Tracking</h3>
          <p className="tracking-subtitle">
            Track the status of your laundry orders
          </p>
        </div>
        <p className="no-orders">
          No orders found. Please create an order first.
        </p>
      </section>
    );
  }

  return (
    <section className="tracking-section">
      <div className="tracking-header">
        <h3>My Orders</h3>
        <p className="tracking-subtitle">View and Track your Orders.</p>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search by Order ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          className="tracking-search"
        />
        <button onClick={handleSearch} className="search-btn">
          🔍 Search
        </button>
      </div>

      <div className="tracking-main">
        <div className="orders-sidebar">
          <div className="orders-list">
            {filteredOrders.map((order) => (
              <div
                key={order.fld_orderID}
                className={`order-item ${
                  selectedOrder === order.fld_orderID ? 'selected' : ''
                } ${
                  order.fld_orderStatus === 'Completed' ||
                  order.fld_orderStatus === 'Cancelled'
                    ? 'completed-order'
                    : ''
                }`}
                onClick={() => setSelectedOrder(order.fld_orderID)}
              >
                <div className="order-info">
                  <p className="order-id">#{order.fld_orderID}</p>
                  <p className="order-date">
                    {new Date(order.fld_orderDate).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`order-status ${order.fld_orderStatus.toLowerCase()}`}
                >
                  {order.fld_orderStatus}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="tracking-details">
          {currentTracking ? (
            <>
              <div className="tracking-order-info">
                <div className="order-header">
                  <div>
                    <p className="order-label">Order ID</p>
                    <p className="order-value">#{currentTracking.orderId}</p>
                  </div>
                  <span className="order-status-badge">
                    {currentTracking.status}
                  </span>
                </div>
              </div>

              <div className="tracking-timeline">
                {currentTracking.stages.map((stage, index) => (
                  <div
                    key={index}
                    className={`timeline-item ${
                      stage.completed ? 'completed' : ''
                    }`}
                  >
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <h5>{stage.name}</h5>
                      <p>{stage.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p>Please select an order to view tracking details</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default Tracking;
