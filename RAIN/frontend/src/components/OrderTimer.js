import React, { useState, useEffect } from 'react';

function OrderTimer({ startedAt, estimatedPrintTimeMinutes, status, onTimerEnd, orderId }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isClientCompleted, setIsClientCompleted] = useState(false);

  useEffect(() => {
    // Reset completion state when props change, especially status
    setIsClientCompleted(false);

    if (status !== 'printing' || !startedAt || typeof estimatedPrintTimeMinutes !== 'number' || estimatedPrintTimeMinutes <= 0) {
      setTimeLeft('');
      if (status === 'ready to pickup' || status === 'cancelled') {
        setIsClientCompleted(true);
      }
      return;
    }

    const startTime = new Date(startedAt).getTime();
    const endTime = startTime + estimatedPrintTimeMinutes * 60 * 1000;
    let intervalId;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        setTimeLeft('00:00');
        setIsClientCompleted(true);
        if (typeof onTimerEnd === 'function') {
          onTimerEnd(orderId); // Pass orderId to the handler
        }
        clearInterval(intervalId);
        return;
      }

      const totalSeconds = Math.floor(remaining / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      } else {
        setTimeLeft(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }
      setIsClientCompleted(false);
    };

    updateTimer(); // Initial call
    intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [startedAt, estimatedPrintTimeMinutes, status, onTimerEnd, orderId]);

  if (isClientCompleted && status !== 'printing') {
      return <span className="timer-display completed">Print Completed</span>;
  }
  // If client timer finished but backend status is still printing (awaiting refresh)
  if (isClientCompleted && status === 'printing') {
      return <span className="timer-display completing">Processing...</span>;
  }

  if (!timeLeft && status === 'printing') {
      return <span className="timer-display">Calculating...</span>;
  }
  if (!timeLeft || status !== 'printing') {
      return null; 
  }

  return <span className="timer-display">{timeLeft}</span>;
}

export default OrderTimer;