import { useEffect, useState, useRef } from 'react';
import { Tldraw, getSnapshot, loadSnapshot } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { saveDrawing, updateDrawing, getDrawingById } from '../services/drawingService';

interface DrawingCanvasProps {
  initialTitle?: string;
}

export function FixedDrawingCanvas({ initialTitle = 'Untitled Drawing' }: DrawingCanvasProps = {}) {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isDrawingLoaded, setIsDrawingLoaded] = useState(false);
  const editorRef = useRef<any>(null);
  const isNewDrawing = id === 'new';

  // First, fetch the drawing data when the component mounts
  useEffect(() => {
    if (!id || id === 'new') return;

    const fetchDrawing = async () => {
      try {
        console.log('Fetching drawing with ID:', id);
        const drawing = await getDrawingById(id);

        if (drawing) {
          console.log('Drawing found, setting title:', drawing.title);
          // Set the title from the database
          setTitle(drawing.title);
        } else {
          console.error('Drawing not found with ID:', id);
        }
      } catch (error) {
        console.error('Error fetching drawing:', error);
      }
    };

    fetchDrawing();
  }, [id]);

  // Then, load the drawing content when the editor is ready
  useEffect(() => {
    if (!id || id === 'new' || !editorRef.current || !isEditorReady || isDrawingLoaded) return;

    const loadDrawingContent = async () => {
      try {
        console.log('Loading drawing content for ID:', id);
        const drawing = await getDrawingById(id);

        if (drawing) {
          try {
            // Parse the content from the database
            const content = JSON.parse(drawing.content);
            console.log('Parsed content:', content);

            if (content && editorRef.current) {
              // Use loadSnapshot for proper loading
              if (content.document) {
                // If the content is already in the correct format
                console.log('Loading snapshot with document and session');
                loadSnapshot(editorRef.current.store, content);
              } else {
                // If the content is just the document (older format)
                console.log('Loading document directly');
                loadSnapshot(editorRef.current.store, {
                  document: content,
                  // We need to provide a valid session state with required properties
                  // Use a complete type assertion to bypass type checking
                  session: {
                    version: 1,
                    currentPageId: 'page:page',
                    isFocusMode: false,
                    exportBackground: true,
                    isDebugMode: false,
                    isToolLocked: false,
                    isGridMode: false,
                    pageStates: []
                  } as any
                });
              }

              console.log('Drawing loaded successfully');
              setLastSaved(new Date());
              setIsDrawingLoaded(true);
            }
          } catch (error) {
            console.error('Error parsing or loading drawing content:', error);
          }
        }
      } catch (error) {
        console.error('Error loading drawing content:', error);
      }
    };

    loadDrawingContent();
  }, [id, isEditorReady, isDrawingLoaded]);

  // Handle title change - just update the state, no auto-save
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  // Handle save button click
  const handleSave = async () => {
    if (!user) {
      console.log('Cannot save: User not logged in');
      return;
    }

    if (!editorRef.current) {
      console.log('Cannot save: Editor not ready');
      return;
    }

    try {
      setIsSaving(true);
      console.log('Starting save process...');

      // Get the current document state using getSnapshot
      const snapshot = getSnapshot(editorRef.current.store);
      console.log('Got snapshot:', snapshot);

      // Serialize the snapshot to JSON
      const content = JSON.stringify(snapshot);
      console.log('Content length:', content.length);

      if (isNewDrawing) {
        console.log('Creating new drawing for user:', user.uid);

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
          onMount={(editor) => {
            console.log('Tldraw mounted, setting editor reference');
            editorRef.current = editor;

            // Wait a bit to ensure the editor is fully initialized
            setTimeout(() => {
              console.log('Setting editor ready state to true');
              setIsEditorReady(true);
            }, 500);

            // Add a debug button to help diagnose issues
            setTimeout(() => {
              const debugButton = document.createElement('button');
              debugButton.innerText = 'Debug';
              debugButton.style.position = 'absolute';
              debugButton.style.bottom = '10px';
              debugButton.style.right = '10px';
              debugButton.style.zIndex = '1000';
              debugButton.onclick = async () => {
                console.log('Editor:', editor);
                console.log('Editor methods:', Object.keys(editor));
                console.log('Editor ready:', isEditorReady);
                console.log('Drawing loaded:', isDrawingLoaded);
                console.log('Current title:', title);

                // Try to get the document using getSnapshot
                try {
                  const snapshot = getSnapshot(editor.store);
                  console.log('Snapshot from getSnapshot:', snapshot);

                  // Check if there are any shapes in the document
                  if (snapshot.document) {
                    // Access the store's shapes safely with type checking
                    const store = editor.store;
                    const shapes = store.allRecords().filter(
                      (record: any) => record.typeName === 'shape'
                    );
                    console.log('Number of shapes in document:', shapes.length);
                    console.log('Shape records:', shapes);
                  }

                  // Try to fetch the drawing from the database
                  if (id && id !== 'new') {
                    try {
                      console.log('Fetching drawing from database for debug...');
                      const drawing = await getDrawingById(id);
                      console.log('Drawing from database:', drawing);
                      if (drawing) {
                        console.log('Database title:', drawing.title);
                        console.log('Database content length:', drawing.content.length);

                        // Try to parse the content
                        try {
                          const parsedContent = JSON.parse(drawing.content);
                          console.log('Parsed content has document:', !!parsedContent.document);
                          if (parsedContent.document) {
                            // Safely check for shapes in the parsed content
                            try {
                              // Try to extract shapes from the parsed content in a type-safe way
                              const shapes = [];
                              // Iterate through all keys in the document to find shapes
                              for (const key in parsedContent.document) {
                                if (key.startsWith('shape:')) {
                                  shapes.push(parsedContent.document[key]);
                                }
                              }
                              console.log('Number of shapes in database:', shapes.length);
                            } catch (e) {
                              console.error('Error extracting shapes from parsed content:', e);
                            }
                          }
                        } catch (parseError) {
                          console.error('Error parsing database content:', parseError);
                        }
                      }
                    } catch (dbError) {
                      console.error('Error fetching drawing from database:', dbError);
                    }
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
