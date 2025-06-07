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

  // State for boxes and order creation
  const [boxes, setBoxes] = useState([]);
  const [selectedBoxId, setSelectedBoxId] = useState('');
  const [loadingBoxes, setLoadingBoxes] = useState(false);
  const [boxError, setBoxError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false); // To control modal content

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

  const fetchBoxes = async () => {
    if (!currentUser) return;
    setLoadingBoxes(true);
    setBoxError('');
    try {
      // The backend /box/list now includes an 'isBusy' field
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
  }, [timerActive, isModalOpen, isOrderConfirmed]);


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

  const handleBuyNowClick = async () => {
    setIsOrderConfirmed(false); // Reset confirmation state
    setOrderError(''); // Clear previous order errors
    setSelectedBoxId(''); // Reset selected box
    if (boxes.length === 0) { // Fetch boxes if not already loaded
      await fetchBoxes();
    }
    setIsModalOpen(true);
    // Timer does not start here anymore
  };

  const handleConfirmOrderAndStartTimer = async () => {
    if (!selectedBoxId) {
      setOrderError('Please select a box.');
      return;
    }
    setOrderError('');

    try {
      // Create order
      const orderPayload = {
        model: product._id, // product ID
        box: selectedBoxId,
        // status will default to 'pending' or as defined in backend
      };
      // console.log('Creating order with payload:', orderPayload);
      // console.log('Current user for order:', currentUser);


      await axios.post(`${BACKEND_URL}/order/create`, orderPayload);
      // console.log('Order created successfully:', orderResponse.data);


      setIsOrderConfirmed(true); // Update modal to show timer

      // Start timer logic (moved from handleBuyNowClick)
      if (product && product.estimatedPrintTime) {
        const totalMinutes = parseInt(product.estimatedPrintTime, 10);
        if (!isNaN(totalMinutes) && totalMinutes > 0) {
          if (totalMinutes === 1) {
            setCountdownMinutes(0);
            setCountdownSeconds(59); // Start from 59 seconds for a 1-minute timer
          } else {
            setCountdownMinutes(totalMinutes - 1);
            setCountdownSeconds(59); // Start from 59 seconds
          }
          setTimerActive(true);
        } else {
          setCountdownMinutes(0);
          setCountdownSeconds(0);
          setTimerActive(false);
        }
      } else {
        setCountdownMinutes(0);
        setCountdownSeconds(0);
        setTimerActive(false);
      }
    } catch (err) {
      console.error('Error creating order:', err.response ? err.response.data : err);
      setOrderError(err.response?.data?.message || 'Failed to create order.');
      setIsOrderConfirmed(false);
    }
  };


  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimerActive(false); // Stop timer if modal is closed
    setIsOrderConfirmed(false); // Reset confirmation state
    setOrderError('');
    setBoxError(''); // Clear box error on close
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
            {!isOrderConfirmed ? (
              <>
                <h3>Confirm Your Print: {product.name}</h3>
                {product.estimatedPrintTime && (
                  <p><strong>Estimated Print Time:</strong> {product.estimatedPrintTime} minutes</p>
                )}
                <div className="form-group">
                  <label htmlFor="box-select">Choose a Box:</label>
                  {loadingBoxes && <p>Loading boxes...</p>}
                  {boxError && <p className="error-message">{boxError}</p>}
                  {!loadingBoxes && !boxError && boxes.length > 0 && (
                    <select
                      id="box-select"
                      value={selectedBoxId}
                      onChange={(e) => setSelectedBoxId(e.target.value)}
                      className="box-select-dropdown"
                      disabled={loadingBoxes}
                    >
                      <option value="">-- Select a Box --</option>
                      {boxes.map((box) => (
                        <option 
                          key={box._id} 
                          value={box._id} 
                          disabled={box.isBusy} // Disable if busy
                        >
                          {box.name} (Location: {box.location || 'N/A'})
                          {box.isBusy ? ' (In Use)' : ''} {/* Indicate if busy */}
                        </option>
                      ))}
                    </select>
                  )}
                  {!loadingBoxes && !boxError && boxes.length === 0 && (
                    <p>No boxes available at the moment.</p>
                  )}
                   {!loadingBoxes && !boxError && boxes.length > 0 && !boxes.some(b => !b.isBusy) && (
                    <p>All available boxes are currently in use.</p>
                  )}
                </div>
                {orderError && <p className="error-message">{orderError}</p>}
                <div className="modal-actions-stacked">
                  <button
                    onClick={handleConfirmOrderAndStartTimer}
                    className="modal-ok-button"
                    disabled={loadingBoxes || !selectedBoxId || boxes.find(b => b._id === selectedBoxId)?.isBusy || (boxes.length > 0 && !boxes.some(b => !b.isBusy))}
                  >
                    Confirm Order & Start Print
                  </button>
                  <button onClick={handleCloseModal} className="modal-cancel-button">
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductView;