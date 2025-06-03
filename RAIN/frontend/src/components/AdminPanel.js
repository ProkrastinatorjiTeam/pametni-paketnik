import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css';

const BACKEND_URL = 'http://localhost:3000';

function AdminPanel({ currentUser }) {
  // User Management State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');

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
                    <li key={user._id} className="data-list-item">
                      <span><strong>Username:</strong> {user.username}</span>
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
    </div>
  );
}

export default AdminPanel;