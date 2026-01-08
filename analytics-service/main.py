from fastapi import FastAPI
import os
import pika
import json
import threading
import time
from pymongo import MongoClient

app = FastAPI()

RABBITMQ_URL = os.getenv("RABBITMQ_URL")
MONGO_URI = os.getenv("MONGO_URI")

collection = None

# Conexión a Mongo
try:
    client = MongoClient(MONGO_URI)
    db = client["analytics_db"]
    collection = db["sales_events"]
except Exception as e:
    print(f" [!] Error conectando a Mongo: {e}")

def start_consumer():
    # Bucle infinito de reintentos
    while True:
        try:
            if not RABBITMQ_URL:
                print(" [!] RABBITMQ_URL no está definida.")
                time.sleep(5)
                continue

            print(f" [*] Intentando conectar a RabbitMQ en: {RABBITMQ_URL}")
            params = pika.URLParameters(RABBITMQ_URL)
            connection = pika.BlockingConnection(params)
            channel = connection.channel()

            channel.queue_declare(queue='analytics_queue', durable=True)
            
            print(" [*] ¡Conexión exitosa! Esperando mensajes...")

            def callback(ch, method, properties, body):
                try:
                    event_data = json.loads(body)
                    print(f" [x] Recibido evento: {event_data}")
                    
                    if collection is not None:
                        collection.insert_one(event_data)
                        print(" [v] Guardado en MongoDB")
                    else:
                        print(" [!] Error: No hay conexión con MongoDB, mensaje descartado.")
                except Exception as e:
                    print(f" [!] Error procesando mensaje: {e}")

            channel.basic_consume(queue='analytics_queue', on_message_callback=callback, auto_ack=True)
            channel.start_consuming()
            
        except pika.exceptions.AMQPConnectionError:
            print(" [!] RabbitMQ no está listo. Reintentando en 5 segundos...")
            time.sleep(5)
        except Exception as e:
            print(f" [!] Error crítico en consumidor: {e}")
            time.sleep(5)

@app.on_event("startup")
async def startup_event():
    consumer_thread = threading.Thread(target=start_consumer, daemon=True)
    consumer_thread.start()

@app.get("/")
def read_root():
    return {"service": "Analytics Service", "status": "active"}