import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';


export const Logout: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      try {
        
        // Clear any local storage
        localStorage.clear();
        sessionStorage.clear();

        // Redirect to login after a brief moment
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
      } catch (error) {
        console.error('Logout error:', error);
        // Redirect anyway
        navigate('/login', { replace: true });
      }
    };

    performLogout();
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '60px 40px',
        textAlign: 'center',
        maxWidth: '400px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#4caf50',
          margin: '0 auto 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px'
        }}>
          ✓
        </div>

        <h2 style={{ margin: '0 0 10px 0', fontSize: '28px', color: '#333' }}>
          Logged Out Successfully
        </h2>

        <p style={{ margin: '0', fontSize: '16px', color: '#666' }}>
          Thank you for using Finaster Exchange
        </p>

        <div style={{
          marginTop: '30px',
          padding: '15px',
          background: '#f5f5f5',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#666'
        }}>
          Redirecting to login page...
        </div>

        <button
          onClick={() => navigate('/login')}
          style={{
            marginTop: '20px',
            padding: '12px 30px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '16px'
          }}
        >
          Return to Login
        </button>
      </div>
    </div>
  );
};

export default Logout;
