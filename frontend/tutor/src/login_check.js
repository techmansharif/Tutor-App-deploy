import React, { useState, useEffect } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetch_location = 'http://localhost:8000';

  // Fetch user data on component mount
  useEffect(() => {
    fetch(`${fetch_location}/api/user`, {
      credentials: 'include'
    })
      .then(response => response.json())
      .then(data => {
        setUser(data.user);
        if (data.user) {
          console.log('User Email:', data.user.email);
          console.log('User ID:', data.user.id);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching user:', error);
        setLoading(false);
      });
  }, []);

  // Handle login
  const handleLogin = () => {
    window.location.href = `${fetch_location}/login`;
  };

  // Handle logout
  const handleLogout = () => {
    fetch(`${fetch_location}/logout`, {
      credentials: 'include'
    })
      .then(() => {
        setUser(null);
      })
      .catch(error => console.error('Error logging out:', error));
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {user ? (
        <div>
          {user.picture && <img src={user.picture} alt="Profile" />}
          <h2>Welcome, {user.name}!</h2>
          <p>Email: {user.email}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <div>
          <h2>Google OAuth Demo</h2>
          <button onClick={handleLogin}>Login with Google</button>
        </div>
      )}
    </div>
  );
}

export default App;


// import React, { useState, useEffect } from 'react';



// function App() {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const fetch_location='http://localhost:8000';
//   // Fetch user data on component mount
//   useEffect(() => {
//     fetch(`${fetch_location}/api/user`, {
//       credentials: 'include'
//     })
//       .then(response => response.json())
//       .then(data => {
//         setUser(data.user);
//         setLoading(false);
//       })
//       .catch(error => {
//         console.error('Error fetching user:', error);
//         setLoading(false);
//       });
//   }, []);

//   // Handle login
//   const handleLogin = () => {
//     window.location.href = `${fetch_location}/login`;
//   };

//   // Handle logout
//   const handleLogout = () => {
//     fetch(`${fetch_location}/logout`, {
//       credentials: 'include'
//     })
//       .then(() => {
//         setUser(null);
//       })
//       .catch(error => console.error('Error logging out:', error));
//   };

//   if (loading) {
//     return <div>Loading...</div>;
//   }

//   return (
//     <div>
//       {user ? (
//         <div>
//           {user.picture && <img src={user.picture} alt="Profile" />}
//           <h2>Welcome, {user.name}!</h2>
//           <p>Email: {user.email}</p>
//           <button onClick={handleLogout}>Logout</button>
//         </div>
//       ) : (
//         <div>
//           <h2>Google OAuth Demo</h2>
//           <button onClick={handleLogin}>Login with Google</button>
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;