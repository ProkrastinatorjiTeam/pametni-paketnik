import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css'; // Reuse styles
import './ProductDetailModal.css';

const BACKEND_URL = 'http://localhost:3000';

function ProductDetailModal({ product, isOpen, onClose, onProductUpdated, currentUser }) {
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    estimatedPrintTime: '',
    price: '',
  });
  const [currentImages, setCurrentImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]); // For file objects
  const [imagePreviews, setImagePreviews] = useState([]); // For new image previews

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (product) {
      setEditData({
        name: product.name || '',
        description: product.description || '',
        estimatedPrintTime: product.estimatedPrintTime || '',
        price: product.price !== null && product.price !== undefined ? product.price.toString() : '',
      });
      setCurrentImages(product.images || []);
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

  const removeNewImagePreview = (index) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      newPreviews.forEach(preview => URL.revokeObjectURL(preview)); // Clean up
      return newPreviews;
    });
  };

  const handleDeleteExistingImage = async (imagePath) => {
    if (!product || !window.confirm(`Are you sure you want to delete this image?`)) return;
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const imageName = imagePath.split('/').pop();
      await axios.delete(`${BACKEND_URL}/model3D/${product._id}/images/${imageName}`);
      setSuccessMessage('Image deleted successfully.');
      setCurrentImages(prev => prev.filter(img => img !== imagePath));
      onProductUpdated(); // Refresh product list in AdminPanel
    } catch (err) {
      console.error('Error deleting image:', err);
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
    formData.append('name', editData.name);
    formData.append('description', editData.description);
    formData.append('estimatedPrintTime', editData.estimatedPrintTime || 0);
    formData.append('price', editData.price || null);

    // Append new images if any
    newImageFiles.forEach(file => {
      formData.append('newImages', file); // Backend should expect 'newImages'
    });

    // If you need to tell the backend which existing images to keep (not implemented here for simplicity)
    // formData.append('existingImagesToKeep', JSON.stringify(currentImages));

    try {
      await axios.patch(`${BACKEND_URL}/model3D/update/${product._id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSuccessMessage('Product updated successfully!');
      setNewImageFiles([]); // Clear new files after successful upload
      setImagePreviews([]);
      onProductUpdated();
      // onClose(); // Optionally close modal on success
    } catch (err) {
      console.error('Error updating product:', err);
      setError(err.response?.data?.message || 'Failed to update product.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!product || !window.confirm(`Are you sure you want to delete the product "${product.name}"? This action cannot be undone.`)) return;
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      await axios.delete(`${BACKEND_URL}/model3D/remove/${product._id}`);
      setSuccessMessage('Product deleted successfully.');
      onProductUpdated();
      onClose(); // Close modal after deletion
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err.response?.data?.message || 'Failed to delete product.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="modal-overlay admin-modal-overlay">
      <div className="modal-content admin-modal-content large-modal-content product-detail-modal">
        <h3>Edit Product: {product.name}</h3>
        <form onSubmit={handleSaveChanges}>
          <div className="form-group">
            <label htmlFor="editProductName">Name:</label>
            <input type="text" id="editProductName" name="name" value={editData.name} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="editProductDescription">Description:</label>
            <textarea id="editProductDescription" name="description" value={editData.description} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="editProductPrintTime">Estimated Print Time (minutes):</label>
            <input type="number" id="editProductPrintTime" name="estimatedPrintTime" value={editData.estimatedPrintTime} onChange={handleInputChange} min="0" />
          </div>
          <div className="form-group">
            <label htmlFor="editProductPrice">Price (€):</label>
            <input type="number" id="editProductPrice" name="price" value={editData.price} onChange={handleInputChange} min="0" step="0.01" placeholder="Optional" />
          </div>

          <div className="form-group">
            <h4>Current Images</h4>
            {currentImages.length > 0 ? (
              <div className="image-gallery">
                {currentImages.map((imgSrc, index) => (
                  <div key={index} className="image-item">
                    <img src={`${BACKEND_URL}${imgSrc}`} alt={`Product ${index + 1}`} />
                    <button type="button" className="delete-image-btn" onClick={() => handleDeleteExistingImage(imgSrc)} disabled={isLoading}>
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            ) : <p>No current images.</p>}
          </div>

          <div className="form-group">
            <label htmlFor="newProductImages">Add New Images (up to 5 total including existing):</label>
            <input type="file" id="newProductImages" multiple accept="image/*" onChange={handleImageFileChange} />
            {imagePreviews.length > 0 && (
              <div className="image-gallery new-image-previews">
                {imagePreviews.map((previewSrc, index) => (
                  <div key={index} className="image-item">
                    <img src={previewSrc} alt={`New preview ${index + 1}`} />
                    <button type="button" className="delete-image-btn" onClick={() => removeNewImagePreview(index)} disabled={isLoading}>
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isLoading && <p>Processing...</p>}
          {error && <p className="error-message modal-error">{error}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}

          <div className="modal-actions">
            <button type="submit" className="submit-button" disabled={isLoading}>Save Changes</button>
            <button type="button" onClick={handleDeleteProduct} className="delete-button" disabled={isLoading}>Delete Product</button>
            <button type="button" onClick={onClose} className="modal-close-button" disabled={isLoading}>Close</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductDetailModal;