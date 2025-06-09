import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css'; // Ponovno uporabimo stile iz AdminPanel
import './UserDetailModal.css'; // Dodatni, specifični stili

const BACKEND_URL = 'http://localhost:3000';

function UserDetailModal({ user, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('details');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [unlockEvents, setUnlockEvents] = useState([]);
  const [loadingUnlockEvents, setLoadingUnlockEvents] = useState(false);

  useEffect(() => {
    if (isOpen && user?._id) {
      setActiveTab('details'); // Vedno začni na zavihku s podrobnostmi
      fetchUserOrders(user._id);
      fetchUserUnlockEvents(user._id);
    }
  }, [isOpen, user]);

  const fetchUserOrders = async (userId) => {
    setLoadingOrders(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/order/user/${userId}`);
      setOrders(response.data.orders || []);
    } catch (err) {
      console.error('Napaka pri pridobivanju naročil uporabnika:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchUserUnlockEvents = async (userId) => {
    setLoadingUnlockEvents(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/user/history/${userId}`);
      setUnlockEvents(response.data.unlockEvents || []);
    } catch (err) {
      console.error('Napaka pri pridobivanju zgodovine odpiranj:', err);
    } finally {
      setLoadingUnlockEvents(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'orders':
        return (
            loadingOrders ? <p>Nalaganje...</p> :
                <ul className="data-list">
                  {orders.length > 0 ? orders.map(order => (
                      <li key={order._id} className="data-list-item history-item-order">
                        <span>{order.model?.name || 'N/A'}</span>
                        <span>{order.box?.name || 'N/A'}</span>
                        <span className={`status-badge status-${order.status?.toLowerCase().replace(/\s+/g, '-')}`}>{order.status}</span>
                        <span>{new Date(order.createdAt).toLocaleString()}</span>
                      </li>
                  )) : <li>Ta uporabnik nima naročil.</li>}
                </ul>
        );
      case 'unlocks':
        return (
            loadingUnlockEvents ? <p>Nalaganje...</p> :
                <ul className="data-list">
                  {unlockEvents.length > 0 ? unlockEvents.map(event => (
                      <li key={event._id} className="data-list-item history-item-unlock">
                        <span>{event.box?.name || 'N/A'}</span>
                        <span className={event.authorized ? 'status-text-success' : 'status-text-error'}>{event.authorized ? 'Pooblaščen' : 'Nepooblaščen'}</span>
                        <span>{new Date(event.createdAt).toLocaleString()}</span>
                      </li>
                  )) : <li>Ta uporabnik nima zgodovine odpiranj.</li>}
                </ul>
        );
      case 'details':
      default:
        return (
            <div className="details-grid-user">
              <strong>Uporabniško ime:</strong>
              <span>{user.username}</span>
              <strong>Email:</strong>
              <span>{user.email}</span>
              <strong>Vloga:</strong>
              <span className="role-text">{user.role}</span>
              <strong>Ime:</strong>
              <span>{user.firstName || 'N/A'}</span>
              <strong>Priimek:</strong>
              <span>{user.lastName || 'N/A'}</span>
            </div>
        );
    }
  };

  if (!isOpen || !user) return null;

  return (
      <div className="modal-overlay">
        <div className="modal-content admin-modal-content large-modal-content">
          <div className="modal-header">
            <h3>Podrobnosti uporabnika: {user.username}</h3>
            <button onClick={onClose} className="close-button">×</button>
          </div>

          <div className="tab-navigation">
            <button onClick={() => setActiveTab('details')} className={activeTab === 'details' ? 'active' : ''}>Podrobnosti</button>
            <button onClick={() => setActiveTab('orders')} className={activeTab === 'orders' ? 'active' : ''}>Zgodovina naročil</button>
            <button onClick={() => setActiveTab('unlocks')} className={activeTab === 'unlocks' ? 'active' : ''}>Zgodovina odpiranj</button>
          </div>

          <div className="modal-body tab-content">
            {renderContent()}
          </div>
        </div>
      </div>
  );
}

export default UserDetailModal;