import { useEffect, useState, useRef } from 'react';
import { Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { saveDrawing, updateDrawing, getDrawingById } from '../services/drawingService';

interface DrawingCanvasProps {
  initialTitle?: string;
}

export function SimpleDrawingCanvas({ initialTitle = 'Untitled Drawing' }: DrawingCanvasProps = {}) {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const editorRef = useRef<any>(null);
  const isNewDrawing = id === 'new';

  // Load existing drawing
  useEffect(() => {
    if (!id || id === 'new' || !editorRef.current) return;

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
  }, [id]);

  // Handle title change - just update the state, no auto-save or side effects
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    console.log('Title changed to:', newTitle);
    setTitle(newTitle);
  };

  // Handle save button click
  const handleSave = async () => {
    console.log('Save button clicked');
    console.log('User:', user);
    console.log('Editor ref:', editorRef.current);

    if (!user || !editorRef.current) {
      console.log('Cannot save: User not logged in or editor not ready');
      return;
    }

    try {
      setIsSaving(true);
      console.log('Starting save process...');

      // Get the current document state
      console.log('Editor object:', editorRef.current);
      console.log('Editor methods:', Object.keys(editorRef.current));

      // Get the document using the correct API for TLDraw v2
      let document;
      try {
        // For TLDraw v2, use the store's serialized snapshot
        if (editorRef.current.store) {
          document = editorRef.current.store.serialize();
          console.log('Got document from editor.store.serialize()');
        } else if (editorRef.current.serialize) {
          document = editorRef.current.serialize();
          console.log('Got document from editor.serialize()');
        } else if (editorRef.current.document) {
          document = editorRef.current.document;
          console.log('Got document from editor.document');
        } else {
          // Fallback to a simple object with the shapes
          document = {
            shapes: editorRef.current.getShapes?.() || [],
            version: 1,
            timestamp: Date.now()
          };
          console.log('Created fallback document');
        }
      } catch (e) {
        console.error('Error getting document:', e);
        // Create a minimal valid document as fallback
        document = {
          version: 1,
          shapes: [],
          timestamp: Date.now()
        };
        console.log('Created minimal fallback document due to error');
      }

      if (!document) {
        console.error('Cannot save: No document in editor');
        setIsSaving(false);
        return;
      }

      const content = JSON.stringify(document);
      console.log('Got document from editor, content preview:', content.substring(0, 100) + '...');
      console.log('Content length:', content.length);

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
        console.log('Drawing updated successfully');
      }
    } catch (error) {
      console.error('Error in saveDrawingData:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // We're not implementing auto-save in this simplified version
  // to avoid any potential issues

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
                onClick={handleSave}
                className="btn btn-square btn-primary"
                disabled={isSaving}
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
            console.log('Editor API:', editor);
            console.log('Editor methods:', Object.keys(editor));

            // Store the editor reference
            editorRef.current = editor;

            // Try to get the document to see what's available
            if (editor.document) {
              console.log('Editor has document property');
            } else if (editor.store && editor.store.getSnapshot) {
              console.log('Editor has store.getSnapshot method');
            } else if (editor.getSnapshot) {
              console.log('Editor has getSnapshot method');
            } else if (editor.getContent) {
              console.log('Editor has getContent method');
            } else {
              console.log('Could not find document access method');
            }

            // Add a debug button to the editor
            setTimeout(() => {
              console.log('Adding debug button');
              const debugButton = document.createElement('button');
              debugButton.innerText = 'Debug Editor';
              debugButton.style.position = 'absolute';
              debugButton.style.bottom = '10px';
              debugButton.style.right = '10px';
              debugButton.style.zIndex = '1000';
              debugButton.onclick = () => {
                console.log('Debug button clicked');
                console.log('Editor:', editor);
                console.log('Editor methods:', Object.keys(editor));

                // Try to get the document using different methods
                try {
                  if (editor.store && editor.store.serialize) {
                    const serialized = editor.store.serialize();
                    console.log('Serialized:', serialized);
                  } else if (editor.serialize) {
                    const serialized = editor.serialize();
                    console.log('Serialized from editor:', serialized);
                  } else if (editor.store && editor.store.getSnapshot) {
                    const snapshot = editor.store.getSnapshot();
                    console.log('Snapshot:', snapshot);
                  } else if (editor.getSnapshot) {
                    const snapshot = editor.getSnapshot();
                    console.log('Snapshot from editor:', snapshot);
                  } else if (editor.document) {
                    console.log('Document:', editor.document);
                  } else {
                    console.log('No document access method found');
                  }

                  // Try to get shapes
                  if (editor.getShapes) {
                    const shapes = editor.getShapes();
                    console.log('Shapes:', shapes);
                  }
                } catch (e) {
                  console.error('Error accessing document:', e);
                }
              };

              const container = document.querySelector('.tl-container');
              if (container) {
                container.appendChild(debugButton);
              }
            }, 2000);
          }}
        />
      </div>
    </div>
  );
}
