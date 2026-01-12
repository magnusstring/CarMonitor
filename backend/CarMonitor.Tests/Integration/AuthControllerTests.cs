using System.Net;
using System.Net.Http.Json;
using CarMonitor.Api.Models;

namespace CarMonitor.Tests.Integration;

public class AuthControllerTests : IClassFixture<CustomWebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public AuthControllerTests(CustomWebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Register_WithValidCredentials_ReturnsToken()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Username = "testuser_" + Guid.NewGuid().ToString("N")[..8],
            Password = "password123",
            Email = "test@example.com"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(result);
        Assert.NotEmpty(result.Token);
        Assert.Equal(request.Username, result.Username);
    }

    [Fact]
    public async Task Register_WithExistingUsername_ReturnsConflict()
    {
        // Arrange
        var username = "duplicate_" + Guid.NewGuid().ToString("N")[..8];
        var request = new RegisterRequest
        {
            Username = username,
            Password = "password123"
        };

        // First registration
        await _client.PostAsJsonAsync("/api/auth/register", request);

        // Act - Second registration with same username
        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Register_WithShortPassword_ReturnsBadRequest()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Username = "testuser_" + Guid.NewGuid().ToString("N")[..8],
            Password = "123" // Too short
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsToken()
    {
        // Arrange
        var username = "logintest_" + Guid.NewGuid().ToString("N")[..8];
        var password = "password123";

        // First register
        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = username,
            Password = password
        });

        // Act - Login
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Username = username,
            Password = password
        });

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(result);
        Assert.NotEmpty(result.Token);
    }

    [Fact]
    public async Task Login_WithInvalidPassword_ReturnsUnauthorized()
    {
        // Arrange
        var username = "invalidpwd_" + Guid.NewGuid().ToString("N")[..8];

        // Register
        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = username,
            Password = "password123"
        });

        // Act - Login with wrong password
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Username = username,
            Password = "wrongpassword"
        });

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithNonExistentUser_ReturnsUnauthorized()
    {
        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Username = "nonexistent_" + Guid.NewGuid().ToString("N")[..8],
            Password = "password123"
        });

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
