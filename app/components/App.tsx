'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';

type Page = 'home' | 'service' | 'qr' | 'additional' | 'profile';

const CARD_DATA_KEY = 'cardData';

type CardPayload = {
  text1: string;
  text2: string;
  text3: string;
  text4: string;
  text5: string;
  text6: string;
  text7: string;
  text8: string;
  uploadedImage: string | null;
  userName: string;
};

function canonicalPayloadString(p: CardPayload): string {
  const keys = Object.keys(p).sort();
  const obj: Record<string, string | null> = {};
  keys.forEach((k) => { obj[k] = p[k as keyof CardPayload] ?? null; });
  return JSON.stringify(obj);
}

async function sha256Hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface AppProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export default function App({ currentPage, onNavigate }: AppProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [text1, setText1] = useState<string>('');
  const [text2, setText2] = useState<string>('');
  const [text3, setText3] = useState<string>('');
  const [text4, setText4] = useState<string>('');
  const [text5, setText5] = useState<string>('');
  const [text6, setText6] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('text6');
      if (saved) return saved;
      const firstDigit = Math.floor(Math.random() * 4) + 4; // 4, 5, 6, or 7
      const remainingDigits = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
      return `${firstDigit}${remainingDigits}`;
    }
    return '';
  });
  const [text7, setText7] = useState<string>('');
  const [text8, setText8] = useState<string>('');
  const [datesInitialized, setDatesInitialized] = useState(false);

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
    return dateString;
  };

  // Calculate dates based on text5 (birth date)
  const calculateDates = (birthDate: string) => {
    if (!birthDate) {
      setText7('');
      setText8('');
      localStorage.removeItem('text7');
      localStorage.removeItem('text8');
      return;
    }

    const date = new Date(birthDate);
    if (isNaN(date.getTime())) {
      setText7('');
      setText8('');
      return;
    }

    // Calculate text7: 16 years, 2 months, 10 days after birth date
    const date7 = new Date(date);
    date7.setFullYear(date7.getFullYear() + 16);
    date7.setMonth(date7.getMonth() + 2);
    date7.setDate(date7.getDate() + 10);
    const text7Value = date7.toISOString().split('T')[0];
    setText7(text7Value);
    localStorage.setItem('text7', text7Value);

    // Calculate text8: 25 years after text5 (birth date)
    const date8 = new Date(date);
    date8.setFullYear(date8.getFullYear() + 25);
    const text8Value = date8.toISOString().split('T')[0];
    setText8(text8Value);
    localStorage.setItem('text8', text8Value);
  };
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [isCenterCardPressed, setIsCenterCardPressed] = useState(false);
  const [userName, setUserName] = useState<string>('Нэр');
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0); // Start with 0 to prevent initial offset
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'center',
    slidesToScroll: 1,
    containScroll: 'trimSnaps',
    startIndex: 4,
    duration: 0 // Disable animation on initial load
  });
  const [selectedIndex, setSelectedIndex] = useState(4);
  const carouselInitializedRef = useRef(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // Detect small screen (370px or smaller)
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth <= 370);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Preload all images with retry logic
  useEffect(() => {
    const imageUrls = [
      '/logo.jpg', // Prioritize logo
      '/header.jpg',
      '/home.jpg',
      '/card.jpg', // Prioritize card image
      '/cardback.jpg',
      '/profile.jpg',
      '/qr.jpg',
      '/services.jpg',
      '/extra.jpg',
    ];

    const loadImage = (url: string, retries = 3): Promise<void> => {
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
          // Verify image is actually loaded
          if (img.complete && img.naturalWidth > 0) {
            resolve();
          } else {
            reject(new Error(`Image ${url} failed to load properly`));
          }
        };
        img.onerror = () => {
          if (retries > 0) {
            // Retry loading the image
            setTimeout(() => {
              loadImage(url, retries - 1).then(resolve).catch(reject);
            }, 500);
          } else {
            reject(new Error(`Failed to load image: ${url} after ${retries} retries`));
          }
        };
        img.src = url;
      });
    };

    // Preload images using link rel="preload" for better browser caching
    const preloadLinks = imageUrls.map(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
      return link;
    });

    const loadImages = async () => {
      try {
        // Load all images with Promise.allSettled to handle individual failures
        const results = await Promise.allSettled(
          imageUrls.map(url => loadImage(url))
        );

        // Check if all images loaded successfully
        const failed = results.filter(result => result.status === 'rejected');

        if (failed.length > 0) {
          console.warn('Some images failed to load:', failed.map(f => f.status === 'rejected' ? f.reason : null));
          // Still proceed, but log warnings
        }

        setImagesLoaded(true);

        // Wait a bit longer to ensure images are fully cached in browser
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      } catch (error) {
        console.error('Critical error loading images:', error);
        // Even on error, proceed after a delay to prevent infinite loading
        setTimeout(() => {
          setIsLoading(false);
        }, 2000);
      }
    };

    loadImages();

    // Cleanup preload links on unmount
    return () => {
      preloadLinks.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
  }, []);

  // Calculate dates automatically when text5 (birth date) changes
  // Skip initial calculation if dates are already loaded from localStorage
  useEffect(() => {
    if (!datesInitialized) {
      setDatesInitialized(true);
      return; // Skip first run (initial load)
    }
    if (text5) {
      calculateDates(text5);
    } else {
      setText7('');
      setText8('');
      localStorage.removeItem('text7');
      localStorage.removeItem('text8');
    }
  }, [text5, datesInitialized]);

  // Load card data from localStorage
  useEffect(() => {
    const clearCardData = () => {
      localStorage.removeItem(CARD_DATA_KEY);
      localStorage.removeItem('uploadedImage');
      ['text1', 'text2', 'text3', 'text4', 'text5', 'text6', 'text7', 'text8', 'userName'].forEach((k) => localStorage.removeItem(k));
      setUploadedImage(null);
      setText1('');
      setText2('');
      setText3('');
      setText4('');
      setText5('');
      setText7('');
      setText8('');
      const firstDigit = Math.floor(Math.random() * 4) + 4;
      const remainingDigits = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
      const newNumber = `${firstDigit}${remainingDigits}`;
      setText6(newNumber);
      localStorage.setItem('text6', newNumber);
    };

    const applyPayloadToState = (p: CardPayload) => {
      if (p.uploadedImage) setUploadedImage(p.uploadedImage);
      setText1(p.text1);
      setText2(p.text2);
      setText3(p.text3);
      setText4(p.text4);
      if (p.text5) {
        setText5(p.text5);
        setText7(p.text7);
        setText8(p.text8);
      }
      setText6(p.text6);
      if (p.userName) setUserName(p.userName);
    };

    const loadLegacy = () => {
      const savedUploadedImage = localStorage.getItem('uploadedImage');
      if (savedUploadedImage) setUploadedImage(savedUploadedImage);
      const s1 = localStorage.getItem('text1');
      if (s1) setText1(s1);
      const s2 = localStorage.getItem('text2');
      if (s2) setText2(s2);
      const s3 = localStorage.getItem('text3');
      if (s3) setText3(s3);
      const s4 = localStorage.getItem('text4');
      if (s4) setText4(s4);
      const s5 = localStorage.getItem('text5');
      if (s5) {
        setText5(s5);
        const s7 = localStorage.getItem('text7');
        const s8 = localStorage.getItem('text8');
        if (s7 && s8) {
          setText7(s7);
          setText8(s8);
        } else {
          calculateDates(s5);
        }
      }
      const s6 = localStorage.getItem('text6');
      if (s6) setText6(s6);
      else {
        const firstDigit = Math.floor(Math.random() * 4) + 4;
        const remainingDigits = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
        const newNumber = `${firstDigit}${remainingDigits}`;
        setText6(newNumber);
        localStorage.setItem('text6', newNumber);
      }
      const savedUserName = localStorage.getItem('userName');
      if (savedUserName) setUserName(savedUserName);
    };

    const cardDataStr = typeof window !== 'undefined' ? localStorage.getItem(CARD_DATA_KEY) : null;

    if (cardDataStr) {
      let parsed: { payload?: CardPayload; hash?: string };
      try {
        parsed = JSON.parse(cardDataStr);
      } catch {
        clearCardData();
        return;
      }
      const { payload, hash } = parsed;
      if (!payload || typeof payload !== 'object' || !hash || typeof hash !== 'string') {
        clearCardData();
        return;
      }
      const normalized: CardPayload = {
        text1: String(payload.text1 ?? ''),
        text2: String(payload.text2 ?? ''),
        text3: String(payload.text3 ?? ''),
        text4: String(payload.text4 ?? ''),
        text5: String(payload.text5 ?? ''),
        text6: String(payload.text6 ?? ''),
        text7: String(payload.text7 ?? ''),
        text8: String(payload.text8 ?? ''),
        uploadedImage: payload.uploadedImage != null ? String(payload.uploadedImage) : null,
        userName: String(payload.userName ?? ''),
      };
      sha256Hex(canonicalPayloadString(normalized))
        .then((computedHash) => {
          if (computedHash !== hash) {
            clearCardData();
            return;
          }
          applyPayloadToState(normalized);
        })
        .catch(() => clearCardData());
    } else {
      loadLegacy();
    }
  }, []);

  // Measure header height
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        if (height > 0) {
          setHeaderHeight(height);
        }
      }
    };

    // Wait for images to load before measuring
    if (!imagesLoaded) {
      return;
    }

    // Measure immediately after images load
    updateHeaderHeight();

    // Measure after multiple delays to ensure header image is fully rendered
    const timer1 = setTimeout(updateHeaderHeight, 50);
    const timer2 = setTimeout(updateHeaderHeight, 150);
    const timer3 = setTimeout(updateHeaderHeight, 300);

    // Measure on resize
    window.addEventListener('resize', updateHeaderHeight);

    // Use requestAnimationFrame for more reliable measurement
    const rafId1 = requestAnimationFrame(() => {
      updateHeaderHeight();
      const rafId2 = requestAnimationFrame(() => {
        updateHeaderHeight();
      });
      return () => cancelAnimationFrame(rafId2);
    });

    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      cancelAnimationFrame(rafId1);
    };
  }, [currentPage, imagesLoaded]);

  const handleScreenClick = () => {
    if (currentPage === 'profile') {
      setIsSliderOpen(true);
      setIsCardFlipped(false);
    }
  };

  // Preload card image when navigating to profile page
  useEffect(() => {
    if (currentPage === 'profile') {
      // Preload card image with high priority
      const cardImg = new window.Image();
      cardImg.src = '/card.jpg';

      // Also add preload link
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = '/card.jpg';
      link.setAttribute('fetchpriority', 'high');
      document.head.appendChild(link);

      return () => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      };
    }
  }, [currentPage]);

  // Close slider when navigating away from profile and scroll to top
  useEffect(() => {
    if (currentPage !== 'profile') {
      setIsSliderOpen(false);
      setIsCardFlipped(false); // Reset flip state when closing slider
      setIsCenterCardPressed(false); // Reset press state
    }
    // Scroll to top on page change
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Prevent scrolling on QR and Additional pages
    if (currentPage === 'qr' || currentPage === 'additional') {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }

    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [currentPage]);

  // Reset press state when mouse/touch is released globally
  useEffect(() => {
    const handleMouseUp = () => setIsCenterCardPressed(false);
    const handleTouchEnd = () => setIsCenterCardPressed(false);

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Discourage casual copying (right-click and copy). Easily bypassed but raises the bar.
  useEffect(() => {
    const preventContext = (e: Event) => e.preventDefault();
    const preventCopy = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventContext);
    document.addEventListener('copy', preventCopy);
    return () => {
      document.removeEventListener('contextmenu', preventContext);
      document.removeEventListener('copy', preventCopy);
    };
  }, []);

  // Handle Embla carousel selection and initialize to 4th slide
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  // Initialize carousel position only when entering profile page (no animation)
  useEffect(() => {
    if (currentPage !== 'profile') {
      carouselInitializedRef.current = false;
      return;
    }

    if (!emblaApi || carouselInitializedRef.current) return;

    // Set position immediately without animation
    carouselInitializedRef.current = true;
  }, [emblaApi, currentPage]);

  const handleBackdropClick = () => {
    setIsSliderOpen(false);
    setIsCardFlipped(false); // Reset card to front when closing slider
    setIsCenterCardPressed(false);
  };

  const handleLoginButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFormOpen(true);
  };

  const computeText7Text8 = (birthDate: string): { text7: string; text8: string } => {
    if (!birthDate) return { text7: '', text8: '' };
    const date = new Date(birthDate);
    if (isNaN(date.getTime())) return { text7: '', text8: '' };
    const d7 = new Date(date);
    d7.setFullYear(d7.getFullYear() + 16);
    d7.setMonth(d7.getMonth() + 2);
    d7.setDate(d7.getDate() + 10);
    const d8 = new Date(date);
    d8.setFullYear(d8.getFullYear() + 25);
    return {
      text7: d7.toISOString().split('T')[0],
      text8: d8.toISOString().split('T')[0],
    };
  };

  const applyPendingFormData = (formData: FormData) => {
    const uploadedImageFile = formData.get('uploadedImage') as File | null;
    const text1Value = formData.get('text1') as string | null;
    const text2Value = formData.get('text2') as string | null;
    const text3Value = formData.get('text3') as string | null;
    const text4Value = formData.get('text4') as string | null;
    const text5Value = formData.get('text5') as string | null;

    if (uploadedImageFile && uploadedImageFile.size > 0) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(uploadedImageFile);
    }
    if (text1Value !== null) setText1(text1Value);
    if (text2Value !== null) setText2(text2Value);
    if (text3Value !== null) setText3(text3Value);
    if (text4Value !== null) setText4(text4Value);
    if (text5Value !== null) {
      setText5(text5Value);
      calculateDates(text5Value);
    }
  };

  const buildPayloadFromForm = async (
    formData: FormData,
    currentText6: string,
    currentUserName: string,
    currentUploadedImage: string | null
  ): Promise<CardPayload> => {
    const text1 = (formData.get('text1') as string) ?? '';
    const text2 = (formData.get('text2') as string) ?? '';
    const text3 = (formData.get('text3') as string) ?? '';
    const text4 = (formData.get('text4') as string) ?? '';
    const text5 = (formData.get('text5') as string) ?? '';
    const { text7, text8 } = computeText7Text8(text5);
    const file = formData.get('uploadedImage') as File | null;
    let uploadedImage: string | null = null;
    if (file && file.size > 0) {
      uploadedImage = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) ?? '');
        reader.readAsDataURL(file);
      });
    } else {
      uploadedImage = currentUploadedImage;
    }
    return {
      text1,
      text2,
      text3,
      text4,
      text5,
      text6: currentText6,
      text7,
      text8,
      uploadedImage,
      userName: currentUserName,
    };
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const payload = await buildPayloadFromForm(formData, text6, userName, uploadedImage);
      applyPendingFormData(formData);
      if (typeof window !== 'undefined') {
        const hash = await sha256Hex(canonicalPayloadString(payload));
        localStorage.setItem(CARD_DATA_KEY, JSON.stringify({ payload, hash }));
      }
      setIsFormOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormBackdropClick = () => {
    setIsFormOpen(false);
  };

  const handleDeleteData = () => {
    localStorage.removeItem(CARD_DATA_KEY);
    localStorage.removeItem('uploadedImage');
    ['text1', 'text2', 'text3', 'text4', 'text5', 'text6', 'text7', 'text8', 'userName'].forEach((k) => localStorage.removeItem(k));

    // Reset all state
    setUploadedImage(null);
    setText1('');
    setText2('');
    setText3('');
    setText4('');
    setText5('');
    setText7('');
    setText8('');

    // Generate new random 12-digit number for text6
    const firstDigit = Math.floor(Math.random() * 4) + 4; // 4, 5, 6, or 7
    const remainingDigits = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
    const newNumber = `${firstDigit}${remainingDigits}`;
    setText6(newNumber);
    localStorage.setItem('text6', newNumber);

    setIsFormOpen(false);
  };

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ backgroundColor: '#284D91' }}
      >
        <div className="text-2xl font-bold flex items-center">
          <span
            style={{
              color: 'red',
              border: '4px solid white',
              padding: '1px 10px',
              marginRight: '3px',
              borderRadius: '10px',
              fontSize: '30px',
            }}
          >
            e
          </span>
          <span style={{ color: 'white', fontSize: '30px', font: 'montserrat' }}>mongolia</span>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    const pageImages: Record<Page, string> = {
      home: '/home.jpg',
      service: '/services.jpg',
      qr: '/qr.jpg',
      additional: '/extra.jpg',
      profile: '/profile.jpg',
    };

    // Memoize the current page image to prevent unnecessary re-renders
    const currentImage = pageImages[currentPage];

    return (
      <>
        {/* Header - fixed at absolute top, always rendered but hidden on profile page with CSS */}
        <div
          ref={headerRef}
          className={`fixed left-0 w-full z-10 ${currentPage !== 'profile' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          style={{
            top: 0,
            paddingTop: 'env(safe-area-inset-top, 0px)',
            backgroundColor: '#DFF0FF',
          }}
        >
          <Image
            src="/header.jpg"
            alt="Header"
            width={1920}
            height={1080}
            className="w-full h-auto object-cover"
            style={{ width: '100%', height: 'auto' }}
            priority
            unoptimized
            onLoad={() => {
              // Measure header height once image is loaded
              if (headerRef.current) {
                const height = headerRef.current.offsetHeight;
                if (height > 0) {
                  setHeaderHeight(height);
                }
              }
            }}
          />
        </div>

        {/* Status bar background for profile page */}
        {currentPage === 'profile' && (
          <div
            className="fixed top-0 left-0 right-0 z-5"
            style={{
              height: 'env(safe-area-inset-top, 0px)',
              backgroundColor: '#DFF0FF',
              minHeight: 'env(safe-area-inset-top, 20px)',
            }}
          />
        )}

        {/* Page content */}
        <div
          className={`min-h-screen ${currentPage === 'profile' ? 'bg-transparent' : 'bg-gray-50'} ${currentPage === 'profile' ? 'pt-5' : ''}`}
          style={{
            ...(currentPage !== 'profile' && headerHeight > 0 ? { paddingTop: `${headerHeight}px` } : currentPage !== 'profile' ? { paddingTop: '80px' } : {}),
            ...(currentPage === 'qr' ? { overflow: 'hidden', height: '100vh' } : {}),
            ...(currentPage === 'additional' ? { overflow: 'hidden', paddingBottom: 'calc(60px + env(safe-area-inset-bottom))' } : {}),
            contain: 'layout style paint',
          }}
        >
          <div className={`relative w-full ${currentPage === 'profile' ? 'pt-0' : ''}`}>
            {/* Page image - with bottom padding */}
            <div
              className={`relative w-full pb-4`}
              style={{
                ...(currentPage === 'qr' ? { overflow: 'hidden', height: '100vh' } : {}),
                ...(currentPage === 'additional' ? { overflow: 'hidden' } : {}),
              }}
            >
              <Image
                key={currentPage}
                src={currentImage}
                alt={currentPage}
                width={1920}
                height={1080}
                className="w-full h-auto object-cover"
                style={{
                  width: '100%',
                  height: 'auto',
                  ...(currentPage === 'qr' ? { height: '100vh', objectFit: 'cover' } : {}),
                  ...(currentPage === 'additional' ? { height: 'auto', maxHeight: 'calc(100vh - env(safe-area-inset-bottom) - 60px)', objectFit: 'contain' } : {}),
                }}
                priority={true}
                unoptimized
                loading="eager"
              />
              {/* Circular cropped image in top left corner */}
              {currentPage === 'profile' && (
                <div
                  className="absolute z-10 rounded-full overflow-hidden"
                  style={{
                    top: '4.5%',
                    left: '8%',
                    width: '14%',
                    height: '5%',
                    backgroundColor: '#fff',
                    backgroundImage: uploadedImage ? `url(${uploadedImage})` : `url('/card.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    filter: 'blur(4px)'
                  }}
                />
              )}
              {/* O.NAME text on profile page */}
              {currentPage === 'profile' && (
                <div
                  className="absolute z-10"
                  style={{
                    top: '5%',
                    left: '24%',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#2D7DEF',
                    fontFamily: 'Montserrat, sans-serif',
                  }}
                >
                  {text2 && text3 ? `${text2.charAt(0)}.${text3}` : text2 && text2.length > 0 ? `${text2.charAt(0)}.` : `O.${userName}`}
                </div>
              )}
              {/* Card carousel on profile page - positioned lower */}
              {currentPage === 'profile' && (
                <div
                  className="absolute left-1/2 transform -translate-x-1/2 z-10"
                  style={{ top: '14%', width: '100%' }}
                >
                  <div className="overflow-hidden" ref={emblaRef} style={{ paddingTop: '8%', paddingBottom: '8%' }}>
                    <div className="flex" style={{ gap: '-20%', paddingLeft: '10%', paddingRight: '10%' }}>
                      {[...Array(9)].map((_, index) => (
                        <div
                          key={index}
                          className="min-w-0 relative flex-shrink-0"
                          onClick={selectedIndex === index ? handleScreenClick : undefined}
                          onMouseDown={selectedIndex === index ? () => setIsCenterCardPressed(true) : undefined}
                          onMouseUp={selectedIndex === index ? () => setIsCenterCardPressed(false) : undefined}
                          onMouseLeave={selectedIndex === index ? () => setIsCenterCardPressed(false) : undefined}
                          onTouchStart={selectedIndex === index ? () => setIsCenterCardPressed(true) : undefined}
                          onTouchEnd={selectedIndex === index ? () => setIsCenterCardPressed(false) : undefined}
                          style={{
                            width: isSmallScreen ? '200px' : '246.15px',
                            transform: selectedIndex === index ? 'scale3d(1.3, 1.3, 1)' : 'scale3d(0.9, 0.9, 1)',
                            opacity: isCenterCardPressed && selectedIndex === index ? 0.6 : 1,
                            zIndex: selectedIndex === index ? 10 : 1,
                            marginLeft: index > 0 ? (isSmallScreen ? '-39px' : '-48px') : '0',
                            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.1s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            willChange: 'transform',
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            cursor: selectedIndex === index ? 'pointer' : 'default',
                          }}
                        >
                          <div className="relative w-full" style={{ width: '100%', height: 'auto' }}>
                            <Image
                              src="/card.jpg"
                              alt="Card"
                              width={1920}
                              height={1080}
                              className="w-full h-auto object-cover"
                              style={{ width: '100%', height: 'auto', borderRadius: '10px' }}
                              priority={index === 4}
                              loading={index === 4 ? 'eager' : 'lazy'}
                              unoptimized
                            />
                            {(() => {
                              const scale = isSmallScreen ? 0.813 : 1; // 200/246.15
                              return (
                                <>
                                  {/* Uploaded image overlay - positions scaled for base card */}
                                  {uploadedImage && (
                                    <img
                                      src={uploadedImage}
                                      alt="Uploaded"
                                      style={{
                                        position: 'absolute',
                                        left: `${7.69 * scale}px`,
                                        top: `${41.5 * scale}px`,
                                        width: `${51.5 * scale}px`,
                                        height: 'auto',
                                        objectFit: 'contain',
                                      }}
                                    />
                                  )}
                                  {/* Text overlays */}
                                  {text1 && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        left: `${68 * scale}px`,
                                        top: `${38.43 * scale}px`,
                                        color: '#000',
                                        fontSize: `${6 * scale}px`,
                                        fontFamily: 'Montserrat, sans-serif',
                                        fontWeight: 350,
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {text1}
                                    </div>
                                  )}
                                  {text2 && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        left: `${68 * scale}px`,
                                        top: `${56.7 * scale}px`,
                                        color: '#000',
                                        fontSize: `${6 * scale}px`,
                                        fontFamily: 'Montserrat, sans-serif',
                                        fontWeight: 350,
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {text2}
                                    </div>
                                  )}
                                  {text3 && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        left: `${68 * scale}px`,
                                        top: `${75 * scale}px`,
                                        color: '#000',
                                        fontSize: `${6 * scale}px`,
                                        fontFamily: 'Montserrat, sans-serif',
                                        fontWeight: 350,
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {text3}
                                    </div>
                                  )}
                                  {text4 && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        left: `${68 * scale}px`,
                                        top: `${92.5 * scale}px`,
                                        color: '#000',
                                        fontSize: `${6 * scale}px`,
                                        fontFamily: 'Montserrat, sans-serif',
                                        fontWeight: 350,
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {text4}
                                    </div>
                                  )}
                                  {text5 && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        left: `${68 * scale}px`,
                                        top: `${119.13 * scale}px`,
                                        color: '#000',
                                        fontSize: `${6 * scale}px`,
                                        fontFamily: 'Montserrat, sans-serif',
                                        fontWeight: 350,
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {formatDate(text5)}
                                    </div>
                                  )}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${68 * scale}px`,
                                      top: `${136.04 * scale}px`,
                                      color: '#000',
                                      fontSize: `${6 * scale}px`,
                                      fontFamily: 'Montserrat, sans-serif',
                                      fontWeight: 350,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {text6}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {/* Hidden login button at the bottom of profile page */}
              {currentPage === 'profile' && (
                <button
                  onClick={handleLoginButtonClick}
                  className="absolute left-1/2 transform -translate-x-1/2 w-100 h-15 cursor-pointer rounded-md opacity-0 z-40"
                  style={{
                    bottom: 'calc(1rem + env(safe-area-inset-bottom) + 6rem)',
                  }}
                  aria-label="Login"
                  title="Click to customize card"
                />
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      {renderPage()}

      {/* Slider overlay - always rendered, hidden when not on profile page */}
      {/* Backdrop - dark overlay */}
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 cursor-pointer ${currentPage === 'profile' && isSliderOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        onClick={handleBackdropClick}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black opacity-50"></div>
      </div>

      {/* Slider - animated from bottom, positioned at bottom: 0, always rendered */}
      <div
        data-slider
        className={`fixed left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[70] transition-transform duration-300 ease-out ${currentPage === 'profile' && isSliderOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        style={{ bottom: 0, height: 'auto', maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center p-4">
          <div className="flex flex-col items-center w-full">
            {/* Gray line at top */}
            <div
              className="bg-gray-400 rounded-full mb-3"
              style={{ width: '50px', height: '5px' }}
            />

            {/* Card image with flip animation */}
            <div
              className="mb-4 flex justify-center cursor-pointer"
              onClick={() => setIsCardFlipped(!isCardFlipped)}
              style={{ perspective: '1000px', width: isSmallScreen ? '292px' : '360px' }}
            >
              <div
                className="relative w-full"
                style={{
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.6s',
                  transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Front of card */}
                <div
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    position: 'relative',
                  }}
                >
                  <Image
                    src="/card.jpg"
                    alt="Card"
                    width={1200}
                    height={1080}
                    className="w-full h-auto object-contain rounded-lg"
                    unoptimized
                  />
                  {(() => {
                    const scale = isSmallScreen ? 0.813 : 1; // 292/360
                    return (
                      <>
                        {/* Uploaded image overlay */}
                        {uploadedImage && (
                          <img
                            src={uploadedImage}
                            alt="Uploaded"
                            style={{
                              position: 'absolute',
                              left: `${11 * scale}px`,
                              top: `${61 * scale}px`,
                              width: `${75 * scale}px`,
                              height: 'auto',
                              objectFit: 'contain',
                            }}
                          />
                        )}
                        {/* Text overlays */}
                        {text1 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${99.5 * scale}px`,
                              top: `${57 * scale}px`,
                              color: '#000',
                              fontSize: `${9 * scale}px`,
                              fontFamily: 'Montserrat, sans-serif',
                              fontWeight: 400,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {text1}
                          </div>
                        )}
                        {text2 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${99.5 * scale}px`,
                              top: `${83 * scale}px`,
                              color: '#000',
                              fontSize: `${9 * scale}px`,
                              fontFamily: 'Montserrat, sans-serif',
                              fontWeight: 400,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {text2}
                          </div>
                        )}
                        {text3 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${99.5 * scale}px`,
                              top: `${110 * scale}px`,
                              color: '#000',
                              fontSize: `${9 * scale}px`,
                              fontFamily: 'Montserrat, sans-serif',
                              fontWeight: 400,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {text3}
                          </div>
                        )}
                        {text4 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${99.5 * scale}px`,
                              top: `${136 * scale}px`,
                              color: '#000',
                              fontSize: `${9 * scale}px`,
                              fontFamily: 'Montserrat, sans-serif',
                              fontWeight: 400,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {text4}
                          </div>
                        )}
                        {text5 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${99.5 * scale}px`,
                              top: `${175 * scale}px`,
                              color: '#000',
                              fontSize: `${9 * scale}px`,
                              fontFamily: 'Montserrat, sans-serif',
                              fontWeight: 400,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatDate(text5)}
                          </div>
                        )}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${99.5 * scale}px`,
                            top: `${200 * scale}px`,
                            color: '#000',
                            fontSize: `${9 * scale}px`,
                            fontFamily: 'Montserrat, sans-serif',
                            fontWeight: 400,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {text6}
                        </div>
                      </>
                    );
                  })()}
                </div>
                {/* Back of card */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <Image
                    src="/cardback.jpg"
                    alt="Card Back"
                    width={1200}
                    height={1080}
                    className="w-full h-auto object-contain rounded-lg"
                    unoptimized
                  />
                  {(() => {
                    const scale = isSmallScreen ? 0.813 : 1; // 292/360
                    return (
                      <>
                        {/* Date fields on card back */}
                        {text7 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${122 * scale}px`,
                              top: `${67 * scale}px`,
                              color: '#000',
                              fontSize: `${9 * scale}px`,
                              fontFamily: 'Montserrat, sans-serif',
                              fontWeight: 400,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatDate(text7)}
                          </div>
                        )}
                        {text8 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${122 * scale}px`,
                              top: `${93 * scale}px`,
                              color: '#000',
                              fontSize: `${9 * scale}px`,
                              fontFamily: 'Montserrat, sans-serif',
                              fontWeight: 400,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatDate(text8)}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Buttons container */}
          <div className="flex flex-col items-center pb-4 mt-2" style={{ width: isSmallScreen ? '292px' : '360px' }}>
            {/* Button "Лавлагаа авах" */}
            <button
              className="w-full py-3 rounded-lg mb-3 font-medium"
              style={{
                backgroundColor: '#005fef',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: 700,
                fontFamily: 'var(--font-albert-sans), sans-serif',
              }}
            >
              Лавлагаа авах
            </button>

            {/* Button "Дахин захиалах" */}
            <button
              className="w-full py-3 rounded-lg font-medium"
              style={{
                backgroundColor: '#dcebfe',
                color: '#005fef',
                fontSize: '0.8rem',
                fontWeight: 700,
                fontFamily: 'var(--font-albert-sans), sans-serif',
              }}
            >
              Дахин захиалах
            </button>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <div
        className={`fixed inset-0 z-[80] transition-opacity duration-300 ${isFormOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        onClick={handleFormBackdropClick}
      >

        <div
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl p-6 w-11/12 max-w-md z-[81]"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Customize Card</h2>
          <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label htmlFor="uploadedImage" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Image (10px left, 54px top)
                  </label>
                  <input
                    type="file"
                    id="uploadedImage"
                    name="uploadedImage"
                    accept="image/*"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="text1" className="block text-sm font-medium text-gray-700 mb-2">
                    Ургийн овог
                  </label>
                  <input
                    type="text"
                    id="text1"
                    name="text1"
                    defaultValue={text1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="text2" className="block text-sm font-medium text-gray-700 mb-2">
                    Овог
                  </label>
                  <input
                    type="text"
                    id="text2"
                    name="text2"
                    defaultValue={text2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="text3" className="block text-sm font-medium text-gray-700 mb-2">
                    Нэр
                  </label>
                  <input
                    type="text"
                    id="text3"
                    name="text3"
                    defaultValue={text3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="text4" className="block text-sm font-medium text-gray-700 mb-2">
                    Хүйс
                  </label>
                  <select
                    id="text4"
                    name="text4"
                    defaultValue={text4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    <option value="Эрэгтэй">Эрэгтэй</option>
                    <option value="Эмэгтэй">Эмэгтэй</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="text5" className="block text-sm font-medium text-gray-700 mb-2">
                    Төрсөн огноо
                  </label>
                  <input
                    type="date"
                    id="text5"
                    name="text5"
                    defaultValue={text5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleFormBackdropClick}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Цуцлах
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      {isSaving ? 'Хадгалж байна…' : 'Ашиглах'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteData}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  >
                    Устгах
                  </button>
                </div>
              </form>
        </div>
      </div>
    </>
  );
}

