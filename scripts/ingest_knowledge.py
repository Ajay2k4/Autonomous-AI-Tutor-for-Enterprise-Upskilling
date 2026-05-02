from services.knowledge_service import KnowledgeService
import sys

def main():
    print("Initializing Knowledge Ingestion...")
    service = KnowledgeService()
    
    try:
        service.ingest_documents()
        print("\nIngestion completed successfully.")
    except Exception as e:
        print(f"\nError during ingestion: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
