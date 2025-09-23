import os
from typing import List, Dict, Any
from pathlib import Path
import PyPDF2
import docx
from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.config import settings

class DocumentProcessor:
    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            length_function=len,
        )
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        text = ""
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text
    
    def extract_text_from_docx(self, file_path: str) -> str:
        doc = docx.Document(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    
    def extract_text_from_txt(self, file_path: str) -> str:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    
    def extract_text(self, file_path: str) -> str:
        file_extension = Path(file_path).suffix.lower()
        
        if file_extension == '.pdf':
            return self.extract_text_from_pdf(file_path)
        elif file_extension == '.docx':
            return self.extract_text_from_docx(file_path)
        elif file_extension == '.txt':
            return self.extract_text_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_extension}")
    
    def chunk_text(self, text: str) -> List[str]:
        return self.text_splitter.split_text(text)
    
    def process_document(self, file_path: str, document_id_prefix: str = None, original_filename: str = None) -> List[Dict[str, Any]]:
        text = self.extract_text(file_path)
        chunks = self.chunk_text(text)
        
        # Use original filename if provided, otherwise extract from file_path
        filename = original_filename or Path(file_path).name
        
        documents = []
        for i, chunk in enumerate(chunks):
            metadata = {
                "source": file_path,
                "original_filename": filename,
                "chunk_id": i,
                "total_chunks": len(chunks)
            }
            
            # Add document_id_prefix for tracking original file
            if document_id_prefix:
                metadata["document_id_prefix"] = document_id_prefix
                metadata["chunk_document_id"] = f"{document_id_prefix}_chunk_{i}"
            
            documents.append({
                "content": chunk,
                "metadata": metadata
            })
        
        return documents
    
    def process_directory(self, directory_path: str) -> List[Dict[str, Any]]:
        all_documents = []
        supported_extensions = ['.pdf', '.docx', '.txt']
        
        for root, dirs, files in os.walk(directory_path):
            for file in files:
                if any(file.lower().endswith(ext) for ext in supported_extensions):
                    file_path = os.path.join(root, file)
                    try:
                        documents = self.process_document(file_path)
                        all_documents.extend(documents)
                    except Exception as e:
                        print(f"Error processing {file_path}: {str(e)}")
        
        return all_documents