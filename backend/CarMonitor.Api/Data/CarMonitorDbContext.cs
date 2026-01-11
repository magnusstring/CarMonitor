using Microsoft.EntityFrameworkCore;
using CarMonitor.Api.Models;

namespace CarMonitor.Api.Data;

public class CarMonitorDbContext : DbContext
{
    public CarMonitorDbContext(DbContextOptions<CarMonitorDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<VehicleShare> VehicleShares => Set<VehicleShare>();
    public DbSet<Reminder> Reminders => Set<Reminder>();
    public DbSet<ReminderTypeEntity> ReminderTypes => Set<ReminderTypeEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Username).HasColumnName("username").HasMaxLength(100).IsRequired();
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(e => e.Username).IsUnique();
        });

        // Vehicle
        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.ToTable("vehicles");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Make).HasColumnName("make").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Model).HasColumnName("model").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Year).HasColumnName("year");
            entity.Property(e => e.LicensePlate).HasColumnName("license_plate").HasMaxLength(20).IsRequired();
            entity.Property(e => e.Vin).HasColumnName("vin").HasMaxLength(17);
            entity.Property(e => e.Color).HasColumnName("color").HasMaxLength(50);
            entity.Property(e => e.Notes).HasColumnName("notes").HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        // VehicleShare
        modelBuilder.Entity<VehicleShare>(entity =>
        {
            entity.ToTable("vehicle_shares");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.VehicleId).HasColumnName("vehicle_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.SharedAt).HasColumnName("shared_at");
            entity.HasIndex(e => new { e.VehicleId, e.UserId }).IsUnique();
        });

        // Reminder
        modelBuilder.Entity<Reminder>(entity =>
        {
            entity.ToTable("reminders");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.VehicleId).HasColumnName("vehicle_id");
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(100).IsRequired();
            entity.Property(e => e.DueDate).HasColumnName("due_date");
            entity.Property(e => e.Notes).HasColumnName("notes").HasMaxLength(500);
            entity.Property(e => e.IsCompleted).HasColumnName("is_completed");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        // ReminderType
        modelBuilder.Entity<ReminderTypeEntity>(entity =>
        {
            entity.ToTable("reminder_types");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Icon).HasColumnName("icon").HasMaxLength(50);
            entity.Property(e => e.Color).HasColumnName("color").HasMaxLength(20);
            entity.Property(e => e.IsDefault).HasColumnName("is_default");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            // Seed default reminder types
            entity.HasData(
                new ReminderTypeEntity { Id = 1, Name = "Insurance", Icon = "insurance", Color = "#3b82f6", IsDefault = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new ReminderTypeEntity { Id = 2, Name = "Inspection", Icon = "inspection", Color = "#10b981", IsDefault = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new ReminderTypeEntity { Id = 3, Name = "RoadTax", Icon = "roadtax", Color = "#f59e0b", IsDefault = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new ReminderTypeEntity { Id = 4, Name = "Service", Icon = "service", Color = "#8b5cf6", IsDefault = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
            );
        });

        SeedDevelopmentData(modelBuilder);
    }

    private void SeedDevelopmentData(ModelBuilder modelBuilder)
    {
        var seedDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        // Seed a demo user (password: "demo123")
        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = 1,
                Username = "demo",
                PasswordHash = "$2a$11$K5xKz5K5xKz5K5xKz5K5xOdemo123hashedpassword",
                Email = "demo@example.com",
                CreatedAt = seedDate
            }
        );

        // Seed 2 vehicles
        modelBuilder.Entity<Vehicle>().HasData(
            new Vehicle
            {
                Id = 1,
                UserId = 0, // Shared with all users
                Make = "Volvo",
                Model = "XC60",
                Year = 2021,
                LicensePlate = "ABC 123",
                Vin = "YV1UZ8256N1234567",
                Color = "Black",
                Notes = "Family SUV",
                CreatedAt = seedDate
            },
            new Vehicle
            {
                Id = 2,
                UserId = 0,
                Make = "Tesla",
                Model = "Model 3",
                Year = 2023,
                LicensePlate = "EV 456",
                Vin = "5YJ3E1EA1NF123456",
                Color = "White",
                Notes = "Daily commuter",
                CreatedAt = seedDate
            }
        );

        // Seed 4 reminders for each vehicle with varied dates
        var today = DateTime.UtcNow.Date;
        modelBuilder.Entity<Reminder>().HasData(
            // Vehicle 1 reminders
            new Reminder { Id = 1, VehicleId = 1, Type = "Insurance", DueDate = today.AddDays(-5), Notes = "Annual insurance renewal", IsCompleted = false, CreatedAt = seedDate },
            new Reminder { Id = 2, VehicleId = 1, Type = "Inspection", DueDate = today.AddDays(10), Notes = "Yearly inspection", IsCompleted = false, CreatedAt = seedDate },
            new Reminder { Id = 3, VehicleId = 1, Type = "RoadTax", DueDate = today.AddDays(45), Notes = "Road tax due", IsCompleted = false, CreatedAt = seedDate },
            new Reminder { Id = 4, VehicleId = 1, Type = "Service", DueDate = today.AddDays(90), Notes = "30,000 km service", IsCompleted = false, CreatedAt = seedDate },

            // Vehicle 2 reminders
            new Reminder { Id = 5, VehicleId = 2, Type = "Insurance", DueDate = today.AddDays(3), Notes = "Insurance expires soon", IsCompleted = false, CreatedAt = seedDate },
            new Reminder { Id = 6, VehicleId = 2, Type = "Inspection", DueDate = today.AddDays(-10), Notes = "Overdue inspection!", IsCompleted = false, CreatedAt = seedDate },
            new Reminder { Id = 7, VehicleId = 2, Type = "RoadTax", DueDate = today.AddDays(120), Notes = "Quarterly road tax", IsCompleted = false, CreatedAt = seedDate },
            new Reminder { Id = 8, VehicleId = 2, Type = "Service", DueDate = today.AddDays(25), Notes = "Tire rotation", IsCompleted = false, CreatedAt = seedDate }
        );
    }
}
