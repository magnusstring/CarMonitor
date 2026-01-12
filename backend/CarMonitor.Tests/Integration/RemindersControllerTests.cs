using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CarMonitor.Api.Models;

namespace CarMonitor.Tests.Integration;

public class RemindersControllerTests : IClassFixture<CustomWebApplicationFactory<Program>>
{
    private readonly CustomWebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public RemindersControllerTests(CustomWebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(HttpClient client, int vehicleId)> GetAuthenticatedClientWithVehicle()
    {
        var username = "remindertest_" + Guid.NewGuid().ToString("N")[..8];
        var response = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = username,
            Password = "password123"
        });
        var auth = await response.Content.ReadFromJsonAsync<LoginResponse>();

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);

        // Create a vehicle
        var vehicleResponse = await client.PostAsJsonAsync("/api/vehicles", new
        {
            Make = "Test",
            Model = "Car",
            Year = 2023,
            LicensePlate = "REM" + Guid.NewGuid().ToString("N")[..5]
        });
        var vehicle = await vehicleResponse.Content.ReadFromJsonAsync<Vehicle>();

        return (client, vehicle!.Id);
    }

    [Fact]
    public async Task GetReminders_WithoutAuth_ReturnsUnauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/reminders");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateReminder_WithValidData_ReturnsCreated()
    {
        // Arrange
        var (client, vehicleId) = await GetAuthenticatedClientWithVehicle();
        var reminder = new
        {
            VehicleId = vehicleId,
            Type = "Insurance",
            DueDate = DateTime.UtcNow.AddDays(30).ToString("yyyy-MM-dd"),
            Notes = "Annual renewal"
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/reminders", reminder);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<Reminder>();
        Assert.NotNull(created);
        Assert.Equal("Insurance", created.Type);
        Assert.Equal(vehicleId, created.VehicleId);
    }

    [Fact]
    public async Task CreateReminder_WithInvalidVehicleId_ReturnsBadRequest()
    {
        // Arrange
        var username = "invalidveh_" + Guid.NewGuid().ToString("N")[..8];
        var response = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = username,
            Password = "password123"
        });
        var auth = await response.Content.ReadFromJsonAsync<LoginResponse>();

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);

        var reminder = new
        {
            VehicleId = 99999, // Non-existent
            Type = "Insurance",
            DueDate = DateTime.UtcNow.AddDays(30).ToString("yyyy-MM-dd")
        };

        // Act
        var createResponse = await client.PostAsJsonAsync("/api/reminders", reminder);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, createResponse.StatusCode);
    }

    [Fact]
    public async Task GetVehicleReminders_ReturnsOnlyVehicleReminders()
    {
        // Arrange
        var (client, vehicleId) = await GetAuthenticatedClientWithVehicle();

        // Create reminders
        await client.PostAsJsonAsync("/api/reminders", new
        {
            VehicleId = vehicleId,
            Type = "Insurance",
            DueDate = DateTime.UtcNow.AddDays(30).ToString("yyyy-MM-dd")
        });
        await client.PostAsJsonAsync("/api/reminders", new
        {
            VehicleId = vehicleId,
            Type = "Inspection",
            DueDate = DateTime.UtcNow.AddDays(60).ToString("yyyy-MM-dd")
        });

        // Act
        var response = await client.GetAsync($"/api/vehicles/{vehicleId}/reminders");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var reminders = await response.Content.ReadFromJsonAsync<List<ReminderDto>>();
        Assert.Equal(2, reminders!.Count);
    }

    [Fact]
    public async Task CompleteReminder_SetsIsCompletedTrue()
    {
        // Arrange
        var (client, vehicleId) = await GetAuthenticatedClientWithVehicle();

        var createResponse = await client.PostAsJsonAsync("/api/reminders", new
        {
            VehicleId = vehicleId,
            Type = "Insurance",
            DueDate = DateTime.UtcNow.AddDays(30).ToString("yyyy-MM-dd")
        });
        var reminder = await createResponse.Content.ReadFromJsonAsync<Reminder>();

        // Act - Use PATCH method as defined in the controller
        var response = await client.PatchAsync($"/api/reminders/{reminder!.Id}/complete", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var completed = await response.Content.ReadFromJsonAsync<Reminder>();
        Assert.True(completed!.IsCompleted);
    }

    [Fact]
    public async Task UpdateReminder_WithValidData_ReturnsOk()
    {
        // Arrange
        var (client, vehicleId) = await GetAuthenticatedClientWithVehicle();

        var createResponse = await client.PostAsJsonAsync("/api/reminders", new
        {
            VehicleId = vehicleId,
            Type = "Insurance",
            DueDate = DateTime.UtcNow.AddDays(30).ToString("yyyy-MM-dd"),
            Notes = "Original notes"
        });
        var reminder = await createResponse.Content.ReadFromJsonAsync<Reminder>();

        // Act
        var response = await client.PutAsJsonAsync($"/api/reminders/{reminder!.Id}", new
        {
            DueDate = DateTime.UtcNow.AddDays(60).ToString("yyyy-MM-dd"),
            Notes = "Updated notes",
            IsCompleted = false
        });

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<Reminder>();
        Assert.Equal("Updated notes", updated!.Notes);
    }

    [Fact]
    public async Task DeleteReminder_WithValidId_ReturnsNoContent()
    {
        // Arrange
        var (client, vehicleId) = await GetAuthenticatedClientWithVehicle();

        var createResponse = await client.PostAsJsonAsync("/api/reminders", new
        {
            VehicleId = vehicleId,
            Type = "Insurance",
            DueDate = DateTime.UtcNow.AddDays(30).ToString("yyyy-MM-dd")
        });
        var reminder = await createResponse.Content.ReadFromJsonAsync<Reminder>();

        // Act
        var response = await client.DeleteAsync($"/api/reminders/{reminder!.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
