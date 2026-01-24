import React from 'react';
import './ConfirmModal.css';

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, type = 'danger' }) {
    if (!isOpen) return null;

    return (
        <div className="confirm-modal-overlay" onClick={onClose}>
            <div className="confirm-modal-content" onClick={e => e.stopPropagation()}>
                <div className="confirm-modal-header">
                    <div className={`modal-icon ${type}`}>
                        {type === 'danger' ? '⚠️' : '❓'}
                    </div>
                    <h3>{title}</h3>
                </div>
                <div className="confirm-modal-body">
                    <p>{message}</p>
                </div>
                <div className="confirm-modal-footer">
                    <button className="btn-modal-cancel" onClick={onClose}>
                        {cancelText || 'Prekliči'}
                    </button>
                    <button className={`btn-modal-confirm ${type}`} onClick={onConfirm}>
                        {confirmText || 'Potrdi'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmModal;