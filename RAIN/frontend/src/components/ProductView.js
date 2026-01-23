import React, {useState, useEffect} from 'react';
import {useParams, useNavigate, Navigate} from 'react-router-dom';
import axios from 'axios';
import './ProductView.css';

function ProductView({currentUser}) {
    const {id} = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [boxes, setBoxes] = useState([]);
    const [selectedBox, setSelectedBox] = useState('');
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }
        const fetchProduct = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await axios.get(`/product/show/${id}`, {withCredentials: true});
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
        const res = await axios.get('/box/list');
        setBoxes(res.data.boxes || []);
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
        if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
            try {
                setDeleteError('');
                await axios.delete(`/product/remove/${product._id}`, {withCredentials: true});
                alert('Product deleted successfully.');
                navigate('/');
            } catch (err) {
                setDeleteError(err.response?.data?.message || 'Failed to delete product.');
            }
        }
    };

    const handleBuyNow = async () => {
        await fetchBoxes();
        setShowModal(true);
    };

    const confirmOrder = async () => {
        if (!selectedBox) {
            alert('Please select a pickup box');
            return;
        }

        try {
            await axios.post('/order/create', {
                product: product._id,
                box: selectedBox
            });

            alert('Order created! You can pick it up from the selected box.');
            navigate('/profile');
        } catch (err) {
            alert(err.response?.data?.message || 'Order failed');
        }
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) {
            return null;
        }

        const filename = imagePath.split('/').pop();

        return `/product/image/${filename}`;
    }

    if (!currentUser) return <Navigate to="/login" state={{message: 'Please log in to view product details.'}}
                                       replace/>;
    if (loading) return <div className="page-status">Loading Product...</div>;
    if (error) return <div className="page-status error">{error}</div>;
    if (!product) return <div className="page-status">Product data not available.</div>;

    const rawImagePath = product.images?.[currentImageIndex];
    const currentImageUrl = rawImagePath ? getImageUrl(rawImagePath) : null;

    return (
        <div className="product-view-wrapper">
            <div className="product-view-container">
                <div className="product-view-actions">
                    <button onClick={() => navigate(-1)} className="back-button">← Back to Gallery</button>
                    {currentUser?.role === 'admin' && (
                        <button onClick={handleDelete} className="delete-button">Delete Product</button>
                    )}
                </div>
                {deleteError && <p className="error-message full-width-error">{deleteError}</p>}

                <div className="product-grid">
                    <div className="product-gallery">
                        <div className="image-carousel">
                            {product.images?.length > 1 && (
                                <button onClick={handlePrevImage} className="carousel-arrow prev-arrow">❮</button>
                            )}
                            <img
                                src={currentImageUrl || '/placeholder.svg'}
                                alt={product.name}
                                className="product-main-image"
                                loading="lazy"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/placeholder.svg';
                                }}
                            />
                            {product.images?.length > 1 && (
                                <button onClick={handleNextImage} className="carousel-arrow next-arrow">❯</button>
                            )}
                        </div>
                    </div>

                    <div className="product-info">
                        <h2>{product.name}</h2>
                        <p className="product-description">{product.description}</p>
                        <div className="product-meta">
                            {product.price != null && (
                                <p className="product-price">Price: €{product.price.toFixed(2)} per {product.unit}</p>
                            )}
                            <p className="product-quantity">Available: {product.quantityAvailable} {product.unit}</p>
                            {product.expiresAt && (
                                <p className="product-expires">Expires
                                    on: {new Date(product.expiresAt).toLocaleDateString()}</p>
                            )}
                        </div>

                        <button className="buy-now-button" onClick={handleBuyNow}>
                            Buy Now
                        </button>
                    </div>
                </div>
            </div>
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Select pickup box</h3>

                        <select
                            value={selectedBox}
                            onChange={(e) => setSelectedBox(e.target.value)}
                            style={{padding: '8px', width: '100%', marginBottom: '15px'}}
                        >
                            <option value="">-- izberi prevzemno mesto --</option>
                            {boxes.map(box => (
                                <option
                                    key={box._id}
                                    value={box._id}
                                    disabled={box.isBusy}
                                    style={{color: box.isBusy ? 'red' : 'green'}}
                                >
                                    {box.name} ({box.location}) — {box.isBusy ? '❌ Zasedeno' : '✅ Prosto'}
                                </option>
                            ))}
                        </select>

                        <div className="modal-actions">
                            <button onClick={confirmOrder}>Confirm Order</button>
                            <button onClick={() => setShowModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>


    );
}

export default ProductView;
