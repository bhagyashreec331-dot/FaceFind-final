import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import About from './pages/About';
import HowItWorks from './pages/HowItWorks';
import Features from './pages/Features';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import JoinEvent from './pages/JoinEvent';
import EventGallery from './pages/EventGallery';
import PhotographerDashboard from './pages/PhotographerDashboard';
import ParticipantDashboard from './pages/ParticipantDashboard';
import AccountSettings from './pages/AccountSettings';
import CreateEvent from './pages/CreateEvent';
import UploadPhotos from './pages/UploadPhotos';
import OAuthCallback from './pages/OAuthCallback';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/features" element={<Features />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/join-event"
            element={
              <ProtectedRoute>
                <JoinEvent />
              </ProtectedRoute>
            }
          />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
          <Route path="/event/:eventId" element={<EventGallery />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

          <Route
            path="/dashboard/photographer"
            element={
              <ProtectedRoute role="photographer">
                <PhotographerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/participant"
            element={
              <ProtectedRoute role="participant">
                <ParticipantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/account"
            element={
              <ProtectedRoute>
                <AccountSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-event"
            element={
              <ProtectedRoute role="photographer">
                <CreateEvent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload-photos/:eventId"
            element={
              <ProtectedRoute role="photographer">
                <UploadPhotos />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
