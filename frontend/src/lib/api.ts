const API_BASE_URL = 'http://127.0.0.1:8000';

export async function registerUser(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/users/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Registration failed');
  }
  return response.json();
}

export async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Login failed');
  }
  return response.json();
}

export async function searchStock(keywords: string) {
  const response = await fetch(`${API_BASE_URL}/search/stock?keywords=${encodeURIComponent(keywords)}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Stock search failed');
  }
  return response.json();
}

export async function addWatchlistItem(symbol: string, companyName: string, token: string) {
  const response = await fetch(`${API_BASE_URL}/watchlist/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ symbol, company_name: companyName }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to add to watchlist');
  }
  return response.json();
}

export async function getWatchlist(token: string) {
  const response = await fetch(`${API_BASE_URL}/watchlist/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to fetch watchlist');
  }
  return response.json();
}

export async function deleteWatchlistItem(itemId: number, token: string) {
  const response = await fetch(`${API_BASE_URL}/watchlist/${itemId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to delete from watchlist');
  }
  return response.json();
}

export async function getStockDetails(symbol: string) {
  const response = await fetch(`${API_BASE_URL}/stock/${symbol}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to fetch stock details');
  }
  return response.json();
}

export async function saveStockNote(symbol: string, note: string, token: string) {
  const response = await fetch(`${API_BASE_URL}/stock_notes/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ symbol, note }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to save note');
  }
  return response.json();
}

export async function getStockNote(symbol: string, token: string) {
  const response = await fetch(`${API_BASE_URL}/stock_notes/${symbol}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to fetch note');
  }
  return response.json();
}

export async function createAlert(symbol: string, alertType: string, threshold: number, token: string) {
  const response = await fetch(`${API_BASE_URL}/alerts/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ symbol, alert_type: alertType, threshold }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to create alert');
  }
  return response.json();
}

export async function getAlerts(token: string) {
  const response = await fetch(`${API_BASE_URL}/alerts/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to fetch alerts');
  }
  return response.json();
}

export async function deleteAlert(alertId: number, token: string) {
  const response = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to delete alert');
  }
  return response.json();
}

export async function getUserProfile(token: string) {
  const response = await fetch(`${API_BASE_URL}/users/me/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to fetch user profile');
  }
  return response.json();
}

export async function updateUserSettings(telegramChatId: string, telegramBotToken: string, token: string) {
  const response = await fetch(`${API_BASE_URL}/users/me/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ telegram_chat_id: telegramChatId, telegram_bot_token: telegramBotToken }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to update settings');
  }
  return response.json();
}
