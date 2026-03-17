import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Search, User, Menu, X, LogOut, LayoutDashboard, Package, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { cart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  // Transparent only on homepage, solid on all other pages
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [location]);

  // Navbar is "solid" when: not homepage, OR homepage but scrolled
  const isSolid = !isHomePage || scrolled;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const navLinks = [
    { label: 'Shop All', href: '/products' },
    { label: 'Electronics', href: '/products?category=electronics' },
    { label: 'Fashion', href: '/products?category=fashion' },
    { label: 'Home & Living', href: '/products?category=home-living' },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isSolid
            ? 'bg-white shadow-sm border-b border-ink-100'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <span className={`font-display text-2xl font-semibold tracking-tight transition-colors duration-300 ${
                isSolid ? 'text-ink-950' : 'text-white'
              }`}>
                NAZARA
              </span>
              <span className={`hidden sm:block w-1 h-1 rounded-full mt-1 ${isSolid ? 'bg-gold-500' : 'bg-gold-400'}`} />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`text-sm font-medium transition-colors duration-200 ${
                    isSolid
                      ? 'text-ink-600 hover:text-ink-950'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className={`p-2 rounded-full transition-colors ${
                  isSolid
                    ? 'text-ink-600 hover:text-ink-950 hover:bg-ink-100'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Search size={20} />
              </button>

              {/* Cart */}
              <Link
                to="/cart"
                className={`relative p-2 rounded-full transition-colors ${
                  isSolid
                    ? 'text-ink-600 hover:text-ink-950 hover:bg-ink-100'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <ShoppingBag size={20} />
                {cart.count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-ink-950 text-white text-xs rounded-full flex items-center justify-center font-mono font-medium"
                  >
                    {cart.count > 9 ? '9+' : cart.count}
                  </motion.span>
                )}
              </Link>

              {/* User */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-ink-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-ink-950 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">{user.name?.[0]?.toUpperCase()}</span>
                    </div>
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-lg border border-ink-100 overflow-hidden z-50"
                      >
                        <div className="p-3 border-b border-ink-100">
                          <p className="font-medium text-ink-950 text-sm">{user.name}</p>
                          <p className="text-xs text-ink-400 truncate">{user.email}</p>
                        </div>
                        <div className="p-1.5">
                          <Link to="/profile" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-ink-700 hover:bg-ink-50 transition-colors">
                            <UserCircle size={16} />
                            My Profile
                          </Link>
                          <Link to="/orders" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-ink-700 hover:bg-ink-50 transition-colors">
                            <Package size={16} />
                            My Orders
                          </Link>
                          {isAdmin && (
                            <Link to="/admin" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-ink-700 hover:bg-ink-50 transition-colors">
                              <LayoutDashboard size={16} />
                              Admin Dashboard
                            </Link>
                          )}
                          <button
                            onClick={logout}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut size={16} />
                            Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  to="/login"
                  className={`hidden sm:flex items-center gap-1.5 py-2 px-4 rounded-full text-xs font-medium transition-all duration-200 ${
                    isSolid
                      ? 'bg-ink-950 text-white hover:bg-ink-800'
                      : 'bg-white text-ink-950 hover:bg-ink-100'
                  }`}
                >
                  <User size={14} />
                  Sign In
                </Link>
              )}

              {/* Mobile menu */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`md:hidden p-2 rounded-full transition-colors ${
                  isSolid
                    ? 'text-ink-600 hover:bg-ink-100'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden bg-white border-t border-ink-100"
            >
              <div className="px-4 py-4 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="block px-3 py-2.5 rounded-xl text-ink-700 hover:bg-ink-50 font-medium text-sm"
                  >
                    {link.label}
                  </Link>
                ))}
                {!isAuthenticated && (
                  <Link to="/login" className="block px-3 py-2.5 rounded-xl text-ink-700 hover:bg-ink-50 font-medium text-sm">
                    Sign In
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4"
            onClick={() => setSearchOpen(false)}
          >
            <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="relative w-full max-w-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSearch} className="flex items-center gap-3 bg-white rounded-2xl shadow-2xl p-4">
                <Search size={20} className="text-ink-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 outline-none text-ink-900 text-base font-sans placeholder-ink-400"
                />
                <button type="submit" className="bg-ink-950 text-white py-2 px-4 rounded-full text-xs font-medium hover:bg-ink-800 transition-colors">
                  Search
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click-away for user menu */}
      {userMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
      )}
    </>
  );
}