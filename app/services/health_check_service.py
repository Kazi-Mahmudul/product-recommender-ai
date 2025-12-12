"""
Health Check Service - Comprehensive health monitoring for all system components.

This service provides detailed health checks for all critical system dependencies
including database, AI services, and internal components.
"""

import asyncio
import time
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
import httpx

from app.core.config import settings
from app.core.database import get_db, engine, current_db_type

logger = logging.getLogger(__name__)


class HealthCheckService:
    """
    Comprehensive health check service for all system components.
    """
    
    def __init__(self):
        self.timeout = 5.0
        self.max_retries = 2
        
    async def check_all_services(self) -> Dict[str, Any]:
        """
        Check health of all system services.
        
        Returns:
            Dict containing health status of all services
        """
        health_results = {
            "status": "healthy",
            "timestamp": time.time(),
            "services": {},
            "overall_health": True
        }
        
        # Run all health checks concurrently
        checks = [
            self._check_database(),
            self._check_gemini_ai_service(),
            self._check_chat_services(),
            self._check_knowledge_services()
        ]
        
        try:
            results = await asyncio.gather(*checks, return_exceptions=True)
            
            # Process results
            service_names = ["database", "gemini_ai", "chat_services", "knowledge_services"]
            for i, result in enumerate(results):
                service_name = service_names[i]
                
                if isinstance(result, Exception):
                    health_results["services"][service_name] = {
                        "status": "error",
                        "error": str(result),
                        "healthy": False
                    }
                    health_results["overall_health"] = False
                else:
                    health_results["services"][service_name] = result
                    if not result.get("healthy", False):
                        health_results["overall_health"] = False
            
            # Determine overall status
            if not health_results["overall_health"]:
                health_results["status"] = "degraded"
                
        except Exception as e:
            logger.error(f"Error during health check: {str(e)}")
            health_results["status"] = "error"
            health_results["overall_health"] = False
            health_results["error"] = str(e)
        
        return health_results
    
    async def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity and basic functionality."""
        try:
            start_time = time.time()
            
            if current_db_type == "dummy":
                return {
                    "status": "dummy",
                    "healthy": False,
                    "message": "Using dummy database - not suitable for production",
                    "response_time": 0
                }
            
            # Test basic connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                
                # Test phones table
                try:
                    result = conn.execute(text("SELECT COUNT(*) FROM phones LIMIT 1"))
                    phone_count = result.scalar()
                    
                    # Test if we have reasonable data
                    if phone_count == 0:
                        return {
                            "status": "warning",
                            "healthy": True,
                            "message": "Database connected but no phone data found",
                            "phone_count": 0,
                            "response_time": time.time() - start_time
                        }
                    
                    return {
                        "status": "healthy",
                        "healthy": True,
                        "phone_count": phone_count,
                        "response_time": time.time() - start_time,
                        "database_type": current_db_type
                    }
                    
                except Exception as table_error:
                    return {
                        "status": "error",
                        "healthy": False,
                        "error": f"Phones table issue: {str(table_error)}",
                        "response_time": time.time() - start_time
                    }
                    
        except Exception as e:
            return {
                "status": "error",
                "healthy": False,
                "error": str(e),
                "response_time": time.time() - time.time()
            }
    
    async def _check_gemini_ai_service(self) -> Dict[str, Any]:
        """Check external Gemini AI service connectivity."""
        try:
            start_time = time.time()
            ai_service_url = settings.GEMINI_SERVICE_URL_SECURE
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Try health endpoint first
                try:
                    response = await client.get(f"{ai_service_url}/health")
                    response_time = time.time() - start_time
                    
                    if response.status_code == 200:
                        return {
                            "status": "healthy",
                            "healthy": True,
                            "url": ai_service_url,
                            "response_time": response_time,
                            "status_code": response.status_code
                        }
                    else:
                        return {
                            "status": "error",
                            "healthy": False,
                            "url": ai_service_url,
                            "response_time": response_time,
                            "status_code": response.status_code,
                            "error": f"Service returned status {response.status_code}"
                        }
                        
                except httpx.HTTPStatusError as e:
                    return {
                        "status": "error",
                        "healthy": False,
                        "url": ai_service_url,
                        "response_time": time.time() - start_time,
                        "error": f"HTTP error: {e.response.status_code}"
                    }
                    
        except httpx.TimeoutException:
            return {
                "status": "error",
                "healthy": False,
                "url": settings.GEMINI_SERVICE_URL_SECURE,
                "response_time": time.time() - start_time,
                "error": "Service timeout"
            }
        except httpx.ConnectError:
            return {
                "status": "error",
                "healthy": False,
                "url": settings.GEMINI_SERVICE_URL_SECURE,
                "response_time": time.time() - start_time,
                "error": "Connection failed - service may be down"
            }
        except Exception as e:
            return {
                "status": "error",
                "healthy": False,
                "url": settings.GEMINI_SERVICE_URL_SECURE,
                "response_time": time.time() - start_time,
                "error": str(e)
            }
    
    async def _check_chat_services(self) -> Dict[str, Any]:
        """Check chat service components."""
        try:
            # Test service imports and initialization
            from app.services.gemini_rag_service import GeminiRAGService
            from app.services.response_formatter import ResponseFormatterService
            
            # Test service initialization
            gemini_service = GeminiRAGService()
            formatter_service = ResponseFormatterService()
            
            # Test basic functionality
            test_query = "test health check"
            response_type = await gemini_service.determine_response_type(test_query)
            
            return {
                "status": "healthy",
                "healthy": True,
                "components": {
                    "gemini_rag_service": "initialized",
                    "response_formatter": "initialized"
                },
                "test_response_type": response_type
            }
            
        except Exception as e:
            return {
                "status": "error",
                "healthy": False,
                "error": f"Chat service initialization failed: {str(e)}"
            }
    
    async def _check_knowledge_services(self) -> Dict[str, Any]:
        """Check knowledge retrieval services."""
        try:
            from app.services.knowledge_retrieval import KnowledgeRetrievalService
            
            # Test service initialization only - no database queries
            knowledge_service = KnowledgeRetrievalService()
            
            return {
                "status": "healthy",
                "healthy": True,
                "components": {
                    "knowledge_retrieval_service": "initialized"
                }
            }
                
        except Exception as e:
            return {
                "status": "error",
                "healthy": False,
                "error": f"Knowledge service initialization failed: {str(e)}"
            }
    
    async def check_service_specific(self, service_name: str) -> Dict[str, Any]:
        """
        Check health of a specific service.
        
        Args:
            service_name: Name of service to check
            
        Returns:
            Dict containing service health status
        """
        if service_name == "database":
            return await self._check_database()
        elif service_name == "gemini_ai":
            return await self._check_gemini_ai_service()
        elif service_name == "chat_services":
            return await self._check_chat_services()
        elif service_name == "knowledge_services":
            return await self._check_knowledge_services()
        else:
            return {
                "status": "error",
                "healthy": False,
                "error": f"Unknown service: {service_name}"
            }