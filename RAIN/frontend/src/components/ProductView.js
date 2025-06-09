import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import './ProductView.css';
// For icons, you can install react-icons: npm install react-icons
// import { FaClock, FaEuroSign } from 'react-icons/fa';

const BACKEND_URL = '/api';

function ProductView({ currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State for countdown timer
  const [countdownMinutes, setCountdownMinutes] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // State for boxes and order creation
  const [boxes, setBoxes] = useState([]);
  const [selectedBoxId, setSelectedBoxId] = useState('');
  const [loadingBoxes, setLoadingBoxes] = useState(false);
  const [boxError, setBoxError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`${BACKEND_URL}/model3D/show/${id}`, { withCredentials: true });
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
    setLoadingBoxes(true);
    setBoxError('');
    try {
      const response = await axios.get(`${BACKEND_URL}/box/list`, { withCredentials: true });
      setBoxes(response.data?.boxes || []);
    } catch (err) {
      setBoxError(err.response?.data?.message || 'Failed to fetch boxes.');
      setBoxes([]);
    } finally {
      setLoadingBoxes(false);
    }
  };

  // Countdown Timer Effect
  useEffect(() => {
    let intervalId;
    if (timerActive) {
      intervalId = setInterval(() => {
        setCountdownSeconds(prev => {
          if (prev > 0) return prev - 1;
          setCountdownMinutes(min => {
            if (min > 0) return min - 1;
            setTimerActive(false);
            clearInterval(intervalId);
            return 0;
          });
          return 59;
        });
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [timerActive]);

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
        await axios.delete(`${BACKEND_URL}/model3D/remove/${product._id}`, { withCredentials: true });
        alert('Product deleted successfully.');
        navigate('/');
      } catch (err) {
        setDeleteError(err.response?.data?.message || 'Failed to delete product.');
      }
    }
  };

  const handleBuyNowClick = async () => {
    setIsOrderConfirmed(false);
    setOrderError('');
    setSelectedBoxId('');
    setIsModalOpen(true);
    await fetchBoxes();
  };

  const handleConfirmOrderAndStartTimer = async () => {
    if (!selectedBoxId) {
      setOrderError('Please select an available printer box.');
      return;
    }
    setOrderError('');
    try {
      await axios.post(`${BACKEND_URL}/order/create`, { model: product._id, box: selectedBoxId }, { withCredentials: true });
      setIsOrderConfirmed(true);
      if (product?.estimatedPrintTime) {
        const totalMinutes = parseInt(product.estimatedPrintTime, 10);
        if (!isNaN(totalMinutes) && totalMinutes > 0) {
          setCountdownMinutes(totalMinutes);
          setCountdownSeconds(0);
          setTimerActive(true);
        }
      }
    } catch (err) {
      setOrderError(err.response?.data?.message || 'Failed to create order.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimerActive(false);
  };

  // --- JSX Render Functions for Modal ---
  const renderOrderForm = () => (
      <>
        <h3>Configure Your Print: {product.name}</h3>
        <p className="modal-sub-text">Select an available 3D printer to begin.</p>
        <div className="form-group">
          <label htmlFor="box-select">Choose a Printer Box:</label>
          {loadingBoxes && <p className="loading-text">Scanning for available printers...</p>}
          {boxError && <p className="error-message">{boxError}</p>}
          {!loadingBoxes && !boxError && (
              <select id="box-select" value={selectedBoxId} onChange={(e) => setSelectedBoxId(e.target.value)}
                      className="box-select-dropdown" disabled={loadingBoxes}>
                <option value="">-- Select a Printer --</option>
                {boxes.map((box) => (
                    <option key={box._id} value={box._id} disabled={box.isBusy}>
                      {box.name} ({box.location}) {box.isBusy ? ' (In Use)' : ' (Available)'}
                    </option>
                ))}
              </select>
          )}
          {!loadingBoxes && !boxError && !boxes.some(b => !b.isBusy) && (
              <p className="info-message">All printers are currently busy. Please check back later.</p>
          )}
        </div>
        {orderError && <p className="error-message">{orderError}</p>}
        <div className="modal-actions-stacked">
          <button onClick={handleConfirmOrderAndStartTimer} className="modal-confirm-button"
                  disabled={loadingBoxes || !selectedBoxId || boxes.find(b => b._id === selectedBoxId)?.isBusy}>
            Confirm & Start Print
          </button>
          <button onClick={handleCloseModal} className="modal-cancel-button">Cancel</button>
        </div>
      </>
  );

  const renderConfirmationScreen = () => (
      <>
        <h3>Print Job Initiated!</h3>
        <p className="modal-sub-text">Your print of <strong>{product.name}</strong> has started.</p>
        {timerActive ? (
            <div className="countdown-container">
              <p>Estimated time remaining:</p>
              <div className="countdown-timer">
                {String(countdownMinutes).padStart(2, '0')}:{String(countdownSeconds).padStart(2, '0')}
              </div>
            </div>
        ) : (
            <p className="success-message">Your print has completed!</p>
        )}
        <button onClick={handleCloseModal} className="modal-ok-button">Close</button>
      </>
  );

  // --- Main Component Render ---
  if (!currentUser) return <Navigate to="/login" state={{ message: 'Please log in to view product details.' }} replace />;
  if (loading) return <div className="page-status">Loading Product...</div>;
  if (error) return <div className="page-status error">{error}</div>;
  if (!product) return <div className="page-status">Product data not available.</div>;

  const currentImageUrl = product.images?.[currentImageIndex] ? `${BACKEND_URL}${product.images[currentImageIndex]}` : 'placeholder.jpg';

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
                <img src={currentImageUrl} alt={product.name} className="product-main-image" loading="lazy" />
                {product.images?.length > 1 && (
                    <button onClick={handleNextImage} className="carousel-arrow next-arrow">❯</button>
                )}
              </div>
            </div>

            <div className="product-info">
              <h2>{product.name}</h2>
              <p className="product-description">{product.description}</p>
              <div className="product-meta">
                {product.estimatedPrintTime && (
                    <p className="product-print-time">
                      {/* <FaClock />  Icon Example */}
                      Est. Print Time: {product.estimatedPrintTime} minutes
                    </p>
                )}
                {product.price != null && (
                    <p className="product-price">
                      {/* <FaEuroSign /> Icon Example */}
                      Price: €{product.price.toFixed(2)}
                    </p>
                )}
              </div>
              <button onClick={handleBuyNowClick} className="buy-now-button">Start Print</button>
            </div>
          </div>
        </div>

        {isModalOpen && (
            <div className="modal-overlay">
              <div className="modal-content">
                {!isOrderConfirmed ? renderOrderForm() : renderConfirmationScreen()}
              </div>
            </div>
        )}
      </div>
  );
}

export default ProductView;