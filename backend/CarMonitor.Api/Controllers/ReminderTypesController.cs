using CarMonitor.Api.Models;
using CarMonitor.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarMonitor.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReminderTypesController : ControllerBase
{
    private readonly ExcelDataService _dataService;

    public ReminderTypesController(ExcelDataService dataService)
    {
        _dataService = dataService;
    }

    [HttpGet]
    public ActionResult<List<ReminderTypeDto>> GetAll()
    {
        var types = _dataService.GetAllReminderTypes();
        return Ok(types.Select(t => new ReminderTypeDto
        {
            Id = t.Id,
            Name = t.Name,
            Icon = t.Icon,
            Color = t.Color,
            IsDefault = t.IsDefault
        }));
    }

    [HttpGet("{id}")]
    public ActionResult<ReminderTypeDto> GetById(int id)
    {
        var type = _dataService.GetReminderTypeById(id);
        if (type == null)
        {
            return NotFound();
        }

        return Ok(new ReminderTypeDto
        {
            Id = type.Id,
            Name = type.Name,
            Icon = type.Icon,
            Color = type.Color,
            IsDefault = type.IsDefault
        });
    }

    [HttpPost]
    public ActionResult<ReminderTypeDto> Create([FromBody] CreateReminderTypeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Name is required" });
        }

        var reminderType = new ReminderTypeEntity
        {
            Name = request.Name,
            Icon = request.Icon ?? "default",
            Color = request.Color ?? "#6366f1"
        };

        var created = _dataService.CreateReminderType(reminderType);

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, new ReminderTypeDto
        {
            Id = created.Id,
            Name = created.Name,
            Icon = created.Icon,
            Color = created.Color,
            IsDefault = created.IsDefault
        });
    }

    [HttpPut("{id}")]
    public ActionResult<ReminderTypeDto> Update(int id, [FromBody] CreateReminderTypeRequest request)
    {
        var reminderType = new ReminderTypeEntity
        {
            Name = request.Name,
            Icon = request.Icon ?? "default",
            Color = request.Color ?? "#6366f1"
        };

        var updated = _dataService.UpdateReminderType(id, reminderType);
        if (updated == null)
        {
            return NotFound();
        }

        return Ok(new ReminderTypeDto
        {
            Id = updated.Id,
            Name = updated.Name,
            Icon = updated.Icon,
            Color = updated.Color,
            IsDefault = updated.IsDefault
        });
    }

    [HttpDelete("{id}")]
    public ActionResult Delete(int id)
    {
        var type = _dataService.GetReminderTypeById(id);
        if (type == null)
        {
            return NotFound();
        }

        if (type.IsDefault)
        {
            return BadRequest(new { message = "Cannot delete default reminder types" });
        }

        var deleted = _dataService.DeleteReminderType(id);
        if (!deleted)
        {
            return NotFound();
        }
        return NoContent();
    }
}
