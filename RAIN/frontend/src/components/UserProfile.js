import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './UserProfile.css';

const BACKEND_URL = 'http://localhost:3000';

function UserProfile({ currentUser }) {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [cancelError, setCancelError] = useState(''); // For cancellation specific errors
  const [cancellingOrderId, setCancellingOrderId] = useState(null); // To show loading on specific button

  const fetchUserOrders = async () => {
    setLoadingOrders(true);
    setOrderError('');
    setCancelError(''); // Clear cancel error on fetch
    try {
      const response = await axios.get(`${BACKEND_URL}/order/my-orders`);
      if (response.data) {
        setOrders(response.data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Error fetching user orders:', err);
      setOrderError(err.response?.data?.message || 'Failed to fetch your orders.');
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser._id) {
      fetchUserOrders();
    }
  }, [currentUser]);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }
    setCancellingOrderId(orderId);
    setCancelError('');
    try {
      const response = await axios.patch(`${BACKEND_URL}/order/my-orders/${orderId}/cancel`);
      if (response.data) {
        // Update the specific order in the list or re-fetch
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? { ...order, status: 'cancelled' } : order
          )
        );
        // Or simply call fetchUserOrders(); for a full refresh
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      setCancelError(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  if (!currentUser) {
    // This case should ideally be handled by the Route protection in App.js
    return <p>Please log in to view your profile.</p>;
  }

  return (
    <div className="user-profile-container">
      <h2>{currentUser.username}'s Profile</h2>
      
      <div className="user-details-profile">
        <p><strong>Username:</strong> {currentUser.username}</p>
        <p><strong>Email:</strong> {currentUser.email}</p>
        {/* You can add more user details here if available, e.g., First Name, Last Name */}
      </div>

      <div className="user-orders-section">
        <h3>Your Orders:</h3>
        {loadingOrders && <p>Loading your orders...</p>}
        {orderError && <p className="error-message-profile">{orderError}</p>}
        {cancelError && <p className="error-message-profile">{cancelError}</p>}
        {!loadingOrders && !orderError && (
          orders.length > 0 ? (
            <ul className="order-list-profile">
              {orders.map(order => (
                <li key={order._id} className="order-item-profile">
                  <div className="order-item-header-profile">
                    <div>
                      <strong>Model:</strong> {order.model?.name || 'N/A'}
                    </div>
                    <span className={`order-status-profile status-${order.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="order-item-body-profile">
                    <p><strong>Order ID:</strong> {order._id}</p>
                    {order.box && <p><strong>Box:</strong> {order.box?.name || 'N/A'} (Location: {order.box?.location || 'N/A'})</p>}
                    <p><strong>Ordered At:</strong> {new Date(order.createdAt).toLocaleString()}</p>
                    {order.startedPrintingAt && <p><strong>Printing Started:</strong> {new Date(order.startedPrintingAt).toLocaleString()}</p>}
                    {order.completedAt && <p><strong>Completed:</strong> {new Date(order.completedAt).toLocaleString()}</p>}
                  </div>
                  <div className="order-item-actions-profile">
                    {order.model?._id && 
                      <Link to={`/product/${order.model._id}`} className="view-product-link-profile">
                        View Product
                      </Link>
                    }
                    {(order.status === 'pending' || order.status === 'printing') && (
                      <button 
                        onClick={() => handleCancelOrder(order._id)} 
                        className="cancel-order-button-profile"
                        disabled={cancellingOrderId === order._id}
                      >
                        {cancellingOrderId === order._id ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>You have no orders yet.</p>
          )
        )}
      </div>
    </div>
  );
}

export default UserProfile;