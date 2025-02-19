from typing import Any, Dict
import json

def load_json(file_path: str) -> Dict[str, Any]:
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(data: Dict[str, Any], file_path: str) -> None:
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def pretty_print_json(data: Dict[str, Any]) -> None:
    print(json.dumps(data, indent=4, ensure_ascii=False))