import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import CreateMatch from './pages/CreateMatch';
import MatchDetails from './pages/MatchDetails';
import Profile from './pages/Profile';
import Splash from './pages/Splash';
import { AuthProvider, useAuth } from './context/AuthContext';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import Search from './pages/Search';
import './App.css';

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) return <div className="app-loading">Loading...</div>;

  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPassword />} />
      {!session ? (
        <Route path="*" element={<Splash />} />
      ) : (
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateMatch />} />
          <Route path="/matches/:id" element={<MatchDetails />} />
          <Route path="/search" element={<Search />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      )}
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;