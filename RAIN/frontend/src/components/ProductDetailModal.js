import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProductDetailModal.css'; // Uvozimo pripadajoče stile

function ProductDetailModal({ product, isOpen, onClose, onProductUpdated }) {
  // Stanje za urejanje podatkov
  const [editData, setEditData] = useState({});
  const [currentImages, setCurrentImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  // Stanje za povratno informacijo uporabniku
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Ponastavi stanje obrazca, ko se modal odpre z novim izdelkom
  useEffect(() => {
    if (product) {
      setEditData({
        name: product.name || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        unit: product.unit || 'piece',
        quantityAvailable: product.quantityAvailable || 0,
        expiresAt: product.expiresAt ? product.expiresAt.split('T')[0] : ''
      });
      setCurrentImages(product.images || []);
      setNewImageFiles([]);
      setImagePreviews([]);
      setError('');
      setSuccessMessage('');
    }
  }, [product, isOpen]);

  // Čiščenje URL-jev za predogled slik
  useEffect(() => {
    return () => {
      imagePreviews.forEach(fileUrl => URL.revokeObjectURL(fileUrl));
    };
  }, [imagePreviews]);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    const filename = imagePath.split('/').pop();
    return `/product/image/${filename}`;
  };

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
    URL.revokeObjectURL(imagePreviews[indexToRemove]);
    setNewImageFiles(prev => prev.filter((_, i) => i !== indexToRemove));
    setImagePreviews(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleDeleteExistingImage = async (imagePath) => {
    if (!product || !window.confirm(`Ali ste prepričani, da želite izbrisati to sliko?`)) return;
    setIsLoading(true);
    try {
      const imageName = imagePath.split('/').pop();
      await axios.delete(`/product/${product._id}/images/${imageName}`);
      setSuccessMessage('Slika uspešno izbrisana.');
      setCurrentImages(prev => prev.filter(img => img !== imagePath));
      onProductUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Brisanje slike ni uspelo.');
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
    Object.keys(editData).forEach(key => formData.append(key, editData[key] || ''));
    newImageFiles.forEach(file => formData.append('newImages', file));

    try {
      await axios.patch(`/product/update/${product._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccessMessage('Izdelek uspešno posodobljen!');
      setNewImageFiles([]);
      setImagePreviews([]);
      onProductUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Posodabljanje izdelka ni uspelo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!product || !window.confirm(`Ali ste prepričani, da želite izbrisati izdelek "${product.name}"? Tega dejanja ni mogoče razveljaviti.`)) return;
    setIsLoading(true);
    try {
      await axios.delete(`/product/remove/${product._id}`);
      setSuccessMessage('Izdelek uspešno izbrisan.');
      onProductUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Brisanje izdelka ni uspelo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
      <div className="modal-overlay">
        <div className="modal-content admin-modal-content large-modal-content">
          <div className="modal-header">
            <h3>Uredi izdelek: {product.name}</h3>
            <button onClick={onClose} className="close-button" disabled={isLoading}>×</button>
          </div>

          <form onSubmit={handleSaveChanges} className="product-detail-form-wrapper">
            <div className="modal-body product-detail-form-grid">
              {/* 1. stolpec: Podrobnosti o izdelku */}
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="editProductName">Ime</label>
                  <input type="text" id="editProductName" name="name" value={editData.name} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="editProductDescription">Opis</label>
                  <textarea id="editProductDescription" name="description" value={editData.description} onChange={handleInputChange} rows="6" />
                </div>
                <div className="form-group">
                  <label htmlFor="editProductPrice">Cena (€)</label>
                  <input type="number" id="editProductPrice" name="price" value={editData.price} onChange={handleInputChange} min="0" step="0.01" placeholder="npr., 12.99" />
                </div>
                <div className="form-group">
                  <label htmlFor="editProductUnit">Enota</label>
                  <select id="editProductUnit" name="unit" value={editData.unit} onChange={handleInputChange}>
                    <option value="piece">kos</option>
                    <option value="kg">kg</option>
                    <option value="pack">paket</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="editProductQuantity">Razpoložljivo število</label>
                  <input type="number" id="editProductQuantity" name="quantityAvailable" value={editData.quantityAvailable} onChange={handleInputChange} min="0" />
                </div>
                <div className="form-group">
                  <label htmlFor="editProductExpires">Rok uporabe</label>
                  <input type="date" id="editProductExpires" name="expiresAt" value={editData.expiresAt} onChange={handleInputChange} />
                </div>
              </div>

              {/* 2. stolpec: Upravljanje s slikami */}
              <div className="form-column image-management-section">
                <div className="form-group">
                  <label>Obstoječe slike</label>
                  {currentImages.length > 0 ? (
                      <div className="image-gallery">
                        {currentImages.map((imgSrc, index) => (
                            <div key={index} className="image-item">
                              <img
                                  src={getImageUrl(product.images?.[index]) || 'placeholder.svg'}
                                  alt={product.name}
                                  className="model-card-image"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'placeholder.svg';
                                  }}
                              />
                              <button type="button" className="delete-image-btn" onClick={() => handleDeleteExistingImage(imgSrc)} disabled={isLoading}>×</button>
                            </div>
                        ))}
                      </div>
                  ) : <p className="no-items-message">Ni obstoječih slik.</p>}
                </div>

                <div className="form-group">
                  <label>Dodaj nove slike</label>
                  <label htmlFor="newProductImages" className="file-input-label">Izberi datoteke...</label>
                  <input type="file" id="newProductImages" multiple accept="image/*" onChange={handleImageFileChange} className="file-input-hidden" />
                  {imagePreviews.length > 0 && (
                      <div className="image-gallery new-image-previews">
                        {imagePreviews.map((previewSrc, index) => (
                            <div key={index} className="image-item">
                              <img src={previewSrc} alt={`Predogled ${index + 1}`} />
                              <button type="button" className="delete-image-btn" onClick={() => removeNewImagePreview(index)} disabled={isLoading}>×</button>
                            </div>
                        ))}
                      </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <div className="footer-message-area">
                {isLoading && <p>Obdelovanje...</p>}
                {error && <p className="error-message">{error}</p>}
                {successMessage && <p className="success-message">{successMessage}</p>}
              </div>
              <div className="footer-button-group">
                <button type="button" onClick={handleDeleteProduct} className="action-button-danger" disabled={isLoading}>Izbriši izdelek</button>
                <button type="submit" className="action-button-primary" disabled={isLoading}>Shrani spremembe</button>
              </div>
            </div>
          </form>
        </div>
      </div>
  );
}

export default ProductDetailModal;
