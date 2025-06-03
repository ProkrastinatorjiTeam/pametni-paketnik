import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProductView.css'; 

const BACKEND_URL = 'http://localhost:3000';

function ProductView() {
  const { id } = useParams(); // Get product ID from URL
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`/model3D/show/${id}`); // Endpoint to get a single product
        setProduct(response.data);
        setCurrentImageIndex(0); // Reset to first image on new product load
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
  }, [id]);

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
    : 'placeholder.jpg'; // Fallback image if needed

  return (
    <div className="product-view-container">
      <button onClick={() => navigate(-1)} className="back-button">← Back</button>
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
        {/* Add more product details here as needed */}
      </div>
    </div>
  );
}

export default ProductView;