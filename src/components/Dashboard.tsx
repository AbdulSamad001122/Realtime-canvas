import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserDrawings, deleteDrawing } from '../services/drawingService';
import { FiPlus, FiTrash2, FiEdit, FiRefreshCw, FiClock, FiImage, FiSearch } from 'react-icons/fi';
import { useToast, ConfirmDialog } from './Toast';

interface Drawing {
  id: string;
  title: string;
  updatedAt?: {
    toDate: () => Date;
  } | Date;
  content?: string;
  userId: string;
  createdAt?: any;
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    drawingId: ''
  });

  useEffect(() => {
    const fetchDrawings = async () => {
      if (!user) return;

      try {
        setLoading(true);
        console.log('Fetching drawings for user:', user.uid);
        const userDrawings = await getUserDrawings(user.uid);
        console.log('Fetched drawings:', userDrawings);
        setDrawings(userDrawings as Drawing[]);
      } catch (error) {
        console.error('Error fetching drawings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDrawings();
  }, [user]);

  const handleNewDrawing = () => {
    navigate('/canvas/new');
  };

  const handleEditDrawing = (id: string) => {
    navigate(`/canvas/${id}`);
  };

  const handleDeleteDrawing = (id: string) => {
    // Find the drawing to get its title
    const drawing = drawings.find(d => d.id === id);
    const title = drawing ? drawing.title : 'this drawing';

    // Open the confirmation dialog
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Drawing',
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      drawingId: id
    });
  };

  const confirmDelete = async () => {
    const id = confirmDialog.drawingId;

    // Close the dialog first
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));

    try {
      await deleteDrawing(id);
      setDrawings(drawings.filter(drawing => drawing.id !== id));
      showToast('Drawing deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting drawing:', error);
      showToast('Failed to delete drawing', 'error');
    }
  };

  const formatDate = (date: Date | { toDate: () => Date } | null | undefined) => {
    if (!date) return 'Unknown date';

    try {
      // Handle Firestore Timestamp objects
      const actualDate = typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function'
        ? date.toDate()
        : date;

      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(actualDate as Date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const filteredDrawings = drawings.filter(drawing =>
    drawing.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const refreshDrawings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userDrawings = await getUserDrawings(user.uid);
      setDrawings(userDrawings as Drawing[]);
      showToast('Drawings refreshed', 'info');
    } catch (error) {
      console.error('Error refreshing drawings:', error);
      showToast('Failed to refresh drawings', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container p-4 mx-auto max-w-7xl">
      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="flex flex-col space-y-4 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-3xl font-bold text-primary">My Drawings</h1>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search drawings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input input-bordered pl-10 w-full sm:w-64"
              />
            </div>

            <button
              onClick={refreshDrawings}
              className="btn btn-outline btn-sm"
              disabled={loading}
            >
              <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>

            <button
              onClick={handleNewDrawing}
              className="btn btn-primary"
            >
              <FiPlus className="mr-2" />
              New Drawing
            </button>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-figure text-primary">
              <FiImage className="w-6 h-6" />
            </div>
            <div className="stat-title">Total Drawings</div>
            <div className="stat-value text-primary">{drawings.length}</div>
          </div>

          <div className="stat">
            <div className="stat-figure text-secondary">
              <FiClock className="w-6 h-6" />
            </div>
            <div className="stat-title">Last Updated</div>
            <div className="stat-value text-secondary">
              {drawings.length > 0
                ? new Date(Math.max(...drawings
                    .filter(d => d.updatedAt)
                    .map(d => {
                      if (!d.updatedAt) return 0;

                      if (typeof d.updatedAt === 'object' && 'toDate' in d.updatedAt &&
                          typeof d.updatedAt.toDate === 'function') {
                        return d.updatedAt.toDate().getTime();
                      } else if (d.updatedAt instanceof Date) {
                        return d.updatedAt.getTime();
                      } else {
                        return 0;
                      }
                    })
                  )).toLocaleDateString()
                : 'N/A'
              }
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : filteredDrawings.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <h2 className="card-title">No Drawings Found</h2>
            {searchTerm ? (
              <p className="text-base-content/70">No drawings match your search. Try a different term or clear your search.</p>
            ) : (
              <p className="text-base-content/70">You don't have any drawings yet. Create your first one!</p>
            )}
            <div className="card-actions justify-center mt-4">
              <button
                onClick={handleNewDrawing}
                className="btn btn-primary"
              >
                Create your first drawing
              </button>

              {!searchTerm && (
                <button
                  onClick={async () => {
                    if (!user) return;

                    try {
                      setLoading(true);
                      const { saveDrawing } = await import('../services/drawingService');
                      const testDrawingId = await saveDrawing({
                        title: 'Test Drawing ' + new Date().toLocaleTimeString(),
                        content: JSON.stringify({ test: 'Simple test drawing' }),
                        userId: user.uid
                      });

                      console.log('Created test drawing with ID:', testDrawingId);
                      showToast('Test drawing created successfully', 'success');

                      // Refresh the drawings list
                      refreshDrawings();
                    } catch (error) {
                      console.error('Error creating test drawing:', error);
                      showToast('Failed to create test drawing', 'error');
                      setLoading(false);
                    }
                  }}
                  className="btn btn-outline"
                >
                  Create Test Drawing
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDrawings.map((drawing) => (
            <div key={drawing.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="card-body">
                <h2 className="card-title">{drawing.title}</h2>
                <p className="text-sm text-base-content/70 flex items-center">
                  <FiClock className="mr-1" /> Last updated: {formatDate(drawing.updatedAt)}
                </p>
                <div className="card-actions justify-end mt-4">
                  <button
                    onClick={() => handleEditDrawing(drawing.id)}
                    className="btn btn-primary btn-sm"
                  >
                    <FiEdit className="mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteDrawing(drawing.id)}
                    className="btn btn-error btn-sm"
                  >
                    <FiTrash2 className="mr-1" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
