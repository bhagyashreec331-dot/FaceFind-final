import { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import DashShell from '../components/DashShell';

import { useAuth } from '../context/AuthContext';

import { useTheme } from '../context/ThemeContext';

import { deleteAccount, updateProfile } from '../services/api';

function Notice({ notice }) {
  if (!notice) return null;

  return (
    <div
      className={notice.type === 'error' ? 'form-error' : 'form-ok'}
      role={notice.type === 'error' ? 'alert' : 'status'}
    >
      {notice.text}
    </div>
  );
}

export default function AccountSettings() {
  const { user, updateUser, logout } = useAuth();

  const { theme, toggleTheme } = useTheme();

  const navigate = useNavigate();

  const [name, setName] = useState(user.name);

  const [profileNotice, setProfileNotice] = useState(null);

  const [savingProfile, setSavingProfile] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');

  const [deleteNotice, setDeleteNotice] = useState(null);

  const [deleting, setDeleting] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();

    setProfileNotice(null);
    setSavingProfile(true);

    try {
      const data = await updateProfile({ name });

      updateUser({ name: data.user.name });

      setProfileNotice({
        type: 'ok',
        text: 'Name updated.',
      });
    } catch (err) {
      setProfileNotice({
        type: 'error',
        text: err.message,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const removeAccount = async (e) => {
    e.preventDefault();

    setDeleteNotice(null);
    setDeleting(true);

    try {
      await deleteAccount({ password: deletePassword });

      logout();
      navigate('/');
    } catch (err) {
      setDeleteNotice({
        type: 'error',
        text: err.message,
      });

      setDeleting(false);
    }
  };

  const isParticipant = user.role === 'participant';

  return (
    <DashShell>
      <div className="dash-head">
        <div>
          <h2>Account settings</h2>
          <p>Manage your profile and preferences.</p>
        </div>
      </div>

      <div className="settings-stack">

        {/* Profile */}
        <section className="panel">
          <h3>Profile</h3>

          <form onSubmit={saveProfile}>
            <Notice notice={profileNotice} />

            <div className="field">
              <label htmlFor="acc-name">Full name</label>

              <input
                id="acc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="acc-email">Email</label>

              <input
                id="acc-email"
                value={user.email || ''}
                readOnly
                disabled
              />

              <p className="hint">
                Email can't be changed here.
              </p>
            </div>

            <div className="field">
              <label>Account type</label>

              <input
                value={isParticipant ? 'Participant' : 'Photographer'}
                readOnly
                disabled
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                savingProfile ||
                name.trim() === user.name
              }
            >
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </section>

        {/* Preferences */}
        <section className="panel">
          <h3>Preferences</h3>

          <div className="pref-row">
            <div>
              <strong>Appearance</strong>

              <p>
                Currently using the {theme} theme.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={toggleTheme}
            >
              Switch to {theme === 'dark' ? 'light' : 'dark'}
            </button>
          </div>
        </section>

        {/* Delete Account */}
        <section className="panel danger-zone">
          <h3>Delete account</h3>

          <p>
            This removes your account
            {isParticipant
              ? ' and every photo match linked to it'
              : ''}
            . It can't be undone.
          </p>

          {!confirmingDelete ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete my account
            </button>
          ) : (
            <form
              onSubmit={removeAccount}
              style={{ marginTop: 16 }}
            >
              <Notice notice={deleteNotice} />

              <div className="field">
                <label htmlFor="delete-password">
                  Confirm with your password
                </label>

                <input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) =>
                    setDeletePassword(e.target.value)
                  }
                  placeholder="Password"
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={deleting}
                >
                  {deleting
                    ? 'Deleting…'
                    : 'Delete permanently'}
                </button>

                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeleteNotice(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

      </div>
    </DashShell>
  );
}