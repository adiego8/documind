#!/usr/bin/env python3
import argparse
import sys
from app.document_processor import DocumentProcessor
from app.vector_store import VectorStore
from app.rag_service import RAGService

def main():
    parser = argparse.ArgumentParser(description="RAG System CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Upload command
    upload_parser = subparsers.add_parser("upload", help="Upload documents")
    upload_parser.add_argument("path", help="File or directory path to upload")
    
    # Query command
    query_parser = subparsers.add_parser("query", help="Query the knowledge base")
    query_parser.add_argument("question", help="Question to ask")
    query_parser.add_argument("--results", "-n", type=int, default=5, help="Number of results to retrieve")
    
    # Stats command
    stats_parser = subparsers.add_parser("stats", help="Show database statistics")
    
    # Clear command
    clear_parser = subparsers.add_parser("clear", help="Clear all documents from database")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    try:
        if args.command == "upload":
            processor = DocumentProcessor()
            vector_store = VectorStore()
            
            import os
            if os.path.isfile(args.path):
                documents = processor.process_document(args.path)
                vector_store.add_documents(documents)
                print(f"Successfully uploaded {len(documents)} chunks from {args.path}")
            elif os.path.isdir(args.path):
                documents = processor.process_directory(args.path)
                vector_store.add_documents(documents)
                print(f"Successfully uploaded {len(documents)} chunks from directory {args.path}")
            else:
                print(f"Error: {args.path} is not a valid file or directory")
                sys.exit(1)
        
        elif args.command == "query":
            rag_service = RAGService()
            result = rag_service.query(args.question, args.results)
            
            print(f"Question: {args.question}")
            print(f"Answer: {result['answer']}")
            print(f"\nContext used: {result['context_used']}")
            
            if result['sources']:
                print(f"\nSources ({len(result['sources'])}):")
                for i, source in enumerate(result['sources'], 1):
                    print(f"  {i}. {source['source']} (chunk {source['chunk_id']}, similarity: {source['similarity_score']:.3f})")
                    print(f"     Preview: {source['content_preview']}")
        
        elif args.command == "stats":
            vector_store = VectorStore()
            count = vector_store.get_collection_count()
            print(f"Documents in database: {count}")
        
        elif args.command == "clear":
            vector_store = VectorStore()
            vector_store.delete_collection()
            print("All documents cleared from database")
    
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()