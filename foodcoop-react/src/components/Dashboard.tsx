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
  coopUsername?: string;
  coopPassword?: string;
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
  
  // Add preference modal state
  const [showAddPreferenceModal, setShowAddPreferenceModal] = useState(false);
  const [isAddingPreference, setIsAddingPreference] = useState(false);
  const [newPreference, setNewPreference] = useState({
    shiftType: '',
    days: [] as string[],
    timeRangeStart: '',
    timeRangeEnd: '',
    notificationEmail: ''
  });

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
        setCoopForm(prev => ({ ...prev, username: userData.user.coopUsername || '' }));
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
          coopUsername: coopForm.username,
          coopPassword: coopForm.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Coop credentials updated successfully' });
        setUser(prev => prev ? { ...prev, coopUsername: coopForm.username, coopPassword: coopForm.password } : null);
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

  const handleAddPreference = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingPreference(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/shifts/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          shiftType: newPreference.shiftType,
          days: newPreference.days,
          timeRangeStart: newPreference.timeRangeStart,
          timeRangeEnd: newPreference.timeRangeEnd,
          notificationEmail: newPreference.notificationEmail || user?.notificationEmail
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Shift preference added successfully' });
        setShowAddPreferenceModal(false);
        setNewPreference({
          shiftType: '',
          days: [],
          timeRangeStart: '',
          timeRangeEnd: '',
          notificationEmail: ''
        });
        // Refresh preferences
        fetchUserData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add shift preference' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add shift preference' });
    } finally {
      setIsAddingPreference(false);
    }
  };

  const handleDeletePreference = async (preferenceId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/shifts/preferences/${preferenceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Shift preference deleted successfully' });
        fetchUserData();
      } else {
        setMessage({ type: 'error', text: 'Failed to delete shift preference' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete shift preference' });
    }
  };

  const handleCheckShifts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/shifts/check-shifts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        console.log(data.shifts);
        if (data.shifts && data.shifts.length > 0) {
          const totalShifts = data.shifts
            .map((day: any) => day.shifts.length)
            .reduce((sum: number, count: number) => sum + count, 0)
          
          setMessage({ 
            type: 'success', 
            text: `Found ${totalShifts} available shifts! Check your email for details.` 
          });
        } else {
          setMessage({ type: 'success', text: 'No available shifts found for your preferences.' });
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to check shifts' });
      }
    } catch (error) {
      console.error('Error checking shifts:', error);
      setMessage({ type: 'error', text: 'Failed to check shifts. Please try again.' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleDayToggle = (day: string) => {
    setNewPreference(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const openAddPreferenceModal = () => {
    setShowAddPreferenceModal(true);
    setNewPreference({
      shiftType: '',
      days: [],
      timeRangeStart: '',
      timeRangeEnd: '',
      notificationEmail: user?.notificationEmail || ''
    });
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
            <div className="preferences-actions">
              <button className="check-shifts-button" onClick={handleCheckShifts}>
                Check for Shifts
              </button>
              <button className="add-preference-button" onClick={openAddPreferenceModal}>
                Add Preference
              </button>
            </div>
          </div>

          {preferences.length === 0 ? (
            <div className="empty-state">
              <h3>No shift preferences yet</h3>
              <p>Add your first shift preference to start receiving notifications</p>
              <button className="add-preference-button" onClick={openAddPreferenceModal}>
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
                      <button className="action-button" title="Delete" onClick={() => handleDeletePreference(preference.id)}>
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

      {/* Add Preference Modal */}
      {showAddPreferenceModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Shift Preference</h2>
              <button 
                className="modal-close"
                onClick={() => setShowAddPreferenceModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddPreference} className="modal-form">
              <div className="form-group">
                <label htmlFor="shiftType">Shift Type</label>
                <select
                  id="shiftType"
                  value={newPreference.shiftType}
                  onChange={(e) => setNewPreference(prev => ({ ...prev, shiftType: e.target.value }))}
                  required
                  disabled={isAddingPreference}
                >
                  <option value="">Select a shift type</option>
                  <option>-- All committees' --</option>
                  <option>🥕 Carrot 🥕</option>
                  <option>Receiving: Lifting 🚚</option>
                  <option>Receiving: Stocking 📦</option>
                  <option>Bathroom Cleaning Plus 🚽</option>
                  <option>Cart Return and Sidewalk Maintenance 🛒</option>
                  <option>Case Maintenance 🧽</option>
                  <option>** Cash Drawer Counting 💰</option>
                  <option>** Cashier 💵</option>
                  <option>Checkout 💳</option>
                  <option>CHIPS Food Drive 🍛</option>
                  <option>Cleaning Bulk Bins 🧼</option>
                  <option>Cleaning 🏝</option>
                  <option>** Enrollment Data Entry and Photo Processing ⌨️</option>
                  <option>Entrance Desk 🎟</option>
                  <option>Flex Worker 🥫</option>
                  <option>Food Processing: Bulk Packaging & Stocking 🍿</option>
                  <option>** Food Processing: Bulk Team Leader 🍿</option>
                  <option>Food Processing: Cheese & Olive Packaging 🧀</option>
                  <option>** Food Processing: Cheese & Olive Team Leader 🧀</option>
                  <option>** Front End Support 👀</option>
                  <option>General Meeting for workslot credit 🗳️</option>
                  <option>Inventory 📋</option>
                  <option>** Inventory: Data entry 🖥</option>
                  <option>Inventory: Produce 🍀</option>
                  <option>** Morning Set-up & Equipment Cleaning 🧺</option>
                  <option>** New Member Enrollment 📃</option>
                  <option>Office 📗</option>
                  <option>** Receiving: Beer Stocking 🍺</option>
                  <option>Receiving: Bread Stocking 🍞</option>
                  <option>Receiving: Bulk Lifting 🫘</option>
                  <option>Receiving: Dairy Lifting 🥛</option>
                  <option>Receiving: Health and Beauty Support 🧴</option>
                  <option>Receiving: Meat Processing and Lifting 🍖</option>
                  <option>Receiving: Produce Lifting and Stocking 🥦</option>
                  <option>Receiving: Produce Processing 🥬</option>
                  <option>** Receiving: Team Leader 📦</option>
                  <option>Receiving: Turkey Runner 🦃</option>
                  <option>Receiving: Vitamins 🍬</option>
                  <option>Repairs 🛠</option>
                  <option>** Scanning Invoices 🖨</option>
                  <option>Sorting and Collating Documents 🗂</option>
                  <option>Soup Kitchen Volunteer Appreciation Event 🎉</option>
                  <option>Soup Kitchen: Deep-Cleaning</option>
                  <option>Soup Kitchen: Food Services 🍲</option>
                  <option>Soup Kitchen: Guest Services ✍️</option>
                  <option>Soup Kitchen: Reception 🙂</option>
                  <option>Special Project: Data Entry</option>
                  <option>Voucher Processing 🧾</option>
                </select>
              </div>

              <div className="form-group">
                <label>Days of the Week</label>
                <div className="days-grid">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <label key={day} className="day-checkbox">
                      <input
                        type="checkbox"
                        checked={newPreference.days.includes(day)}
                        onChange={() => handleDayToggle(day)}
                        disabled={isAddingPreference}
                      />
                      <span>{day.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="timeRangeStart">Start Time</label>
                  <input
                    type="time"
                    id="timeRangeStart"
                    value={newPreference.timeRangeStart}
                    onChange={(e) => setNewPreference(prev => ({ ...prev, timeRangeStart: e.target.value }))}
                    required
                    disabled={isAddingPreference}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="timeRangeEnd">End Time</label>
                  <input
                    type="time"
                    id="timeRangeEnd"
                    value={newPreference.timeRangeEnd}
                    onChange={(e) => setNewPreference(prev => ({ ...prev, timeRangeEnd: e.target.value }))}
                    required
                    disabled={isAddingPreference}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notificationEmail">Notification Email (optional)</label>
                <input
                  type="email"
                  id="notificationEmail"
                  value={newPreference.notificationEmail}
                  onChange={(e) => setNewPreference(prev => ({ ...prev, notificationEmail: e.target.value }))}
                  placeholder={user?.notificationEmail || 'your-email@example.com'}
                  disabled={isAddingPreference}
                />
                <small>Leave empty to use your default notification email</small>
              </div>

              <div className="modal-actions">
                <button 
                  type="submit" 
                  className="settings-button"
                  disabled={isAddingPreference || newPreference.days.length === 0}
                >
                  {isAddingPreference ? 'Adding...' : 'Add Preference'}
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setShowAddPreferenceModal(false)}
                  disabled={isAddingPreference}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard; 