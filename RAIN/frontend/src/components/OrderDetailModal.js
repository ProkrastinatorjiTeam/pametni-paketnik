import React from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './AdminPanel.css';
import './OrderDetailModal.css';
import { useToast } from '../contexts/ToastContext';

function OrderDetailModal({ order, isOpen, onClose, onStatusUpdated }) {
    const { showToast } = useToast();

    if (!isOpen || !order) return null;

    const updateStatus = async (newStatus) => {
        try {
            const res = await axios.patch(
                `/order/update/${order._id}/status`,
                { status: newStatus },
                { withCredentials: true }
            );
            showToast(`Status naročila uspešno spremenjen: "${newStatus}"`, 'success');

            onStatusUpdated?.(res.data);
            onClose();
        } catch (err) {
            showToast(err.response?.data?.message || 'Napaka pri posodabljanju statusa', 'error');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content admin-modal-content large-modal-content">
                <div className="modal-header">
                    <h3>Podrobnosti naročila</h3>
                    <button onClick={onClose} className="close-button">×</button>
                </div>

                <div className="modal-body order-detail-body">
                    <div className="order-detail-section">
                        <h4>Osnovni podatki</h4>
                        <div className="details-grid-order">
                            <strong>ID Naročila:</strong><span>{order._id}</span>
                            <strong>Datum:</strong><span>{new Date(order.createdAt).toLocaleString()}</span>
                            <strong>Status:</strong>
                            <span className={`status-badge status-${order.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                                {order.status}
                            </span>
                        </div>
                    </div>

                    <div className="order-detail-section">
                        <h4>Uporabnik</h4>
                        {order.orderBy ? (
                            <div className="details-grid-order">
                                <strong>Upor. ime:</strong><span>{order.orderBy.username}</span>
                                <strong>Email:</strong><span>{order.orderBy.email}</span>
                            </div>
                        ) : <p>Podatki o uporabniku niso na voljo.</p>}
                    </div>

                    <div className="order-detail-section">
                        <h4>Izdelek</h4>
                        {order.product ? (
                            <div className="details-grid-order">
                                <strong>Ime:</strong><span>{order.product.name}</span>
                                <strong>Cena:</strong><span>€{order.product.price?.toFixed(2) || 'N/A'}</span>
                                <strong>Povezava:</strong>
                                <Link to={`/product/${order.product._id}`} className="detail-link">Odpri stran izdelka</Link>
                            </div>
                        ) : <p>Podatki o izdelku niso na voljo.</p>}
                    </div>

                    <div className="order-detail-section">
                        <h4>Paketnik</h4>
                        {order.box ? (
                            <div className="details-grid-order">
                                <strong>Ime:</strong><span>{order.box.name}</span>
                                <strong>Lokacija:</strong><span>{order.box.location}</span>
                                <strong>Fizični ID:</strong><span>{order.box.physicalId}</span>
                            </div>
                        ) : <p>Podatki o boxu niso na voljo.</p>}
                    </div>
                </div>

                {/* Dodamo Actions sekcijo za spremembo statusa */}
                <div className="modal-actions order-detail-actions">
                    {(order.status === 'pending' || order.status === 'reserved') && (
                        <button className="primary" onClick={() => updateStatus('ready for pickup')}>
                            Mark as Ready for Pickup
                        </button>
                    )}
                    {order.status !== 'cancelled' && (
                        <button className="danger" onClick={() => updateStatus('cancelled')}>
                            Cancel Order
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default OrderDetailModal;
