import os
import json
from openai import OpenAI

SYSTEM_PROMPT = """Ты — CodeGenius AI, экспертный fullstack-разработчик. 
Твоя задача — по описанию пользователя сгенерировать полноценное приложение.

СТЕК:
- Фронтенд: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Бэкенд: Python 3.11 Cloud Functions (handler(event, context) -> dict)
- БД: PostgreSQL (psycopg2, simple query protocol)
- Иконки: lucide-react через компонент <Icon name="..." />
- Стейт: useState, useEffect, @tanstack/react-query для запросов

ПРАВИЛА ГЕНЕРАЦИИ КОДА:
1. Пиши ТОЛЬКО рабочий, полный код без заглушек и TODO
2. Компоненты React — функциональные, с TypeScript типами
3. Бэкенд всегда начинается с обработки OPTIONS (CORS)
4. Все ответы бэкенда содержат заголовок Access-Control-Allow-Origin: *
5. Стили — только Tailwind классы, никакого inline CSS
6. Импорты — всегда полные, используй @/ для src/
7. Каждый файл — самодостаточный, с экспортом по умолчанию
8. БД запросы — только через psycopg2, без ORM
9. Секреты — только через os.environ, никогда не хардкоди
10. Формы — react-hook-form + zod валидация

СТРУКТУРА ОТВЕТА:
Отвечай ТОЛЬКО валидным JSON следующего формата:
{
  "description": "Краткое описание что создано (1-2 предложения)",
  "files": [
    {
      "path": "src/pages/MyPage.tsx",
      "content": "...полный код файла...",
      "language": "typescript"
    },
    {
      "path": "backend/my-api/index.py", 
      "content": "...полный код файла...",
      "language": "python"
    }
  ],
  "instructions": "Что нужно сделать после: какие роуты добавить, какие миграции запустить (1-3 шага)"
}

ВАЖНО: 
- files — массив ВСЕХ файлов которые нужно создать/изменить
- Всегда создавай и фронтенд и бэкенд вместе
- backend функции всегда в папке backend/{name}/index.py
- Фронтенд страницы в src/pages/, компоненты в src/components/
"""


def handler(event: dict, context) -> dict:
    """Генерирует полноценный React + Python проект по текстовому промпту пользователя."""
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": "",
        }

    body = json.loads(event.get("body", "{}"))
    prompt = body.get("prompt", "").strip()
    history = body.get("history", [])

    if not prompt:
        return {
            "statusCode": 400,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": "Промпт не указан"}),
        }

    client = OpenAI(
        api_key=os.environ["OPENAI_API_KEY"],
        base_url="https://api.laozhang.ai/v1",
    )

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for msg in history[-10:]:
        if msg.get("role") in ("user", "assistant"):
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": prompt})

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.3,
        max_tokens=8000,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content
    result = json.loads(raw)

    return {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*"},
        "body": json.dumps(result, ensure_ascii=False),
    }
