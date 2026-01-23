import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AddProductModal.css';

function AddProductModal({ isOpen, onClose, onProductAdded }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [unit, setUnit] = useState('piece');
    const [quantityAvailable, setQuantityAvailable] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setName('');
            setDescription('');
            setPrice('');
            setUnit('piece');
            setQuantityAvailable('');
            setExpiresAt('');
            setImageFiles([]);
            setImagePreviews([]);
            setError('');
            setIsLoading(false);
        }
    }, [isOpen]);

    useEffect(() => {
        return () => {
            imagePreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [imagePreviews]);

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files).slice(0, 5);
        setImageFiles(files);
        imagePreviews.forEach(url => URL.revokeObjectURL(url));
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(newPreviews);
    };

    const handleRemoveImage = (index) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => {
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (imageFiles.length === 0) {
            setError('Prosimo, izberite vsaj eno sliko.');
            setIsLoading(false);
            return;
        }

        if (!name || !price || !quantityAvailable) {
            setError('Prosimo, izpolnite vsa obvezna polja.');
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
            onProductAdded();
        } catch (err) {
            setError(err.response?.data?.message || 'Dodajanje izdelka ni uspelo.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content admin-modal-content large-modal-content">
                <div className="modal-header">
                    <h3>Dodaj nov izdelek</h3>
                    <button onClick={onClose} className="close-button" disabled={isLoading}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="add-product-form-wrapper">
                    <div className="modal-body add-product-form-grid">
                        <div className="form-column">
                            <div className="form-group">
                                <label>Ime izdelka *</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Opis</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows="4" />
                            </div>
                            <div className="form-group">
                                <label>Cena (€) *</label>
                                <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0" step="0.01" required />
                            </div>
                            <div className="form-group">
                                <label>Enota</label>
                                <select value={unit} onChange={e => setUnit(e.target.value)}>
                                    <option value="piece">kos</option>
                                    <option value="kg">kg</option>
                                    <option value="pack">paket</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Količina na voljo *</label>
                                <input type="number" value={quantityAvailable} onChange={e => setQuantityAvailable(e.target.value)} min="0" required />
                            </div>
                            <div className="form-group">
                                <label>Datum poteka</label>
                                <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
                            </div>
                        </div>

                        <div className="form-column image-upload-section">
                            <div className="form-group">
                                <label>Slike (do 5) *</label>
                                <label htmlFor="images" className="file-input-label">Izberi datoteke...</label>
                                <input type="file" id="images" multiple accept="image/*" onChange={handleImageChange} className="file-input-hidden" required />
                                {imagePreviews.length > 0 && (
                                    <div className="image-preview-gallery">
                                        {imagePreviews.map((src, index) => (
                                            <div key={src} className="image-preview-item">
                                                <img src={src} alt={`Predogled ${index + 1}`} />
                                                <button type="button" className="remove-image-btn" onClick={() => handleRemoveImage(index)}>×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        {error && <p className="error-message">{error}</p>}
                        <div className="footer-button-group">
                            <button type="button" onClick={onClose} className="action-button-secondary" disabled={isLoading}>Prekliči</button>
                            <button type="submit" className="action-button-primary" disabled={isLoading}>
                                {isLoading ? 'Dodajanje...' : 'Dodaj izdelek'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddProductModal;