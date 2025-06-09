import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = '/api';

function AddBoxModal({ isOpen, onClose, onBoxAdded }) {
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [physicalId, setPhysicalId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Ponastavi stanje, ko se modal zapre
    useEffect(() => {
        if (!isOpen) {
            setName('');
            setLocation('');
            setPhysicalId('');
            setError('');
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await axios.post(`${BACKEND_URL}/box/add`, { name, location, physicalId });
            onBoxAdded(); // Pokliče funkcijo v staršu za osvežitev in zaprtje
        } catch (err) {
            setError(err.response?.data?.message || 'Dodajanje boxa ni uspelo.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content admin-modal-content small-modal">
                <div className="modal-header">
                    <h3>Dodaj nov Box</h3>
                    <button onClick={onClose} className="close-button" disabled={isLoading}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label htmlFor="newBoxName">Ime:</label>
                        <input type="text" id="newBoxName" value={name} onChange={(e) => setName(e.target.value)} required/>
                    </div>
                    <div className="form-group">
                        <label htmlFor="newBoxLocation">Lokacija:</label>
                        <input type="text" id="newBoxLocation" value={location} onChange={(e) => setLocation(e.target.value)}/>
                    </div>
                    <div className="form-group">
                        <label htmlFor="newBoxPhysicalId">Fizični ID:</label>
                        <input type="text" id="newBoxPhysicalId" value={physicalId} onChange={(e) => setPhysicalId(e.target.value)} required/>
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <div className="modal-actions">
                        <button type="submit" className="action-button-primary" disabled={isLoading}>
                            {isLoading ? 'Dodajanje...' : 'Dodaj Box'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddBoxModal;