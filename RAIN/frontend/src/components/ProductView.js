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
  const [deleteError, setDeleteError] = useState(''); // For delete operation errors

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError('');
        setDeleteError(''); // Clear previous delete errors
        const response = await axios.get(`/model3D/show/${id}`);
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
    // Simple confirmation, consider a more robust modal for production
    if (window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      try {
        setDeleteError('');
        // Corrected URL to match backend route for removing a model
        await axios.delete(`/model3D/remove/${product._id}`);
        alert('Product deleted successfully.'); // Or use a more subtle notification
        navigate('/'); // Navigate to home page
      } catch (err) {
        console.error('Error deleting product:', err);
        if (err.response) {
            // Check if the response status is 204 (No Content), which is a success for DELETE
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
      <div className="product-view-actions"> {/* Wrapper for buttons */}
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
      </div>
    </div>
  );
}

export default ProductView;