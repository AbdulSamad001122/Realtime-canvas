import { useEffect, useState, useRef, useCallback } from 'react';
import { Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { saveDrawing, updateDrawing, getDrawingById } from '../services/drawingService';

interface DrawingCanvasProps {
  initialTitle?: string;
}

export function NewDrawingCanvas({ initialTitle = 'Untitled Drawing' }: DrawingCanvasProps = {}) {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const editorRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isNewDrawing = id === 'new';

  // Load existing drawing
  useEffect(() => {
    if (!editorRef.current || !editorReady || !id || id === 'new') return;

    const loadDrawing = async () => {
      try {
        console.log('Loading drawing with ID:', id);
        const drawing = await getDrawingById(id);

        if (drawing) {
          console.log('Drawing found, setting title:', drawing.title);
          setTitle(drawing.title);

          try {
            const content = JSON.parse(drawing.content);
            console.log('Parsed content, loading into editor');

            if (content && editorRef.current) {
              editorRef.current.loadDocument(content);
              console.log('Drawing loaded successfully');
              setLastSaved(new Date());
            }
          } catch (error) {
            console.error('Error parsing drawing content:', error);
          }
        } else {
          console.error('Drawing not found with ID:', id);
        }
      } catch (error) {
        console.error('Error loading drawing:', error);
      }
    };

    loadDrawing();
  }, [id, editorReady]);

  // Handle save button click - declare with function statement first to avoid reference issues
  const handleSave = useCallback(async (forceSave = false) => {
    if (!user) {
      console.log('Cannot save: User not logged in');
      return;
    }

    if (!editorRef.current || !editorReady) {
      console.log('Cannot save: Editor not ready');
      return;
    }

    // For existing drawings, only save if there are changes or force save is requested
    if (!isNewDrawing && !hasChanges && !forceSave) {
      console.log('No changes to save');
      return;
    }

    try {
      setIsSaving(true);
      console.log('Starting save process...');

      // Get the current document state
      const document = editorRef.current.document;
      if (!document) {
        console.error('Cannot save: No document in editor');
        setIsSaving(false);
        return;
      }

      const content = JSON.stringify(document);
      console.log('Got document from editor, content length:', content.length);

      if (isNewDrawing) {
        console.log('Creating new drawing for user:', user.uid);

        try {
          const newId = await saveDrawing({
            title,
            content,
            userId: user.uid
          });

          console.log('New drawing created with ID:', newId);
          setLastSaved(new Date());
          setHasChanges(false);

          // Navigate to the new drawing URL
          console.log('Navigating to new drawing URL:', newId);
          navigate(`/canvas/${newId}`, { replace: true });
        } catch (error) {
          console.error('Error saving new drawing:', error);
        }
      } else {
        console.log('Updating existing drawing with ID:', id);
        await updateDrawing(id!, { content, title });
        setLastSaved(new Date());
        setHasChanges(false);
        console.log('Drawing updated successfully');
      }
    } catch (error) {
      console.error('Error in saveDrawingData:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user, editorReady, hasChanges, isNewDrawing, title, navigate, id]);

  // Handle title change
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasChanges(true);

    // For existing drawings, schedule a save after title change
    if (!isNewDrawing) {
      // Clear any existing timeout
      if (titleChangeTimeoutRef.current) {
        clearTimeout(titleChangeTimeoutRef.current);
      }

      titleChangeTimeoutRef.current = setTimeout(() => {
        if (!isSaving) {
          handleSave(false);
        }
      }, 1000);
    }
  }, [isNewDrawing, isSaving]);

  // Listen for changes in the editor
  useEffect(() => {
    if (!editorRef.current || !editorReady) return;

    console.log('Setting up editor change listener');

    // This function will be called when the document changes
    const handleChange = () => {
      console.log('Editor content changed');
      setHasChanges(true);

      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // For existing drawings, auto-save after a delay
      if (!isNewDrawing) {
        saveTimeoutRef.current = setTimeout(() => {
          console.log('Auto-saving after change');
          if (!isSaving) {
            handleSave(false);
          }
        }, 2000);
      }
    };

    // Subscribe to changes
    const unsubscribe = editorRef.current.on('change', handleChange);
    console.log('Subscribed to editor changes');

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (unsubscribe) {
        unsubscribe();
      }
      console.log('Cleaned up editor change listener');
    };
  }, [editorReady, isNewDrawing, isSaving, handleSave]);

  // Auto-save interval for existing drawings
  useEffect(() => {
    if (!editorRef.current || !editorReady || isNewDrawing) return;

    console.log('Setting up auto-save interval');

    const autoSaveInterval = setInterval(() => {
      if (!isSaving && hasChanges) {
        console.log('Auto-saving on interval');
        handleSave(false);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => {
      clearInterval(autoSaveInterval);
      console.log('Cleared auto-save interval');
    };
  }, [editorReady, isNewDrawing, isSaving, hasChanges, handleSave]);

  return (
    <div className="flex flex-col h-full">
      <div className="navbar bg-base-100 border-b">
        <div className="navbar-start">
          <div className="form-control">
            <div className="input-group">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                className="input input-bordered"
                placeholder="Drawing Title"
              />
              <button
                onClick={() => handleSave(true)}
                className="btn btn-square btn-primary"
                disabled={isSaving || !editorReady}
                title="Save Drawing"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="navbar-center">
          {isSaving ? (
            <div className="flex items-center">
              <span className="loading loading-spinner loading-xs mr-2"></span>
              <span className="text-sm">Saving...</span>
            </div>
          ) : isNewDrawing ? (
            <div className="flex items-center">
              <div className="badge badge-outline mr-2">
                {lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : 'Not saved yet'}
              </div>
              <div className="text-sm text-info">
                Click the save button to create your drawing
              </div>
            </div>
          ) : lastSaved ? (
            <div className="badge badge-outline">
              Last saved: {lastSaved.toLocaleTimeString()}
            </div>
          ) : (
            <div className="badge badge-outline badge-warning">
              Not saved yet
            </div>
          )}
        </div>

        <div className="navbar-end">
          <Link to="/" className="btn btn-ghost">
            Back to Dashboard
          </Link>
        </div>
      </div>
      <div className="flex-1">
        <Tldraw
          onMount={(editor: any) => {
            console.log('Tldraw mounted, setting editor reference');
            editorRef.current = editor;

            // Wait for the editor to be fully initialized
            setTimeout(() => {
              console.log('Editor initialization complete');
              setEditorReady(true);
            }, 1000);
          }}
        />
      </div>
    </div>
  );
}
