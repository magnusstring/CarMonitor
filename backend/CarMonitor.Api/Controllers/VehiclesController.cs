using System.Security.Claims;
using CarMonitor.Api.Models;
using CarMonitor.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarMonitor.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VehiclesController : ControllerBase
{
    private readonly ExcelDataService _dataService;
    private readonly ReminderService _reminderService;

    public VehiclesController(ExcelDataService dataService, ReminderService reminderService)
    {
        _dataService = dataService;
        _reminderService = reminderService;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(userIdClaim, out var userId) ? userId : 0;
    }

    [HttpGet]
    public ActionResult<List<VehicleDto>> GetAll()
    {
        var userId = GetCurrentUserId();
        var vehicles = _dataService.GetVehiclesForUser(userId);

        return Ok(vehicles.Select(v => ToDto(v, userId)));
    }

    [HttpGet("{id}")]
    public ActionResult<VehicleDto> GetById(int id)
    {
        var userId = GetCurrentUserId();
        var vehicle = _dataService.GetVehicleById(id);

        if (vehicle == null || !_dataService.UserHasAccessToVehicle(userId, id))
        {
            return NotFound();
        }

        return Ok(ToDto(vehicle, userId));
    }

    [HttpGet("{id}/reminders")]
    public ActionResult<List<ReminderDto>> GetVehicleReminders(int id)
    {
        var userId = GetCurrentUserId();

        if (!_dataService.UserHasAccessToVehicle(userId, id))
        {
            return NotFound();
        }

        return Ok(_reminderService.GetRemindersByVehicleId(id));
    }

    [HttpPost]
    public ActionResult<VehicleDto> Create([FromBody] CreateVehicleRequest request)
    {
        var userId = GetCurrentUserId();

        var vehicle = new Vehicle
        {
            UserId = userId,
            Make = request.Make,
            Model = request.Model,
            Year = request.Year,
            LicensePlate = request.LicensePlate,
            Vin = request.Vin,
            Color = request.Color,
            Notes = request.Notes
        };

        var created = _dataService.CreateVehicle(vehicle);

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ToDto(created, userId));
    }

    [HttpPut("{id}")]
    public ActionResult<VehicleDto> Update(int id, [FromBody] CreateVehicleRequest request)
    {
        var userId = GetCurrentUserId();
        var existing = _dataService.GetVehicleById(id);

        if (existing == null || !_dataService.UserHasAccessToVehicle(userId, id))
        {
            return NotFound();
        }

        var vehicle = new Vehicle
        {
            Make = request.Make,
            Model = request.Model,
            Year = request.Year,
            LicensePlate = request.LicensePlate,
            Vin = request.Vin,
            Color = request.Color,
            Notes = request.Notes
        };

        var updated = _dataService.UpdateVehicle(id, vehicle);
        if (updated == null)
        {
            return NotFound();
        }

        return Ok(ToDto(updated, userId));
    }

    [HttpDelete("{id}")]
    public ActionResult Delete(int id)
    {
        var userId = GetCurrentUserId();
        var vehicle = _dataService.GetVehicleById(id);

        // Only owner can delete
        if (vehicle == null || (vehicle.UserId != userId && vehicle.UserId != 0))
        {
            return NotFound();
        }

        var deleted = _dataService.DeleteVehicle(id);
        if (!deleted)
        {
            return NotFound();
        }
        return NoContent();
    }

    [HttpPost("{id}/share")]
    public ActionResult<SharedUserDto> ShareVehicle(int id, [FromBody] ShareVehicleRequest request)
    {
        var userId = GetCurrentUserId();
        var vehicle = _dataService.GetVehicleById(id);

        // Only owner can share
        if (vehicle == null || (vehicle.UserId != userId && vehicle.UserId != 0))
        {
            return NotFound();
        }

        var targetUser = _dataService.GetUserByUsername(request.Username);
        if (targetUser == null)
        {
            return BadRequest(new { message = "User not found" });
        }

        if (targetUser.Id == userId)
        {
            return BadRequest(new { message = "Cannot share with yourself" });
        }

        _dataService.ShareVehicle(id, targetUser.Id);

        return Ok(new SharedUserDto
        {
            UserId = targetUser.Id,
            Username = targetUser.Username
        });
    }

    [HttpDelete("{id}/share/{targetUserId}")]
    public ActionResult UnshareVehicle(int id, int targetUserId)
    {
        var userId = GetCurrentUserId();
        var vehicle = _dataService.GetVehicleById(id);

        // Only owner can unshare
        if (vehicle == null || (vehicle.UserId != userId && vehicle.UserId != 0))
        {
            return NotFound();
        }

        _dataService.UnshareVehicle(id, targetUserId);
        return NoContent();
    }

    [HttpGet("users")]
    public ActionResult<List<SharedUserDto>> GetUsers()
    {
        var userId = GetCurrentUserId();
        var users = _dataService.GetAllUsers()
            .Where(u => u.Id != userId)
            .Select(u => new SharedUserDto
            {
                UserId = u.Id,
                Username = u.Username
            })
            .ToList();

        return Ok(users);
    }

    private VehicleDto ToDto(Vehicle vehicle, int currentUserId)
    {
        var owner = _dataService.GetUserById(vehicle.UserId);
        var shares = _dataService.GetSharesForVehicle(vehicle.Id);
        var sharedUsers = shares.Select(s =>
        {
            var user = _dataService.GetUserById(s.UserId);
            return new SharedUserDto
            {
                UserId = s.UserId,
                Username = user?.Username ?? "Unknown"
            };
        }).ToList();

        return new VehicleDto
        {
            Id = vehicle.Id,
            Make = vehicle.Make,
            Model = vehicle.Model,
            Year = vehicle.Year,
            LicensePlate = vehicle.LicensePlate,
            Vin = vehicle.Vin,
            Color = vehicle.Color,
            Notes = vehicle.Notes,
            IsOwner = vehicle.UserId == currentUserId || vehicle.UserId == 0,
            OwnerName = owner?.Username ?? "Unknown",
            SharedWith = sharedUsers
        };
    }
}
