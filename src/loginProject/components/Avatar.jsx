import { useState } from 'react';

const Avatar = ({ user, photoURL: explicitPhoto, size = 'md' }) => {
  const [imgError, setImgError] = useState(false);
  const initial = (user?.displayName || user?.email || '?')[0].toUpperCase();
  const sizeClasses = size === 'lg'
    ? 'h-24 w-24 text-3xl border-4'
    : 'h-8 w-8 text-sm border-2';
  const photoURL = explicitPhoto || user?.photoURL || null;

  if (photoURL && !imgError) {
    return (
      <img
        alt={user?.displayName || 'Avatar'}
        className={`${sizeClasses} rounded-full border-white object-cover shadow-sm`}
        src={photoURL}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`${sizeClasses} flex items-center justify-center rounded-full border-white bg-gradient-to-br from-blue-700 to-blue-500 font-bold text-white shadow-sm`}>
      {initial}
    </div>
  );
};

export default Avatar;
