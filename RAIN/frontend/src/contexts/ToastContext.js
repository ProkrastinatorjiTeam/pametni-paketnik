// src/contexts/ToastContext.js (or src/providers/ToastProvider.js)
import React, { createContext, useContext, useState, useCallback } from 'react';
import ToastNotification from '../components/ToastNotification'; // Adjust path if needed

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [timerId, setTimerId] = useState(null);

    const showToast = useCallback((message, type = 'info', duration = 3000) => {
        // Clear any existing timer to prevent multiple toasts overlapping
        if (timerId) {
            clearTimeout(timerId);
        }

        setNotification({ message, type });

        const newTimerId = setTimeout(() => {
            setNotification({ message: '', type: '' });
            setTimerId(null); // Clear timerId when toast disappears
        }, duration);
        setTimerId(newTimerId);
    }, [timerId]);

    const hideToast = useCallback(() => {
        setNotification({ message: '', type: '' });
        if (timerId) {
            clearTimeout(timerId);
            setTimerId(null);
        }
    }, [timerId]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Render the global ToastNotification here */}
            <ToastNotification
                message={notification.message}
                type={notification.type}
                onClose={hideToast}
            />
        </ToastContext.Provider>
    );
};

// Custom hook to easily use the toast functionality
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};