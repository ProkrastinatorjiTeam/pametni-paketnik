import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import OrderTimer from './OrderTimer'; // Your existing timer component
import './UserProfile.css';

const BACKEND_URL = 'http://localhost:3000';

function UserProfile({ currentUser }) {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderError, setOrderError] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  const fetchUserOrders = async () => {
    setLoadingOrders(true);
    setOrderError('');
    setCancelError('');
    try {
      const response = await axios.get(`${BACKEND_URL}/order/my-orders`);
      setOrders(response.data || []);
    } catch (err) {
      setOrderError(err.response?.data?.message || 'Failed to fetch your orders.');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (currentUser?._id) {
      fetchUserOrders();
    }
  }, [currentUser]);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancellingOrderId(orderId);
    setCancelError('');
    try {
      const response = await axios.patch(`${BACKEND_URL}/order/my-orders/${orderId}/cancel`);
      setOrders(prevOrders => prevOrders.map(order => order._id === orderId ? response.data : order));
    } catch (err) {
      setCancelError(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleOrderTimerEnd = (orderId) => {
    console.log(`Client timer ended for order ${orderId}. Fetching updated orders.`);
    fetchUserOrders();
  };

  if (!currentUser) {
    return <p>Please log in to view your profile.</p>;
  }

  return (
      <div className="user-profile-wrapper">
        <div className="user-profile-container">
          <h2>{currentUser.username}'s Profile</h2>

          <div className="user-details-card">
            <div className="details-grid">
              <strong>Username:</strong>
              <span>{currentUser.username}</span>
              <strong>Email:</strong>
              <span>{currentUser.email}</span>
            </div>
          </div>

          <div className="user-orders-section">
            <h3>Your Orders</h3>
            {loadingOrders && <p>Loading your orders...</p>}
            {orderError && <p className="error-message-profile">{orderError}</p>}
            {cancelError && <p className="error-message-profile">{cancelError}</p>}

            {!loadingOrders && !orderError && (
                orders.length > 0 ? (
                    <ul className="order-list-profile">
                      {orders.map(order => (
                          <li key={order._id} className="order-item-profile">
                            <div className="order-item-header">
                              <div className="order-header-info">
                                <strong>{order.model?.name || 'N/A'}</strong>
                                <span className="order-id-text">Order ID: {order._id}</span>
                              </div>
                              <span className={`order-status-badge status-${order.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                        {order.status}
                      </span>
                            </div>

                            <div className="order-item-details-grid">
                              {order.box && <><strong>Printer Box:</strong><span>{order.box.name} ({order.box.location})</span></>}
                              <strong>Ordered At:</strong><span>{new Date(order.createdAt).toLocaleString()}</span>

                              {order.status === 'printing' && order.startedPrintingAt && order.model?.estimatedPrintTime ? (
                                  <>
                                    <strong>Time Remaining:</strong>
                                    <span>
                            <OrderTimer orderId={order._id} startedAt={order.startedPrintingAt} estimatedPrintTimeMinutes={order.model.estimatedPrintTime} status={order.status} onTimerEnd={handleOrderTimerEnd} />
                          </span>
                                  </>
                              ) : order.status === 'ready to pickup' && order.completedAt ? (
                                  <><strong>Ready for Pickup:</strong><span>{new Date(order.completedAt).toLocaleString()}</span></>
                              ) : order.status === 'cancelled' && order.completedAt ? (
                                  <><strong>Cancelled At:</strong><span>{new Date(order.completedAt).toLocaleString()}</span></>
                              ) : null}
                            </div>

                            <div className="order-item-actions">
                              {order.model?._id &&
                                  <Link to={`/product/${order.model._id}`} className="action-link-view">
                                    View Product
                                  </Link>
                              }
                              {(order.status === 'pending' || order.status === 'printing') && (
                                  <button onClick={() => handleCancelOrder(order._id)} className="action-button-cancel" disabled={cancellingOrderId === order._id}>
                                    {cancellingOrderId === order._id ? 'Cancelling...' : 'Cancel Order'}
                                  </button>
                              )}
                            </div>
                          </li>
                      ))}
                    </ul>
                ) : (
                    <p className="no-orders-message">You have no orders yet. <Link to="/">Browse models</Link> to start printing!</p>
                )
            )}
          </div>
        </div>
      </div>
  );
}

export default UserProfile;