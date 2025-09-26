# RAG System with Chat Interface

A comprehensive RAG (Retrieval-Augmented Generation) system with a modern React frontend and FastAPI backend, featuring authentication, role-based access, and real-time chat functionality.

## Features

### User Roles
- **Admin**: Full access to document management, assistant configuration, and chat
- **User**: Access to chat interface only

### Core Functionality
- 🔐 **Authentication System**: Login/Register with role-based access
- 💬 **Real-time Chat**: Interactive chat interface with the AI assistant
- 📄 **Document Management**: Upload and manage documents (Admin only)
- ⚙️ **Assistant Configuration**: Customize assistant behavior (Admin only)
- 📊 **Statistics**: View document and usage statistics
- 💾 **Chat History**: Persistent chat sessions and message history
- 🔍 **Source Citations**: View document sources for AI responses

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- OpenAI API key

### Setup

1. **Configure Environment**:
   ```bash
   # Copy and update environment variables
   cp .env.example .env
   # Add your OpenAI API key to .env
   ```

2. **Backend Setup**:
   ```bash
   # Install Python dependencies
   source .venv/bin/activate
   pip install -r requirements.txt
   
   # Start the backend server
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
   ```

3. **Frontend Setup**:
   ```bash
   # Install and start React app
   cd frontend
   npm install
   npm start
   ```

4. **Access the Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - API Documentation: http://localhost:8080/docs

### Default Credentials
- **Admin**: username: `admin`, password: `admin123`

## Usage Guide

### For Admins

1. **Login** with admin credentials
2. **Configure Assistant** in the Admin Dashboard:
   - Set assistant name and personality
   - Adjust temperature and response length
   - Define initial context/instructions
3. **Upload Documents**:
   - Navigate to Document Management tab
   - Upload PDF, DOCX, or TXT files
   - View document statistics
4. **Use Chat**: Switch to chat interface to test the assistant

### For Users

1. **Register** a new user account or **Login**
2. **Start Chatting**: Begin asking questions to the assistant
3. **View Sources**: Expand source citations to see document references
4. **Session History**: Each conversation is saved as a session

## Architecture

### Backend (FastAPI)
- **Authentication**: JWT-based with bcrypt password hashing
- **Database**: SQLAlchemy with SQLite (configurable)
- **Vector Store**: ChromaDB for document embeddings
- **AI Integration**: OpenAI GPT models via LangChain

### Frontend (React)
- **State Management**: Redux Toolkit
- **UI Framework**: Material-UI
- **Routing**: React Router
- **HTTP Client**: Axios

### Key Components
- `app/models.py`: Database models
- `app/auth.py`: Authentication logic
- `app/main.py`: API endpoints
- `frontend/src/store/`: Redux store and slices
- `frontend/src/components/`: React components

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login

### Assistant Configuration
- `GET /assistant/config` - Get current configuration
- `PUT /assistant/config` - Update configuration (Admin only)

### Chat
- `POST /chat/session` - Create new chat session
- `GET /chat/sessions` - Get user's chat sessions
- `POST /chat/message` - Send message
- `GET /chat/session/{id}/history` - Get chat history

### Documents
- `POST /upload` - Upload documents (Admin only)
- `GET /stats` - Get document statistics
- `DELETE /documents` - Clear all documents (Admin only)

## Customization

### Adding New Document Types
Extend `document_processor.py` to support additional file formats.

### UI Themes
Modify the Material-UI theme in `App.js`.

### AI Models
Update `config.py` to use different OpenAI models or providers.

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure virtual environment is activated
2. **Port Conflicts**: Change ports in startup commands
3. **CORS Issues**: Update CORS origins in `main.py`
4. **API Key**: Verify OpenAI API key in `.env` file

### Development

Start both servers in development mode:
```bash
# Terminal 1 - Backend
source .venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 - Frontend  
cd frontend
npm start
```

The React app will automatically proxy API requests to the FastAPI backend.