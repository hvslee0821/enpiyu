'use client';

import {
    BiHome,
    BiHomeAlt,
    BiFileBlank,
    BiFile,
    BiQrScan,
    BiQr,
    BiDockTop,
    BiUser,
    BiUserCircle
} from 'react-icons/bi';

type Page = 'home' | 'service' | 'qr' | 'additional' | 'profile';

interface FooterNavProps {
    currentPage: Page;
    onNavigate: (page: Page) => void;
}

export default function FooterNav({ currentPage, onNavigate }: FooterNavProps) {
    const menuItems: Array<{
        page: Page;
        label: string;
        IconComponent: typeof BiHome;
        IconComponentSolid?: typeof BiHomeAlt;
        isQR?: boolean;
    }> = [
        { page: 'home', label: 'Нүүр', IconComponent: BiHome, IconComponentSolid: BiHomeAlt },
        { page: 'service', label: 'Үйлчилгээ', IconComponent: BiFileBlank, IconComponentSolid: BiFile },
        { page: 'qr', label: 'QR', IconComponent: BiQrScan, IconComponentSolid: BiQr, isQR: true },
        { page: 'additional', label: 'Нэмэлт', IconComponent: BiDockTop, IconComponentSolid: BiDockTop },
        { page: 'profile', label: 'Профайл', IconComponent: BiUser, IconComponentSolid: BiUserCircle },
    ];

    return (
        <nav 
            className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200"
            style={{
                paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))',
            }}
        >
            <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
                {menuItems.map((item) => {
                    const isActive = currentPage === item.page;
                    const isQR = item.isQR;

                    return (
                        <div key={item.page} className={isQR ? 'relative flex items-center justify-center' : ''}>
                            {isQR && (
                                <div className="absolute w-20 h-20 -mt-6 rounded-full bg-white z-0"></div>
                            )}
                            <button
                                onClick={() => onNavigate(item.page)}
                                className={`
                flex flex-col items-center justify-center relative z-10
                ${isQR
                                    ? 'w-16 h-16 -mt-6 rounded-full bg-gradient-to-b from-blue-600 to-blue-400 active:scale-95'
                                    : 'w-14 h-14 rounded-lg active:scale-95'
                                }
                transition-all duration-200
                ${isQR ? 'hover:from-blue-500 hover:to-blue-300' : 'hover:bg-gray-50'}
                touch-manipulation  
              `}
                                style={isQR ? {
                                    boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), 0 0 10px rgba(59, 130, 246, 0.3)',
                                } : undefined}
                            >
                                <span className={`${isQR ? 'text-2xl text-white' : isActive ? 'text-xl text-blue-600' : 'text-xl text-gray-600'} mb-0.5 select-none flex items-center justify-center`}>
                                    {isActive && !isQR && item.IconComponentSolid ? (
                                        <item.IconComponentSolid />
                                    ) : (
                                        <item.IconComponent />
                                    )}
                                </span>
                                {!isQR && (
                                    <span className={`text-xs ${isActive ? 'text-blue-600 font-medium' : 'text-gray-600'} select-none`}>
                                        {item.label}
                                    </span>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </nav>
    );
}

