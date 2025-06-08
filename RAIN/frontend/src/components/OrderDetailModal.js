import React from 'react';
import { Link } from 'react-router-dom';
import './AdminPanel.css'; // Ponovno uporabimo glavne stile
import './OrderDetailModal.css'; // Dodatni, specifični stili

function OrderDetailModal({ order, isOpen, onClose }) {
    if (!isOpen || !order) return null;

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
                            <strong>Status:</strong><span className={`status-badge status-${order.status?.toLowerCase().replace(/\s+/g, '-')}`}>{order.status}</span>
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
                        {order.model ? (
                            <div className="details-grid-order">
                                <strong>Ime:</strong><span>{order.model.name}</span>
                                <strong>Cena:</strong><span>€{order.model.price?.toFixed(2) || 'N/A'}</span>
                                <strong>Čas tiska:</strong><span>{order.model.estimatedPrintTime || 'N/A'} min</span>
                                <strong>Povezava:</strong><Link to={`/product/${order.model._id}`} className="detail-link">Odpri stran izdelka</Link>
                            </div>
                        ) : <p>Podatki o izdelku niso na voljo.</p>}
                    </div>

                    <div className="order-detail-section">
                        <h4>Tiskalniški Box</h4>
                        {order.box ? (
                            <div className="details-grid-order">
                                <strong>Ime:</strong><span>{order.box.name}</span>
                                <strong>Lokacija:</strong><span>{order.box.location}</span>
                                <strong>Fizični ID:</strong><span>{order.box.physicalId}</span>
                            </div>
                        ) : <p>Podatki o boxu niso na voljo.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OrderDetailModal;