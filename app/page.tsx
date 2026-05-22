'use client';

import { useState, useEffect } from 'react';
import App from './components/App';
import FooterNav from './components/FooterNav';

type Page = 'home' | 'service' | 'qr' | 'additional' | 'profile';

// Check if device is mobile
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check user agent for mobile devices
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  
  // Check screen width (mobile typically < 768px)
  const isMobileWidth = window.innerWidth <= 768;
  
  // Check for touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return mobileRegex.test(userAgent) || (isMobileWidth && hasTouch);
};

export default function Home() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  // Load saved page from localStorage or default to 'home'
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    if (typeof window !== 'undefined') {
      const savedPage = localStorage.getItem('currentPage') as Page | null;
      if (savedPage && ['home', 'service', 'qr', 'additional', 'profile'].includes(savedPage)) {
        return savedPage;
      }
    }
    return 'home';
  });

  // Save page to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  // Show message if not mobile
  if (isMobile === false) {
    return (
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#284D91',
          color: 'white',
          fontSize: '1.2rem',
          textAlign: 'center',
          padding: '2rem',
          fontFamily: 'Montserrat, sans-serif',
        }}
      >
        <div>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📱</div>
          <div>Энэ апп нь зөвхөн мобайл төхөөрөмж дээр ажиллана</div>
          <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.8 }}>
            This app only works on mobile devices
          </div>
        </div>
      </div>
    );
  }

  // Don't render until we know if it's mobile
  if (isMobile === null) {
    return (
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#284D91',
        }}
      />
    );
  }

  return (
    <>
      <App currentPage={currentPage} onNavigate={setCurrentPage} />
      <FooterNav currentPage={currentPage} onNavigate={setCurrentPage} />
    </>
  );
}
