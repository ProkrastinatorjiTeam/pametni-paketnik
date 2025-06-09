import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css'; // Ponovno uporabimo stile iz AdminPanel
import './BoxDetailModal.css'; // Dodatni, specifični stili

const BACKEND_URL = 'http://localhost:3000';

function BoxDetailModal({ box, isOpen, onClose, onBoxUpdated }) {
  // Stanje za nadzor zavihkov
  const [activeTab, setActiveTab] = useState('details');

  // Stanje za urejanje podatkov
  const [editData, setEditData] = useState({ name: '', location: '', physicalId: '' });

  // Stanja za povratno informacijo uporabniku
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Stanja za zgodovino
  const [printHistory, setPrintHistory] = useState([]);
  const [loadingPrintHistory, setLoadingPrintHistory] = useState(false);
  const [unlockHistory, setUnlockHistory] = useState([]);
  const [loadingUnlockHistory, setLoadingUnlockHistory] = useState(false);

  // Ponastavi stanje, ko se modal odpre
  useEffect(() => {
    if (box && isOpen) {
      setEditData({
        name: box.name || '',
        location: box.location || '',
        physicalId: box.physicalId || '',
      });
      setActiveTab('details'); // Vedno začni na zavihku s podrobnostmi
      setError('');
      setSuccessMessage('');
      // Ob odprtju modala takoj pridobi obe zgodovini
      fetchPrintHistory(box._id);
      fetchUnlockHistory(box._id);
    }
  }, [box, isOpen]);

  // --- MANJKAJOČE FUNKCIJE ZA PRIDOBIVANJE PODATKOV ---
  const fetchPrintHistory = async (boxId) => {
    if (!boxId) return;
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
    if (!boxId) return;
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

  // --- MANJKAJOČA FUNKCIJA ZA SPREMEMBO VNOSA ---
  const handleChange = (e) => {
    const { name: inputName, value } = e.target;
    setEditData(prev => ({ ...prev, [inputName]: value }));
  };

  // Funkcija za shranjevanje sprememb
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await axios.patch(`${BACKEND_URL}/box/update/${box._id}`, editData);
      setSuccessMessage('Box uspešno posodobljen!');
      if (onBoxUpdated) {
        onBoxUpdated(response.data.box); // Obvesti starša, da osveži seznam
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Posodobitev boxa ni uspela.');
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcija za brisanje
  const handleDeleteBox = async () => {
    if (!window.confirm(`Ali ste prepričani, da želite trajno izbrisati box "${box.name}"?`)) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await axios.delete(`${BACKEND_URL}/box/remove/${box._id}`);
      onBoxUpdated(); // Obvesti starša, da osveži seznam
      onClose();      // Zapri modal
    } catch (err) {
      setError(err.response?.data?.message || 'Brisanje boxa ni uspelo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render funkcija za vsebino zavihkov
  const renderContent = () => {
    switch (activeTab) {
      case 'printHistory':
        return (
            loadingPrintHistory ? <div className="loading-state">Nalaganje zgodovine...</div> :
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
            loadingUnlockHistory ? <div className="loading-state">Nalaganje zgodovine...</div> :
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
            <form id="edit-box-form" onSubmit={handleSubmit} className="edit-box-form">
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

          <div className="modal-footer">
            <div className="footer-message-area">
              {isLoading && <p>Obdelovanje...</p>}
              {error && <p className="error-message">{error}</p>}
              {successMessage && <p className="success-message">{successMessage}</p>}
            </div>
            <div className="footer-button-group">
              {activeTab === 'details' && (
                  <>
                    <button type="button" onClick={handleDeleteBox} className="action-button-danger" disabled={isLoading}>
                      Izbriši Box
                    </button>
                    <button type="submit" form="edit-box-form" className="action-button-primary" disabled={isLoading}>
                      Shrani spremembe
                    </button>
                  </>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}

export default BoxDetailModal;