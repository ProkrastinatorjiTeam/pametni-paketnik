import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css'; // Reuse styles or create a new one

const BACKEND_URL = 'http://localhost:3000';

function BoxDetailModal({ box, isOpen, onClose, onBoxUpdated, currentUser }) {
  const [editData, setEditData] = useState({ name: '', location: '', physicalId: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [printHistory, setPrintHistory] = useState([]);
  const [loadingPrintHistory, setLoadingPrintHistory] = useState(false);
  const [printHistoryError, setPrintHistoryError] = useState('');

  const [unlockHistory, setUnlockHistory] = useState([]);
  const [loadingUnlockHistory, setLoadingUnlockHistory] = useState(false);
  const [unlockHistoryError, setUnlockHistoryError] = useState('');

  useEffect(() => {
    if (box) {
      setEditData({
        name: box.name || '',
        location: box.location || '',
        physicalId: box.physicalId || '',
      });
      setError('');
      setSuccessMessage('');
      fetchPrintHistory(box._id);
      fetchUnlockHistory(box._id);
    }
  }, [box]);

  const fetchPrintHistory = async (boxId) => {
    if (!boxId) return;
    setLoadingPrintHistory(true);
    setPrintHistoryError('');
    try {
      const response = await axios.get(`${BACKEND_URL}/order/by-box/${boxId}`);
      setPrintHistory(response.data || []);
    } catch (err) {
      console.error('Error fetching print history:', err);
      setPrintHistoryError(err.response?.data?.message || 'Failed to load print history.');
    } finally {
      setLoadingPrintHistory(false);
    }
  };

  const fetchUnlockHistory = async (boxId) => {
    if (!boxId) return;
    setLoadingUnlockHistory(true);
    setUnlockHistoryError('');
    try {
      const response = await axios.get(`${BACKEND_URL}/box/history/${boxId}`);
      setUnlockHistory(response.data?.unlockEvents || []);
    } catch (err) {
      console.error('Error fetching unlock history:', err);
      setUnlockHistoryError(err.response?.data?.message || 'Failed to load unlock history.');
    } finally {
      setLoadingUnlockHistory(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await axios.patch(`${BACKEND_URL}/box/update/${box._id}`, editData);
      setSuccessMessage('Box updated successfully!');
      if (onBoxUpdated) {
        onBoxUpdated(response.data.box); // Pass updated box data back
      }
      // setTimeout(onClose, 1500); // Optionally close after a delay
    } catch (err) {
      console.error('Error updating box:', err);
      setError(err.response?.data?.message || 'Failed to update box.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !box) return null;

  return (
    <div className="modal-overlay admin-modal-overlay">
      <div className="modal-content admin-modal-content">
        <h3>Box Details: {box.name}</h3>
        <form onSubmit={handleSubmit} className="edit-box-form">
          <div className="form-group">
            <label htmlFor="editBoxName">Name:</label>
            <input
              type="text"
              id="editBoxName"
              name="name"
              value={editData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="editBoxLocation">Location:</label>
            <input
              type="text"
              id="editBoxLocation"
              name="location"
              value={editData.location}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="editBoxPhysicalId">Physical ID:</label>
            <input
              type="text" // Consider type="number" if appropriate, but backend handles parsing
              id="editBoxPhysicalId"
              name="physicalId"
              value={editData.physicalId}
              onChange={handleChange}
              required
            />
          </div>
          {isLoading && <p>Updating box...</p>}
          {error && <p className="error-message modal-error">{error}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}
          <div className="modal-actions">
            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={onClose} className="modal-close-button" disabled={isLoading}>
              Close
            </button>
          </div>
        </form>

        <div className="history-section">
          <h4>Print History</h4>
          {loadingPrintHistory && <p>Loading print history...</p>}
          {printHistoryError && <p className="error-message">{printHistoryError}</p>}
          {!loadingPrintHistory && !printHistoryError && (
            printHistory.length > 0 ? (
              <ul className="data-list">
                {printHistory.map(order => (
                  <li key={order._id} className="data-list-item">
                    <span>Model: {order.model?.name || 'N/A'}</span>
                    <span>User: {order.orderBy?.username || 'N/A'}</span>
                    <span>Status: {order.status}</span>
                    <span>Ordered: {new Date(order.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : <p>No print history for this box.</p>
          )}
        </div>

        <div className="history-section">
          <h4>Unlock History</h4>
          {loadingUnlockHistory && <p>Loading unlock history...</p>}
          {unlockHistoryError && <p className="error-message">{unlockHistoryError}</p>}
          {!loadingUnlockHistory && !unlockHistoryError && (
            unlockHistory.length > 0 ? (
              <ul className="data-list">
                {unlockHistory.map(event => (
                  <li key={event._id} className="data-list-item">
                    <span>User: {event.user?.username || 'N/A'}</span>
                    <span>Time: {new Date(event.createdAt).toLocaleString()}</span>
                    <span>Authorized: {event.authorized ? 'Yes' : 'No'}</span>
                  </li>
                ))}
              </ul>
            ) : <p>No unlock history for this box.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default BoxDetailModal;