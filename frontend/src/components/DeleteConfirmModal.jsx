// components/DeleteConfirmModal.jsx
import { FiTrash2, FiAlertTriangle, FiX } from 'react-icons/fi';

const DeleteConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="card max-w-md w-full p-6 shadow-2xl border-2 border-red-500/20 bg-white dark:bg-gray-800 space-y-4 rounded-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-900/40 dark:text-red-300">
              <FiAlertTriangle size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{title || 'Delete Donation Record?'}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Action requires confirmation</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FiX size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300">
          {message || 'Are you sure you want to delete this record? This action cannot be undone and will remove it from your dashboard history.'}
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 shadow-md flex items-center gap-1.5"
          >
            <FiTrash2 size={14} />
            {loading ? 'Deleting...' : 'Yes, Delete Record'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
