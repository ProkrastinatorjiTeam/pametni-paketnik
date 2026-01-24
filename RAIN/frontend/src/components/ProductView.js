import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import './ProductView.css';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from './ConfirmModal';

function ProductView({ currentUser }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [boxes, setBoxes] = useState([]);
    const [selectedBox, setSelectedBox] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [isOrdering, setIsOrdering] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }
        const fetchProduct = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await axios.get(`/product/show/${id}`);
                setProduct(response.data);
            } catch (err) {
                console.error('Error fetching product:', err);
                setError(err.response?.data?.message || 'Failed to load product details.');
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchProduct();
    }, [id, currentUser]);

    const fetchBoxes = async () => {
        try {
            const res = await axios.get('/box/list');
            setBoxes(res.data.boxes || []);
        } catch (err) {
            console.error("Error at fetching boxes:.");
        }
    };

    const handleNextImage = () => {
        if (product?.images?.length) {
            setCurrentImageIndex(prev => (prev + 1) % product.images.length);
        }
    };

    const handlePrevImage = () => {
        if (product?.images?.length) {
            setCurrentImageIndex(prev => (prev - 1 + product.images.length) % product.images.length);
        }
    };

    const handleDelete = async () => {
        setIsConfirmOpen(true);
    };

    const triggerDelete= async () => {
        setIsConfirmOpen(false);

        try {
            setDeleteError('');
            await axios.delete(`/product/remove/${product._id}`);

            showToast('Product deleted!', 'success');
            navigate('/');
        } catch (err) {
            setDeleteError(err.response?.data?.message || 'Error at deleting.');
        }
    };

    const handleBuyNow = async () => {
        await fetchBoxes();
        setShowModal(true);
    };

    const confirmOrder = async () => {
        if (!selectedBox) return;

        setIsOrdering(true);
        try {
            await axios.post('/order/create', {
                product: product._id,
                box: selectedBox
            });

            showToast('Order placed!', 'success');
            navigate('/profile');
        } catch (err) {
            alert(err.response?.data?.message || 'Naročilo ni uspelo.');
        } finally {
            setIsOrdering(false);
        }
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        const filename = imagePath.split('/').pop();
        return `/product/image/${filename}`;
    };

    if (!currentUser) return <Navigate to="/login" state={{ message: 'Please log in.' }} replace />;
    if (loading) return <div className="page-status animate-pulse">Preparing product info...</div>;
    if (error) return <div className="page-status error">⚠️ {error}</div>;
    if (!product) return <div className="page-status">Product does not exist.</div>;

    const currentImageUrl = product.images?.[currentImageIndex] ? getImageUrl(product.images[currentImageIndex]) : '/placeholder.svg';

    return (
        <div className="product-view-wrapper">
            <div className="product-view-container">
                <div className="product-view-actions">
                    <button onClick={() => navigate(-1)} className="back-button">← Back to store</button>
                    {currentUser?.role === 'admin' && (
                        <button onClick={handleDelete} className="delete-button-outline">Delete product</button>
                    )}
                </div>

                {deleteError && <div className="error-banner">{deleteError}</div>}

                <div className="product-grid">
                    <div className="product-gallery">
                        <div className="image-carousel-main">
                            {product.images?.length > 1 && (
                                <>
                                    <button onClick={handlePrevImage} className="nav-arrow prev">❮</button>
                                    <button onClick={handleNextImage} className="nav-arrow next">❯</button>
                                </>
                            )}
                            <img
                                src={currentImageUrl}
                                alt={product.name}
                                className="main-display-image"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }}
                            />
                            <div className="image-counter">
                                {currentImageIndex + 1} / {product.images?.length || 1}
                            </div>
                        </div>
                    </div>

                    <div className="product-info-panel">
                        <div className="info-header">
                            <span className="category-tag">Local Farm</span>
                            <h1>{product.name}</h1>
                        </div>

                        <p className="product-desc-text">{product.description}</p>

                        <div className="product-stats-card">
                            <div className="stat-row">
                                <span className="stat-label">Price:</span>
                                <span className="stat-value price-highlight">€{product.price.toFixed(2)} <small>/ {product.unit}</small></span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Available:</span>
                                <span className="stat-value">{product.quantityAvailable} {product.unit}</span>
                            </div>
                            {product.expiresAt && (
                                <div className="stat-row">
                                    <span className="stat-label">Good until:</span>
                                    <span className="stat-value text-red">{new Date(product.expiresAt).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>

                        <button className="primary-buy-button" onClick={handleBuyNow}>
                            Add to box!
                        </button>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay-blur">
                    <div className="order-modal-box">
                        <div className="modal-header">
                            <h3>Select the pickup box</h3>
                            <button className="close-x" onClick={() => setShowModal(false)}>&times;</button>
                        </div>

                        <div className="modal-body-content">
                            <p>Product <strong>{product.name}</strong> will be delivered to selected box!</p>

                            <div className="select-container">
                                <select
                                    className="fancy-select"
                                    value={selectedBox}
                                    onChange={(e) => setSelectedBox(e.target.value)}
                                >
                                    <option value="">-- Seznam prostih omaric --</option>
                                    {boxes.map(box => (
                                        <option
                                            key={box._id}
                                            value={box._id}
                                            disabled={box.isBusy}
                                        >
                                            {box.name} ({box.location}) — {box.isBusy ? '❌ Busy' : '✅ Free'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="modal-footer-btns">
                            <button
                                className="confirm-btn"
                                onClick={confirmOrder}
                                disabled={!selectedBox || isOrdering}
                            >
                                {isOrdering ? 'Confirming..' : 'Confirm Order'}
                            </button>
                            <button className="cancel-btn" onClick={() => setShowModal(false)}>Prekliči</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={triggerDelete}
                title="Deleting product"
                message="Are you sure you want to delete this product?"
                confirmText="Yes, delete"
                cancelText="No, keep"
            />
        </div>
    );
}

export default ProductView;