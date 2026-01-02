import React from 'react';

export const SkeletonCard = () => (
    <div className="bg-white/5 p-3 rounded-xl animate-pulse">
        <div className="aspect-square bg-white/10 rounded-lg mb-3"></div>
        <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-white/5 rounded w-1/2"></div>
    </div>
);

export const SkeletonRow = () => (
    <div className="flex items-center gap-4 p-2 rounded-lg animate-pulse">
        <div className="w-10 h-10 bg-white/10 rounded"></div>
        <div className="flex-1 space-y-2">
            <div className="h-3 bg-white/10 rounded w-1/3"></div>
            <div className="h-2 bg-white/5 rounded w-1/4"></div>
        </div>
    </div>
);

export const SkeletonStreamLine = () => (
    <div className="space-y-12 animate-pulse">
        <div className="w-full h-[60vh] md:h-[500px] bg-white/5 rounded-[2.5rem]"></div>
        {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-4">
                <div className="h-8 w-48 bg-white/10 rounded-full"></div>
                <div className="flex gap-4 overflow-hidden">
                    {[...Array(5)].map((_, j) => (
                        <div key={j} className="w-48 h-64 bg-white/5 rounded-2xl flex-shrink-0"></div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);
