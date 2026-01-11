using CarMonitor.Api.Models;
using CarMonitor.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace CarMonitor.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public ActionResult<LoginResponse> Login([FromBody] LoginRequest request)
    {
        var result = _authService.Login(request);
        if (result == null)
        {
            return Unauthorized(new { message = "Invalid username or password" });
        }
        return Ok(result);
    }

    [HttpPost("register")]
    public ActionResult<LoginResponse> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Username and password are required" });
        }

        if (request.Password.Length < 6)
        {
            return BadRequest(new { message = "Password must be at least 6 characters" });
        }

        var result = _authService.Register(request);
        if (result == null)
        {
            return Conflict(new { message = "Username already exists" });
        }
        return Ok(result);
    }
}
