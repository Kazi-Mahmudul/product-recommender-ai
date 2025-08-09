"""
Contextual Integration Service - Ties all enhanced components together
"""

import logging
import time
import uuid
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from app.services.contextual_query_processor import ContextualQueryProcessor
from app.services.phone_name_resolver import PhoneNameResolver
from app.services.context_manager import ContextManager
from app.services.contextual_filter_generator import ContextualFilterGenerator
from app.services.contextual_response_formatter import ContextualResponseFormatter
from app.models.contextual_models import (
    ContextualResponse, QueryAnalytics, QueryType,
    create_contextual_response
)

logger = logging.getLogger(__name__)

class ContextualIntegrationService:
    """
    Main integration service that orchestrates all contextual query components
    """
    
    def __init__(self):
        """Initialize the integration service with all components"""
        self.query_processor = ContextualQueryProcessor()
        self.phone_resolver = PhoneNameResolver()
        self.context_manager = ContextManager()
        self.filter_generator = ContextualFilterGenerator()
        self.response_formatter = ContextualResponseFormatter()
        
        # Performance tracking
        self.query_analytics = []
        
        logger.info("Contextual Integration Service initialized")
    
    async def process_contextual_query(
        self,
        db: Session,
        query: str,
        session_id: Optional[str] = None,
        context_data: Optional[Dict[str, Any]] = None
    ) -> ContextualResponse:
        """
        Main entry point for processing contextual queries
        
        Args:
            db: Database session
            query: Natural language query
            session_id: Optional session ID for context management
            context_data: Optional additional context data
            
        Returns:
            ContextualResponse with formatted results
        """
        start_time = time.time()
        query_id = str(uuid.uuid4())
        session_id = session_id or str(uuid.uuid4())
        
        try:
            logger.info(f"Processing contextual query: '{query}' (ID: {query_id})")
            
            # Step 1: Initialize processor with session
            processor = ContextualQueryProcessor(session_id=session_id)
            
            # Step 2: Process the query using enhanced processing
            processing_result = processor.process_contextual_query_enhanced(
                db, query, session_id
            )
            
            # Step 3: Format the response based on type
            formatted_response = await self._format_response_by_type(
                processing_result, db
            )
            
            # Step 4: Calculate processing time and confidence
            processing_time = time.time() - start_time
            confidence = processing_result.get('confidence', 0.0)
            
            # Step 5: Create contextual response
            contextual_response = create_contextual_response(
                response_type=formatted_response.get('type', 'unknown'),
                data=formatted_response,
                processing_time=processing_time,
                confidence=confidence,
                session_id=session_id
            )
            
            # Step 6: Add metadata
            contextual_response.metadata = {
                'query_id': query_id,
                'enhanced_processing': processing_result.get('enhanced_processing', False),
                'phone_count': len(processing_result.get('resolved_phones', [])),
                'has_context': bool(context_data),
                'processing_steps': [
                    'query_parsing',
                    'phone_resolution',
                    'intent_classification',
                    'filter_generation',
                    'response_formatting'
                ]
            }
            
            # Step 7: Record analytics
            self._record_query_analytics(
                query_id, session_id, query, processing_result, 
                processing_time, confidence, success=True
            )
            
            logger.info(f"Successfully processed query {query_id} in {processing_time:.3f}s")
            return contextual_response
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Error processing contextual query {query_id}: {e}")
            
            # Record failed analytics
            self._record_query_analytics(
                query_id, session_id, query, {}, 
                processing_time, 0.0, success=False, error_type=str(type(e).__name__)
            )
            
            # Return error response
            error_response = self.response_formatter.format_error_response(
                "processing_error",
                f"I encountered an error processing your query: {str(e)}",
                [
                    "Try rephrasing your question",
                    "Check if the phone names are spelled correctly",
                    "Try a simpler query"
                ]
            )
            
            return create_contextual_response(
                response_type="error",
                data=error_response,
                processing_time=processing_time,
                confidence=0.0,
                session_id=session_id
            )
    
    async def _format_response_by_type(
        self, 
        processing_result: Dict[str, Any], 
        db: Session
    ) -> Dict[str, Any]:
        """Format response based on the processing result type"""
        response_type = processing_result.get('type', 'unknown')
        
        try:
            if response_type == 'comparison':
                return self._format_comparison_response(processing_result)
            elif response_type == 'alternative':
                return self._format_alternative_response(processing_result)
            elif response_type == 'specification':
                return self._format_specification_response(processing_result)
            elif response_type == 'recommendation':
                return self._format_recommendation_response(processing_result)
            else:
                # Return the processing result as-is for unknown types
                return processing_result
                
        except Exception as e:
            logger.error(f"Error formatting response of type {response_type}: {e}")
            return processing_result
    
    def _format_comparison_response(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Format comparison response using the response formatter"""
        phones = result.get('phones', [])
        focus_area = result.get('focus_area')
        
        return self.response_formatter.format_comparison_response(
            phones, focus_area=focus_area
        )
    
    def _format_alternative_response(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Format alternative response using the response formatter"""
        alternatives = result.get('alternatives', [])
        reference_phone = result.get('reference_phone', {})
        criteria = result.get('criteria', {})
        
        return self.response_formatter.format_alternative_response(
            alternatives, reference_phone, criteria
        )
    
    def _format_specification_response(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Format specification response using the response formatter"""
        phones = result.get('phones', [])
        focus_area = result.get('focus_area')
        
        if phones:
            # For specification queries, format the first phone
            return self.response_formatter.format_specification_response(
                phones[0], 
                requested_features=[focus_area] if focus_area else None
            )
        else:
            return self.response_formatter.format_error_response(
                "no_phone_data",
                "No phone data available for specifications"
            )
    
    def _format_recommendation_response(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Format recommendation response"""
        # For recommendations, we'll return the result as-is since it's already formatted
        # by the query processor, but we can enhance it with additional metadata
        
        recommendations = result.get('recommendations', [])
        reference_phone = result.get('reference_phone')
        relationship = result.get('relationship')
        focus_area = result.get('focus_area')
        
        # Add enhanced metadata
        enhanced_result = result.copy()
        enhanced_result['metadata'] = {
            'recommendation_count': len(recommendations),
            'has_reference_phone': bool(reference_phone),
            'relationship_type': relationship,
            'focus_area': focus_area,
            'contextual': True
        }
        
        return enhanced_result
    
    def _record_query_analytics(
        self,
        query_id: str,
        session_id: str,
        query_text: str,
        processing_result: Dict[str, Any],
        processing_time: float,
        confidence: float,
        success: bool,
        error_type: Optional[str] = None
    ) -> None:
        """Record analytics for the query"""
        try:
            # Determine query type
            query_type_str = processing_result.get('type', 'unknown')
            try:
                query_type = QueryType(query_type_str)
            except ValueError:
                query_type = QueryType.RECOMMENDATION  # Default fallback
            
            # Count phones
            phone_count = len(processing_result.get('resolved_phones', []))
            if phone_count == 0:
                phone_count = len(processing_result.get('phones', []))
            if phone_count == 0:
                phone_count = len(processing_result.get('recommendations', []))
            
            # Create analytics record
            analytics = QueryAnalytics(
                query_id=query_id,
                session_id=session_id,
                query_text=query_text,
                query_type=query_type,
                processing_time=processing_time,
                confidence=confidence,
                phone_count=phone_count,
                success=success,
                error_type=error_type
            )
            
            # Store in memory (in production, this would go to a database)
            self.query_analytics.append(analytics)
            
            # Keep only last 1000 analytics records to prevent memory issues
            if len(self.query_analytics) > 1000:
                self.query_analytics = self.query_analytics[-1000:]
                
        except Exception as e:
            logger.error(f"Error recording query analytics: {e}")
    
    def get_session_context(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get conversation context for a session"""
        try:
            context = self.context_manager.get_context(session_id)
            return context.to_dict() if context else None
        except Exception as e:
            logger.error(f"Error getting session context: {e}")
            return None
    
    def clear_session_context(self, session_id: str) -> bool:
        """Clear conversation context for a session"""
        try:
            self.context_manager.delete_context(session_id)
            return True
        except Exception as e:
            logger.error(f"Error clearing session context: {e}")
            return False
    
    def get_analytics_summary(self) -> Dict[str, Any]:
        """Get analytics summary"""
        try:
            if not self.query_analytics:
                return {
                    "total_queries": 0,
                    "success_rate": 0.0,
                    "average_processing_time": 0.0,
                    "average_confidence": 0.0
                }
            
            total_queries = len(self.query_analytics)
            successful_queries = sum(1 for a in self.query_analytics if a.success)
            success_rate = successful_queries / total_queries if total_queries > 0 else 0.0
            
            avg_processing_time = sum(a.processing_time for a in self.query_analytics) / total_queries
            avg_confidence = sum(a.confidence for a in self.query_analytics) / total_queries
            
            # Query type distribution
            query_type_counts = {}
            for analytics in self.query_analytics:
                query_type = analytics.query_type.value
                query_type_counts[query_type] = query_type_counts.get(query_type, 0) + 1
            
            return {
                "total_queries": total_queries,
                "successful_queries": successful_queries,
                "success_rate": success_rate,
                "average_processing_time": avg_processing_time,
                "average_confidence": avg_confidence,
                "query_type_distribution": query_type_counts,
                "recent_queries": [
                    {
                        "query_id": a.query_id,
                        "query_text": a.query_text[:50] + "..." if len(a.query_text) > 50 else a.query_text,
                        "query_type": a.query_type.value,
                        "success": a.success,
                        "processing_time": a.processing_time,
                        "confidence": a.confidence
                    }
                    for a in self.query_analytics[-10:]  # Last 10 queries
                ]
            }
            
        except Exception as e:
            logger.error(f"Error generating analytics summary: {e}")
            return {"error": str(e)}
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check on all components"""
        health_status = {
            "status": "healthy",
            "components": {},
            "timestamp": time.time()
        }
        
        try:
            # Check query processor
            health_status["components"]["query_processor"] = {
                "status": "healthy" if self.query_processor else "error",
                "initialized": bool(self.query_processor)
            }
            
            # Check phone resolver
            health_status["components"]["phone_resolver"] = {
                "status": "healthy" if self.phone_resolver else "error",
                "initialized": bool(self.phone_resolver)
            }
            
            # Check context manager
            health_status["components"]["context_manager"] = {
                "status": "healthy" if self.context_manager else "error",
                "initialized": bool(self.context_manager)
            }
            
            # Check filter generator
            health_status["components"]["filter_generator"] = {
                "status": "healthy" if self.filter_generator else "error",
                "initialized": bool(self.filter_generator)
            }
            
            # Check response formatter
            health_status["components"]["response_formatter"] = {
                "status": "healthy" if self.response_formatter else "error",
                "initialized": bool(self.response_formatter)
            }
            
            # Overall status
            all_healthy = all(
                comp["status"] == "healthy" 
                for comp in health_status["components"].values()
            )
            health_status["status"] = "healthy" if all_healthy else "degraded"
            
        except Exception as e:
            logger.error(f"Error during health check: {e}")
            health_status["status"] = "error"
            health_status["error"] = str(e)
        
        return health_status

# Global instance for easy access
contextual_integration_service = ContextualIntegrationService()