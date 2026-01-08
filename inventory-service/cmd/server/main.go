package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"

	"google.golang.org/grpc"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	pb "github.com/systaxiecuador/polyglot-micro/inventory-service/proto"
)

// --- Modelo de Base de Datos ---
type Product struct {
	ID    int32 `gorm:"primaryKey"`
	Name  string
	Stock int32
}

// --- Servidor gRPC ---
type server struct {
	pb.UnimplementedInventoryServiceServer
	db *gorm.DB
}

// Implementación: GetStock
func (s *server) GetStock(ctx context.Context, req *pb.GetStockRequest) (*pb.StockResponse, error) {
	var product Product
	if result := s.db.First(&product, req.ProductId); result.Error != nil {
		return &pb.StockResponse{
			Success: false,
			Message: "Product not found",
		}, nil
	}

	return &pb.StockResponse{
		ProductId:    product.ID,
		CurrentStock: product.Stock,
		Success:      true,
	}, nil
}

// Implementación: DecreaseStock (Con Transacción para evitar Race Conditions)
func (s *server) DecreaseStock(ctx context.Context, req *pb.DecreaseStockRequest) (*pb.StockResponse, error) {
	var product Product

	// Iniciamos una transacción
	tx := s.db.Begin()

	// Bloqueamos la fila para evitar que otro proceso lea el stock viejo mientras actualizamos
	if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&product, req.ProductId).Error; err != nil {
		tx.Rollback()
		return &pb.StockResponse{Success: false, Message: "Product not found"}, nil
	}

	if product.Stock < req.Quantity {
		tx.Rollback()
		return &pb.StockResponse{
			ProductId:    product.ID,
			CurrentStock: product.Stock,
			Success:      false,
			Message:      "Insufficient stock",
		}, nil
	}

	// Actualizamos
	product.Stock -= req.Quantity
	tx.Save(&product)
	tx.Commit()

	log.Printf("Order %s: Decreased stock for Product %d by %d", req.OrderId, req.ProductId, req.Quantity)

	return &pb.StockResponse{
		ProductId:    product.ID,
		CurrentStock: product.Stock,
		Success:      true,
		Message:      "Stock updated successfully",
	}, nil
}

func main() {
	// Configuración de DB desde Variables de Entorno (Docker)
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=5432 sslmode=disable TimeZone=UTC",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASS"),
		os.Getenv("DB_NAME"),
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// AutoMigrate crea la tabla si no existe (Solo para desarrollo/portafolio)
	db.AutoMigrate(&Product{})

	// Seed Básico (Si está vacío, crea productos de prueba)
	var count int64
	db.Model(&Product{}).Count(&count)
	if count == 0 {
		db.Create(&Product{ID: 1, Name: "Laptop Gamer", Stock: 100})
		db.Create(&Product{ID: 2, Name: "Mouse Wireless", Stock: 50})
		log.Println("Seeded database with initial products")
	}

	// Iniciar Servidor gRPC
	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", os.Getenv("GRPC_PORT")))
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterInventoryServiceServer(s, &server{db: db})

	log.Printf("🚀 Inventory Service (Go) listening at %v", lis.Addr())
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
