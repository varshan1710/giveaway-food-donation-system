// components/Loader.jsx
const Loader = ({ fullScreen = false, size = 'md' }) => {
  const sizeClasses = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };
  const spinner = (
    <div
      className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-primary-200 border-t-primary-600`}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        {spinner}
      </div>
    );
  }
  return <div className="flex items-center justify-center py-10">{spinner}</div>;
};

export default Loader;
