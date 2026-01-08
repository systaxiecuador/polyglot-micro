import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { InventoryController } from './inventory.controller';
import { join } from 'path'; 

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'INVENTORY_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'inventory',
          url: process.env.INVENTORY_GRPC_URL || 'localhost:50051',          
          protoPath: process.env.NODE_ENV === 'production' 
            ? '/protos/inventory.proto' 
            : join(__dirname, '../../../protos/inventory.proto'),
        },
      },
      {
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'analytics_queue', 
          queueOptions: {
            durable: true
          },
        },
      },
    ]),
  ],
  controllers: [InventoryController],
})
export class InventoryModule {}