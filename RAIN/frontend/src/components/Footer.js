import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-container">
                <div className="footer-brand">
                    <h2 className="footer-logo">FoodBox<span>.</span></h2>
                    <p>Supporting local farmers by bringing fresh, organic food directly to your doorstep.</p>
                </div>

                <div className="footer-links-group">
                    <div className="footer-column">
                        <h4>Shop</h4>
                        <Link to="/">All Products</Link>
                        <Link to="/">Vegetables</Link>
                        <Link to="/">Meat & Dairy</Link>
                    </div>

                    <div className="footer-column">
                        <h4>Information</h4>
                        <Link to="/profile">My Account</Link>
                        <Link to="/">Pickup Locations</Link>
                        <Link to="/">Sustainability</Link>
                    </div>

                    <div className="footer-column">
                        <h4>Contact</h4>
                        <p>Email: hello@foodbox.si</p>
                        <p>Phone: +386 40 123 456</p>
                        <p>Address: Farm Road 12, Ljubljana</p>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} FoodBox Project. All rights reserved.</p>
                <div className="footer-legal">
                    <Link to="/">Privacy Policy</Link>
                    <Link to="/">Terms of Service</Link>
                </div>
            </div>
        </footer>
    );
}

export default Footer;