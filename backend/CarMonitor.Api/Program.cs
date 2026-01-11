using System.Text;
using CarMonitor.Api.Data;
using CarMonitor.Api.Models;
using CarMonitor.Api.Services;
using Hangfire;
using Hangfire.MemoryStorage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Add controllers
    builder.Services.AddControllers();

    // Swagger
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
        {
            Description = "JWT Authorization header using the Bearer scheme",
            Name = "Authorization",
            In = Microsoft.OpenApi.Models.ParameterLocation.Header,
            Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
            Scheme = "Bearer"
        });
        c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
        {
            {
                new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Reference = new Microsoft.OpenApi.Models.OpenApiReference
                    {
                        Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
    });

    // JWT Authentication
    var jwtKey = builder.Configuration["Jwt:Key"] ?? "DefaultSecretKeyThatShouldBeChangedInProduction123!";
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "CarMonitor",
                ValidAudience = builder.Configuration["Jwt:Audience"] ?? "CarMonitor",
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
            };
        });

    // CORS
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowAngular", policy =>
        {
            policy.WithOrigins(
                    "http://localhost:4200",
                    "https://localhost:4200",
                    "https://carmonitor-app.azurewebsites.net")
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
    });

    // Hangfire
    builder.Services.AddHangfire(config => config.UseMemoryStorage());
    builder.Services.AddHangfireServer();

    // Data layer - use MySQL in production, InMemory locally
    var connectionString = builder.Configuration.GetConnectionString("MySql");

    // Check for Azure MySQL in App (MYSQLCONNSTR_localdb)
    var mysqlInAppConnStr = Environment.GetEnvironmentVariable("MYSQLCONNSTR_localdb");
    if (!string.IsNullOrEmpty(mysqlInAppConnStr))
    {
        // Parse MySQL in App connection string format:
        // Database=localdb;Data Source=127.0.0.1:PORT;User Id=azure;Password=PASSWORD
        connectionString = ConvertMySqlInAppConnectionString(mysqlInAppConnStr);
        Console.WriteLine("Using MySQL in App database");
    }

    if (!string.IsNullOrEmpty(connectionString) && !builder.Environment.IsDevelopment())
    {
        // Production: Use MySQL
        builder.Services.AddDbContext<CarMonitorDbContext>(options =>
            options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));
    }
    else
    {
        // Development: Use InMemory database with seed data
        builder.Services.AddDbContext<CarMonitorDbContext>(options =>
            options.UseInMemoryDatabase("CarMonitorDev"));
    }
    builder.Services.AddScoped<IDataService, DbDataService>();

    // Helper function to convert MySQL in App connection string to Pomelo format
    static string ConvertMySqlInAppConnectionString(string connStr)
    {
        // Input: Database=localdb;Data Source=127.0.0.1:PORT;User Id=azure;Password=PASSWORD
        // Output: Server=127.0.0.1;Port=PORT;Database=localdb;User=azure;Password=PASSWORD
        var parts = connStr.Split(';')
            .Select(p => p.Trim())
            .Where(p => !string.IsNullOrEmpty(p))
            .Select(p => p.Split('=', 2))
            .Where(p => p.Length == 2)
            .ToDictionary(p => p[0].Trim(), p => p[1].Trim(), StringComparer.OrdinalIgnoreCase);

        var database = parts.GetValueOrDefault("Database", "localdb");
        var dataSource = parts.GetValueOrDefault("Data Source", "127.0.0.1:3306");
        var userId = parts.GetValueOrDefault("User Id", "azure");
        var password = parts.GetValueOrDefault("Password", "");

        // Parse Data Source (127.0.0.1:PORT)
        var hostParts = dataSource.Split(':');
        var server = hostParts[0];
        var port = hostParts.Length > 1 ? hostParts[1] : "3306";

        return $"Server={server};Port={port};Database={database};User={userId};Password={password};";
    }

    // Services
    builder.Services.AddScoped<AuthService>();
    builder.Services.AddScoped<EmailService>();
    builder.Services.AddScoped<SmsService>();
    builder.Services.AddScoped<ReminderService>();

    var app = builder.Build();

    // Initialize database
    var useMySQL = !string.IsNullOrEmpty(connectionString) && !builder.Environment.IsDevelopment();
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<CarMonitorDbContext>();
        // EnsureCreated will create tables if they don't exist (works for both MySQL and InMemory)
        db.Database.EnsureCreated();
        Console.WriteLine($"Database initialized (MySQL: {useMySQL})");

        // Seed demo data only in development
        if (builder.Environment.IsDevelopment() && !db.Vehicles.Any())
        {
            SeedDevelopmentData(db);
            Console.WriteLine("Development seed data added");
        }
    }

    // Seed data for local development only
    static void SeedDevelopmentData(CarMonitorDbContext db)
    {
        var seedDate = DateTime.UtcNow;
        var today = DateTime.UtcNow.Date;

        // Add demo vehicles
        var vehicle1 = new Vehicle
        {
            UserId = 0,
            Make = "Volvo",
            Model = "XC60",
            Year = 2021,
            LicensePlate = "ABC 123",
            Vin = "YV1UZ8256N1234567",
            Color = "Black",
            Notes = "Family SUV",
            CreatedAt = seedDate
        };
        var vehicle2 = new Vehicle
        {
            UserId = 0,
            Make = "Tesla",
            Model = "Model 3",
            Year = 2023,
            LicensePlate = "EV 456",
            Vin = "5YJ3E1EA1NF123456",
            Color = "White",
            Notes = "Daily commuter",
            CreatedAt = seedDate
        };

        db.Vehicles.AddRange(vehicle1, vehicle2);
        db.SaveChanges();

        // Add reminders for each vehicle
        var reminders = new List<Reminder>
        {
            // Vehicle 1 reminders
            new() { VehicleId = vehicle1.Id, Type = "Insurance", DueDate = today.AddDays(-5), Notes = "Annual insurance renewal", IsCompleted = false, CreatedAt = seedDate },
            new() { VehicleId = vehicle1.Id, Type = "Inspection", DueDate = today.AddDays(10), Notes = "Yearly inspection", IsCompleted = false, CreatedAt = seedDate },
            new() { VehicleId = vehicle1.Id, Type = "RoadTax", DueDate = today.AddDays(45), Notes = "Road tax due", IsCompleted = false, CreatedAt = seedDate },
            new() { VehicleId = vehicle1.Id, Type = "Service", DueDate = today.AddDays(90), Notes = "30,000 km service", IsCompleted = false, CreatedAt = seedDate },
            // Vehicle 2 reminders
            new() { VehicleId = vehicle2.Id, Type = "Insurance", DueDate = today.AddDays(3), Notes = "Insurance expires soon", IsCompleted = false, CreatedAt = seedDate },
            new() { VehicleId = vehicle2.Id, Type = "Inspection", DueDate = today.AddDays(-10), Notes = "Overdue inspection!", IsCompleted = false, CreatedAt = seedDate },
            new() { VehicleId = vehicle2.Id, Type = "RoadTax", DueDate = today.AddDays(120), Notes = "Quarterly road tax", IsCompleted = false, CreatedAt = seedDate },
            new() { VehicleId = vehicle2.Id, Type = "Service", DueDate = today.AddDays(25), Notes = "Tire rotation", IsCompleted = false, CreatedAt = seedDate }
        };

        db.Reminders.AddRange(reminders);
        db.SaveChanges();
    }

    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    // Always enable CORS
    app.UseCors("AllowAngular");

    // Skip HTTPS redirection on Azure (handled by load balancer)
    if (app.Environment.IsDevelopment())
    {
        app.UseHttpsRedirection();
    }

    // Serve static files (Angular app) in production
    if (!app.Environment.IsDevelopment())
    {
        app.UseDefaultFiles();
        app.UseStaticFiles();
    }

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();

    // SPA fallback for Angular routing (production only)
    if (!app.Environment.IsDevelopment())
    {
        app.MapFallbackToFile("index.html");
    }

    // Hangfire dashboard (only in development)
    if (app.Environment.IsDevelopment())
    {
        app.MapHangfireDashboard("/hangfire");
    }

    Console.WriteLine("Starting CarMonitor...");

    // Schedule daily reminder jobs after app starts
    app.Lifetime.ApplicationStarted.Register(() =>
    {
        // Email reminders at 8:00 AM daily
        RecurringJob.AddOrUpdate<ReminderService>(
            "daily-reminder-emails",
            service => service.SendDailyReminderEmails(),
            Cron.Daily(8, 0)
        );

        // SMS notifications at 9:00 AM daily (1 day before expiry)
        RecurringJob.AddOrUpdate<ReminderService>(
            "daily-sms-notifications",
            service => service.SendSmsNotifications(),
            Cron.Daily(9, 0)
        );
    });

    app.Run();
}
catch (Exception ex)
{
    Console.Error.WriteLine($"FATAL ERROR: {ex}");
    throw;
}
