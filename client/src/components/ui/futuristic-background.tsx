
import React from 'react';

interface FuturisticBackgroundProps {
    children?: React.ReactNode;
    className?: string;
}

export function FuturisticBackground({ children, className = "" }: FuturisticBackgroundProps) {
    return (
        <div className={`relative w-full overflow-hidden bg-slate-50 ${className}`}>
            {/* Grid Pattern */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#3b82f61a,transparent)]"></div>
            </div>

            {/* Gradient Blobs */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-200/20 blur-3xl pointer-events-none mix-blend-multiply animate-pulse" style={{ animationDuration: '7s' }}></div>
            <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-200/20 blur-3xl pointer-events-none mix-blend-multiply animate-pulse" style={{ animationDuration: '10s' }}></div>

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
