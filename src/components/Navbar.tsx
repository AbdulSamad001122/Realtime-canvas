import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiLogOut, FiMenu, FiMoon, FiSun, FiGrid } from 'react-icons/fi';

export function Navbar() {
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    setIsDarkMode(!isDarkMode);
  };

  if (!user) return null;

  return (
    <div className="navbar bg-base-100 shadow-md">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <FiMenu className="h-5 w-5" />
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            <li><Link to="/"><FiHome className="mr-2" /> Dashboard</Link></li>
            <li><Link to="/canvas/new"><FiGrid className="mr-2" /> New Drawing</Link></li>
          </ul>
        </div>
        <Link to="/" className="btn btn-ghost text-xl text-primary font-bold">Whiteboard</Link>
      </div>

      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li><Link to="/" className="flex items-center"><FiHome className="mr-2" /> Dashboard</Link></li>
          <li><Link to="/canvas/new" className="flex items-center"><FiGrid className="mr-2" /> New Drawing</Link></li>
        </ul>
      </div>

      <div className="navbar-end">
        <button onClick={toggleTheme} className="btn btn-ghost btn-circle">
          {isDarkMode ? <FiSun className="h-5 w-5" /> : <FiMoon className="h-5 w-5" />}
        </button>

        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
            <div className="w-10 rounded-full">
              <img
                src={user.photoURL || undefined}
                alt={user.displayName || 'User'}
              />
            </div>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            <li className="p-2 text-sm font-medium text-center border-b border-base-200">
              {user.displayName || user.email}
            </li>
            <li>
              <button onClick={handleLogout} className="flex items-center justify-between">
                Logout
                <FiLogOut />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
