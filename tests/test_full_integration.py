"""
Full integration test for the LangGraph upgrade.
"""
import sys
import os
from unittest.mock import Mock, patch

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.utils import get_translator
from src.graphs.langgraph_translator import LangGraphCharacterCardTranslator
from src.translate import CharacterCardTranslator

def test_backward_compatibility():
    """Test that the system maintains backward compatibility."""
    print("Testing backward compatibility...")
    
    # Mock settings and prompts
    settings = {
        "model_name": "gpt-3.5-turbo",
        "base_url": "https://api.openai.com/v1",
        "api_key": "sk-test-key"
    }
    
    prompts = {
        "base_template": "Translate this text",
        "description_template": "Translate description",
        "dialogue_template": "Translate dialogue"
    }
    
    # Test LangGraph translator (default)
    translator_langgraph = get_translator(settings, prompts, use_langgraph=True)
    assert isinstance(translator_langgraph, LangGraphCharacterCardTranslator), "Should return LangGraph translator"
    print("✓ LangGraph translator creation works")
    
    # Test legacy translator
    translator_legacy = get_translator(settings, prompts, use_langgraph=False)
    assert isinstance(translator_legacy, CharacterCardTranslator), "Should return legacy translator"
    print("✓ Legacy translator creation works")
    
    print("Backward compatibility test passed!")

def test_api_integration():
    """Test that the API integration works with both translators."""
    print("Testing API integration...")
    
    settings = {
        "model_name": "gpt-3.5-turbo",
        "base_url": "https://api.openai.com/v1",
        "api_key": "sk-test-key"
    }
    
    prompts = {
        "base_template": "Translate this text",
        "description_template": "Translate description",
        "dialogue_template": "Translate dialogue"
    }
    
    # Mock the translation graph for LangGraph
    mock_result = {
        "field_name": "name",
        "original_text": "Hello world",
        "translated_text": "你好世界",
        "status": "completed",
        "error_message": None
    }
    
    with patch('src.graphs.langgraph_translator.translation_graph') as mock_graph:
        mock_graph.invoke.return_value = mock_result
        
        # Test LangGraph translator
        translator = get_translator(settings, prompts, use_langgraph=True)
        result = translator.translate_field("name", "Hello world")
        assert result == "你好世界"
        print("✓ LangGraph API integration works")
    
    # Mock the legacy LLM call
    mock_llm = Mock()
    mock_response = Mock()
    mock_response.content = "你好世界"
    mock_llm.invoke.return_value = mock_response
    
    with patch('src.translate.ChatOpenAI') as mock_chat_openai:
        mock_chat_openai.return_value = mock_llm
        
        # Test legacy translator
        translator = get_translator(settings, prompts, use_langgraph=False)
        result = translator.translate_field("name", "Hello world")
        assert result == "你好世界"
        print("✓ Legacy API integration works")
    
    print("API integration test passed!")

def test_batch_translator_integration():
    """Test that batch translator works with both backends."""
    print("Testing batch translator integration...")
    
    from src.batch_translate import BatchTranslator
    
    settings = {
        "model_name": "gpt-3.5-turbo",
        "base_url": "https://api.openai.com/v1",
        "api_key": "sk-test-key"
    }
    
    prompts = {
        "base_template": "Translate this text",
        "description_template": "Translate description",
        "dialogue_template": "Translate dialogue"
    }
    
    # Test LangGraph batch translator
    translator = get_translator(settings, prompts, use_langgraph=True)
    batch_translator = BatchTranslator(translator, max_concurrent=2)
    assert batch_translator.use_langgraph == True, "Should detect LangGraph translator"
    print("✓ LangGraph batch translator detection works")
    
    # Test legacy batch translator
    translator = get_translator(settings, prompts, use_langgraph=False)
    batch_translator = BatchTranslator(translator, max_concurrent=2)
    assert batch_translator.use_langgraph == False, "Should detect legacy translator"
    print("✓ Legacy batch translator detection works")
    
    print("Batch translator integration test passed!")

if __name__ == "__main__":
    test_backward_compatibility()
    test_api_integration()
    test_batch_translator_integration()
    print("All integration tests completed successfully!")