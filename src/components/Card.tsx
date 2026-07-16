import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'premium';
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, variant = 'premium', className = '', onClick }) => {
  const baseClass = variant === 'premium' ? 'card-premium' : 'card';

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClass} text-left w-full cursor-pointer hover:scale-[1.03] transition-transform duration-300 ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <div className={`${baseClass} ${className}`}>
      {children}
    </div>
  );
};

export default Card;
