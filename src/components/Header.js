import React from 'react';
import './Header.css';

function Header({ parkCount }) {
  return (
    <header className="site-header">
      <h1>ParkFinder</h1>
      <p>
        Find the right park in Richmond for what you want to do
        {parkCount ? `, from ${parkCount} parks across the area.` : '.'}
      </p>
    </header>
  );
}

export default Header;
