import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AddProductModal.css'; // Uporabili bomo nove, specifične stile

const BACKEND_URL = 'http://localhost:3000';

function AddProductModal({ isOpen, onClose, onProductAdded }) {
    // Stanja za vnosna polja
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [estimatedPrintTime, setEstimatedPrintTime] = useState('');
    const [price, setPrice] = useState('');
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);

    // Stanja za povratno informacijo
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Ponastavi stanje, ko se modal zapre, da je ob ponovnem odprtju prazen
    useEffect(() => {
        if (!isOpen) {
            setName('');
            setDescription('');
            setEstimatedPrintTime('');
            setPrice('');
            setImageFiles([]);
            setImagePreviews([]);
            setError('');
            setIsLoading(false);
        }
    }, [isOpen]);

    // Čiščenje URL-jev za predogled slik, da preprečimo puščanje pomnilnika
    useEffect(() => {
        return () => {
            imagePreviews.forEach(fileUrl => URL.revokeObjectURL(fileUrl));
        };
    }, [imagePreviews]);

    const handleImageChange = (event) => {
        const files = Array.from(event.target.files).slice(0, 5);
        setImageFiles(files);
        // Sproti počistimo stare predoglede, preden ustvarimo nove
        imagePreviews.forEach(fileUrl => URL.revokeObjectURL(fileUrl));
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(newPreviews);
    };

    const handleRemoveImage = (indexToRemove) => {
        // Odstranimo iz obeh seznamov
        setImageFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        setImagePreviews(prev => {
            const newPreviews = prev.filter((_, index) => index !== indexToRemove);
            URL.revokeObjectURL(prev[indexToRemove]); // Počistimo spomin za odstranjen predogled
            return newPreviews;
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setIsLoading(true);

        if (imageFiles.length === 0) {
            setError('Prosimo, izberite vsaj eno sliko.');
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
            onProductAdded(); // Pokliče funkcijo v staršu (AdminPanel) za osvežitev in zaprtje
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
                    <h3>Dodaj nov 3D Model</h3>
                    <button onClick={onClose} className="close-button" disabled={isLoading}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="add-product-form-wrapper">
                    <div className="modal-body add-product-form-grid">
                        <div className="form-column">
                            <div className="form-group">
                                <label htmlFor="name">Ime modela</label>
                                <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="description">Opis</label>
                                <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="5" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="estimatedPrintTime">Predviden čas tiska (minute)</label>
                                <input type="number" id="estimatedPrintTime" value={estimatedPrintTime} onChange={(e) => setEstimatedPrintTime(e.target.value)} min="0" placeholder="npr., 120"/>
                            </div>
                            <div className="form-group">
                                <label htmlFor="price">Cena (€)</label>
                                <input type="number" id="price" value={price} onChange={(e) => setPrice(e.target.value)} min="0" step="0.01" placeholder="npr., 12.99"/>
                            </div>
                        </div>
                        <div className="form-column image-upload-section">
                            <div className="form-group">
                                <label>Slike (do 5)</label>
                                <label htmlFor="images" className="file-input-label">Izberi datoteke...</label>
                                <input type="file" id="images" multiple accept="image/*" onChange={handleImageChange} required className="file-input-hidden"/>
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
                        <div className="footer-message-area">
                            {error && <p className="error-message">{error}</p>}
                        </div>
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