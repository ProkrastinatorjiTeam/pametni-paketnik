import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css'; 

const BACKEND_URL = 'http://localhost:3000';

function UserDetailModal({ user, isOpen, onClose, currentUser }) {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const [unlockEvents, setUnlockEvents] = useState([]);
  const [loadingUnlockEvents, setLoadingUnlockEvents] = useState(false);
  const [unlockEventsError, setUnlockEventsError] = useState('');

  useEffect(() => {
    if (isOpen && user && user._id) {
      // Fetch User Orders
      const fetchUserOrders = async () => {
        setLoadingOrders(true);
        setOrdersError('');
        try {
          // This endpoint needs to be created on the backend
          const response = await axios.get(`${BACKEND_URL}/order/user/${user._id}`);
          setOrders(response.data.orders || []);
        } catch (err) {
          console.error('Error fetching user orders:', err);
          setOrdersError(err.response?.data?.message || 'Failed to fetch user orders.');
          setOrders([]);
        } finally {
          setLoadingOrders(false);
        }
      };

      // Fetch User Unlock Events
      const fetchUserUnlockEvents = async () => {
        setLoadingUnlockEvents(true);
        setUnlockEventsError('');
        try {
          // This endpoint should exist: GET /user/history/:id
          const response = await axios.get(`${BACKEND_URL}/user/history/${user._id}`);
          setUnlockEvents(response.data.unlockEvents || []);
        } catch (err) {
          console.error('Error fetching user unlock events:', err);
          setUnlockEventsError(err.response?.data?.message || 'Failed to fetch user unlock events.');
          setUnlockEvents([]);
        } finally {
          setLoadingUnlockEvents(false);
        }
      };

      fetchUserOrders();
      fetchUserUnlockEvents();
    }
  }, [isOpen, user, currentUser]);

  if (!isOpen || !user) {
    return null;
  }

  return (
    <div className="modal-overlay admin-modal-overlay">
      <div className="modal-content admin-modal-content large-modal-content"> {/* Added large-modal-content for more space */}
        <h3>Details for {user.username}</h3>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>

        <div className="user-detail-section">
          <h4>Order History</h4>
          {loadingOrders && <p>Loading orders...</p>}
          {ordersError && <p className="error-message modal-error">{ordersError}</p>}
          {!loadingOrders && !ordersError && (
            orders.length > 0 ? (
              <ul className="data-list order-list">
                {orders.map(order => (
                  <li key={order._id} className="data-list-item order-item">
                    <span><strong>ID:</strong> {order._id}</span>
                    <span><strong>Model:</strong> {order.model?.name || 'N/A'}</span>
                    <span><strong>Box:</strong> {order.box?.name || 'N/A'}</span>
                    <span><strong>Status:</strong> {order.status}</span>
                    <span><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No orders found for this user.</p>
            )
          )}
        </div>

        <div className="user-detail-section">
          <h4>Box Opening Attempts</h4>
          {loadingUnlockEvents && <p>Loading opening attempts...</p>}
          {unlockEventsError && <p className="error-message modal-error">{unlockEventsError}</p>}
          {!loadingUnlockEvents && !unlockEventsError && (
            unlockEvents.length > 0 ? (
              <ul className="data-list opening-list">
                {unlockEvents.map(event => (
                  <li key={event._id} className="data-list-item">
                    <span><strong>Box:</strong> {event.box?.name || event.box_physical_id || 'N/A'} (ID: {event.box?.physicalId || 'N/A'})</span>
                    <span><strong>Time:</strong> {new Date(event.timestamp).toLocaleString()}</span>
                    <span><strong>Successful:</strong> {event.success ? 'Yes' : 'No'}</span>
                    {/* You might have 'authorized' field instead of 'success' depending on your unlockEventModel */}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No opening attempts found for this user.</p>
            )
          )}
        </div>

        <button onClick={onClose} className="modal-close-button">Close</button>
      </div>
    </div>
  );
}

export default UserDetailModal;