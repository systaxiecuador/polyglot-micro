import { Controller, Get, Post, Body, Param, Inject, OnModuleInit, HttpException, HttpStatus } from '@nestjs/common';
import type { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { Observable, lastValueFrom } from 'rxjs';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';

interface InventoryService {
  getStock(data: { product_id: number }): Observable<any>; 
  
  decreaseStock(data: { productId: number; quantity: number; order_id: string }): Observable<any>;
}
@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController implements OnModuleInit {
  private inventoryService: InventoryService;

  constructor(
    @Inject('INVENTORY_PACKAGE') private client: ClientGrpc,
    // INYECCIÓN DE RABBITMQ
    @Inject('RABBITMQ_SERVICE') private rmqClient: ClientProxy 
  ) {}

  onModuleInit() {
    this.inventoryService = this.client.getService<InventoryService>('InventoryService');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar Stock', description: 'Consulta el stock en Postgres vía gRPC (Go).' })
  @ApiParam({ name: 'id', description: 'ID del producto (ej: 1)' })
  @ApiResponse({ status: 200, description: 'Stock retornado correctamente.' })
  async getStock(@Param('id') id: string) {
    // 1. Convertir y validar
    const numericId = Number(id);
    
    console.log(`[DEBUG] Recibido ID en URL: "${id}". Convertido a numero: ${numericId}`);

    const payload = {
      id: numericId,          
      product_id: numericId,  
      productId: numericId    
    };

    try {
      console.log('[DEBUG] Enviando payload a gRPC:', JSON.stringify(payload));
      const result = await lastValueFrom(this.inventoryService.getStock(payload));
      return result;
    } catch (error) {
      console.error('[DEBUG] Error en gRPC:', error);
      throw new HttpException(error, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post('decrease')
  @ApiOperation({ summary: 'Registrar Venta', description: 'Reduce stock (Go) y emite eventos a Analytics (Python) y Notificaciones (PHP).' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        product_id: { type: 'number', example: 1 },
        quantity: { type: 'number', example: 2 },
        orderId: { type: 'string', example: 'ORD-999' }
      }
    }
  })
  async decreaseStock(@Body() body: { product_id: number; quantity: number; orderId: string }) {
    try {
      const numericId = Number(body.product_id);    
      console.log(`[DEBUG] Recibido ID en URL: "${body.product_id}". Convertido a numero: ${numericId}`);
      const payload = {
        productId: body.product_id,
        quantity: body.quantity,
        order_id: body.orderId,
      };
      try {
        console.log('[DEBUG] Enviando payload a gRPC:', JSON.stringify(payload));
        const result = await lastValueFrom(this.inventoryService.decreaseStock(payload));
        if (result.success) {
          console.log('[Gateway] Stock descontado. Emitiendo evento a RabbitMQ...');
          this.rmqClient.emit('product_sold', payload);
        }
        return result;
      } catch (error) {
        console.error('[DEBUG] Error en gRPC:', error);
        throw new HttpException(error, HttpStatus.BAD_GATEWAY);
      }
      
    } catch (error) {
      throw new HttpException('Error communicating with Inventory Service', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}