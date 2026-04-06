# CodePop Frontend Authentication Flow Document

**Version:** 1.1  
**Target Audience:** Frontend Developers (NextJS)  
**Backend:** Django (Transparent P2P Architecture)

## 1. Architectural Overview

CodePop uses a **decentralized P2P architecture** designed to be **transparent** to the end-user.

- **Single Domain Experience:** Users should always interact with a single domain (e.g., `https://codepop.com`). GeoDNS or a Load Balancer should route the user to the geographically nearest Store Server.
- **Home vs. Visiting Server:**
  - **Home Server:** Where the user registered.
  - **Visiting Server:** Any other server.
- **Transparent Proxying:** If a user logs into a Visiting Server, that server handles communication with the Home Server in the background. The user never sees a subdomain change or a redirect to another server.

## 2. Token Standards

- **Type:** JWT (JSON Web Token)
- **Signature Algorithm:** `RS256` (Asymmetric RSA)
- **Transport:** `Authorization: Bearer <access_token>` header.

### JWT Payload Claims

The frontend doesn't need to verify the signature (the backend does this), but the token identifies the user and their "Home" identity across the entire network.

## 3. Authentication Endpoints

### 3.1 Login

**Endpoint:** `POST /auth/login/`  
**Payload:**

```json
{
  "username": "user123",
  "password": "securepassword"
}
```

**Response (200 OK):**

```json
{
  "refresh": "eyJhbG...",
  "access": "eyJhbG...",
  "user_id": "...",
  "username": "user123",
  "first_name": "John",
  "is_proxy": true,
  "home_server_id": "store_provo_01"
}
```

_Note: The `is_proxy` flag indicates the backend is routing this session to a remote Home Server. The frontend does not need to take any action; it continues using the current server connection._

### 3.2 Registration

**Endpoint:** `POST /auth/register/`  
_Note: The server receiving this request becomes the user's permanent **Home Server**._

### 3.3 Token Refresh / Logout

**Endpoints:** `POST /auth/refresh/` and `POST /auth/logout/`  
_Note: These are handled transparently. If the token was originally issued by a remote server, the current server will proxy the refresh/blacklist request to the Home Server internally._

## 4. Frontend Implementation Guidelines (NextJS)

### 4.1 API Client Configuration

The frontend should use a single base URL for the API. It should **not** attempt to route users to different subdomains.

```javascript
const API_BASE_URL = "https://codepop.com/backend/"; // Standard base URL
```

### 4.2 Interceptors (401 Handling)

Use a standard Axios or Fetch interceptor to handle token refreshes. Because of the transparent architecture, the same `/auth/refresh/` endpoint on the **current** server will work regardless of which server in the network issued the original token.

### 4.3 Permissions & UI Gating

Use the `user_type` returned in the login response to gate the UI. These permissions are consistent network-wide.

## 5. Summary Flow Diagram

1. **User enters credentials** on the NextJS frontend.
2. **Frontend posts** to the geographically nearest Store Server's `/auth/login/`.
3. **Store Server** (Visiting) identifies the user's Home Server via a global `MasterList`.
4. **Store Server** proxies the credentials to the **Home Server** internally.
5. **Home Server** validates and returns a signed JWT.
6. **Frontend receives tokens** and remains on the same URL/Server.
7. **Frontend attaches `access_token`** to all subsequent calls.
8. Any Store Server in the network can verify this token locally using the Home Server's public key.

## 6. Pseudo Code Implementation (Cookie-Based)

This implementation uses **`HttpOnly` Cookies** for the `refresh_token` to protect against XSS attacks. The browser automatically handles the storage and transport of the refresh token.

### 6.1 API Client Setup

```javascript
import axios from "axios";

const API_BASE_URL = "https://codepop.com/backend/";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial: Allows browser to send/receive cookies
});

// Request Interceptor: Attach Access Token from memory/localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Handle 401 & Automatic Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // The browser automatically sends the HttpOnly refresh_token cookie
        const { data } = await axios.post(
          `${API_BASE_URL}auth/refresh/`,
          {}, // No body needed, token is in the cookie
          { withCredentials: true },
        );

        localStorage.setItem("access_token", data.access);

        // Retry the original request with the new access token
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed (expired or invalid) -> Logout user
        localStorage.removeItem("access_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);
```

### 6.2 Login Logic

```javascript
async function login(username, password) {
  try {
    // Backend sets the 'refresh_token' HttpOnly cookie automatically
    const { data } = await api.post("auth/login/", { username, password });

    // Only store the short-lived access token in the frontend
    localStorage.setItem("access_token", data.access);

    // UI redirection based on user type
    if (data.user_type === "customer") {
      router.push("/home");
    } else {
      router.push("/admin/dashboard");
    }
  } catch (error) {
    console.error(
      "Login failed:",
      error.response?.data?.error || error.message,
    );
  }
}
```

### 6.3 Logout Logic

```javascript
async function logout() {
  try {
    // Backend clears the 'refresh_token' cookie
    await api.post("auth/logout/");
  } finally {
    localStorage.removeItem("access_token");
    window.location.href = "/login";
  }
}
```
