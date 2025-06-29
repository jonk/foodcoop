import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

interface ShiftPreference {
  id: number;
  shiftType: string;
  days: string[];
  timeRangeStart: string;
  timeRangeEnd: string;
  notificationEmail: string;
  isActive: boolean;
  createdAt: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  notificationEmail: string;
  foodCoopUsername?: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<ShiftPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Settings form states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [coopForm, setCoopForm] = useState({
    username: '',
    password: ''
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingCoop, setIsUpdatingCoop] = useState(false);
  
  // Form visibility states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCoopForm, setShowCoopForm] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
      fetchUserData();
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [userResponse, preferencesResponse] = await Promise.all([
        fetch('http://localhost:3000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:3000/api/shifts/preferences', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData.user);
        setCoopForm(prev => ({ ...prev, username: userData.user.foodCoopUsername || '' }));
      }

      if (preferencesResponse.ok) {
        const preferencesData = await preferencesResponse.json();
        setPreferences(preferencesData.preferences);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setMessage({ type: 'error', text: 'Failed to load user data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    setMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setIsUpdatingPassword(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password updated successfully' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordForm(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update password' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleCoopCredentialsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingCoop(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          foodCoopUsername: coopForm.username
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Coop credentials updated successfully' });
        setUser(prev => prev ? { ...prev, foodCoopUsername: coopForm.username } : null);
        setShowCoopForm(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update coop credentials' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update coop credentials' });
    } finally {
      setIsUpdatingCoop(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="main-content">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Settings</h2>
          <p>Manage your account</p>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Password Change Section */}
        <div className="settings-section">
          <h3>Change Password</h3>
          {!showPasswordForm ? (
            <button 
              type="button" 
              className="settings-button"
              onClick={() => setShowPasswordForm(true)}
            >
              Change Password
            </button>
          ) : (
            <form className="settings-form" onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  required
                  disabled={isUpdatingPassword}
                />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  disabled={isUpdatingPassword}
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  disabled={isUpdatingPassword}
                  minLength={6}
                />
              </div>
              <div className="form-actions">
                <button 
                  type="submit" 
                  className="settings-button"
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  disabled={isUpdatingPassword}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Coop Credentials Section */}
        <div className="settings-section">
          <h3>Food Coop Credentials</h3>
          {!showCoopForm ? (
            <button 
              type="button" 
              className="settings-button"
              onClick={() => setShowCoopForm(true)}
            >
              Change Food Coop Credentials
            </button>
          ) : (
            <form className="settings-form" onSubmit={handleCoopCredentialsUpdate}>
              <div className="form-group">
                <label htmlFor="coopUsername">Coop Username</label>
                <input
                  type="text"
                  id="coopUsername"
                  value={coopForm.username}
                  onChange={(e) => setCoopForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Your Food Coop username"
                  disabled={isUpdatingCoop}
                />
              </div>
              <div className="form-group">
                <label htmlFor="coopPassword">Coop Password</label>
                <input
                  type="password"
                  id="coopPassword"
                  value={coopForm.password}
                  onChange={(e) => setCoopForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Your Food Coop password"
                  disabled={isUpdatingCoop}
                />
              </div>
              <div className="form-actions">
                <button 
                  type="submit" 
                  className="settings-button"
                  disabled={isUpdatingCoop}
                >
                  {isUpdatingCoop ? 'Updating...' : 'Update Credentials'}
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => {
                    setShowCoopForm(false);
                    setCoopForm({ username: '', password: '' });
                  }}
                  disabled={isUpdatingCoop}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Logout Button */}
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="main-header">
          <h1>Welcome back, {user?.name}!</h1>
          <p>Manage your shift preferences and notifications</p>
        </div>

        {/* Shift Preferences Section */}
        <div className="preferences-section">
          <div className="preferences-header">
            <h2>Your Shift Preferences</h2>
            <button className="add-preference-button">
              Add Preference
            </button>
          </div>

          {preferences.length === 0 ? (
            <div className="empty-state">
              <h3>No shift preferences yet</h3>
              <p>Add your first shift preference to start receiving notifications</p>
              <button className="add-preference-button">
                Add Your First Preference
              </button>
            </div>
          ) : (
            <div className="preferences-grid">
              {preferences.map((preference) => (
                <div key={preference.id} className="preference-card">
                  <div className="preference-header">
                    <h3 className="preference-title">{preference.shiftType}</h3>
                    <div className="preference-actions">
                      <button className="action-button" title="Edit">
                        ✏️
                      </button>
                      <button className="action-button" title="Delete">
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="preference-details">
                    <div className="detail-item">
                      <span className="detail-label">Days</span>
                      <span className="detail-value">{preference.days.join(', ')}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Time</span>
                      <span className="detail-value">
                        {formatTime(preference.timeRangeStart)} - {formatTime(preference.timeRangeEnd)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email</span>
                      <span className="detail-value">{preference.notificationEmail}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <span className="detail-value">
                        {preference.isActive ? '🟢 Active' : '🔴 Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard; 