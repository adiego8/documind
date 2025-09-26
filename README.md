# RAG System with Chat Interface

A comprehensive Retrieval Augmented Generation (RAG) system with a modern React frontend and FastAPI backend, featuring authentication, role-based access, and real-time chat functionality.

## 🚀 Features

### Core Functionality
- 🔐 **Authentication System**: Login/Register with role-based access (Admin/User)
- 💬 **Real-time Chat Interface**: Interactive chat with AI assistant
- 📄 **Document Management**: Upload and manage documents (Admin only)
- ⚙️ **Assistant Configuration**: Customize assistant behavior and personality (Admin only)
- 📊 **Statistics Dashboard**: View document and usage statistics
- 💾 **Chat History**: Persistent chat sessions and message history
- 🔍 **Source Citations**: View document sources for AI responses

### Technical Features
- **Local Vector Database**: ChromaDB for fast, local document storage and retrieval
- **Multiple Document Formats**: Support for PDF, DOCX, and TXT files
- **OpenAI Integration**: Uses OpenAI API for embeddings and text generation
- **Modern UI**: React with Material-UI components
- **State Management**: Redux Toolkit for frontend state
- **JWT Authentication**: Secure token-based authentication
- **Database**: SQLAlchemy with SQLite for user and session data

## 📋 Prerequisites

- Python 3.9+
- Node.js 16+
- Docker & Docker Compose
- OpenAI API key

## 🛠️ Quick Setup

1. **Create virtual environment**:
   ```bash
   make create-venv
   source .venv/bin/activate
   ```

2. **Install all dependencies**:
   ```bash
   make setup
   ```

3. **Setup PostgreSQL database**:
   ```bash
   make start-db
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI API key and database settings
   ```

## 🚀 Running the Application

### Using Makefile (Recommended)

See all available commands:
```bash
make help
```

Start the application (requires 3 terminals):
```bash
# Terminal 1 - Database
make start-db

# Terminal 2 - Backend  
make run-backend

# Terminal 3 - Frontend
make run-frontend
```

### Manual Commands

If you prefer to run manually:
```bash
# Database
docker-compose up -d postgres

# Backend
source .venv/bin/activate
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm start
```

## 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080  
- **API Documentation**: http://localhost:8080/docs
- **Database Admin (Adminer)**: http://localhost:8081

## 🔑 Default Credentials

- **Admin**: username: `admin`, password: `admin123`
- **Database (Adminer)**: Server=`postgres`, Username=`postgres`, Password=`postgres`, Database=`ragdb`

## 💡 How to Use

### For Admins

1. **Login** with admin credentials at http://localhost:3000
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

### CLI Interface (Optional)

The system also includes a CLI for batch operations:

```bash
# Upload documents
python cli.py upload /path/to/document.pdf
python cli.py upload /path/to/documents/directory

# Query the knowledge base
python cli.py query "What is the main topic of the document?"
python cli.py query "Explain the key concepts" --results 10

# Check database stats
python cli.py stats

# Clear all documents
python cli.py clear
```

## 🛠️ Database Management

### Using Adminer (Web Interface)
```bash
make start-adminer
# Visit http://localhost:8080
# Login: Server=postgres, Username=postgres, Password=postgres, Database=ragdb
```

### Using Command Line
```bash
# View database logs
make db-logs

# Access PostgreSQL directly
docker exec -it rag_postgres psql -U postgres -d ragdb

# Reset database (WARNING: Deletes all data)
make reset-db
```

### Available Tables
- `users` - User accounts and authentication
- `assistant_config` - AI assistant configuration  
- `chat_sessions` - Chat session metadata
- `chat_messages` - Individual chat messages with sources

## 🔌 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login

### Chat Interface  
- `POST /chat/session` - Create new chat session
- `GET /chat/sessions` - Get user's chat sessions
- `POST /chat/message` - Send message to assistant
- `GET /chat/session/{id}/history` - Get chat history

### Assistant Configuration (Admin only)
- `GET /assistant/config` - Get current configuration
- `PUT /assistant/config` - Update assistant configuration

### Document Management (Admin only)
- `POST /upload` - Upload multiple files
- `POST /upload-directory` - Process entire directory  
- `GET /stats` - Get database statistics
- `DELETE /documents` - Clear all documents

### Legacy Endpoints
- `GET /` - Basic web interface (old)
- `POST /query` - Direct query endpoint (old)

## Configuration

Edit `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
CHROMA_PERSIST_DIRECTORY=./chroma_db
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
EMBEDDING_MODEL=text-embedding-3-small
LLM_MODEL=gpt-3.5-turbo
MAX_TOKENS=1000
TEMPERATURE=0.7
```

## Architecture

- **Document Processing**: Extracts text and splits into chunks
- **Vector Storage**: ChromaDB stores embeddings locally
- **Embeddings**: OpenAI's text-embedding-3-small model
- **Generation**: OpenAI's GPT models for answering questions
- **Retrieval**: Cosine similarity search for relevant chunks

## Supported File Types

- **PDF**: Extracted using PyPDF2
- **DOCX**: Extracted using python-docx
- **TXT**: Plain text files

## 🎨 UI Design & Branding

### Typography & Fonts

The application uses custom Google Fonts for premium branding:

- **Primary Brand Font**: [Orbitron](https://fonts.google.com/specimen/Orbitron) - A futuristic, tech-focused monospace font used for the DOCUMIND logo and main branding
- **Supporting Font**: [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) - A clean, modern sans-serif font for supporting text and descriptions

### DOCUMIND Logo Styling

#### Login Form
```css
fontFamily: 'Orbitron, monospace'
fontSize: { xs: '1.5rem', sm: '1.8rem' }
fontWeight: 700
background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
WebkitBackgroundClip: 'text'
WebkitTextFillColor: 'transparent'
letterSpacing: '0.1em'
textShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
```

#### Header Navigation
```css
fontFamily: 'Orbitron, monospace'
fontSize: { xs: '1rem', sm: '1.4rem' }
fontWeight: 700
background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)'
WebkitBackgroundClip: 'text'
WebkitTextFillColor: 'transparent'
letterSpacing: '0.08em'
filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
```

### Design System

- **Primary Gradient**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` - Used throughout the app for buttons, branding, and accents
- **Glass Morphism**: Subtle backdrop filters and transparent backgrounds for modern UI elements
- **Shadow Effects**: Consistent drop shadows and text shadows for depth and readability
- **Responsive Typography**: Font sizes and spacing adapt to different screen sizes

The branding creates a premium, tech-forward appearance that emphasizes AI and document intelligence capabilities.

### Custom Dialog System

The application uses a custom dialog system instead of browser alerts/confirms for better user experience:

- **CustomDialog Component**: Reusable dialog with consistent styling and animations
- **useCustomDialog Hook**: Easy-to-use hook for showing alerts, confirmations, and notifications
- **Dialog Types**: `info`, `warning`, `error`, `success`, `confirm` with appropriate icons and colors
- **Modern Styling**: Glass morphism effects, gradients, and smooth animations
- **Responsive Design**: Adapts to different screen sizes

```javascript
// Usage example
const { showAlert, showConfirm, showError } = useCustomDialog();

// Show alert
await showAlert('Operation completed successfully', 'Success');

// Show confirmation
const confirmed = await showConfirm('Delete this item?', 'Confirm Delete');
if (confirmed) {
  // User confirmed
}

// Show error
await showError('Something went wrong', 'Error');
```

## Privacy & Local Operation

- Documents and embeddings stored locally in ChromaDB
- Only queries and text chunks sent to OpenAI API
- No document content stored remotely
- Full control over your data