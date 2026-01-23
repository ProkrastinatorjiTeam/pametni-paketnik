import React from 'react';
import './ToastNotification.css';

function ToastNotification({ message, type, onClose }) {
    if (!message) return null;

    const notificationClass = `toast-notification ${type}`;

    return (
        <div className={notificationClass}>
            <span>{message}</span>
            <button onClick={onClose} className="toast-close-button">×</button>
        </div>
    );
}

export default ToastNotification;