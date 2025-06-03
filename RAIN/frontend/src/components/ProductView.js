import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import './ProductView.css';

const BACKEND_URL = 'http://localhost:3000';

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

  useEffect(() => {
    // Effect for fetching product data
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError('');
        setDeleteError('');
        const response = await axios.get(`${BACKEND_URL}/model3D/show/${id}`);
        setProduct(response.data);
        setCurrentImageIndex(0);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product details. Please try again later.');
        if (err.response && err.response.status === 404) {
          setError('Product not found.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id, currentUser]);


  useEffect(() => {
    // Effect for the countdown timer
    let intervalId;
    if (timerActive && isModalOpen) {
      intervalId = setInterval(() => {
        setCountdownSeconds(prevSeconds => {
          if (prevSeconds > 0) {
            return prevSeconds - 1;
          } else {
            setCountdownMinutes(prevMinutes => {
              if (prevMinutes > 0) {
                return prevMinutes - 1;
              } else {
                // Timer finished
                setTimerActive(false);
                clearInterval(intervalId);
                return 0;
              }
            });
            return 59; // Reset seconds
          }
        });
      }, 1000);
    } else {
      clearInterval(intervalId);
    }

    // Cleanup function to clear interval when component unmounts or timer stops
    return () => clearInterval(intervalId);
  }, [timerActive, isModalOpen]);


  const handleNextImage = () => {
    if (product && product.images && product.images.length > 0) {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % product.images.length);
    }
  };

  const handlePrevImage = () => {
    if (product && product.images && product.images.length > 0) {
      setCurrentImageIndex((prevIndex) =>
        (prevIndex - 1 + product.images.length) % product.images.length
      );
    }
  };

  const handleDelete = async () => {
    if (!product || !product._id) return;
    if (window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      try {
        setDeleteError('');
        // Ensure BACKEND_URL is used if not using a proxy
        await axios.delete(`${BACKEND_URL}/model3D/remove/${product._id}`);
        alert('Product deleted successfully.');
        navigate('/');
      } catch (err) {
        console.error('Error deleting product:', err);
        if (err.response) {
            if (err.response.status === 204) {
                alert('Product deleted successfully.');
                navigate('/');
                return;
            }
            setDeleteError(err.response.data?.message || `Error: ${err.response.status} ${err.response.statusText}`);
        } else {
            setDeleteError('Failed to delete product. Please check your connection and try again.');
        }
      }
    }
  };

  const handleBuyNowClick = () => {
    if (product && product.estimatedPrintTime) {
      const totalMinutes = parseInt(product.estimatedPrintTime, 10);
      if (!isNaN(totalMinutes) && totalMinutes > 0) {
        if (totalMinutes === 1) {
            setCountdownMinutes(0);
            setCountdownSeconds(60); 
        } else {
            setCountdownMinutes(totalMinutes -1);
            setCountdownSeconds(60);
        }
        setTimerActive(true);
      } else {
        // No valid print time, or print time is 0
        setCountdownMinutes(0);
        setCountdownSeconds(0);
        setTimerActive(false);
      }
    } else {
        setCountdownMinutes(0);
        setCountdownSeconds(0);
        setTimerActive(false);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimerActive(false);
  };

  if (!currentUser) {
    return <Navigate to="/login" state={{ message: 'Please log in to view product details.' }} replace />;
  }

  if (loading) {
    return <div className="product-view-loading">Loading product...</div>;
  }

  if (error) {
    return <div className="product-view-error">{error}</div>;
  }

  if (!product) {
    return <div className="product-view-error">Product data not available.</div>;
  }

  const currentImageUrl = product.images && product.images.length > 0
    ? `${BACKEND_URL}${product.images[currentImageIndex]}`
    : 'placeholder.jpg';

  return (
    <div className="product-view-container">
      <div className="product-view-actions">
        <button onClick={() => navigate(-1)} className="back-button">← Back</button>
        {currentUser && currentUser.role === 'admin' && (
          <button onClick={handleDelete} className="delete-button">Delete</button>
        )}
      </div>
      {deleteError && <p className="error-message delete-error-message">{deleteError}</p>}
      <h2>{product.name}</h2>
      <div className="image-carousel">
        {product.images && product.images.length > 1 && (
          <button onClick={handlePrevImage} className="carousel-arrow prev-arrow">
            &#10094;
          </button>
        )}
        <img src={currentImageUrl} alt={product.name} className="product-main-image" />
        {product.images && product.images.length > 1 && (
          <button onClick={handleNextImage} className="carousel-arrow next-arrow">
            &#10095;
          </button>
        )}
      </div>
      <div className="product-details">
        <p><strong>Description:</strong> {product.description || 'No description available.'}</p>
        {product.estimatedPrintTime && (
          <p><strong>Estimated Print Time:</strong> {product.estimatedPrintTime} minutes</p>
        )}
        <button onClick={handleBuyNowClick} className="buy-now-button">Buy Now</button>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Thank you for starting the print of {product.name}!</h3>
            {product.estimatedPrintTime ? (
              timerActive || (countdownMinutes === 0 && countdownSeconds === 0 && !timerActive && parseInt(product.estimatedPrintTime, 10) > 0) ? (
                <p>
                  Your print will complete in: <br />
                  <span className="countdown-timer">
                    {String(countdownMinutes).padStart(2, '0')}:{String(countdownSeconds).padStart(2, '0')}
                  </span>
                </p>
              ) : (
                <p>Your print has completed!</p>
              )
            ) : (
              <p>Print time information is not available.</p>
            )}
            <button onClick={handleCloseModal} className="modal-ok-button">OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductView;