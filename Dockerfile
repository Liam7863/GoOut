# 1. Берем официальный образ Python
FROM python:3.11-slim

# 2. Устанавливаем рабочую папку внутри контейнера
WORKDIR /app

# 3. Копируем список библиотек и устанавливаем их
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Копируем весь ваш код внутрь контейнера
COPY . .

# 5. Команда для запуска сервера (аналог вашей команды в терминале)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]