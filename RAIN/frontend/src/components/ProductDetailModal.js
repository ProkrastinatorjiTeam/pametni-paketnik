import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProductDetailModal.css'; // Uvozimo pripadajoče stile

const BACKEND_URL = 'http://localhost:3000';

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
        estimatedPrintTime: product.estimatedPrintTime || '',
        price: product.price?.toString() || '',
      });
      setCurrentImages(product.images || []);
      // Ponastavi polja za novo sejo
      setNewImageFiles([]);
      setImagePreviews([]);
      setError('');
      setSuccessMessage('');
    }
  }, [product, isOpen]);

  // Čiščenje URL-jev za predogled slik, da preprečimo puščanje pomnilnika
  useEffect(() => {
    return () => {
      imagePreviews.forEach(fileUrl => URL.revokeObjectURL(fileUrl));
    };
  }, [imagePreviews]);


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
    URL.revokeObjectURL(imagePreviews[indexToRemove]); // Počisti pomnilnik
    setNewImageFiles(prev => prev.filter((_, i) => i !== indexToRemove));
    setImagePreviews(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleDeleteExistingImage = async (imagePath) => {
    if (!product || !window.confirm(`Ali ste prepričani, da želite izbrisati to sliko?`)) return;
    setIsLoading(true);
    try {
      const imageName = imagePath.split('/').pop();
      await axios.delete(`${BACKEND_URL}/model3D/${product._id}/images/${imageName}`);
      setSuccessMessage('Slika uspešno izbrisana.');
      setCurrentImages(prev => prev.filter(img => img !== imagePath));
      onProductUpdated(); // Osveži seznam izdelkov v Admin Panelu
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
      await axios.patch(`${BACKEND_URL}/model3D/update/${product._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccessMessage('Izdelek uspešno posodobljen!');
      setNewImageFiles([]);
      setImagePreviews([]);
      onProductUpdated(); // Osveži seznam izdelkov v Admin Panelu
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
      await axios.delete(`${BACKEND_URL}/model3D/remove/${product._id}`);
      setSuccessMessage('Izdelek uspešno izbrisan.');
      onProductUpdated();
      onClose(); // Zapri modal po brisanju
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
                  <label htmlFor="editProductPrintTime">Predviden čas tiska (minute)</label>
                  <input type="number" id="editProductPrintTime" name="estimatedPrintTime" value={editData.estimatedPrintTime} onChange={handleInputChange} min="0" />
                </div>
                <div className="form-group">
                  <label htmlFor="editProductPrice">Cena (€)</label>
                  <input type="number" id="editProductPrice" name="price" value={editData.price} onChange={handleInputChange} min="0" step="0.01" placeholder="npr., 12.99" />
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
                              <img src={`${BACKEND_URL}${imgSrc}`} alt={`Izdelek ${index + 1}`} />
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