import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import OrderTimer from './OrderTimer'; // Import the new component
import './UserProfile.css'; 

const BACKEND_URL = 'http://localhost:3000';

function UserProfile({ currentUser }) {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [cancelError, setCancelError] = useState(''); 
  const [cancellingOrderId, setCancellingOrderId] = useState(null); 

  const fetchUserOrders = async () => {
    setLoadingOrders(true);
    setOrderError('');
    setCancelError(''); 
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
        // Update the specific order in the list
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? response.data : order // Use the updated order from backend
          )
        );
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      setCancelError(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleOrderTimerEnd = (orderId) => {
    // When a client-side timer ends, re-fetch orders to get the authoritative status from backend.
    // This is important because the backend's checkAndUpdateOrderStatus is the source of truth.
    console.log(`Client timer ended for order ${orderId}. Fetching updated orders.`);
    fetchUserOrders();
  };

  if (!currentUser) {
    return <p>Please log in to view your profile.</p>;
  }

  return (
    <div className="user-profile-container">
      <h2>{currentUser.username}'s Profile</h2>
      
      <div className="user-details-profile">
        <p><strong>Username:</strong> {currentUser.username}</p>
        <p><strong>Email:</strong> {currentUser.email}</p>
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
                    
                    {order.status === 'printing' && order.startedPrintingAt && order.model?.estimatedPrintTime ? (
                      <p>
                        <strong>Time Remaining: </strong>
                        <OrderTimer
                          orderId={order._id}
                          startedAt={order.startedPrintingAt}
                          estimatedPrintTimeMinutes={order.model.estimatedPrintTime}
                          status={order.status}
                          onTimerEnd={handleOrderTimerEnd}
                        />
                      </p>
                    ) : order.status === 'ready to pickup' && order.completedAt ? (
                      <p><strong>Ready for Pickup At:</strong> {new Date(order.completedAt).toLocaleString()}</p>
                    ) : order.status === 'cancelled' && order.completedAt ? (
                       <p><strong>Cancelled At:</strong> {new Date(order.completedAt).toLocaleString()}</p>
                    ) : null}
                    
                    {/* Fallback for completedAt if status is not printing but completedAt exists */}
                    {order.completedAt && order.status !== 'printing' && order.status !== 'ready to pickup' && order.status !== 'cancelled' && (
                         <p><strong>Processed At:</strong> {new Date(order.completedAt).toLocaleString()}</p>
                    )}

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