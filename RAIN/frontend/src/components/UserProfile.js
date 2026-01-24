import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './UserProfile.css';
import ConfirmModal from './ConfirmModal';
import {useToast} from "../contexts/ToastContext";

function UserProfile({ currentUser }) {
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [orderError, setOrderError] = useState('');
    const [cancelError, setCancelError] = useState('');
    const [cancellingOrderId, setCancellingOrderId] = useState(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [orderIdToCancel, setOrderIdToCancel] = useState(null);
    const { showToast } = useToast();

    const openCancelDialog = (orderId) => {
        setOrderIdToCancel(orderId);
        setIsConfirmOpen(true);
    };

    const triggerCancel = async () => {
        setIsConfirmOpen(false);
        if (!orderIdToCancel) return;

        setCancellingOrderId(orderIdToCancel);
        try {
            const response = await axios.patch(`/order/my-orders/${orderIdToCancel}/cancel`);
            setOrders(prev => prev.map(o => o._id === orderIdToCancel ? response.data : o));

            showToast('Order canceled successfully!', 'success');
        } catch (err) {
            setCancelError('Cancelling order failed.');
        } finally {
            setCancellingOrderId(null);
        }
    };

    const fetchUserOrders = async () => {
        setLoadingOrders(true);
        setOrderError('');
        setCancelError('');
        try {
            const response = await axios.get(`/order/my-orders`);
            setOrders(response.data || []);
        } catch (err) {
            setOrderError(err.response?.data?.message || 'Nalaganje naročil ni uspelo.');
        } finally {
            setLoadingOrders(false);
        }
    };

    useEffect(() => {
        if (currentUser?._id) {
            fetchUserOrders();
        }
    }, [currentUser]);

    if (!currentUser) return <div className="page-status">Please log in to view your profile.</div>;

    return (
        <div className="user-profile-wrapper">
            <div className="user-profile-container">

                {/* --- HEADER SEKCIJA --- */}
                <header className="profile-header">
                    <div className="user-avatar">
                        {currentUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info-text">
                        <h1>{currentUser.username}</h1>
                        <p className="user-email">{currentUser.email}</p>
                        <span className="user-role-tag">{currentUser.role || 'Member'}</span>
                    </div>
                </header>

                {/* --- ORDERS SEKCIJA --- */}
                <div className="user-orders-section">
                    <div className="orders-header">
                        <h3>Your Orders</h3>
                        <span className="order-count">{orders.length} orders total</span>
                    </div>

                    {loadingOrders && <div className="loading-spinner-small">Fetching your orders...</div>}
                    {orderError && <div className="error-banner">{orderError}</div>}
                    {cancelError && <div className="error-banner">{cancelError}</div>}

                    {!loadingOrders && !orderError && (
                        orders.length > 0 ? (
                            <div className="order-cards-list">
                                {orders.map(order => (
                                    <div key={order._id} className="order-card-item">
                                        <div className="order-card-top">
                                            <div className="product-brief">
                                                <h4>{order.product?.name || 'Deleted Product'}</h4>
                                                <span className="order-date">{new Date(order.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <span className={`status-badge status-${order.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                                                {order.status}
                                            </span>
                                        </div>

                                        <div className="order-card-details">
                                            <div className="detail-item">
                                                <label>Pickup Location</label>
                                                <p>{order.box ? `${order.box.name} (${order.box.location})` : 'Processing...'}</p>
                                            </div>
                                            <div className="detail-item">
                                                <label>Order ID</label>
                                                <p className="id-code">#{order._id.slice(-6)}</p>
                                            </div>
                                        </div>

                                        <div className="order-card-actions">
                                            {order.product?._id && (
                                                <Link to={`/product/${order.product._id}`} className="btn-view-product">
                                                    View Details
                                                </Link>
                                            )}
                                            {(order.status === 'pending' || order.status === 'preparing') && (
                                                <button
                                                    onClick={() => openCancelDialog(order._id)}
                                                    className="btn-cancel-order"
                                                    disabled={cancellingOrderId === order._id}
                                                >
                                                    {cancellingOrderId === order._id ? 'Cancelling...' : 'Cancel Order'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-orders-state">
                                <div className="empty-icon">📦</div>
                                <p>You haven't ordered anything yet.</p>
                                <Link to="/" className="btn-start-shopping">Start Shopping</Link>
                            </div>
                        )
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={triggerCancel}
                title="Cancelling order"
                message="Are you sure you want to cancel this order?"
                confirmText="Yes, cancel"
                cancelText="No, keep"
            />
        </div>
    );
}

export default UserProfile;