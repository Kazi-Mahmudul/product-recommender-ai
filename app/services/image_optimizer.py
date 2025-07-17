import logging
from typing import Dict, Optional, Tuple
import re
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

logger = logging.getLogger(__name__)

class ImageOptimizer:
    """Service for optimizing image URLs for different contexts"""
    
    # Common image CDNs and their optimization parameters
    CDN_PATTERNS = {
        # Cloudinary
        r'res\.cloudinary\.com': {
            'width': 'w_{width}',
            'height': 'h_{height}',
            'quality': 'q_{quality}',
            'format': 'f_{format}',
        },
        # Imgix
        r'imgix\.net': {
            'width': 'w={width}',
            'height': 'h={height}',
            'quality': 'q={quality}',
            'format': 'fm={format}',
        },
        # Cloudfront
        r'cloudfront\.net': {
            'width': 'width={width}',
            'height': 'height={height}',
            'quality': 'quality={quality}',
            'format': 'format={format}',
        },
        # Default (query parameters)
        'default': {
            'width': 'width={width}',
            'height': 'height={height}',
            'quality': 'quality={quality}',
            'format': 'format={format}',
        }
    }
    
    @staticmethod
    def optimize_image_url(
        url: str,
        width: Optional[int] = None,
        height: Optional[int] = None,
        quality: Optional[int] = None,
        format: Optional[str] = None,
    ) -> str:
        """
        Optimize an image URL by adding appropriate parameters for resizing and quality
        
        Args:
            url: Original image URL
            width: Desired width in pixels
            height: Desired height in pixels
            quality: Image quality (1-100)
            format: Image format (webp, jpeg, png)
            
        Returns:
            Optimized image URL
        """
        if not url:
            return url
            
        try:
            # Parse the URL
            parsed_url = urlparse(url)
            
            # Determine which CDN pattern to use
            cdn_params = None
            for pattern, params in ImageOptimizer.CDN_PATTERNS.items():
                if re.search(pattern, parsed_url.netloc):
                    cdn_params = params
                    break
            
            # Use default parameters if no specific CDN is matched
            if not cdn_params:
                cdn_params = ImageOptimizer.CDN_PATTERNS['default']
            
            # Get existing query parameters
            query_params = parse_qs(parsed_url.query)
            
            # Add optimization parameters
            if width and 'width' not in query_params:
                param = cdn_params['width'].format(width=width)
                if '=' in param:
                    key, value = param.split('=')
                    query_params[key] = [value]
                else:
                    # For path-based parameters (like Cloudinary)
                    path_parts = parsed_url.path.split('/')
                    if 'upload' in path_parts:
                        upload_index = path_parts.index('upload')
                        path_parts.insert(upload_index + 1, param)
                        parsed_url = parsed_url._replace(path='/'.join(path_parts))
            
            if height and 'height' not in query_params:
                param = cdn_params['height'].format(height=height)
                if '=' in param:
                    key, value = param.split('=')
                    query_params[key] = [value]
                else:
                    # For path-based parameters (like Cloudinary)
                    if 'upload' in parsed_url.path and '/' in parsed_url.path:
                        path_parts = parsed_url.path.split('/')
                        upload_index = path_parts.index('upload')
                        if upload_index + 1 < len(path_parts) and width:
                            # If width was already added, don't add height separately
                            pass
                        else:
                            path_parts.insert(upload_index + 1, param)
                            parsed_url = parsed_url._replace(path='/'.join(path_parts))
            
            if quality and 'quality' not in query_params:
                param = cdn_params['quality'].format(quality=quality)
                if '=' in param:
                    key, value = param.split('=')
                    query_params[key] = [value]
            
            if format and 'format' not in query_params:
                param = cdn_params['format'].format(format=format)
                if '=' in param:
                    key, value = param.split('=')
                    query_params[key] = [value]
            
            # Rebuild the query string
            query_string = urlencode(query_params, doseq=True)
            
            # Rebuild the URL
            optimized_url = urlunparse((
                parsed_url.scheme,
                parsed_url.netloc,
                parsed_url.path,
                parsed_url.params,
                query_string,
                parsed_url.fragment
            ))
            
            return optimized_url
            
        except Exception as e:
            logger.error(f"Error optimizing image URL: {str(e)}")
            return url  # Return original URL if optimization fails
    
    @staticmethod
    def get_optimized_phone_image(
        phone_image_url: str,
        context: str = 'card'
    ) -> str:
        """
        Get an optimized phone image URL for a specific context
        
        Args:
            phone_image_url: Original phone image URL
            context: Context for optimization (card, detail, thumbnail)
            
        Returns:
            Optimized image URL
        """
        # Define optimization parameters for different contexts
        context_params = {
            'card': {
                'width': 300,
                'height': None,
                'quality': 80,
                'format': 'webp'
            },
            'detail': {
                'width': 600,
                'height': None,
                'quality': 85,
                'format': 'webp'
            },
            'thumbnail': {
                'width': 100,
                'height': 100,
                'quality': 70,
                'format': 'webp'
            },
            'list': {
                'width': 150,
                'height': None,
                'quality': 75,
                'format': 'webp'
            }
        }
        
        # Get parameters for the requested context
        params = context_params.get(context, context_params['card'])
        
        # Optimize the image URL
        return ImageOptimizer.optimize_image_url(
            phone_image_url,
            width=params['width'],
            height=params['height'],
            quality=params['quality'],
            format=params['format']
        )