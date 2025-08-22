"""
测试LangGraph翻译器的错误处理
"""
import sys
import os
from unittest.mock import Mock, patch

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.graphs.langgraph_translator import LangGraphCharacterCardTranslator
from src.errors import TranslationError, ErrorCode

def test_langgraph_error_handling():
    """测试LangGraph翻译器的错误处理"""
    print("测试LangGraph错误处理...")
    
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
    
    # Mock the translation graph to return error
    mock_error_result = {
        "field_name": "scenario",
        "original_text": "test text",
        "translated_text": "",
        "status": "error",
        "error_message": "Error code: 500 - {'error': {'message': 'no candidates returned'}}"
    }
    
    with patch('src.graphs.langgraph_translator.translation_graph') as mock_graph:
        mock_graph.invoke.return_value = mock_error_result
        
        # Test that error is properly wrapped in TranslationError
        try:
            translator.translate_field("scenario", "test text")
            assert False, "Expected TranslationError to be raised"
        except TranslationError as e:
            assert e.error_code == ErrorCode.API_ERROR
            assert "no candidates returned" in e.message
            print("✓ LangGraph错误处理正确")
        except Exception as e:
            assert False, f"Expected TranslationError but got {type(e).__name__}: {e}"
    
    print("LangGraph错误处理测试完成!")

if __name__ == "__main__":
    test_langgraph_error_handling()
    print("所有错误处理测试完成成功!")