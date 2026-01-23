import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AddProductPage.css';

function AddProductPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('piece');
  const [quantityAvailable, setQuantityAvailable] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      imagePreviews.forEach(fileUrl => URL.revokeObjectURL(fileUrl));
    };
  }, [imagePreviews]);

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files).slice(0, 5);
    setImageFiles(files);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(newPreviews);
  };

  const handleRemoveImage = (indexToRemove) => {
    setImageFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prev => {
      URL.revokeObjectURL(prev[indexToRemove]);
      return prev.filter((_, index) => index !== indexToRemove);
    });
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

    if (!name || !price || !quantityAvailable) {
      setError('Please fill all required fields.');
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', parseFloat(price));
    formData.append('unit', unit);
    formData.append('quantityAvailable', parseInt(quantityAvailable, 10));
    if (expiresAt) formData.append('expiresAt', expiresAt);
    imageFiles.forEach(file => formData.append('images', file));

    try {
      await axios.post('/product/add', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccessMessage('Product added successfully! Redirecting...');
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
            <h2>Add New Product</h2>
          </div>

          <form onSubmit={handleSubmit} className="add-product-form">
            <div className="form-grid">
              <div className="form-column">
                <div className="form-group">
                  <label>Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows="4" />
                </div>
                <div className="form-group">
                  <label>Price (€) *</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0" step="0.01" required />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <select value={unit} onChange={e => setUnit(e.target.value)}>
                    <option value="piece">piece</option>
                    <option value="kg">kg</option>
                    <option value="pack">pack</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantity Available *</label>
                  <input type="number" value={quantityAvailable} onChange={e => setQuantityAvailable(e.target.value)} min="0" required />
                </div>
                <div className="form-group">
                  <label>Expiration Date</label>
                  <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
                </div>
              </div>

              <div className="form-column image-upload-section">
                <div className="form-group">
                  <label>Images (up to 5) *</label>
                  <label htmlFor="images" className="file-input-label">Choose Files...</label>
                  <input type="file" id="images" multiple accept="image/*" onChange={handleImageChange} className="file-input-hidden" required />
                  {imagePreviews.length > 0 && (
                      <div className="image-preview-gallery">
                        {imagePreviews.map((src, index) => (
                            <div key={index} className="image-preview-item">
                              <img src={src} alt={`Preview ${index + 1}`} />
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
