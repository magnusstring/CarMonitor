using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CarMonitor.Api.Models;

namespace CarMonitor.Tests.Integration;

public class VehiclesControllerTests : IClassFixture<CustomWebApplicationFactory<Program>>
{
    private readonly CustomWebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public VehiclesControllerTests(CustomWebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> GetAuthToken()
    {
        var username = "vehicletest_" + Guid.NewGuid().ToString("N")[..8];
        var response = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = username,
            Password = "password123"
        });
        var result = await response.Content.ReadFromJsonAsync<LoginResponse>();
        return result!.Token;
    }

    private async Task<HttpClient> GetAuthenticatedClient()
    {
        var token = await GetAuthToken();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task GetVehicles_WithoutAuth_ReturnsUnauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/vehicles");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetVehicles_WithAuth_ReturnsOk()
    {
        // Arrange
        var client = await GetAuthenticatedClient();

        // Act
        var response = await client.GetAsync("/api/vehicles");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task CreateVehicle_WithValidData_ReturnsCreated()
    {
        // Arrange
        var client = await GetAuthenticatedClient();
        var vehicle = new
        {
            Make = "Toyota",
            Model = "Camry",
            Year = 2023,
            LicensePlate = "TEST" + Guid.NewGuid().ToString("N")[..4],
            Color = "Blue",
            Vin = "1HGBH41JXMN109186"
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/vehicles", vehicle);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<Vehicle>();
        Assert.NotNull(created);
        Assert.Equal("Toyota", created.Make);
        Assert.Equal("Camry", created.Model);
    }

    [Fact]
    public async Task CreateVehicle_WithPartialData_ReturnsCreated()
    {
        // Arrange
        var client = await GetAuthenticatedClient();
        var vehicle = new
        {
            Make = "Toyota",
            Model = "Partial",
            Year = 2023,
            LicensePlate = "PART" + Guid.NewGuid().ToString("N")[..4]
            // Note: API accepts vehicles without optional fields like Vin, Color, Notes
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/vehicles", vehicle);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<Vehicle>();
        Assert.NotNull(created);
        Assert.Equal("Toyota", created.Make);
    }

    [Fact]
    public async Task GetVehicle_WithValidId_ReturnsVehicle()
    {
        // Arrange
        var client = await GetAuthenticatedClient();
        var vehicle = new
        {
            Make = "Honda",
            Model = "Civic",
            Year = 2022,
            LicensePlate = "GET" + Guid.NewGuid().ToString("N")[..5]
        };

        var createResponse = await client.PostAsJsonAsync("/api/vehicles", vehicle);
        var created = await createResponse.Content.ReadFromJsonAsync<Vehicle>();

        // Act
        var response = await client.GetAsync($"/api/vehicles/{created!.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<Vehicle>();
        Assert.NotNull(result);
        Assert.Equal("Honda", result.Make);
    }

    [Fact]
    public async Task UpdateVehicle_WithValidData_ReturnsOk()
    {
        // Arrange
        var client = await GetAuthenticatedClient();
        var vehicle = new
        {
            Make = "Ford",
            Model = "Focus",
            Year = 2021,
            LicensePlate = "UPD" + Guid.NewGuid().ToString("N")[..5]
        };

        var createResponse = await client.PostAsJsonAsync("/api/vehicles", vehicle);
        var created = await createResponse.Content.ReadFromJsonAsync<Vehicle>();

        var update = new
        {
            Make = "Ford",
            Model = "Mustang", // Changed
            Year = 2021,
            LicensePlate = created!.LicensePlate
        };

        // Act
        var response = await client.PutAsJsonAsync($"/api/vehicles/{created.Id}", update);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<Vehicle>();
        Assert.Equal("Mustang", result!.Model);
    }

    [Fact]
    public async Task DeleteVehicle_WithValidId_ReturnsNoContent()
    {
        // Arrange
        var client = await GetAuthenticatedClient();
        var vehicle = new
        {
            Make = "Nissan",
            Model = "Altima",
            Year = 2020,
            LicensePlate = "DEL" + Guid.NewGuid().ToString("N")[..5]
        };

        var createResponse = await client.PostAsJsonAsync("/api/vehicles", vehicle);
        var created = await createResponse.Content.ReadFromJsonAsync<Vehicle>();

        // Act
        var response = await client.DeleteAsync($"/api/vehicles/{created!.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Verify deleted
        var getResponse = await client.GetAsync($"/api/vehicles/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }
}
