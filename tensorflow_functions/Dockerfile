FROM python:3

WORKDIR /usr/src/app

COPY requirements.txt ./

RUN set -ex; \
    pip install --no-cache-dir --upgrade pip; \
    pip install --no-cache-dir -r requirements.txt;

COPY . .

CMD ["python", "./init.py"]