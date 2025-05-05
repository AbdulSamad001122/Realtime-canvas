import { useAuth } from '../context/AuthContext';
import { FcGoogle } from 'react-icons/fc';
import { FiPenTool, FiSave, FiShare2 } from 'react-icons/fi';

export function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200 flex flex-col items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">Whiteboard</h1>
            <p className="text-base-content/70">Create, save, and share your ideas</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="flex flex-col items-center p-4 bg-base-200 rounded-box">
              <FiPenTool className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-medium">Draw</h3>
              <p className="text-xs text-center text-base-content/70">Create beautiful drawings</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-base-200 rounded-box">
              <FiSave className="w-8 h-8 text-secondary mb-2" />
              <h3 className="font-medium">Save</h3>
              <p className="text-xs text-center text-base-content/70">Auto-save your work</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-base-200 rounded-box">
              <FiShare2 className="w-8 h-8 text-accent mb-2" />
              <h3 className="font-medium">Share</h3>
              <p className="text-xs text-center text-base-content/70">Collaborate with others</p>
            </div>
          </div>

          <div className="divider">Sign in to continue</div>

          <button
            onClick={signInWithGoogle}
            className="btn btn-outline w-full normal-case flex items-center justify-center gap-2"
          >
            <FcGoogle className="w-5 h-5" />
            Sign in with Google
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-base-content/70">
              By signing in, you can save your drawings and access them from anywhere.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-base-content/50 text-sm">
        <p>© {new Date().getFullYear()} Whiteboard. All rights reserved.</p>
      </div>
    </div>
  );
}
