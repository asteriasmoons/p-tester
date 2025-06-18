import { useEffect, useState } from 'react';

function LoginStatus() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3001/auth/user', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUser(data.user);
        }
      });
  }, []);

  const handleLogout = () => {
    window.location.href = 'http://localhost:3001/auth/logout';
  };

  const handleLogin = () => {
    window.location.href = 'http://localhost:3001/auth/discord';
  };

  return (
    <div style={{
      marginTop: '2rem',
      padding: '1rem',
      backgroundColor: '#2d2d2d',
      borderRadius: '8px',
      color: '#fff',
      textAlign: 'center'
    }}>
      {user ? (
        <>
          <img
            src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
            alt="Avatar"
            style={{ width: '64px', borderRadius: '50%' }}
          />
          <p style={{ margin: '0.5rem 0' }}>{user.username}</p>
          <button onClick={handleLogout} className="sidebar-link">Logout</button>
        </>
      ) : (
        <button onClick={handleLogin} className="sidebar-link">Login with Discord</button>
      )}
    </div>
  );
}

export default LoginStatus;