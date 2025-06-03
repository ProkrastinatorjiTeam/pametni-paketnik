import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AddProductPage.css'; 

function AddProductPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedPrintTime, setEstimatedPrintTime] = useState('');
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleImageChange = (event) => {
    setImages(Array.from(event.target.files)); // Store an array of files
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (images.length === 0) {
      setError('Please select at least one image.');
      return;
    }
    if (images.length > 5) {
        setError('You can upload a maximum of 5 images.');
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('estimatedPrintTime', estimatedPrintTime);
    images.forEach(image => {
      formData.append('images', image); // Append each file under the 'images' key
    });

    try {
      const response = await axios.post('/model3D/add', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Product added successfully:', response.data);
      setSuccessMessage('Product added successfully!');
      // Clear form
      setName('');
      setDescription('');
      setEstimatedPrintTime('');
      setImages([]);
      event.target.reset(); // Reset file input
      // Optionally navigate away or show a link to view products
      // navigate('/admin/products');
    } catch (err) {
      console.error('Error adding product:', err.response ? err.response.data : err.message);
      setError(err.response?.data?.message || 'Failed to add product. Please try again.');
    }
  };

  return (
    <div className="add-product-container">
      <h2>Add New 3D Model</h2>
      <form onSubmit={handleSubmit} className="add-product-form">
        <div className="form-group">
          <label htmlFor="name">Model Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="estimatedPrintTime">Estimated Print Time (minutes):</label>
          <input
            type="number"
            id="estimatedPrintTime"
            value={estimatedPrintTime}
            onChange={(e) => setEstimatedPrintTime(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="images">Images (up to 5):</label>
          <input
            type="file"
            id="images"
            multiple // Allow multiple file selection
            accept="image/*" // Accept only image files
            onChange={handleImageChange}
            required
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}
        <button type="submit" className="submit-product-button">Add Product</button>
      </form>
    </div>
  );
}

export default AddProductPage;