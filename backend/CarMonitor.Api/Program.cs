using System.Text;
using CarMonitor.Api.Data;
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

    // Data layer - use MySQL in production, Excel locally
    var connectionString = builder.Configuration.GetConnectionString("MySql");
    if (!string.IsNullOrEmpty(connectionString) && !builder.Environment.IsDevelopment())
    {
        // Production: Use MySQL
        builder.Services.AddDbContext<CarMonitorDbContext>(options =>
            options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));
        builder.Services.AddScoped<IDataService, DbDataService>();
    }
    else
    {
        // Development: Use Excel file
        builder.Services.AddSingleton<ExcelDataService>();
        builder.Services.AddSingleton<IDataService>(sp => sp.GetRequiredService<ExcelDataService>());
    }

    // Services
    builder.Services.AddScoped<AuthService>();
    builder.Services.AddScoped<EmailService>();
    builder.Services.AddScoped<ReminderService>();

    var app = builder.Build();

    // Initialize data layer
    if (string.IsNullOrEmpty(connectionString) || builder.Environment.IsDevelopment())
    {
        // Force ExcelDataService initialization
        _ = app.Services.GetRequiredService<ExcelDataService>();
    }
    else
    {
        // Run migrations for MySQL
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CarMonitorDbContext>();
        db.Database.Migrate();
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

    // Schedule daily reminder email job after app starts
    app.Lifetime.ApplicationStarted.Register(() =>
    {
        RecurringJob.AddOrUpdate<ReminderService>(
            "daily-reminder-emails",
            service => service.SendDailyReminderEmails(),
            Cron.Daily(8, 0) // Run at 8:00 AM daily
        );
    });

    app.Run();
}
catch (Exception ex)
{
    Console.Error.WriteLine($"FATAL ERROR: {ex}");
    throw;
}
