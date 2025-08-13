# Telegram (formerly GramJS) Node.js Documentation

## Installation

```bash
npm install telegram
# or
yarn add telegram
```

## Prerequisites

Before you start, you need:
1. **API ID and API Hash** from [my.telegram.org](https://my.telegram.org)
2. Your phone number registered with Telegram
3. Access to receive SMS/calls for verification

## Basic Setup

### 1. Import Required Modules

```javascript
const { TelegramApi } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const input = require('input'); // For user input during auth
```

### 2. Initialize Client

```javascript
const apiId = 123456; // Your API ID
const apiHash = 'your-api-hash'; // Your API Hash
const stringSession = new StringSession(''); // Empty string for first time

const client = new TelegramApi(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});
```

## Authentication

### First Time Setup (Generate Session)

```javascript
async function authenticate() {
    console.log('Loading interactive example...');
    await client.start({
        phoneNumber: async () => await input.text('Please enter your number: '),
        password: async () => await input.text('Please enter your password: '),
        phoneCode: async () => await input.text('Please enter the code you received: '),
        onError: (err) => console.log(err),
    });
    
    console.log('You should now be connected.');
    console.log('Save this string to avoid logging in again:');
    console.log(client.session.save()); // Save this string!
}
```

### Using Saved Session

```javascript
// Use the saved session string from previous authentication
const savedSession = 'your-saved-session-string-here';
const stringSession = new StringSession(savedSession);

const client = new TelegramApi(stringSession, apiId, apiHash, {});
await client.connect();
```

## Basic Operations

### Send Message

```javascript
async function sendMessage() {
    await client.sendMessage('username_or_chat_id', {
        message: 'Hello from Node.js!'
    });
}
```

### Send Message to Specific User/Chat

```javascript
// By username
await client.sendMessage('@username', { message: 'Hello!' });

// By phone number
await client.sendMessage('+1234567890', { message: 'Hello!' });

// By chat ID
await client.sendMessage(-1001234567890, { message: 'Hello group!' });
```

### Get Chat/User Entity

```javascript
async function getEntity() {
    const entity = await client.getEntity('@username');
    console.log(entity);
    return entity;
}
```

### Send File

```javascript
async function sendFile() {
    await client.sendFile('@username', {
        file: './path/to/file.jpg',
        caption: 'Check out this image!'
    });
}
```

### Get Message History

```javascript
async function getMessages() {
    const messages = await client.getMessages('@username', {
        limit: 10
    });
    
    messages.forEach(msg => {
        console.log(`${msg.date}: ${msg.message}`);
    });
}
```

## Event Handling

### Listen for New Messages

```javascript
client.addEventHandler((event) => {
    const message = event.message;
    console.log('New message:', message.message);
    console.log('From:', message.senderId);
}, new NewMessage({}));
```

### Filter Events

```javascript
// Only messages from specific chats
client.addEventHandler((event) => {
    console.log('Message from specific chat:', event.message.message);
}, new NewMessage({ chats: ['@specific_username'] }));

// Only private messages
client.addEventHandler((event) => {
    console.log('Private message:', event.message.message);
}, new NewMessage({ incoming: true, outgoing: false }));
```

## Complete Example

```javascript
const { TelegramApi } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const input = require('input');

const apiId = 123456; // Replace with your API ID
const apiHash = 'your-api-hash'; // Replace with your API Hash

async function main() {
    // Use saved session or empty string for first time
    const stringSession = new StringSession('your-saved-session-or-empty');
    
    const client = new TelegramApi(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });

    console.log('Loading interactive example...');
    
    // Start the client
    await client.start({
        phoneNumber: async () => await input.text('Please enter your number: '),
        password: async () => await input.text('Please enter your password: '),
        phoneCode: async () => await input.text('Please enter the code you received: '),
        onError: (err) => console.log(err),
    });

    console.log('You should now be connected.');
    
    // Save session for future use
    if (!stringSession.save()) {
        console.log('Session string:', client.session.save());
    }

    // Send a message
    await client.sendMessage('@username', {
        message: 'Hello from my Node.js script!'
    });

    // Listen for new messages
    client.addEventHandler((event) => {
        console.log('Received:', event.message.message);
    }, new NewMessage({}));

    console.log('Listening for messages...');
}

main().catch(console.error);
```

## Advanced Features

### Working with Channels/Groups

```javascript
// Get channel info
const channel = await client.getEntity('@channel_username');

// Send to channel (if you're admin)
await client.sendMessage(channel, { message: 'Broadcasting...' });

// Get channel members
const participants = await client.getParticipants(channel);
```

### Message Formatting

```javascript
// Send formatted message
await client.sendMessage('@username', {
    message: '**Bold text** and __italic text__',
    parseMode: 'md' // or 'html'
});

// With entities
await client.sendMessage('@username', {
    message: 'Check this link: google.com',
    linkPreview: false
});
```

### Download Files

```javascript
async function downloadFile(message) {
    if (message.media) {
        const buffer = await client.downloadMedia(message);
        require('fs').writeFileSync('downloaded_file', buffer);
    }
}
```

## Error Handling

```javascript
try {
    await client.sendMessage('@username', { message: 'Test' });
} catch (error) {
    if (error.message.includes('USER_DEACTIVATED')) {
        console.log('User account is deactivated');
    } else if (error.message.includes('CHAT_WRITE_FORBIDDEN')) {
        console.log('Cannot write to this chat');
    } else {
        console.error('Unknown error:', error);
    }
}
```

## Important Notes

1. **Session String**: Always save your session string after first authentication to avoid re-authentication
2. **Rate Limits**: Telegram has rate limits - don't send messages too quickly
3. **Privacy**: This accesses your personal Telegram account - be careful with credentials
4. **2FA**: If you have two-factor authentication enabled, you'll need to provide your password
5. **Phone Verification**: First-time setup requires phone number verification

## Common Issues

- **FloodWaitError**: You're sending messages too fast
- **AuthKeyUnregisteredError**: Your session expired, need to re-authenticate  
- **PhoneNumberInvalidError**: Check your phone number format
- **SessionPasswordNeededError**: Account has 2FA enabled, provide password

## Resources

- [Official MTProto Documentation](https://core.telegram.org/mtproto)
- [Telegram API Methods](https://core.telegram.org/methods)
- [GramJS Documentation](https://gram.js.org/)