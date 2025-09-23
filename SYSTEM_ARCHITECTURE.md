# RAG System Architecture

## Admin-Centric Design

This system is organized around **Admin Codes** as the central organizing principle. Everything is related to admins through their unique admin codes.

```
Admin (admin user)
├── Admin Code (ADMIN001)
    ├── Users (registered under this code)
    │   ├── user1 (admin_code_id: 1)
    │   ├── user2 (admin_code_id: 1)
    │   └── user3 (admin_code_id: 1)
    ├── Assistants (owned by this admin)
    │   ├── Tax Expert (admin_code_id: 1)
    │   ├── Legal Advisor (admin_code_id: 1)
    │   └── Financial Planner (admin_code_id: 1)
    └── Conversations (all conversations from admin's users)
        ├── user1 ↔ Tax Expert
        ├── user2 ↔ Legal Advisor
        └── user3 ↔ Financial Planner
```

## Database Schema

### Core Tables
- **`admin_codes`**: Unique codes per admin (e.g., "ADMIN001")
- **`users`**: All users linked to admin via `admin_code_id`
- **`assistants`**: All assistants owned by admin via `admin_code_id`
- **`conversations`**: Track all user-assistant interactions
- **`conversation_messages`**: Individual messages with user attribution

### Relationships
- **Admin → Admin Code**: One-to-many (admin can have multiple codes)
- **Admin Code → Users**: One-to-many (users register under admin codes)
- **Admin Code → Assistants**: One-to-many (assistants belong to admin codes)
- **Users + Assistants → Conversations**: Many-to-many through conversations table

## Key Features

✅ **Admin Isolation**: Each admin only sees their own users, assistants, and conversations
✅ **User Attribution**: Every conversation shows which user wrote each message
✅ **Assistant Ownership**: Assistants belong to specific admins
✅ **Document Isolation**: Each assistant has its own document collection
✅ **Complete Monitoring**: Admins can view all conversations from their users

## API Endpoints

### Admin Code Management
- `POST /admin/codes` - Create registration codes
- `GET /admin/codes` - List admin's codes
- `GET /admin/codes/{code}/validate` - Validate registration code

### User Management
- `POST /auth/register?admin_code=ADMIN001` - Register user under admin code
- `POST /auth/login` - Login (returns user with admin_code_id)

### Assistant Management (Admin Only)
- `GET /assistants` - Get assistants (filtered by user's admin_code_id)
- `POST /assistants` - Create assistant (assigned to admin's admin_code_id)
- `PUT /assistants/{id}` - Update assistant
- `DELETE /assistants/{id}` - Delete assistant

### Conversation Monitoring (Admin Only)
- `GET /admin/conversations` - View all conversations from admin's users
- `GET /admin/conversations/{id}/messages` - View complete conversation history

## Example Flow

1. **Admin Registration**: New admin registers with existing admin code
2. **Code Creation**: Admin creates registration code "COMPANY123"
3. **User Registration**: Users register with "COMPANY123", linking them to admin
4. **Assistant Creation**: Admin creates assistants (Tax Expert, Legal Advisor)
5. **User Interaction**: Users chat with admin's assistants
6. **Admin Monitoring**: Admin views all conversations, sees which user wrote what

## Data Isolation

- **Users only see**: Assistants from their admin
- **Admins see**: All their users, assistants, and conversations
- **No cross-contamination**: Admin A cannot see Admin B's data
- **Document separation**: Each assistant has its own vector store collection