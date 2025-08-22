"""
Integration test for LangGraph translator with proper mocking.
"""
import sys
import os
from unittest.mock import Mock, patch

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.graphs.langgraph_translator import LangGraphCharacterCardTranslator

def test_langgraph_translator_integration():
    """Test the LangGraph translator integration with mocked graph."""
    print("Testing LangGraph translator integration...")
    
    # Mock prompts
    prompts = {
        "base_template": "Translate this text",
        "description_template": "Translate description",
        "dialogue_template": "Translate dialogue"
    }
    
    # Create translator instance
    translator = LangGraphCharacterCardTranslator(
        model_name="gpt-3.5-turbo",
        base_url="https://api.openai.com/v1",
        api_key="sk-test-key",
        prompts=prompts
    )
    
    # Mock the translation graph
    mock_result = {
        "field_name": "name",
        "original_text": "Hello world",
        "translated_text": "你好世界",
        "status": "completed",
        "error_message": None
    }
    
    with patch('src.graphs.langgraph_translator.translation_graph') as mock_graph:
        mock_graph.invoke.return_value = mock_result
        
        # Test translation
        result = translator.translate_field("name", "Hello world")
        assert result == "你好世界", f"Expected '你好世界', got '{result}'"
        
        # Verify the graph was called with correct parameters
        mock_graph.invoke.assert_called_once()
        call_args = mock_graph.invoke.call_args[0][0]
        assert call_args["field_name"] == "name"
        assert call_args["original_text"] == "Hello world"
        assert call_args["system_prompt"] == "Translate this text"
        print("✓ Translation with mock graph passed")
    
    # Test empty text
    result = translator.translate_field("name", "")
    assert result == "", "Empty text should return empty string"
    print("✓ Empty text handling passed")
    
    print("LangGraph translator integration test completed!")

def test_field_specific_prompts():
    """Test that different field types use appropriate prompts."""
    print("Testing field-specific prompts...")
    
    prompts = {
        "base_template": "Base prompt",
        "description_template": "Description prompt",
        "dialogue_template": "Dialogue prompt"
    }
    
    translator = LangGraphCharacterCardTranslator(
        model_name="gpt-3.5-turbo",
        base_url="https://api.openai.com/v1",
        api_key="sk-test-key",
        prompts=prompts
    )
    
    # Test base field
    prompt = translator._get_system_prompt("name")
    assert prompt == "Base prompt", f"Expected 'Base prompt', got '{prompt}'"
    
    # Test description field
    prompt = translator._get_system_prompt("description")
    assert prompt == "Description prompt", f"Expected 'Description prompt', got '{prompt}'"
    
    # Test dialogue fields
    for field in ["first_mes", "mes_example", "alternate_greetings"]:
        prompt = translator._get_system_prompt(field)
        assert prompt == "Dialogue prompt", f"Expected 'Dialogue prompt' for {field}, got '{prompt}'"
    
    # Test character book content
    prompt = translator._get_system_prompt("character_book.content")
    assert prompt == "Base prompt", f"Expected 'Base prompt' for character_book.content, got '{prompt}'"
    
    print("✓ Field-specific prompts test passed")

if __name__ == "__main__":
    test_field_specific_prompts()
    test_langgraph_translator_integration()
    print("All integration tests completed successfully!")