using System.Security.Claims;
using CarMonitor.Api.Models;
using CarMonitor.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarMonitor.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IDataService _dataService;

    public UserController(IDataService dataService)
    {
        _dataService = dataService;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        return userIdClaim != null ? int.Parse(userIdClaim.Value) : 0;
    }

    [HttpGet("settings")]
    public ActionResult<UserSettingsResponse> GetSettings()
    {
        var userId = GetUserId();
        var user = _dataService.GetUserById(userId);
        if (user == null)
        {
            return NotFound();
        }

        return Ok(new UserSettingsResponse
        {
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            SmsNotificationsEnabled = user.SmsNotificationsEnabled
        });
    }

    [HttpPut("settings")]
    public ActionResult<UserSettingsResponse> UpdateSettings([FromBody] UpdateUserSettingsRequest request)
    {
        var userId = GetUserId();
        var user = _dataService.GetUserById(userId);
        if (user == null)
        {
            return NotFound();
        }

        user.Email = request.Email;
        user.PhoneNumber = request.PhoneNumber;
        user.SmsNotificationsEnabled = request.SmsNotificationsEnabled;

        var updated = _dataService.UpdateUser(userId, user);
        if (updated == null)
        {
            return BadRequest(new { message = "Failed to update settings" });
        }

        return Ok(new UserSettingsResponse
        {
            Email = updated.Email,
            PhoneNumber = updated.PhoneNumber,
            SmsNotificationsEnabled = updated.SmsNotificationsEnabled
        });
    }
}

public class UserSettingsResponse
{
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public bool SmsNotificationsEnabled { get; set; }
}

public class UpdateUserSettingsRequest
{
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public bool SmsNotificationsEnabled { get; set; }
}
