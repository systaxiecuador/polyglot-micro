<?php

require_once __DIR__ . '/vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

// 1. Configuración desde Variables de Entorno
$rabbitmqUrl = getenv('RABBITMQ_URL');

// Función para extraer partes de la URL (amqp://user:pass@host:port)
$urlParts = parse_url($rabbitmqUrl);
$host = $urlParts['host'] ?? 'rabbitmq';
$port = $urlParts['port'] ?? 5672;
$user = $urlParts['user'] ?? 'guest';
$pass = $urlParts['pass'] ?? 'guest';

$queue = 'analytics_queue';

echo " [*] Notification Service (PHP) iniciando...\n";

// 2. Bucle infinito de conexión (Retry Logic)
while (true) {
    try {
        echo " [*] Intentando conectar a RabbitMQ en {$host}:{$port}...\n";
        
        $connection = new AMQPStreamConnection($host, $port, $user, $pass);
        $channel = $connection->channel();

        // Aseguramos que la cola exista
        $channel->queue_declare($queue, false, true, false, false);

        echo " [*] ¡Conexión exitosa! Esperando eventos de ventas...\n";

        // 3. Callback: Qué hacer cuando llega un mensaje
        $callback = function ($msg) {
            echo " [x] Evento recibido: " . $msg->body . "\n";
            
            // Simular envío de correo
            $data = json_decode($msg->body, true);
            // Aquí simplemente simulamos la acción
            echo " [EMAIL] Enviando correo de confirmación para la orden...\n";
            echo " [EMAIL] Enviado exitosamente a logística.\n";
            echo "------------------------------------------------\n";
        };

        $channel->basic_consume($queue, '', false, true, false, false, $callback);

        // Mantener escuchando
        while ($channel->is_consuming()) {
            $channel->wait();
        }

        $channel->close();
        $connection->close();

    } catch (Exception $e) {
        echo " [!] Error de conexión: " . $e->getMessage() . "\n";
        echo " [!] Reintentando en 5 segundos...\n";
        sleep(5);
    }
}