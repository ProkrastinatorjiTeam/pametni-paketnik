import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css'; // Ponovno uporabimo stile iz AdminPanel
import './BoxDetailModal.css'; // Dodatni, specifični stili

const BACKEND_URL = 'http://localhost:3000';

function BoxDetailModal({ box, isOpen, onClose, onBoxUpdated }) {
  const [activeTab, setActiveTab] = useState('details');
  const [editData, setEditData] = useState({ name: '', location: '', physicalId: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [printHistory, setPrintHistory] = useState([]);
  const [loadingPrintHistory, setLoadingPrintHistory] = useState(false);

  const [unlockHistory, setUnlockHistory] = useState([]);
  const [loadingUnlockHistory, setLoadingUnlockHistory] = useState(false);

  useEffect(() => {
    if (box && isOpen) {
      setEditData({
        name: box.name || '',
        location: box.location || '',
        physicalId: box.physicalId || '',
      });
      setActiveTab('details');
      setError('');
      setSuccessMessage('');
      fetchPrintHistory(box._id);
      fetchUnlockHistory(box._id);
    }
  }, [box, isOpen]);

  const fetchPrintHistory = async (boxId) => {
    setLoadingPrintHistory(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/order/by-box/${boxId}`);
      setPrintHistory(response.data || []);
    } catch (err) {
      console.error('Napaka pri pridobivanju zgodovine tiskanja:', err);
    } finally {
      setLoadingPrintHistory(false);
    }
  };

  const fetchUnlockHistory = async (boxId) => {
    setLoadingUnlockHistory(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/box/history/${boxId}`);
      setUnlockHistory(response.data?.unlockEvents || []);
    } catch (err) {
      console.error('Napaka pri pridobivanju zgodovine odpiranj:', err);
    } finally {
      setLoadingUnlockHistory(false);
    }
  };

  // --- POPRAVLJENA FUNKCIJA ---
  const handleChange = (e) => {
    const { name: inputName, value } = e.target; // Preimenovano iz 'name' v 'inputName'
    setEditData(prev => ({ ...prev, [inputName]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await axios.patch(`${BACKEND_URL}/box/update/${box._id}`, editData);
      setSuccessMessage('Box uspešno posodobljen!');
      if (onBoxUpdated) {
        onBoxUpdated(response.data.box);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Posodobitev boxa ni uspela.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'printHistory':
        return (
            loadingPrintHistory ? <p>Nalaganje...</p> :
                <ul className="data-list">
                  {printHistory.length > 0 ? printHistory.map(order => (
                      <li key={order._id} className="data-list-item history-item-print">
                        <span>{order.model?.name || 'N/A'}</span>
                        <span>{order.orderBy?.username || 'N/A'}</span>
                        <span className={`status-badge status-${order.status?.toLowerCase().replace(/\s+/g, '-')}`}>{order.status}</span>
                        <span>{new Date(order.createdAt).toLocaleString()}</span>
                      </li>
                  )) : <li>Ni zgodovine tiskanja za ta box.</li>}
                </ul>
        );
      case 'unlockHistory':
        return (
            loadingUnlockHistory ? <p>Nalaganje...</p> :
                <ul className="data-list">
                  {unlockHistory.length > 0 ? unlockHistory.map(event => (
                      <li key={event._id} className="data-list-item history-item-unlock">
                        <span>{event.user?.username || 'N/A'}</span>
                        <span className={event.authorized ? 'status-text-success' : 'status-text-error'}>{event.authorized ? 'Pooblaščen' : 'Nepooblaščen'}</span>
                        <span>{new Date(event.createdAt).toLocaleString()}</span>
                      </li>
                  )) : <li>Ni zgodovine odpiranj za ta box.</li>}
                </ul>
        );
      case 'details':
      default:
        return (
            <form onSubmit={handleSubmit} className="edit-box-form">
              <div className="form-group">
                <label htmlFor="editBoxName">Ime:</label>
                <input type="text" id="editBoxName" name="name" value={editData.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="editBoxLocation">Lokacija:</label>
                <input type="text" id="editBoxLocation" name="location" value={editData.location} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="editBoxPhysicalId">Fizični ID:</label>
                <input type="text" id="editBoxPhysicalId" name="physicalId" value={editData.physicalId} onChange={handleChange} required />
              </div>
              <div className="modal-footer form-footer">
                <div className="footer-message-area">
                  {isLoading && <p>Shranjevanje...</p>}
                  {error && <p className="error-message">{error}</p>}
                  {successMessage && <p className="success-message">{successMessage}</p>}
                </div>
                <button type="submit" className="action-button-primary" disabled={isLoading}>Shrani spremembe</button>
              </div>
            </form>
        );
    }
  };

  if (!isOpen || !box) return null;

  return (
      <div className="modal-overlay">
        <div className="modal-content admin-modal-content large-modal-content">
          <div className="modal-header">
            <h3>Podrobnosti Boxa: {box.name}</h3>
            <button onClick={onClose} className="close-button" disabled={isLoading}>×</button>
          </div>

          <div className="tab-navigation">
            <button onClick={() => setActiveTab('details')} className={activeTab === 'details' ? 'active' : ''}>Podrobnosti</button>
            <button onClick={() => setActiveTab('printHistory')} className={activeTab === 'printHistory' ? 'active' : ''}>Zgodovina tiskanja</button>
            <button onClick={() => setActiveTab('unlockHistory')} className={activeTab === 'unlockHistory' ? 'active' : ''}>Zgodovina odpiranj</button>
          </div>

          <div className="modal-body tab-content">
            {renderContent()}
          </div>
        </div>
      </div>
  );
}

export default BoxDetailModal;