import React, {useState, useEffect} from 'react';
import axios from 'axios';
import {Link} from 'react-router-dom';
import './UserProfile.css';

function UserProfile({currentUser}) {
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [orderError, setOrderError] = useState('');
    const [cancelError, setCancelError] = useState('');
    const [cancellingOrderId, setCancellingOrderId] = useState(null);

    const fetchUserOrders = async () => {
        setLoadingOrders(true);
        setOrderError('');
        setCancelError('');
        try {
            const response = await axios.get(`/order/my-orders`);
            setOrders(response.data || []);
        } catch (err) {
            setOrderError(err.response?.data?.message || 'Failed to fetch your orders.');
        } finally {
            setLoadingOrders(false);
        }
    };

    useEffect(() => {
        if (currentUser?._id) {
            fetchUserOrders();
        }
    }, [currentUser]);

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm('Are you sure you want to cancel this order?')) return;
        setCancellingOrderId(orderId);
        setCancelError('');
        try {
            const response = await axios.patch(`/order/my-orders/${orderId}/cancel`);
            setOrders(prevOrders => prevOrders.map(order => order._id === orderId ? response.data : order));
        } catch (err) {
            setCancelError(err.response?.data?.message || 'Failed to cancel order.');
        } finally {
            setCancellingOrderId(null);
        }
    };

    if (!currentUser) {
        return <p>Please log in to view your profile.</p>;
    }

    return (
        <div className="user-profile-wrapper">
            <div className="user-profile-container">
                <h2>{currentUser.username}'s Profile</h2>

                <div className="user-details-card">
                    <div className="details-grid">
                        <strong>Username:</strong>
                        <span>{currentUser.username}</span>
                        <strong>Email:</strong>
                        <span>{currentUser.email}</span>
                    </div>
                </div>

                <div className="user-orders-section">
                    <h3>Your Orders</h3>
                    {loadingOrders && <p>Loading your orders...</p>}
                    {orderError && <p className="error-message-profile">{orderError}</p>}
                    {cancelError && <p className="error-message-profile">{cancelError}</p>}

                    {!loadingOrders && !orderError && (
                        orders.length > 0 ? (
                            <ul className="order-list-profile">
                                {orders.map(order => (
                                    <li key={order._id} className="order-item-profile">
                                        <div className="order-item-header">
                                            <div className="order-header-info">
                                                <strong>{order.product?.name || 'N/A'}</strong>
                                                <span className="order-id-text">Order ID: {order._id}</span>
                                            </div>
                                            <span
                                                className={`order-status-badge status-${order.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                        {order.status}
                      </span>
                                        </div>

                                        <div className="order-item-details-grid">
                                            <strong>Product:</strong>
                                            <span>{order.product?.name || 'Unknown product'}</span>

                                            <strong>Pickup Box:</strong>
                                            <span>
    {order.box
        ? `${order.box.name} (${order.box.location})`
        : 'Not assigned'}
  </span>

                                            <strong>Status:</strong>
                                            <span>{order.status}</span>

                                            <strong>Ordered At:</strong>
                                            <span>{new Date(order.createdAt).toLocaleString()}</span>

                                            {order.completedAt && (
                                                <>
                                                    <strong>Completed At:</strong>
                                                    <span>{new Date(order.completedAt).toLocaleString()}</span>
                                                </>
                                            )}
                                        </div>

                                        <div className="order-item-actions">
                                            {order.product?._id && (
                                                <Link to={`/product/${order.product._id}`} className="action-link-view">
                                                    View Product
                                                </Link>
                                            )}
                                            {(order.status === 'pending' || order.status === 'printing') && (
                                                <button
                                                    onClick={() => handleCancelOrder(order._id)}
                                                    className="action-button-cancel"
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
                            <p className="no-orders-message">
                                You have no orders yet. <Link to="/">Browse products</Link> to start!
                            </p>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

export default UserProfile;
