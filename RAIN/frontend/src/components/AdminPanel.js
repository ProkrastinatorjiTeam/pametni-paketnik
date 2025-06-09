import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './AdminPanel.css';
import BoxDetailModal from './BoxDetailModal';
import UserDetailModal from './UserDetailModal';
import ProductDetailModal from './ProductDetailModal';
import AddProductModal from './AddProductModal';
import AddBoxModal from './AddBoxModal';
import OrderDetailModal from './OrderDetailModal'; // Uvoz modala za podrobnosti naročila

// Registracija potrebnih komponent za Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BACKEND_URL = 'http://localhost:3000';

function AdminPanel({ currentUser }) {
    // --- Stanja (States) ---

    // Stanje za nadzor, kateri pogled je aktiven
    const [currentView, setCurrentView] = useState('dashboard');

    // Podatkovna stanja za vse poglede
    const [stats, setStats] = useState({});
    const [topProducts, setTopProducts] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    const [listData, setListData] = useState([]);

    // Stanja za nalaganje in napake
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Stanja za "popup" modale za urejanje podrobnosti
    const [selectedUserDetails, setSelectedUserDetails] = useState(null);
    const [selectedProductDetails, setSelectedProductDetails] = useState(null);
    const [selectedBoxDetails, setSelectedBoxDetails] = useState(null);
    const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

    // Stanja za "popup" modale za dodajanje
    const [isAddBoxModalOpen, setIsAddBoxModalOpen] = useState(false);
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

    // Stanje za mobilno navigacijo
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // --- Efekti (Effects) ---

    // Pridobivanje podatkov ob prvi nalaganju in ob spremembi pogleda
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                if (currentView === 'dashboard') {
                    const [statsRes, topProductsRes, recentOrdersRes] = await Promise.all([
                        axios.get(`${BACKEND_URL}/stats/overview`),
                        axios.get(`${BACKEND_URL}/stats/top-products`),
                        axios.get(`${BACKEND_URL}/stats/recent-orders`)
                    ]);

                    setStats(statsRes.data);
                    setTopProducts(topProductsRes.data);
                    setRecentOrders(recentOrdersRes.data);
                } else {
                    const endpoints = {
                        users: '/user/list', products: '/model3D/list', orders: '/order/list',
                        boxes: '/box/list', openings: '/unlockEvent/list'
                    };
                    const response = await axios.get(`${BACKEND_URL}${endpoints[currentView]}`);
                    const dataKey = { users: 'users', boxes: 'boxes', openings: 'unlockEvents' };
                    setListData(response.data[dataKey[currentView]] || response.data);
                }
            } catch (err) {
                setError(`Nalaganje podatkov za "${currentView}" ni uspelo.`);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentView]);


    // --- Funkcije za upravljanje (Handlers) ---

    const handleViewChange = (view) => {
        setCurrentView(view);
        setIsSidebarOpen(false); // Zapri sidebar na mobilnih napravah po izbiri
    };

    // Funkcije za upravljanje modalov za DODAJANJE
    const handleOpenAddProductModal = () => setIsAddProductModalOpen(true);
    const handleCloseAddProductModal = () => setIsAddProductModalOpen(false);
    const handleProductAdded = async () => {
        handleCloseAddProductModal();
        setLoading(true);
        try {
            const response = await axios.get(`${BACKEND_URL}/model3D/list`);
            setListData(response.data || []);

            setCurrentView('products');
        } catch (err) {
            setError('Osveževanje seznama izdelkov ni uspelo.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAddBoxModal = () => setIsAddBoxModalOpen(true);
    const handleCloseAddBoxModal = () => setIsAddBoxModalOpen(false);
    const handleBoxAdded = async () => {
        handleCloseAddBoxModal();
        setLoading(true);
        try {
            const response = await axios.get(`${BACKEND_URL}/box/list`);
            setListData(response.data?.boxes || []);
            setCurrentView('boxes');
        } catch (err) {
            setError('Osveževanje seznama boxov ni uspelo.');
        } finally {
            setLoading(false);
        }
    };

    // Podatki in opcije za graf
    const chartOptions = { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: 'Najbolj priljubljeni izdelki', font: { size: 16, family: 'Montserrat' } } }};
    const chartData = {
        labels: topProducts.map(p => p.name),
        datasets: [{ label: 'Število naročil', data: topProducts.map(p => p.orderCount), backgroundColor: 'rgba(0, 123, 255, 0.6)', borderRadius: 4 }],
    };


    // --- Komponente za renderiranje pogledov ---

    const DashboardView = () => (
        <>
            <h2>Pregled stanja</h2>
            <div className="stats-grid">
                {/* Dodajmo varnostna preverjanja tudi tukaj */}
                <div className="stat-card"><strong>€{stats.totalRevenue?.toFixed(2) || '0.00'}</strong><span>Skupni prihodki</span></div>
                <div className="stat-card"><strong>{stats.totalOrders || 0}</strong><span>Vsa naročila</span></div>
                <div className="stat-card"><strong>{stats.userCount || 0}</strong><span>Uporabniki</span></div>
                <div className="stat-card"><strong>{stats.availableBoxes || 0}</strong><span>Prosti tiskalniki</span></div>
            </div>
            <div className="dashboard-widgets-grid">
                <div className="widget chart-widget"><Bar options={chartOptions} data={chartData} /></div>
                <div className="widget list-widget">
                    <h3>Zadnje aktivnosti</h3>
                    <ul>
                        {recentOrders.length > 0 ? recentOrders.map(order => (
                            <li key={order._id}>
                <span>
                  {/* TUKAJ JE KLJUČNI POPRAVEK */}
                    {order.model?.name || 'Neznan izdelek'}
                    (<strong>{order.orderBy?.username || 'Neznan uporabnik'}</strong>)
                </span>
                                <span className={`status-badge status-${order.status?.toLowerCase().replace(/\s+/g, '-') || 'default'}`}>
                  {order.status || 'Neznano'}
                </span>
                            </li>
                        )) : <li>Ni nedavnih aktivnosti.</li>}
                    </ul>
                </div>
            </div>
        </>
    );

    const DataListView = () => (
        <div className="data-list-container">
            <div className="list-header">
                <h3>Seznam: {currentView.charAt(0).toUpperCase() + currentView.slice(1)}</h3>
                {currentView === 'boxes' && <button onClick={handleOpenAddBoxModal} className="add-button">+ Dodaj Box</button>}
                {currentView === 'products' && <button onClick={handleOpenAddProductModal} className="add-button">+ Dodaj izdelek</button>}
            </div>
            <ul className="data-list">
                {listData.length > 0 ? listData.map(item => {
                    if (currentView === 'users') return (<li key={item._id} className="data-list-item user-item" onClick={() => setSelectedUserDetails(item)}><span>{item.username}</span><span>{item.email}</span><span className="role-text">{item.role}</span></li>);
                    if (currentView === 'products') return (
                        <li key={item._id} className="data-list-item product-item" onClick={() => setSelectedProductDetails(item)}>
                            <div className="product-info-cell">
                                <img src={item.images?.[0] ? `${BACKEND_URL}${item.images[0]}` : 'placeholder.jpg'} alt={item.name} className="list-item-image"/>
                                <span>{item.name}</span>
                            </div>
                            <span>{item.estimatedPrintTime || 'N/A'} min</span>
                            <span>€{item.price?.toFixed(2) || 'N/A'}</span>
                        </li>
                    );
                    if (currentView === 'orders') return (
                        <li key={item._id} className="data-list-item order-item" onClick={() => setSelectedOrderDetails(item)}>
                            <span>{item.model?.name || 'N/A'}</span>
                            <span>{item.orderBy?.username || 'N/A'}</span>
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                            <span className={`status-badge status-${item.status?.toLowerCase().replace(/\s+/g, '-')}`}>{item.status}</span>
                        </li>
                    );
                    if (currentView === 'boxes') return (<li key={item._id} className="data-list-item box-item" onClick={() => setSelectedBoxDetails(item)}><span>{item.name}</span><span>{item.location || 'N/A'}</span><span>{item.physicalId}</span><span className={item.isBusy ? 'status-text-error' : 'status-text-success'}>{item.isBusy ? 'V uporabi' : 'Prost'}</span></li>);
                    if (currentView === 'openings') return (
                        <li key={item._id} className={`data-list-item opening-item ${item.success ? 'success-row' : 'failure-row'}`}>
                            <span>{item.box?.name || 'N/A'}</span>
                            <span>{item.user?.username || 'N/A'}</span>
                            <span>{new Date(item.timestamp).toLocaleString()}</span>
                            <span className={item.success ? 'status-text-success' : 'status-text-error'}>{item.success ? 'Uspešno' : 'Neuspešno'}</span>
                        </li>);
                    return null;
                }) : <li>Ni podatkov.</li>}
            </ul>
        </div>
    );


    // --- Glavni Return Stavek ---

    return (
        <div className="admin-panel-layout">
            <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h3>Upravljanje</h3>
                    <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>×</button>
                </div>
                <ul>
                    <li className={currentView === 'dashboard' ? 'active' : ''} onClick={() => handleViewChange('dashboard')}>Nadzorna plošča</li>
                    <li className={currentView === 'users' ? 'active' : ''} onClick={() => handleViewChange('users')}>Uporabniki</li>
                    <li className={currentView === 'products' ? 'active' : ''} onClick={() => handleViewChange('products')}>Izdelki</li>
                    <li className={currentView === 'orders' ? 'active' : ''} onClick={() => handleViewChange('orders')}>Naročila</li>
                    <li className={currentView === 'boxes' ? 'active' : ''} onClick={() => handleViewChange('boxes')}>Box-i</li>
                    <li className={currentView === 'openings' ? 'active' : ''} onClick={() => handleViewChange('openings')}>Zgodovina odpiranj</li>
                </ul>
            </aside>

            <main className="admin-main-content">
                <button className="open-sidebar-btn" onClick={() => setIsSidebarOpen(true)}>☰ Meni</button>
                {loading ? <div className="loading-state">Nalaganje...</div> :
                    error ? <div className="error-message">{error}</div> :
                        (currentView === 'dashboard' ? <DashboardView /> : <DataListView />)}
            </main>

            {/* MODALI ZA UREJANJE IN DODAJANJE */}

            {/* Modali za urejanje podrobnosti */}
            <UserDetailModal user={selectedUserDetails} isOpen={!!selectedUserDetails} onClose={() => setSelectedUserDetails(null)} />
            <ProductDetailModal product={selectedProductDetails} isOpen={!!selectedProductDetails} onClose={() => setSelectedProductDetails(null)} onProductUpdated={() => handleViewChange('products')} />
            <BoxDetailModal box={selectedBoxDetails} isOpen={!!selectedBoxDetails} onClose={() => setSelectedBoxDetails(null)} onBoxUpdated={() => handleViewChange('boxes')} />
            <OrderDetailModal order={selectedOrderDetails} isOpen={!!selectedOrderDetails} onClose={() => setSelectedOrderDetails(null)} />

            {/* Modali za dodajanje */}
            <AddProductModal
                isOpen={isAddProductModalOpen}
                onClose={handleCloseAddProductModal}
                onProductAdded={handleProductAdded}
            />
            <AddBoxModal
                isOpen={isAddBoxModalOpen}
                onClose={handleCloseAddBoxModal}
                onBoxAdded={handleBoxAdded}
            />
        </div>
    );
}

export default AdminPanel;