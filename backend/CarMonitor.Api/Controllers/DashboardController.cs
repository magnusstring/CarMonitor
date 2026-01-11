using CarMonitor.Api.Models;
using CarMonitor.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarMonitor.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly ReminderService _reminderService;

    public DashboardController(ReminderService reminderService)
    {
        _reminderService = reminderService;
    }

    [HttpGet]
    public ActionResult<DashboardResponse> Get()
    {
        return Ok(_reminderService.GetDashboard());
    }
}
