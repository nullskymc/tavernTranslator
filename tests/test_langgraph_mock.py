"""
Mock test for LangGraph integration that doesn't make real API calls.
"""
import sys
import os
from unittest.mock import Mock, patch

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.graphs.translation_graph import translation_graph, async_translation_graph

def test_translation_graph_with_mock():
    """Test the translation graph with mocked LLM calls."""
    print("Testing translation graph with mocked LLM...")
    
    # Mock the LLM creation and response
    mock_llm = Mock()
    mock_response = Mock()
    mock_response.content = "Translated text"
    mock_llm.invoke.return_value = mock_response
    
    with patch('src.graphs.translation_graph.create_translation_llm', return_value=mock_llm):
        # Test valid translation
        state = {
            "field_name": "test_field",
            "original_text": "Hello world",
            "translated_text": "",
            "model_name": "gpt-3.5-turbo",
            "base_url": "https://api.openai.com/v1",
            "api_key": "sk-valid-key",
            "system_prompt": "Translate this text",
            "status": "pending",
            "error_message": None
        }
        
        result = translation_graph.invoke(state)
        assert result["status"] == "completed", f"Expected 'completed', got {result['status']}"
        assert result["translated_text"] == "Translated text"
        print("✓ Successful translation test passed")
        
        # Verify the LLM was called correctly
        mock_llm.invoke.assert_called_once()
        call_args = mock_llm.invoke.call_args[0][0]
        assert len(call_args) == 2
        assert call_args[0].content == "Translate this text"
        assert call_args[1].content == "Hello world"
        print("✓ LLM call verification passed")
    
    print("All mock tests passed!")

def test_empty_text_handling():
    """Test that empty text is handled correctly."""
    print("Testing empty text handling...")
    
    # Test empty text
    state = {
        "field_name": "test_field",
        "original_text": "",
        "translated_text": "",
        "model_name": "gpt-3.5-turbo",
        "base_url": "https://api.openai.com/v1",
        "api_key": "sk-test",
        "system_prompt": "Translate this text",
        "status": "pending",
        "error_message": None
    }
    
    result = translation_graph.invoke(state)
    assert result["status"] == "completed", f"Expected 'completed', got {result['status']}"
    assert result["translated_text"] == "", "Empty text should return empty string"
    print("✓ Empty text handling test passed")

def test_missing_configuration():
    """Test that missing configuration is handled correctly."""
    print("Testing missing configuration handling...")
    
    # Test missing model name
    state = {
        "field_name": "test_field",
        "original_text": "Hello world",
        "translated_text": "",
        "model_name": "",  # Missing model name
        "base_url": "https://api.openai.com/v1",
        "api_key": "sk-test",
        "system_prompt": "Translate this text",
        "status": "pending",
        "error_message": None
    }
    
    result = translation_graph.invoke(state)
    assert result["status"] == "error", f"Expected 'error', got {result['status']}"
    assert "缺少必要的配置" in result["error_message"]
    print("✓ Configuration validation test passed")

if __name__ == "__main__":
    test_empty_text_handling()
    test_missing_configuration()
    test_translation_graph_with_mock()
    print("All tests completed successfully!")