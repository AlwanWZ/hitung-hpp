import React from 'react';

export const TierLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full min-h-screen bg-slate-50">
      {children}
    </div>
  );
};