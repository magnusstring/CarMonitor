using CarMonitor.Api.Data;
using Hangfire;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace CarMonitor.Tests.Integration;

public class CustomWebApplicationFactory<TProgram> : WebApplicationFactory<TProgram> where TProgram : class
{
    private readonly string _databaseName = "TestDb_" + Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Set environment to Testing to skip Hangfire scheduling
        builder.UseEnvironment("Testing");

        // Disable static web assets to avoid wwwroot issues
        builder.UseSetting("webroot", ".");

        builder.ConfigureServices(services =>
        {
            // Remove the existing DbContext registration
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<CarMonitorDbContext>));

            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            // Remove Hangfire server to prevent background processing in tests
            services.RemoveAll<IHostedService>();

            // Add InMemory database for testing with consistent name per factory instance
            services.AddDbContext<CarMonitorDbContext>(options =>
            {
                options.UseInMemoryDatabase(_databaseName);
            });

            // Build service provider and initialize database
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<CarMonitorDbContext>();
            db.Database.EnsureCreated();
        });
    }
}
