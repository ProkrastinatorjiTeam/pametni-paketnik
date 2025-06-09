import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AddProductPage.css';

const BACKEND_URL = 'http://localhost:3000';

function AddProductPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedPrintTime, setEstimatedPrintTime] = useState('');
  const [price, setPrice] = useState('');
  const [imageFiles, setImageFiles] = useState([]); // For the actual File objects
  const [imagePreviews, setImagePreviews] = useState([]); // For the preview URLs

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Clean up preview URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      imagePreviews.forEach(fileUrl => URL.revokeObjectURL(fileUrl));
    };
  }, [imagePreviews]);

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files).slice(0, 5); // Limit to 5
    setImageFiles(files);

    // Create new preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(newPreviews);
  };

  const handleRemoveImage = (indexToRemove) => {
    // Remove from both files and previews
    setImageFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    if (imageFiles.length === 0) {
      setError('Please select at least one image.');
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('estimatedPrintTime', estimatedPrintTime || 0);
    formData.append('price', price || null);
    imageFiles.forEach(image => {
      formData.append('images', image);
    });

    try {
      await axios.post(`${BACKEND_URL}/model3D/add`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccessMessage('Product added successfully! You will be redirected shortly.');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add product.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="add-product-page-wrapper">
        <div className="add-product-container">
          <div className="header-with-back-button">
            <button onClick={() => navigate(-1)} className="page-back-button">← Back</button>
            <h2>Add New 3D Model</h2>
          </div>

          <form onSubmit={handleSubmit} className="add-product-form">
            <div className="form-grid">
              {/* Column 1: Text Details */}
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="name">Model Name</label>
                  <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="5" />
                </div>
                <div className="form-group">
                  <label htmlFor="estimatedPrintTime">Est. Print Time (minutes)</label>
                  <input type="number" id="estimatedPrintTime" value={estimatedPrintTime} onChange={(e) => setEstimatedPrintTime(e.target.value)} min="0" placeholder="e.g., 120"/>
                </div>
                <div className="form-group">
                  <label htmlFor="price">Price (€)</label>
                  <input type="number" id="price" value={price} onChange={(e) => setPrice(e.target.value)} min="0" step="0.01" placeholder="e.g., 12.99" />
                </div>
              </div>

              {/* Column 2: Image Upload */}
              <div className="form-column image-upload-section">
                <div className="form-group">
                  <label>Images (up to 5)</label>
                  <label htmlFor="images" className="file-input-label">Choose Files...</label>
                  <input type="file" id="images" multiple accept="image/*" onChange={handleImageChange} className="file-input-hidden"/>

                  {imagePreviews.length > 0 && (
                      <div className="image-preview-gallery">
                        {imagePreviews.map((previewSrc, index) => (
                            <div key={index} className="image-preview-item">
                              <img src={previewSrc} alt={`Preview ${index + 1}`} />
                              <button type="button" className="remove-image-btn" onClick={() => handleRemoveImage(index)}>×</button>
                            </div>
                        ))}
                      </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-footer">
              {error && <p className="error-message">{error}</p>}
              {successMessage && <p className="success-message">{successMessage}</p>}

              <button type="submit" className="submit-product-button" disabled={isLoading}>
                {isLoading ? 'Adding Product...' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}

export default AddProductPage;