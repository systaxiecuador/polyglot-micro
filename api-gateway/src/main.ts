import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- CONFIGURACIÓN SWAGGER ---
  const config = new DocumentBuilder()
    .setTitle('Polyglot Microservices API')
    .setDescription('API Gateway que orquesta servicios en Go, Python y PHP')
    .setVersion('1.0')
    .addTag('Inventory', 'Operaciones de stock y ventas')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document); // La URL será /api/docs
  // -----------------------------

  await app.listen(3000);
}
bootstrap();