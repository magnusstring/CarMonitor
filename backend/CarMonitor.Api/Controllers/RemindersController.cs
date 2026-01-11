using CarMonitor.Api.Models;
using CarMonitor.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarMonitor.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RemindersController : ControllerBase
{
    private readonly ExcelDataService _dataService;
    private readonly ReminderService _reminderService;

    public RemindersController(ExcelDataService dataService, ReminderService reminderService)
    {
        _dataService = dataService;
        _reminderService = reminderService;
    }

    [HttpGet]
    public ActionResult<List<ReminderDto>> GetAll()
    {
        return Ok(_reminderService.GetRemindersWithStatus());
    }

    [HttpGet("{id}")]
    public ActionResult<ReminderDto> GetById(int id)
    {
        var reminders = _reminderService.GetRemindersWithStatus();
        var reminder = reminders.FirstOrDefault(r => r.Id == id);
        if (reminder == null)
        {
            return NotFound();
        }
        return Ok(reminder);
    }

    [HttpPost]
    public ActionResult<ReminderDto> Create([FromBody] CreateReminderRequest request)
    {
        var vehicle = _dataService.GetVehicleById(request.VehicleId);
        if (vehicle == null)
        {
            return BadRequest(new { message = "Vehicle not found" });
        }

        // Validate that the reminder type exists
        var reminderTypes = _dataService.GetAllReminderTypes();
        var validType = reminderTypes.FirstOrDefault(t =>
            t.Name.Equals(request.Type, StringComparison.OrdinalIgnoreCase));

        if (validType == null)
        {
            var validNames = string.Join(", ", reminderTypes.Select(t => t.Name));
            return BadRequest(new { message = $"Invalid reminder type. Valid types: {validNames}" });
        }

        var reminder = new Reminder
        {
            VehicleId = request.VehicleId,
            Type = validType.Name,
            DueDate = request.DueDate,
            Notes = request.Notes,
            IsCompleted = false
        };

        var created = _dataService.CreateReminder(reminder);
        var dto = _reminderService.GetRemindersWithStatus().First(r => r.Id == created.Id);

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, dto);
    }

    [HttpPut("{id}")]
    public ActionResult<ReminderDto> Update(int id, [FromBody] UpdateReminderRequest request)
    {
        var existing = _dataService.GetReminderById(id);
        if (existing == null)
        {
            return NotFound();
        }

        var reminder = new Reminder
        {
            DueDate = request.DueDate,
            Notes = request.Notes,
            IsCompleted = request.IsCompleted
        };

        var updated = _dataService.UpdateReminder(id, reminder);
        if (updated == null)
        {
            return NotFound();
        }

        var dto = _reminderService.GetRemindersWithStatus().First(r => r.Id == id);
        return Ok(dto);
    }

    [HttpPatch("{id}/complete")]
    public ActionResult<ReminderDto> MarkComplete(int id)
    {
        var existing = _dataService.GetReminderById(id);
        if (existing == null)
        {
            return NotFound();
        }

        var reminder = new Reminder
        {
            DueDate = existing.DueDate,
            Notes = existing.Notes,
            IsCompleted = true
        };

        _dataService.UpdateReminder(id, reminder);
        var dto = _reminderService.GetRemindersWithStatus().First(r => r.Id == id);
        return Ok(dto);
    }

    [HttpDelete("{id}")]
    public ActionResult Delete(int id)
    {
        var deleted = _dataService.DeleteReminder(id);
        if (!deleted)
        {
            return NotFound();
        }
        return NoContent();
    }
}
