import { useEffect, useState, useRef, useCallback } from 'react';
import { Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { saveDrawing, updateDrawing, getDrawingById } from '../services/drawingService';
import { ConsoleLogger } from './ConsoleLogger';

interface DrawingCanvasProps {
  initialTitle?: string;
}

export function DrawingCanvas({ initialTitle = 'Untitled Drawing' }: DrawingCanvasProps = {}) {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const editorRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isNewDrawing = id === 'new';

  // Function to save drawing data
  const saveDrawingData = useCallback(async (forceSave = false) => {
    if (!user) {
      console.log('Cannot save: No user logged in');
      return;
    }

    if (!editorRef.current || !isEditorReady) {
      console.log('Cannot save: Editor not ready');
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

      // For existing drawings, just update
      if (id && id !== 'new') {
        console.log('Updating existing drawing with ID:', id);
        await updateDrawing(id, { content, title });
        setLastSaved(new Date());
        console.log('Drawing updated successfully');
      }
      // For new drawings
      else if (id === 'new') {
        // Only save if forced (button click) or we haven't saved yet
        if (forceSave || !lastSaved) {
          console.log('Creating new drawing for user:', user.uid);

          try {
            const newId = await saveDrawing({
              title,
              content,
              userId: user.uid
            });

            console.log('New drawing created with ID:', newId);
            setLastSaved(new Date());

            // Only navigate if forced save and we haven't navigated yet
            if (forceSave && !hasNavigated) {
              console.log('Force save requested, preparing to navigate');
              setHasNavigated(true); // Prevent multiple navigations

              // Use a timeout to ensure the state updates before navigation
              setTimeout(() => {
                console.log('Navigating to new drawing URL:', newId);
                navigate(`/canvas/${newId}`, { replace: true });
              }, 500);
            }
          } catch (saveError) {
            console.error('Error saving new drawing:', saveError);
          }
        } else {
          console.log('Skipping save for new drawing (not forced)');
          // Just update the UI to show we "saved" without actually saving
          setLastSaved(new Date());
        }
      }
    } catch (error) {
      console.error('Error in saveDrawingData:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user, id, title, navigate, isEditorReady, hasNavigated, lastSaved]);

  // Load existing drawing
  useEffect(() => {
    // Skip for new drawings or if editor isn't ready
    if (!id || id === 'new' || !editorRef.current || !isEditorReady) return;

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
            } else {
              console.error('Cannot load document: editor or content missing');
            }
          } catch (parseError) {
            console.error('Error parsing drawing content:', parseError);
          }
        } else {
          console.error('Drawing not found with ID:', id);
        }
      } catch (error) {
        console.error('Error loading drawing:', error);
      }
    };

    loadDrawing();
  }, [id, isEditorReady]);

  // Handle editor changes
  useEffect(() => {
    if (!editorRef.current || !isEditorReady) return;

    console.log('Setting up editor change handler');

    // This function will be called when the document changes
    const handleChange = () => {
      console.log('Editor content changed');

      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set a new timeout to save after 2 seconds of inactivity
      saveTimeoutRef.current = setTimeout(() => {
        console.log('Auto-saving after change');
        saveDrawingData(false);
      }, 2000);
    };

    // Subscribe to changes
    const unsubscribe = editorRef.current.on('change', handleChange);
    console.log('Subscribed to editor changes');

    // Cleanup function
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (unsubscribe) {
        unsubscribe();
      }
      console.log('Cleaned up editor change handler');
    };
  }, [saveDrawingData, isEditorReady]);

  // Handle title changes
  const handleTitleChange = useCallback((newTitle: string) => {
    console.log('Title changed to:', newTitle);
    setTitle(newTitle);

    // For new drawings, don't auto-save on title change
    if (id === 'new') {
      console.log('New drawing - not auto-saving on title change');
      return;
    }

    // For existing drawings, schedule a save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      console.log('Saving after title change');
      saveDrawingData(false);
    }, 1000);
  }, [id, saveDrawingData]);

  return (
    <div className="flex flex-col h-full">
      <ConsoleLogger />
      <div className="navbar bg-base-100 border-b">
        <div className="navbar-start">
          <div className="form-control">
            <div className="input-group">
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="input input-bordered"
                placeholder="Drawing Title"
              />
              <button
                onClick={() => saveDrawingData(true)}
                className="btn btn-square btn-primary"
                disabled={isSaving || !isEditorReady}
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
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
              <li>
                <Link to="/">
                  Back to Dashboard
                </Link>
              </li>
            </ul>
          </div>
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
              setIsEditorReady(true);

              // For new drawings, we don't need to do anything special on mount
              if (id === 'new') {
                console.log('New drawing - editor ready');
              }
            }, 1000);
          }}
        />
      </div>
    </div>
  );
}
