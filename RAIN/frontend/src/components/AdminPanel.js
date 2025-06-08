import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css';
import BoxDetailModal from './BoxDetailModal'; // Import the new modal
import UserDetailModal from './UserDetailModal'; // Import the UserDetailModal

const BACKEND_URL = 'http://localhost:3000';

function AdminPanel({ currentUser }) {
  // User Management State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');
  const [isUserDetailModalOpen, setIsUserDetailModalOpen] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);

  // Product Management State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState('');

  // Order Management State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Box Management State
  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);
  const [boxes, setBoxes] = useState([]);
  const [loadingBoxes, setLoadingBoxes] = useState(false);
  const [boxError, setBoxError] = useState('');

  // Add Box Modal State
  const [isAddBoxModalOpen, setIsAddBoxModalOpen] = useState(false);
  const [newBoxName, setNewBoxName] = useState('');
  const [newBoxLocation, setNewBoxLocation] = useState('');
  const [newBoxPhysicalId, setNewBoxPhysicalId] = useState('');
  const [addBoxError, setAddBoxError] = useState('');
  const [loadingAddBox, setLoadingAddBox] = useState(false);

  // State for Box Detail Modal
  const [isBoxDetailModalOpen, setIsBoxDetailModalOpen] = useState(false);
  const [selectedBoxDetails, setSelectedBoxDetails] = useState(null);

  // Opening Management State
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [openings, setOpenings] = useState([]);
  const [loadingOpenings, setLoadingOpenings] = useState(false);
  const [openingError, setOpeningError] = useState('');

  // Fetch Users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUserError('');
    try {
      const response = await axios.get(`${BACKEND_URL}/user/list`);
      if (response.data && response.data.users) {
        setUsers(response.data.users);
      } else {
        setUsers([]);
        setUserError('Could not fetch user data format.');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setUserError(err.response?.data?.message || 'Failed to fetch users.');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenUserManagement = () => {
    fetchUsers();
    setIsUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setIsUserModalOpen(false);
    setUserError('');
  };

  const handleOpenUserDetailModal = (user) => {
    setSelectedUserDetails(user);
    setIsUserDetailModalOpen(true);
  };

  const handleCloseUserDetailModal = () => {
    setSelectedUserDetails(null);
    setIsUserDetailModalOpen(false);
  };

  // Fetch Products
  const fetchProducts = async () => {
    setLoadingProducts(true);
    setProductError('');
    try {
      const response = await axios.get(`${BACKEND_URL}/model3D/list`); // Assuming this endpoint lists all products
      setProducts(response.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setProductError(err.response?.data?.message || 'Failed to fetch products.');
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleOpenProductManagement = () => {
    fetchProducts();
    setIsProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
    setProductError('');
  };

  // Fetch Orders
  const fetchOrders = async () => {
    setLoadingOrders(true);
    setOrderError('');
    try {
      // Ensure this endpoint exists and is admin-protected on your backend
      const response = await axios.get(`${BACKEND_URL}/order/list`); 
      setOrders(response.data || []); // Assuming response.data is an array of orders
    } catch (err) {
      console.error('Error fetching orders:', err);
      setOrderError(err.response?.data?.message || 'Failed to fetch orders.');
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleOpenOrderManagement = () => {
    fetchOrders();
    setIsOrderModalOpen(true);
  };

  const handleCloseOrderModal = () => {
    setIsOrderModalOpen(false);
    setOrderError('');
  };

  // Fetch Boxes (no change needed here as backend now sends 'isBusy')
  const fetchBoxes = async () => {
    setLoadingBoxes(true);
    setBoxError('');
    try {
      const response = await axios.get(`${BACKEND_URL}/box/list`);
      if (response.data && response.data.boxes) {
        setBoxes(response.data.boxes);
      } else {
        setBoxes([]);
        setBoxError('Could not fetch box data format.');
      }
    } catch (err) {
      console.error('Error fetching boxes:', err);
      setBoxError(err.response?.data?.message || 'Failed to fetch boxes.');
      setBoxes([]);
    } finally {
      setLoadingBoxes(false);
    }
  };

  const handleOpenBoxManagement = () => {
    fetchBoxes();
    setIsBoxModalOpen(true);
  };

  const handleCloseBoxModal = () => {
    setIsBoxModalOpen(false);
    setBoxError('');
  };

  // Add Box Modal Handlers
  const handleOpenAddBoxModal = () => {
    setNewBoxName('');
    setNewBoxLocation('');
    setNewBoxPhysicalId('');
    setAddBoxError('');
    setIsAddBoxModalOpen(true);
  };

  const handleCloseAddBoxModal = () => {
    setIsAddBoxModalOpen(false);
    setAddBoxError('');
  };

  const handleAddBox = async (e) => {
    e.preventDefault();
    setLoadingAddBox(true);
    setAddBoxError('');
    try {
      const response = await axios.post(`${BACKEND_URL}/box/add`, {
        name: newBoxName,
        location: newBoxLocation,
        physicalId: newBoxPhysicalId,
      });
      // Assuming the backend returns the created box or a success message
      if (response.data) {
        fetchBoxes(); // Refresh the box list
        handleCloseAddBoxModal();
      }
    } catch (err) {
      console.error('Error adding box:', err);
      setAddBoxError(err.response?.data?.message || 'Failed to add box.');
    } finally {
      setLoadingAddBox(false);
    }
  };

  // Handlers for Box Detail Modal
  const handleOpenBoxDetailModal = (box) => {
    setSelectedBoxDetails(box);
    setIsBoxDetailModalOpen(true);
  };

  const handleCloseBoxDetailModal = () => {
    setSelectedBoxDetails(null);
    setIsBoxDetailModalOpen(false);
  };

  const handleBoxUpdated = (updatedBox) => {
    // Refresh the main box list after an update
    fetchBoxes();
    // Optionally, update the selectedBoxDetails if you want the detail modal to reflect changes immediately
    // setSelectedBoxDetails(updatedBox); 
    // Or close the detail modal
    // handleCloseBoxDetailModal();
  };

  // Fetch Openings (Unlock Events)
  const fetchOpenings = async () => {
    setLoadingOpenings(true);
    setOpeningError('');
    try {
      // Assuming your backend endpoint for all unlock events is /unlock-event/list
      const response = await axios.get(`${BACKEND_URL}/unlockEvent/list`); // Changed to /unlockEvent/list
      if (response.data && response.data.unlockEvents) {
        setOpenings(response.data.unlockEvents);
      } else {
        setOpenings([]);
        setOpeningError('Could not fetch opening data format.');
      }
    } catch (err) {
      console.error('Error fetching openings:', err);
      setOpeningError(err.response?.data?.message || 'Failed to fetch openings.');
      setOpenings([]);
    } finally {
      setLoadingOpenings(false);
    }
  };

  const handleOpenOpeningManagement = () => {
    fetchOpenings();
    setIsOpeningModalOpen(true);
  };

  const handleCloseOpeningModal = () => {
    setIsOpeningModalOpen(false);
    setOpeningError('');
  };

  return (
    <div className="admin-panel-container">
      <h2>Admin Panel</h2>
      <p>Welcome to the Admin Panel, {currentUser?.username || 'Admin'}.</p>
      <div className="admin-panel-content">
        <section className="admin-section">
          <h3 onClick={handleOpenUserManagement} className="clickable-heading">
            User Management
          </h3>
          <p>View users and their roles.</p>
        </section>
        <section className="admin-section">
          <h3 onClick={handleOpenProductManagement} className="clickable-heading">
            Product Management
          </h3>
          <p>View products and their print time.</p>
        </section>
        <section className="admin-section">
          <h3 onClick={handleOpenOrderManagement} className="clickable-heading">
            Order Management
          </h3>
          <p>View orders here.</p>
        </section>
        <section className="admin-section">
          <h3 onClick={handleOpenBoxManagement} className="clickable-heading">
            Box Management
          </h3>
          <p>View and manage boxes.</p>
        </section>
        <section className="admin-section">
          <h3 onClick={handleOpenOpeningManagement} className="clickable-heading">
            Opening Management
          </h3>
          <p>View box opening history.</p>
        </section>
      </div>

      {/* User Management Modal */}
      {isUserModalOpen && (
        <div className="modal-overlay admin-modal-overlay">
          <div className="modal-content admin-modal-content">
            <h3>User List</h3>
            {loadingUsers && <p>Loading users...</p>}
            {userError && <p className="error-message modal-error">{userError}</p>}
            {!loadingUsers && !userError && (
              users.length > 0 ? (
                <ul className="data-list user-list">
                  {users.map(user => (
                    <li 
                      key={user._id} 
                      className="data-list-item clickable-list-item" // Make it clickable
                      onClick={() => handleOpenUserDetailModal(user)} // Open detail modal on click
                    >
                      <span><strong>Username:</strong> {user.username}</span>
                      <span><strong>Email:</strong> {user.email}</span>
                      <span><strong>Role:</strong> {user.role}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No users found.</p>
              )
            )}
            <button onClick={handleCloseUserModal} className="modal-close-button">Close</button>
          </div>
        </div>
      )}

      {/* Product Management Modal */}
      {isProductModalOpen && (
        <div className="modal-overlay admin-modal-overlay">
          <div className="modal-content admin-modal-content">
            <h3>Product List</h3>
            {loadingProducts && <p>Loading products...</p>}
            {productError && <p className="error-message modal-error">{productError}</p>}
            {!loadingProducts && !productError && (
              products.length > 0 ? (
                <ul className="data-list product-list">
                  {products.map(product => (
                    <li key={product._id} className="data-list-item">
                      <span><strong>Name:</strong> {product.name}</span>
                      <span><strong>Print Time:</strong> {product.estimatedPrintTime || 'N/A'} min</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No products found.</p>
              )
            )}
            <button onClick={handleCloseProductModal} className="modal-close-button">Close</button>
          </div>
        </div>
      )}

      {/* Order Management Modal */}
      {isOrderModalOpen && (
        <div className="modal-overlay admin-modal-overlay">
          <div className="modal-content admin-modal-content">
            <h3>Order History</h3>
            {loadingOrders && <p>Loading orders...</p>}
            {orderError && <p className="error-message modal-error">{orderError}</p>}
            {!loadingOrders && !orderError && (
              orders.length > 0 ? (
                <ul className="data-list order-list">
                  {orders.map(order => (
                    <li key={order._id} className="data-list-item order-item">
                      <span><strong>ID:</strong> {order._id}</span>
                      <span><strong>Model:</strong> {order.model?.name || 'N/A'}</span>
                      <span><strong>User:</strong> {order.orderBy?.username || 'N/A'}</span>
                      <span><strong>Status:</strong> {order.status}</span>
                       <span><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No order history.</p>
              )
            )}
            <button onClick={handleCloseOrderModal} className="modal-close-button">Close</button>
          </div>
        </div>
      )}

      {/* Box Management List Modal */}
      {isBoxModalOpen && (
        <div className="modal-overlay admin-modal-overlay">
          <div className="modal-content admin-modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Box List</h3>
              <button onClick={handleOpenAddBoxModal} className="add-button">ADD +</button>
            </div>
            {loadingBoxes && <p>Loading boxes...</p>}
            {boxError && <p className="error-message modal-error">{boxError}</p>}
            {!loadingBoxes && !boxError && (
              boxes.length > 0 ? (
                <ul className="data-list box-list">
                  {boxes.map(box => (
                    <li 
                      key={box._id} 
                      className="data-list-item clickable-list-item" // Add class for styling
                      onClick={() => handleOpenBoxDetailModal(box)} // Make item clickable
                    >
                      <span><strong>Name:</strong> {box.name}</span>
                      <span><strong>Location:</strong> {box.location || 'N/A'}</span>
                      <span><strong>Physical ID:</strong> {box.physicalId}</span>
                      <span><strong>Auth Users:</strong> {box.authorizedUsers?.length || 0}</span>
                      <span>
                        <strong>Status:</strong> 
                        <span className={box.isBusy ? 'status-busy' : 'status-available'}>
                          {box.isBusy ? ' In Use' : ' Available'}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No boxes yet.</p>
              )
            )}
            <button onClick={handleCloseBoxModal} className="modal-close-button">Close</button>
          </div>
        </div>
      )}

      {/* Add Box Modal */}
      {isAddBoxModalOpen && (
        <div className="modal-overlay admin-modal-overlay">
          <div className="modal-content admin-modal-content">
            <h3>Add New Box</h3>
            <form onSubmit={handleAddBox} className="add-box-form">
              <div className="form-group">
                <label htmlFor="newBoxName">Name:</label>
                <input
                  type="text"
                  id="newBoxName"
                  value={newBoxName}
                  onChange={(e) => setNewBoxName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="newBoxLocation">Location:</label>
                <input
                  type="text"
                  id="newBoxLocation"
                  value={newBoxLocation}
                  onChange={(e) => setNewBoxLocation(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="newBoxPhysicalId">Physical ID:</label>
                <input
                  type="text"
                  id="newBoxPhysicalId"
                  value={newBoxPhysicalId}
                  onChange={(e) => setNewBoxPhysicalId(e.target.value)}
                  required
                />
              </div>
              {loadingAddBox && <p>Adding box...</p>}
              {addBoxError && <p className="error-message modal-error">{addBoxError}</p>}
              <div className="modal-actions">
                <button type="submit" className="submit-button" disabled={loadingAddBox}>
                  {loadingAddBox ? 'Adding...' : 'Add Box'}
                </button>
                <button type="button" onClick={handleCloseAddBoxModal} className="modal-close-button" disabled={loadingAddBox}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Opening Management Modal */}
      {isOpeningModalOpen && (
        <div className="modal-overlay admin-modal-overlay">
          <div className="modal-content admin-modal-content">
            <h3>Box Opening History</h3>
            {loadingOpenings && <p>Loading opening history...</p>}
            {openingError && <p className="error-message modal-error">{openingError}</p>}
            {!loadingOpenings && !openingError && (
              openings.length > 0 ? (
                <ul className="data-list opening-list">
                  {openings.map(event => (
                    <li key={event._id} className="data-list-item">
                      <span><strong>Box:</strong> {event.box?.name || event.box} (ID: {event.box?.physicalId || 'N/A'})</span>
                      <span><strong>User:</strong> {event.user?.username || event.user}</span>
                      <span><strong>Time:</strong> {new Date(event.timestamp).toLocaleString()}</span> {/* Changed to event.timestamp */}
                      <span><strong>Successful:</strong> {event.success ? 'Yes' : 'No'}</span>
                      {/* The field might be 'authorized' depending on your backend model */}
                      {/* <span><strong>Authorized:</strong> {event.authorized ? 'Yes' : 'No'}</span> */}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No opening events found.</p>
              )
            )}
            <button onClick={handleCloseOpeningModal} className="modal-close-button">Close</button>
          </div>
        </div>
      )}

      {/* Box Detail Modal */}
      <BoxDetailModal
        box={selectedBoxDetails}
        isOpen={isBoxDetailModalOpen}
        onClose={handleCloseBoxDetailModal}
        onBoxUpdated={handleBoxUpdated}
        currentUser={currentUser}
      />

      {selectedUserDetails && (
        <UserDetailModal
          user={selectedUserDetails}
          isOpen={isUserDetailModalOpen}
          onClose={handleCloseUserDetailModal}
          currentUser={currentUser} 
        />
      )}
    </div>
  );
}

export default AdminPanel;