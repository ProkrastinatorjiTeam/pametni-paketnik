import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProductDetailModal.css'; // We will create a new themed CSS file

const BACKEND_URL = 'http://localhost:3000';

function ProductDetailModal({ product, isOpen, onClose, onProductUpdated }) {
  const [editData, setEditData] = useState({});
  const [currentImages, setCurrentImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Reset form state when the modal opens with a new product
  useEffect(() => {
    if (product) {
      setEditData({
        name: product.name || '',
        description: product.description || '',
        estimatedPrintTime: product.estimatedPrintTime || '',
        price: product.price?.toString() || '',
      });
      setCurrentImages(product.images || []);
      // Reset fields for new session
      setNewImageFiles([]);
      setImagePreviews([]);
      setError('');
      setSuccessMessage('');
    }
  }, [product, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageFileChange = (e) => {
    const files = Array.from(e.target.files);
    setNewImageFiles(prev => [...prev, ...files]);
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previews]);
  };

  const removeNewImagePreview = (indexToRemove) => {
    URL.revokeObjectURL(imagePreviews[indexToRemove]); // Clean up memory
    setNewImageFiles(prev => prev.filter((_, i) => i !== indexToRemove));
    setImagePreviews(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleDeleteExistingImage = async (imagePath) => {
    if (!product || !window.confirm(`Are you sure you want to delete this image?`)) return;
    setIsLoading(true);
    try {
      const imageName = imagePath.split('/').pop();
      await axios.delete(`${BACKEND_URL}/model3D/${product._id}/images/${imageName}`);
      setSuccessMessage('Image deleted successfully.');
      setCurrentImages(prev => prev.filter(img => img !== imagePath));
      onProductUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete image.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    const formData = new FormData();
    Object.keys(editData).forEach(key => formData.append(key, editData[key]));
    newImageFiles.forEach(file => formData.append('newImages', file));

    try {
      await axios.patch(`${BACKEND_URL}/model3D/update/${product._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccessMessage('Product updated successfully!');
      setNewImageFiles([]);
      setImagePreviews([]);
      onProductUpdated(); // Refresh list in AdminPanel
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update product.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!product || !window.confirm(`Are you sure you want to delete "${product.name}"?`)) return;
    setIsLoading(true);
    try {
      await axios.delete(`${BACKEND_URL}/model3D/remove/${product._id}`);
      setSuccessMessage('Product deleted successfully.');
      onProductUpdated();
      onClose(); // Close modal after deletion
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete product.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
      <div className="modal-overlay">
        <div className="modal-content admin-modal-content large-modal-content">
          <div className="modal-header">
            <h3>Edit Product: {product.name}</h3>
            <button onClick={onClose} className="close-button" disabled={isLoading}>×</button>
          </div>

          <form onSubmit={handleSaveChanges} className="modal-body product-detail-form-grid">
            {/* Column 1: Product Details */}
            <div className="form-column">
              <div className="form-group">
                <label htmlFor="editProductName">Name</label>
                <input type="text" id="editProductName" name="name" value={editData.name} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="editProductDescription">Description</label>
                <textarea id="editProductDescription" name="description" value={editData.description} onChange={handleInputChange} rows="6" />
              </div>
              <div className="form-group">
                <label htmlFor="editProductPrintTime">Est. Print Time (minutes)</label>
                <input type="number" id="editProductPrintTime" name="estimatedPrintTime" value={editData.estimatedPrintTime} onChange={handleInputChange} min="0" />
              </div>
              <div className="form-group">
                <label htmlFor="editProductPrice">Price (€)</label>
                <input type="number" id="editProductPrice" name="price" value={editData.price} onChange={handleInputChange} min="0" step="0.01" placeholder="e.g., 12.99" />
              </div>
            </div>

            {/* Column 2: Image Management */}
            <div className="form-column image-management-section">
              <div className="form-group">
                <label>Current Images</label>
                {currentImages.length > 0 ? (
                    <div className="image-gallery">
                      {currentImages.map((imgSrc, index) => (
                          <div key={index} className="image-item">
                            <img src={`${BACKEND_URL}${imgSrc}`} alt={`Product ${index + 1}`} />
                            <button type="button" className="delete-image-btn" onClick={() => handleDeleteExistingImage(imgSrc)} disabled={isLoading}>×</button>
                          </div>
                      ))}
                    </div>
                ) : <p className="no-items-message">No current images.</p>}
              </div>

              <div className="form-group">
                <label>Add New Images</label>
                <label htmlFor="newProductImages" className="file-input-label">Choose Files...</label>
                <input type="file" id="newProductImages" multiple accept="image/*" onChange={handleImageFileChange} className="file-input-hidden" />

                {imagePreviews.length > 0 && (
                    <div className="image-gallery new-image-previews">
                      {imagePreviews.map((previewSrc, index) => (
                          <div key={index} className="image-item">
                            <img src={previewSrc} alt={`New preview ${index + 1}`} />
                            <button type="button" className="delete-image-btn" onClick={() => removeNewImagePreview(index)} disabled={isLoading}>×</button>
                          </div>
                      ))}
                    </div>
                )}
              </div>
            </div>
          </form>

          <div className="modal-footer">
            <div className="footer-message-area">
              {isLoading && <p>Processing...</p>}
              {error && <p className="error-message">{error}</p>}
              {successMessage && <p className="success-message">{successMessage}</p>}
            </div>
            <div className="footer-button-group">
              <button type="button" onClick={handleDeleteProduct} className="action-button-danger" disabled={isLoading}>Delete Product</button>
              <button type="button" onClick={handleSaveChanges} className="action-button-primary" disabled={isLoading}>Save Changes</button>
            </div>
          </div>
        </div>
      </div>
  );
}

export default ProductDetailModal;