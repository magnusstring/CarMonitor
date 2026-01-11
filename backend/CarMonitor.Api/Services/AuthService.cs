using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CarMonitor.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace CarMonitor.Api.Services;

public class AuthService
{
    private readonly ExcelDataService _dataService;
    private readonly IConfiguration _configuration;

    public AuthService(ExcelDataService dataService, IConfiguration configuration)
    {
        _dataService = dataService;
        _configuration = configuration;
    }

    public LoginResponse? Login(LoginRequest request)
    {
        var user = _dataService.GetUserByUsername(request.Username);
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return null;
        }

        return GenerateToken(user);
    }

    public LoginResponse? Register(RegisterRequest request)
    {
        var existingUser = _dataService.GetUserByUsername(request.Username);
        if (existingUser != null)
        {
            return null;
        }

        var user = new User
        {
            Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Email = request.Email
        };

        _dataService.CreateUser(user);
        return GenerateToken(user);
    }

    private LoginResponse GenerateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _configuration["Jwt:Key"] ?? "DefaultSecretKeyThatShouldBeChangedInProduction123!"));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresAt = DateTime.UtcNow.AddDays(7);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "CarMonitor",
            audience: _configuration["Jwt:Audience"] ?? "CarMonitor",
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials
        );

        return new LoginResponse
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            Username = user.Username,
            ExpiresAt = expiresAt
        };
    }
}
