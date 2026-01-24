import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RecommendationBanner.css';

function RecommendationBanner({ product, onClose }) {
    const navigate = useNavigate();

    if (!product) return null;

    const getImageUrl = (imagePath) => {
        if (!imagePath) {
            return null;
        }

        const filename = imagePath.split('/').pop();

        return `/product/image/${filename}`;
    }

    return (
        <div className="rec-banner-wrapper animate-slide-down">
            <div className="rec-banner-content">
                <button className="rec-banner-close" onClick={onClose} title="Zapri">
                    &times;
                </button>

                <div className="rec-banner-body">
                    <div className="rec-banner-image-container">
                        <img
                            src={getImageUrl(product.images?.[0])}
                            alt={product.name}
                            onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }}
                        />
                        <div className="rec-banner-badge">Top Pick for You</div>
                    </div>

                    <div className="rec-banner-text">
                        <h3>We thought you might like <strong>{product.name}</strong>!</h3>
                        <p>Based on your healthy shopping history, this would be a great addition to your box.</p>

                        <div className="rec-banner-footer">
                            <span className="rec-banner-price">€{product.price.toFixed(2)} / {product.unit}</span>
                            <button
                                className="rec-banner-btn"
                                onClick={() => navigate(`/product/${product._id}`)}
                            >
                                View Product
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RecommendationBanner;