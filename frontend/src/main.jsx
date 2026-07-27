import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext.jsx'
import { GOOGLE_CLIENT_ID } from './config/environment.js'
import AppErrorBoundary from './components/common/AppErrorBoundary.jsx'

const app = (
  <AuthProvider>
    <App />
  </AuthProvider>
)

const appWithProviders = GOOGLE_CLIENT_ID ? (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{app}</GoogleOAuthProvider>
) : (
  app
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>{appWithProviders}</AppErrorBoundary>,
)
