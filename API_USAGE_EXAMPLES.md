# ANTIC Notification Service API Usage Examples

## Overview

The ANTIC Notification Service provides a REST API for sending WhatsApp and Telegram notifications. All API requests require authentication using an API key.

## Authentication

Include your API key in the request header:
```
X-API-Key: ak_your_api_key_here
```

## Base URL

```
https://your-domain.com/api
```

## WhatsApp API

### Send WhatsApp Message

**Endpoint:** `POST /notifications/whatsapp`
**Required Permission:** `whatsapp:send`

#### Request Body

```json
{
  "recipient": "+1234567890",
  "message": "Hello from ANTIC Notification Service!",
  "metadata": {
    "campaign": "welcome",
    "userId": "12345"
  }
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "messageId": "msg_whatsapp_123456",
    "status": "sent",
    "recipient": "+1234567890",
    "service": "whatsapp"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

#### Code Examples

**cURL:**
```bash
curl -X POST https://your-domain.com/api/notifications/whatsapp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ak_your_api_key_here" \
  -d '{
    "recipient": "+1234567890",
    "message": "Hello from ANTIC!"
  }'
```

**JavaScript (Node.js):**
```javascript
const axios = require('axios');

const sendWhatsApp = async () => {
  try {
    const response = await axios.post('https://your-domain.com/api/notifications/whatsapp', {
      recipient: '+1234567890',
      message: 'Hello from ANTIC!'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'ak_your_api_key_here'
      }
    });
    
    console.log('Message sent:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
};

sendWhatsApp();
```

**Python:**
```python
import requests

def send_whatsapp_message():
    url = "https://your-domain.com/api/notifications/whatsapp"
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": "ak_your_api_key_here"
    }
    data = {
        "recipient": "+1234567890",
        "message": "Hello from ANTIC!"
    }
    
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 200:
        print("Message sent:", response.json())
    else:
        print("Error:", response.json())

send_whatsapp_message()
```

**PHP:**
```php
<?php
function sendWhatsAppMessage() {
    $url = 'https://your-domain.com/api/notifications/whatsapp';
    $headers = [
        'Content-Type: application/json',
        'X-API-Key: ak_your_api_key_here'
    ];
    $data = [
        'recipient' => '+1234567890',
        'message' => 'Hello from ANTIC!'
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    echo $response;
}

sendWhatsAppMessage();
?>
```

## Telegram API

### Send Telegram Message

**Endpoint:** `POST /notifications/telegram`
**Required Permission:** `telegram:send`

#### Request Body

```json
{
  "recipient": "@username",
  "message": "Hello from ANTIC Notification Service!",
  "metadata": {
    "campaign": "welcome",
    "userId": "12345"
  }
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "messageId": "msg_telegram_123456",
    "status": "sent",
    "recipient": "@username",
    "service": "telegram"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

#### Code Examples

**cURL:**
```bash
curl -X POST https://your-domain.com/api/notifications/telegram \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ak_your_api_key_here" \
  -d '{
    "recipient": "@username",
    "message": "Hello from ANTIC!"
  }'
```

**JavaScript (Node.js):**
```javascript
const sendTelegram = async () => {
  try {
    const response = await fetch('https://your-domain.com/api/notifications/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'ak_your_api_key_here'
      },
      body: JSON.stringify({
        recipient: '@username',
        message: 'Hello from ANTIC!'
      })
    });
    
    const result = await response.json();
    console.log('Message sent:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};

sendTelegram();
```

## Rate Limiting

Each API key has its own rate limit configuration. Rate limit information is included in response headers:

- `X-RateLimit-Limit`: Maximum requests allowed in the time window
- `X-RateLimit-Remaining`: Number of requests remaining in the current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Try again in 3600 seconds."
  },
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/notifications/whatsapp"
}
```

## Error Handling

### Common Error Responses

**Invalid API Key:**
```json
{
  "error": {
    "code": "invalid_api_key",
    "message": "Invalid or expired API key."
  },
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/notifications/whatsapp"
}
```

**Insufficient Permissions:**
```json
{
  "error": {
    "code": "insufficient_permissions",
    "message": "API key does not have required permission: whatsapp:send"
  },
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/notifications/whatsapp"
}
```

**Validation Error:**
```json
{
  "error": {
    "code": "validation_error",
    "message": "WhatsApp recipient must be a valid phone number",
    "details": {
      "field": "recipient",
      "value": "invalid-phone"
    }
  },
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/notifications/whatsapp"
}
```

## Best Practices

1. **Store API Keys Securely**: Never expose API keys in client-side code or public repositories
2. **Handle Rate Limits**: Implement exponential backoff when rate limits are exceeded
3. **Error Handling**: Always check response status and handle errors appropriately
4. **Use HTTPS**: Always use HTTPS for API requests to ensure data security
5. **Monitor Usage**: Keep track of your API usage to avoid unexpected rate limit hits

## SDK Examples

### Node.js SDK Example

```javascript
class AnticNotificationClient {
  constructor(apiKey, baseUrl = 'https://your-domain.com/api') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async sendWhatsApp(recipient, message, metadata = {}) {
    return this.makeRequest('/notifications/whatsapp', {
      recipient,
      message,
      metadata
    });
  }

  async sendTelegram(recipient, message, metadata = {}) {
    return this.makeRequest('/notifications/telegram', {
      recipient,
      message,
      metadata
    });
  }

  async makeRequest(endpoint, data) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error.message}`);
    }

    return response.json();
  }
}

// Usage
const client = new AnticNotificationClient('ak_your_api_key_here');

// Send WhatsApp message
client.sendWhatsApp('+1234567890', 'Hello from ANTIC!')
  .then(result => console.log('WhatsApp sent:', result))
  .catch(error => console.error('Error:', error));

// Send Telegram message
client.sendTelegram('@username', 'Hello from ANTIC!')
  .then(result => console.log('Telegram sent:', result))
  .catch(error => console.error('Error:', error));
```

### Python SDK Example

```python
import requests
import json

class AnticNotificationClient:
    def __init__(self, api_key, base_url='https://your-domain.com/api'):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': api_key
        }

    def send_whatsapp(self, recipient, message, metadata=None):
        return self._make_request('/notifications/whatsapp', {
            'recipient': recipient,
            'message': message,
            'metadata': metadata or {}
        })

    def send_telegram(self, recipient, message, metadata=None):
        return self._make_request('/notifications/telegram', {
            'recipient': recipient,
            'message': message,
            'metadata': metadata or {}
        })

    def _make_request(self, endpoint, data):
        url = f"{self.base_url}{endpoint}"
        response = requests.post(url, headers=self.headers, json=data)
        
        if response.status_code != 200:
            error_data = response.json()
            raise Exception(f"API Error: {error_data['error']['message']}")
        
        return response.json()

# Usage
client = AnticNotificationClient('ak_your_api_key_here')

# Send WhatsApp message
try:
    result = client.send_whatsapp('+1234567890', 'Hello from ANTIC!')
    print('WhatsApp sent:', result)
except Exception as e:
    print('Error:', e)

# Send Telegram message
try:
    result = client.send_telegram('@username', 'Hello from ANTIC!')
    print('Telegram sent:', result)
except Exception as e:
    print('Error:', e)
```

## Webhook Integration (Future Feature)

Coming soon: Webhook support for delivery status notifications and message events.

## Support

For API support and questions, please contact your system administrator or check the admin dashboard for additional resources.