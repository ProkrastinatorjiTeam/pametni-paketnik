import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css';
import BoxDetailModal from './BoxDetailModal';
import UserDetailModal from './UserDetailModal';
import ProductDetailModal from './ProductDetailModal';

const BACKEND_URL = 'http://localhost:3000';

function AdminPanel({ currentUser }) {
  // State for each management section
  const [activeModal, setActiveModal] = useState(null); // 'users', 'products', etc.

  // Data states
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [openings, setOpenings] = useState([]);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Detail Modal States
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [selectedBoxDetails, setSelectedBoxDetails] = useState(null);

  // Add Box Modal State
  const [isAddBoxModalOpen, setIsAddBoxModalOpen] = useState(false);
  const [newBoxName, setNewBoxName] = useState('');
  const [newBoxLocation, setNewBoxLocation] = useState('');
  const [newBoxPhysicalId, setNewBoxPhysicalId] = useState('');
  const [addBoxError, setAddBoxError] = useState('');
  const [loadingAddBox, setLoadingAddBox] = useState(false);

  // Generic fetch function
  const fetchData = async (endpoint, setData, type) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${BACKEND_URL}${endpoint}`);
      // Backend data structures vary, so we handle them here
      if (type === 'users') setData(response.data?.users || []);
      else if (type === 'boxes') setData(response.data?.boxes || []);
      else if (type === 'openings') setData(response.data?.unlockEvents || []);
      else setData(response.data || []); // For products and orders
    } catch (err) {
      setError(`Failed to fetch ${type}: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (modalType) => {
    setActiveModal(modalType);
    switch (modalType) {
      case 'users': fetchData('/user/list', setUsers, 'users'); break;
      case 'products': fetchData('/model3D/list', setProducts, 'products'); break;
      case 'orders': fetchData('/order/list', setOrders, 'orders'); break;
      case 'boxes': fetchData('/box/list', setBoxes, 'boxes'); break;
      case 'openings': fetchData('/unlockEvent/list', setOpenings, 'openings'); break;
      default: break;
    }
  };

  const handleCloseModal = () => setActiveModal(null);

  // Add Box Logic
  const handleOpenAddBoxModal = () => setIsAddBoxModalOpen(true);
  const handleCloseAddBoxModal = () => {
    setIsAddBoxModalOpen(false);
    setNewBoxName(''); setNewBoxLocation(''); setNewBoxPhysicalId(''); setAddBoxError('');
  };
  const handleAddBox = async (e) => {
    e.preventDefault();
    setLoadingAddBox(true);
    setAddBoxError('');
    try {
      await axios.post(`${BACKEND_URL}/box/add`, { name: newBoxName, location: newBoxLocation, physicalId: newBoxPhysicalId });
      fetchData('/box/list', setBoxes, 'boxes'); // Refresh list
      handleCloseAddBoxModal();
    } catch (err) {
      setAddBoxError(err.response?.data?.message || 'Failed to add box.');
    } finally {
      setLoadingAddBox(false);
    }
  };

  // --- JSX Rendering ---
  return (
      <div className="admin-panel-wrapper">
        <div className="admin-panel-container">
          <h2>Admin Dashboard</h2>
          <p className="admin-subtitle">Select a category to view and manage data.</p>

          <div className="admin-grid">
            <div className="admin-card" onClick={() => handleOpenModal('users')}>
              <h3>User Management</h3><p>View all registered users and their roles.</p>
            </div>
            <div className="admin-card" onClick={() => handleOpenModal('products')}>
              <h3>Product Management</h3><p>View and manage all available 3D models.</p>
            </div>
            <div className="admin-card" onClick={() => handleOpenModal('orders')}>
              <h3>Order Management</h3><p>Browse the complete history of all orders.</p>
            </div>
            <div className="admin-card" onClick={() => handleOpenModal('boxes')}>
              <h3>Box Management</h3><p>Manage printer boxes and their status.</p>
            </div>
            <div className="admin-card" onClick={() => handleOpenModal('openings')}>
              <h3>Opening History</h3><p>Review the log of all box unlock events.</p>
            </div>
          </div>

          {/* Generic Data Display Modal */}
          {activeModal && (
              <div className="modal-overlay">
                <div className="modal-content admin-modal-content">
                  <div className="modal-header">
                    <h3>{activeModal.charAt(0).toUpperCase() + activeModal.slice(1)} List</h3>
                    {activeModal === 'boxes' && <button onClick={handleOpenAddBoxModal} className="add-button">+ Add Box</button>}
                    <button onClick={handleCloseModal} className="close-button">×</button>
                  </div>
                  <div className="modal-body">
                    {loading && <p>Loading...</p>}
                    {error && <p className="error-message">{error}</p>}
                    {!loading && !error && (
                        <ul className="data-list">
                          {/* Render list items based on active modal */}
                          {activeModal === 'users' && users.map(user => (
                              <li key={user._id} className="data-list-item user-item" onClick={() => setSelectedUserDetails(user)}>
                                <span>{user.username}</span><span>{user.email}</span><span className="role-text">{user.role}</span>
                              </li>))}
                          {activeModal === 'products' && products.map(p => (
                              <li key={p._id} className="data-list-item product-item" onClick={() => setSelectedProductDetails(p)}>
                                <span>{p.name}</span><span>{p.estimatedPrintTime || 'N/A'} min</span><span>€{p.price?.toFixed(2) || 'N/A'}</span>
                              </li>))}
                          {activeModal === 'orders' && orders.map(o => (
                              <li key={o._id} className="data-list-item order-item">
                                <span>{o.model?.name || 'N/A'}</span><span>{o.orderBy?.username || 'N/A'}</span>
                                <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                                <span className={`status-badge status-${o.status?.toLowerCase().replace(/\s+/g, '-')}`}>{o.status}</span>
                              </li>))}
                          {activeModal === 'boxes' && boxes.map(box => (
                              <li key={box._id} className="data-list-item box-item" onClick={() => setSelectedBoxDetails(box)}>
                                <span>{box.name}</span><span>{box.location || 'N/A'}</span>
                                <span>{box.physicalId}</span>
                                <span className={box.isBusy ? 'status-text-error' : 'status-text-success'}>{box.isBusy ? 'In Use' : 'Available'}</span>
                              </li>))}
                          {activeModal === 'openings' && openings.map(e => (
                              <li key={e._id} className="data-list-item opening-item">
                                <span>{e.box?.name || 'N/A'}</span><span>{e.user?.username || 'N/A'}</span>
                                <span>{new Date(e.timestamp).toLocaleString()}</span>
                                <span className={e.success ? 'status-text-success' : 'status-text-error'}>{e.success ? 'Success' : 'Failed'}</span>
                              </li>))}
                        </ul>
                    )}
                  </div>
                </div>
              </div>
          )}

          {/* Add Box Modal */}
          {isAddBoxModalOpen && (
              <div className="modal-overlay"><div className="modal-content admin-modal-content small-modal">
                <div className="modal-header"><h3>Add New Box</h3><button onClick={handleCloseAddBoxModal} className="close-button">×</button></div>
                <form onSubmit={handleAddBox} className="modal-body">
                  <div className="form-group"><label htmlFor="newBoxName">Name:</label><input type="text" id="newBoxName" value={newBoxName} onChange={(e) => setNewBoxName(e.target.value)} required/></div>
                  <div className="form-group"><label htmlFor="newBoxLocation">Location:</label><input type="text" id="newBoxLocation" value={newBoxLocation} onChange={(e) => setNewBoxLocation(e.target.value)}/></div>
                  <div className="form-group"><label htmlFor="newBoxPhysicalId">Physical ID:</label><input type="text" id="newBoxPhysicalId" value={newBoxPhysicalId} onChange={(e) => setNewBoxPhysicalId(e.target.value)} required/></div>
                  {addBoxError && <p className="error-message">{addBoxError}</p>}
                  <div className="modal-actions"><button type="submit" className="action-button-primary" disabled={loadingAddBox}>{loadingAddBox ? 'Adding...' : 'Add Box'}</button></div>
                </form>
              </div></div>
          )}

          {/* Detail Modals */}
          <BoxDetailModal box={selectedBoxDetails} isOpen={!!selectedBoxDetails} onClose={() => setSelectedBoxDetails(null)} onBoxUpdated={() => fetchData('/box/list', setBoxes, 'boxes')} />
          <UserDetailModal user={selectedUserDetails} isOpen={!!selectedUserDetails} onClose={() => setSelectedUserDetails(null)} />
          <ProductDetailModal product={selectedProductDetails} isOpen={!!selectedProductDetails} onClose={() => setSelectedProductDetails(null)} onProductUpdated={() => fetchData('/model3D/list', setProducts, 'products')} />
        </div>
      </div>
  );
}

export default AdminPanel;